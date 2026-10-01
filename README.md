# Clamped

Issue tracking for student teams: hackathons, capstone groups, and clubs.

Teams report, assign, and track programming issues through a fixed workflow. The main rule:
**whoever works on an issue can't be the one who verifies it**, so every fix gets a second
set of eyes.

## How it works

- Issues move through five states: Reported → In Progress → Patched → Under Review → Verified.
- Each issue has a reporter, an assignee, and a verifier. The assignee can't also verify it.
- Projects have two roles. **Members** report issues, assign themselves, and move tickets
  along. **Leads** can also assign other people, manage members, and delete tickets.
  Whoever creates a project is its lead.

## Running it

Open `project3/index.html` in a browser. There's no build step. jQuery loads from a CDN, so
you need an internet connection.

## What's here

```
project3/     The site: 6 pages, one stylesheet, js/main.js (jQuery)
```

| Page | What it shows |
|---|---|
| `index.html` | Landing page |
| `dashboard.html` | Your issues, the triage queue, and your projects |
| `list.html` | All issues, with filters |
| `detail.html` | One issue: its workflow, assignments, and actions |
| `add.html` | Report a new issue |
| `search.html` | Search results |

## Behaviour

All of it is in `project3/js/main.js`, which every page loads after jQuery.

| Feature | Page | Try it |
|---|---|---|
| Simulated search | any page with the top search box | search `payment` for results, anything else for the "no results" message |
| Filter issues (`change`, DOM traversal) | `list.html` | pick a Project, Role, Status or Severity filter |
| Send for review (`click`, event delegation) | `detail.html` | click **Send for Review**, then **Remind Priya** |

## Not built yet

- There's no backend. Search is simulated: `search.html` holds one set of results, and
  `main.js` shows it for the phrases "payment" and "checkout". Filters and workflow buttons
  change the page only; nothing is saved.
- There's no real login. **Sign In** and the **Create Workspace** form on `index.html` go
  straight to `dashboard.html`; nothing is checked or saved.
- Projects and Calendar in the sidebar are placeholders with no page.
- The table's sort links, pagination, notification bell, Assign Member and Revoke my role
  are visual only.
