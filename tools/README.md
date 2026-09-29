# tools

Scripts for checking the pages. Run them from the repo root. None of them are part of the
site.

| Script | What it checks or does |
|---|---|
| `audit.js` | Broken links, duplicate IDs, missing labels and alt text, heading order, unused CSS classes |
| `balance.js` | Every HTML tag opens and closes in order |
| `check-selectors.js` | Every ID the JavaScript looks for exists on a page |
| `logic-test.js` | The filter and search rules in `main.js` give the right results |
| `rubric.js` | The Project 2 pages meet the spec |
| `zip-submission.ps1` | Zips a folder for Canvas, with paths that work on macOS too |

```sh
node tools/audit.js project3
node tools/balance.js project3
node tools/check-selectors.js project3
node tools/logic-test.js project3

node tools/rubric.js submission

powershell -ExecutionPolicy Bypass -File tools/zip-submission.ps1 -Folder project3 -Into project3
```
