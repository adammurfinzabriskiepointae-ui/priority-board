# Adam's Priority Board

A live board of creative projects, served by GitHub Pages at
https://adammurfinzabriskiepointae-ui.github.io/priority-board/

| File | What it is |
|---|---|
| `index.html` | The board everyone can see. Waiting / Doing / Done, Top priorities, archive. |
| `edit.html` | The same page in editor mode: drag cards, edit text, set priorities. Needs a GitHub token pasted once. **Generated from `index.html`**: run `python3 tools/sync_edit.py` after changing `index.html`. |
| `brief.html` | The public request form. Anyone with the link can send a brief (commodity type, image/video/graphic, where used, final spec, brief, deadline, WeTransfer link); it joins the queue in Waiting, in deadline order. No priority controls. |
| `data/projects.json` | The board data. The editor writes it through the GitHub API; the brief inbox appends to it. |
| `data/config.json` | `briefEndpoint`: the Apps Script inbox URL the brief form posts to. |
| `apps-script/Code.gs` | The inbox: a Google Apps Script web app that receives briefs, appends them to `projects.json` and sends the emails. See `SETUP.md`. |
| `SETUP.md` | One-time steps to deploy the inbox and connect the form. |
| `tools/sync_edit.py` | Rebuilds `edit.html` from `index.html`. |

Each project in `projects.json` has: `id, title, dept (commodity type), kind (IMAGE | VIDEO | GRAPHIC | MIXED), usage, spec, name, email, deadline (YYYY-MM-DD), brief, assets, status
(requested | queued | in_progress | done | archived | declined), rank, top, topOrder, notes, createdAt, updatedAt`.
Briefs from the form arrive as `queued` and join Waiting straight away. Waiting is sorted by deadline (overdue and
soonest first, no deadline last; ties keep their rank order). `requested` is only for older briefs sent before
6 Nov 2026: they show in Waiting marked NEW BRIEF with Add to queue / Decline.

Commodity types (`dept`): MENS, WOMENS, KIDS, TEENS, HOME, COSMETICS, OTHER (older cards may still say ECOM).
