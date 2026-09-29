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
project3/     The current site: 7 pages, one stylesheet, js/main.js (jQuery)
submission/   The Project 2 hand-in: 5 static pages, no JavaScript
tools/        Scripts for checking and zipping (see tools/README.md)
```

| Page | What it shows |
|---|---|
| `index.html` | Landing page |
| `dashboard.html` | Your issues, the triage queue, and your projects |
| `list.html` | All issues, with filters and sorting |
| `detail.html` | One issue: its workflow, assignments, and actions |
| `add.html` | Report a new issue |
| `edit.html` | Edit an issue |
| `search.html` | Search results |

## Not built yet

- There's no backend. Search, filters, and the workflow buttons run on sample data in
  `main.js`.
- Projects and Calendar in the sidebar are placeholders with no page.
