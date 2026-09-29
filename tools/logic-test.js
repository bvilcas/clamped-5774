// Runs the decision logic from main.js against the real rows parsed out of
// list.html. This is not a browser, so it does not prove the jQuery wiring —
// it proves the filter rules and the search switch give the right answers.
const fs = require('fs');

const html = fs.readFileSync(process.argv[2] + '/list.html', 'utf8');
const body = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));

const rows = [...body.matchAll(/<tr data-role="([^"]*)">([\s\S]*?)<\/tr>/g)].map(m => {
  const cells = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .map(t => t[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  return { role: m[1], cells };
});

// --- the same rules main.js uses -------------------------------------------
const FILTER_COLUMNS = { 'filter-project': 2, 'filter-severity': 3, 'filter-status': 4 };
const SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function rowMatches(row, filters, text) {
  let keep = true;
  for (const [id, wanted] of Object.entries(filters)) {
    if (!wanted) continue;
    if (id === 'filter-role') { if (row.role !== wanted) keep = false; continue; }
    const cell = (row.cells[FILTER_COLUMNS[id]] || '').trim().toUpperCase();
    if (id === 'filter-severity') {
      if (SEVERITY_RANK[cell] < SEVERITY_RANK[wanted]) keep = false;
    } else if (cell !== wanted.replace('_', ' ').toUpperCase()) keep = false;
  }
  if (keep && text) {
    const hay = (row.cells[0] + ' ' + row.cells[1]).toLowerCase();
    if (hay.indexOf(text) === -1) keep = false;
  }
  return keep;
}

const count = (filters, text = '') => rows.filter(r => rowMatches(r, filters, text)).length;
const keys = (filters, text = '') =>
  rows.filter(r => rowMatches(r, filters, text)).map(r => r.cells[0]).join(' ');

const cases = [
  ['page default (severity MEDIUM, as the HTML loads)', { 'filter-severity': 'MEDIUM' }, '', 7],
  ['no filters at all', {}, '', 7],
  ['severity HIGH and above', { 'filter-severity': 'HIGH' }, '', 4],
  ['severity CRITICAL', { 'filter-severity': 'CRITICAL' }, '', 2],
  ['project checkout-service', { 'filter-project': 'checkout-service' }, '', 2],
  ['project api-gateway', { 'filter-project': 'api-gateway' }, '', 2],
  ['status PATCHED', { 'filter-status': 'PATCHED' }, '', 2],
  ['status IN_PROGRESS (underscore)', { 'filter-status': 'IN_PROGRESS' }, '', 2],
  ['role ASSIGNEE', { 'filter-role': 'ASSIGNEE' }, '', 2],
  ['role VERIFIER', { 'filter-role': 'VERIFIER' }, '', 2],
  ['role REPORTER', { 'filter-role': 'REPORTER' }, '', 1],
  ['text "token"', {}, 'token', 1],
  ['text "clm-13"', {}, 'clm-13', 4],
  ['combination that excludes everything', { 'filter-project': 'clamped-web', 'filter-severity': 'CRITICAL' }, '', 0],
];

let fails = 0;
console.log(`${rows.length} rows parsed from list.html\n`);
for (const [name, filters, text, expected] of cases) {
  const got = count(filters, text);
  const ok = got === expected;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${got} (expected ${expected})  ${keys(filters, text)}`);
}

// --- the search switch ------------------------------------------------------
const ISSUES = [
  { key: 'CLM-148', project: 'checkout-service' },
  { key: 'CLM-139', project: 'checkout-service' },
  { key: 'CLM-137', project: 'clamped-web' },
  { key: 'CLM-134', project: 'api-gateway' },
];
function search(raw) {
  const q = raw.trim().toLowerCase();
  if (q === '') return 'prompt';
  switch (q) {
    case 'payment':
    case 'checkout':
      return ISSUES.filter(i => i.project === 'checkout-service');
    case 'token':
      return ISSUES.filter(i => i.project === 'api-gateway');
    default:
      return [];
  }
}
console.log('');
for (const [input, expected] of [
  ['payment', 2], ['  Payment  ', 2], ['PAYMENT', 2], ['checkout', 2],
  ['token', 1], ['banana', 0], ['', 'prompt'],
]) {
  const r = search(input);
  const got = r === 'prompt' ? 'prompt' : r.length;
  const ok = got === expected;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  search("${input}") -> ${got} (expected ${expected})`);
}

console.log(`\n${fails === 0 ? 'All logic cases pass.' : fails + ' FAILING'}`);
process.exit(fails === 0 ? 0 : 1);
