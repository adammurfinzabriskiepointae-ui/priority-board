# Connecting the brief form (one time, about 5 minutes)

The board is a plain web page on GitHub Pages, so it cannot receive form submissions by itself.
A tiny Google Apps Script acts as the inbox: `brief.html` sends the brief to it, the script adds the
brief to `data/projects.json`, and the board shows it at the bottom of **Waiting**.

Do this once, signed in to Google as the account that should own the inbox (ai.developerdxb07@gmail.com).

## 1. Get a GitHub token for the script

You may already have one from the board editor (it needs the same permission). To make a new one:

1. Open https://github.com/settings/personal-access-tokens/new (signed in as `adammurfinzabriskiepointae-ui`).
2. Token name: `priority-board inbox`. Expiration: 1 year.
3. Repository access: **Only select repositories** → `priority-board`.
4. Permissions → Repository permissions → **Contents: Read and write**. Nothing else.
5. Generate, and copy the token (starts with `github_pat_`). You will not see it again.

## 2. Create the script

1. Open https://script.google.com and press **New project**.
2. Click the project name (top left, "Untitled project") and call it `Priority Board inbox`.
3. In the editor, delete everything in `Code.gs` and paste the whole contents of `apps-script/Code.gs` from this repository. Press **Save** (disk icon).
4. Left sidebar → **Project Settings** (cog) → **Script Properties** → **Add script property**:
   - `GITHUB_TOKEN` = the token from step 1
   - `NOTIFY_EMAIL` = the address that should get a "New brief" email for each submission (Adam's)
   Press **Save script properties**.
5. Back in the editor, choose the function `checkSetup` in the toolbar dropdown and press **Run**.
   The first time, Google asks you to authorise: **Review permissions** → choose the account →
   **Advanced** → **Go to Priority Board inbox (unsafe)** → **Allow**. (It says "unsafe" only because the
   script is your own and not published in the store.)
   The log at the bottom should say `OK: token works, N projects on the board`.

## 3. Publish it as a web app

1. **Deploy** (top right) → **New deployment**.
2. Cog next to "Select type" → **Web app**.
3. Description: `v1`. **Execute as: Me**. **Who has access: Anyone**. Press **Deploy**.
4. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfy…/exec`).

## 4. Tell the board where the inbox is

Put that URL into `data/config.json`:

```json
{ "briefEndpoint": "https://script.google.com/macros/s/AKfy…/exec" }
```

Either edit the file on GitHub (open `data/config.json` in the repo → pencil → paste → Commit changes),
or send the URL to Claude and it will commit it. A minute later https://adammurfinzabriskiepointae-ui.github.io/priority-board/brief.html
is live. Send yourself a test brief; it should appear at the bottom of Waiting within a minute and you
should get the "New brief" email.

## Later

- **Changing the script:** after editing `Code.gs`, go **Deploy → Manage deployments → pencil → Version: New version → Deploy**.
  The URL stays the same. Without a new version the old code keeps running.
- **Token expired:** make a new one (step 1) and update the `GITHUB_TOKEN` script property. No redeploy needed.
- **Emails:** the confirmation to the requester is sent from the Google account that owns the script,
  with reply-to set to `NOTIFY_EMAIL`. Gmail allows about 100 of these a day, far more than needed.
- **Privacy:** the repository is public, so the briefs and the requesters' email addresses in
  `data/projects.json` are readable by anyone who finds the link. The page is marked no-index, but
  do not put anything confidential in a brief.
