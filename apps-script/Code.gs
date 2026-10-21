/**
 * Priority Board — brief inbox.
 *
 * brief.html POSTs a brief here. This script appends it to data/projects.json in the
 * GitHub repository (status "requested", so it shows at the bottom of Waiting on the
 * board), then emails Adam and sends the requester a confirmation.
 *
 * Runs as a Google Apps Script web app (see SETUP.md). Script properties:
 *   GITHUB_TOKEN  required  fine-grained token, Contents: read and write on the board repo
 *   NOTIFY_EMAIL  optional  where "New brief" emails go (Adam); several addresses separated by commas.
 *                           The first one is the reply-to on the requester's confirmation.
 *   GITHUB_REPO   optional  owner/name, defaults to the board repo below
 */
var REPO_DEFAULT = "adammurfinzabriskiepointae-ui/priority-board";
var FILE_PATH = "data/projects.json";
var BRANCH = "main";
var BOARD_URL = "https://adammurfinzabriskiepointae-ui.github.io/priority-board/";
var DEPTS = ["MENS", "WOMENS", "KIDS", "TEENS", "HOME", "COSMETICS", "OTHER"]; // commodity types
var KINDS = ["IMAGE", "VIDEO", "GRAPHIC", "MIXED"];
var MAX_PER_HOUR = 40;

function doGet() {
  return out({ ok: true, service: "priority-board brief inbox", boardUrl: BOARD_URL });
}

function doPost(e) {
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch (err) { return out({ ok: false, error: "Bad request" }); }

  // Honeypot: real people never fill the hidden "website" box. Pretend it worked and store nothing.
  if (body.website) return out({ ok: true, id: "", createdAt: new Date().toISOString() });

  var v = validate(body);
  if (v.error) return out({ ok: false, error: v.error });
  if (!tokenOrEmpty()) return out({ ok: false, error: "The inbox is not configured yet (no GitHub token)." });
  if (overLimit()) return out({ ok: false, error: "Too many briefs in the last hour. Please try again later." });

  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); }
  catch (err) { return out({ ok: false, error: "The inbox is busy, please try again in a moment." }); }
  try {
    var item = v.item;
    for (var attempt = 0; attempt < 3; attempt++) {
      var cur = readBoard();
      cur.items.push(item);
      var code = writeBoard(cur.items, cur.sha, "New brief: " + item.title);
      if (code === 409 || code === 422) continue; // someone saved in between: reload and retry
      if (code < 200 || code >= 300) return out({ ok: false, error: "GitHub refused the save (" + code + ")." });
      notify(item);
      return out({ ok: true, id: item.id, createdAt: item.createdAt });
    }
    return out({ ok: false, error: "Could not save after three tries. Please send again." });
  } catch (err) {
    return out({ ok: false, error: "Inbox error: " + (err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

// ---- Validation: same limits as the board's own add-project form.
function validate(b) {
  var clean = function (s, max) { return String(s == null ? "" : s).replace(/\r\n?/g, "\n").trim().slice(0, max); };
  var name = clean(b.name, 60), email = clean(b.email, 120), dept = clean(b.dept, 20).toUpperCase();
  var title = clean(b.title, 140), brief = clean(b.brief, 4000), deadline = clean(b.deadline, 10), assets = clean(b.assets, 2000);
  var kind = clean(b.kind, 20).toUpperCase(), usage = clean(b.usage, 200), spec = clean(b.spec, 300);
  if (!name) return { error: "Please add your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please add a working email address." };
  if (DEPTS.indexOf(dept) < 0) return { error: "Please choose a commodity type." };
  if (!title) return { error: "Please say what you need." };
  if (KINDS.indexOf(kind) < 0) return { error: "Please choose image, video or graphic." };
  if (!usage) return { error: "Please say where it will be used." };
  if (!spec) return { error: "Please give the final size and specification." };
  if (!brief) return { error: "Please write the brief." };
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return { error: "The deadline date looks wrong." };
  var now = new Date().toISOString();
  return { item: {
    id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title: title, dept: dept, kind: kind, usage: usage, spec: spec, name: name, email: email, deadline: deadline, brief: brief, assets: assets,
    status: "requested", rank: null, top: false, topOrder: null, notes: "",
    createdAt: now, updatedAt: now, source: "brief-form"
  } };
}

// ---- GitHub: data/projects.json via the Contents API.
function props() { return PropertiesService.getScriptProperties(); }
function tokenOrEmpty() { return props().getProperty("GITHUB_TOKEN") || ""; }
function repo() { return props().getProperty("GITHUB_REPO") || REPO_DEFAULT; }
function apiUrl() { return "https://api.github.com/repos/" + repo() + "/contents/" + FILE_PATH; }
function ghHeaders() { return { Authorization: "Bearer " + tokenOrEmpty(), Accept: "application/vnd.github+json" }; }

function readBoard() {
  var r = UrlFetchApp.fetch(apiUrl() + "?ref=" + BRANCH, { headers: ghHeaders(), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error("GitHub read failed (" + r.getResponseCode() + ")");
  var j = JSON.parse(r.getContentText());
  var text = Utilities.newBlob(Utilities.base64Decode(String(j.content).replace(/\n/g, ""))).getDataAsString("UTF-8");
  var items = JSON.parse(text);
  if (!Array.isArray(items)) throw new Error("projects.json is not a list");
  return { items: items, sha: j.sha };
}

function writeBoard(items, sha, message) {
  var payload = { message: message, branch: BRANCH, sha: sha,
    content: Utilities.base64Encode(JSON.stringify(items, null, 2), Utilities.Charset.UTF_8) };
  var r = UrlFetchApp.fetch(apiUrl(), { method: "put", contentType: "application/json", headers: ghHeaders(),
    payload: JSON.stringify(payload), muteHttpExceptions: true });
  return r.getResponseCode();
}

// ---- Simple global rate limit so a stuck page cannot flood the board.
function overLimit() {
  var cache = CacheService.getScriptCache();
  var key = "briefs-" + Math.floor(Date.now() / 3600000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 3600);
  return n > MAX_PER_HOUR;
}

// ---- Emails. Failures here never fail the save.
function notify(item) {
  var adam = props().getProperty("NOTIFY_EMAIL") || ""; // one or more addresses, comma separated
  var replyTo = adam.split(",")[0].trim();
  var when = Utilities.formatDate(new Date(item.createdAt), "Asia/Dubai", "EEE d MMM yyyy, HH:mm") + " Dubai";
  var lines = [
    "New brief on the Priority Board", "",
    "What:       " + item.title,
    "Commodity:  " + item.dept,
    "Type:       " + item.kind,
    "Used for:   " + item.usage,
    "Spec:       " + item.spec,
    "From:       " + item.name + " <" + item.email + ">",
    "Deadline:   " + (item.deadline || "not given"),
    "Sent:       " + when, "",
    "Brief:", item.brief, "",
    "Links:", (item.assets || "none"), "",
    "Board: " + BOARD_URL + "edit.html"
  ];
  if (adam) {
    try { MailApp.sendEmail({ to: adam, subject: "New brief: " + item.title + " (" + item.dept + ")", body: lines.join("\n"), replyTo: item.email }); }
    catch (err) { console.warn("Notify failed: " + err); }
  }
  try {
    var conf = [
      "Hi " + item.name + ",", "",
      "Got your brief \"" + item.title + "\" at " + when + ". It is now in Waiting on the board:", BOARD_URL, "",
      "Adam will email you here if he has questions.", "",
      "Your brief:", item.brief, "",
      "Type: " + item.kind + " · Used for: " + item.usage + " · Spec: " + item.spec,
      "Deadline: " + (item.deadline || "not given"),
      "Links: " + (item.assets || "none")
    ];
    var opts = { to: item.email, subject: "Got your brief: " + item.title, body: conf.join("\n") };
    if (replyTo) opts.replyTo = replyTo;
    MailApp.sendEmail(opts);
  } catch (err) { console.warn("Confirmation failed: " + err); }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor (Run ▸ checkSetup) to confirm the token can read the board.
function checkSetup() {
  var cur = readBoard();
  Logger.log("OK: token works, " + cur.items.length + " projects on the board. NOTIFY_EMAIL = " + (props().getProperty("NOTIFY_EMAIL") || "(not set)"));
}
