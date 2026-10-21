# Adam's Priority Board

A live board of creative projects, served by GitHub Pages at
https://adammurfinzabriskiepointae-ui.github.io/priority-board/

| File | What it is |
|---|---|
| `index.html` | The board everyone can see. Waiting / Doing / Done, Top priorities, archive. |
| `edit.html` | The same page in editor mode: drag cards, edit text, set priorities. Needs a GitHub token pasted once. **Generated from `index.html`**: run `python3 tools/sync_edit.py` after changing `index.html`. |
| `brief.html` | The public request form. Anyone with the link can send a brief; it lands at the bottom of Waiting with a timestamp. No priority controls. |
| `data/projects.json` | The board data. The editor writes it through the GitHub API; the brief inbox appends to it. |
| `data/config.json` | `briefEndpoint`: the Apps Script inbox URL the brief form posts to. |
| `apps-script/Code.gs` | The inbox: a Google Apps Script web app that receives briefs, appends them to `projects.json` and sends the emails. See `SETUP.md`. |
| `SETUP.md` | One-time steps to deploy the inbox and connect the form. |
| `tools/sync_edit.py` | Rebuilds `edit.html` from `index.html`. |

Each project in `projects.json` has: `id, title, dept, name, email, deadline (YYYY-MM-DD), brief, assets, status
(requested | queued | in_progress | done | archived | declined), rank, top, topOrder, notes, createdAt, updatedAt`.
`requested` = a new brief nobody has triaged yet; it shows in Waiting marked NEW BRIEF until Adam drags it or presses
"Add to queue".

Departments: MENS, WOMENS, KIDS, TEENS, HOME, COSMETICS, OTHER (older cards may still say ECOM).
