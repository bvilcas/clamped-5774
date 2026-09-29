// Static audit of a folder of pages: broken links and fragments, duplicate ids,
// controls with no label, heading order, missing alt text, orphan pages,
// and aria references that point at nothing.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
const src = {};
for (const f of files) src[f] = fs.readFileSync(path.join(dir, f), 'utf8');

const problems = [];
const add = (f, msg) => problems.push(`${f}: ${msg}`);

// ids per file
const idsOf = {};
for (const f of files) {
  const ids = [];
  for (const m of src[f].matchAll(/\sid="([^"]+)"/g)) ids.push(m[1]);
  idsOf[f] = ids;
  const seen = new Set(), dup = new Set();
  for (const id of ids) { if (seen.has(id)) dup.add(id); seen.add(id); }
  for (const d of dup) add(f, `duplicate id "${d}"`);
}

const linkedTo = new Set();

for (const f of files) {
  const s = src[f];

  // --- links ---
  // A form's action is a link too: the search box reaches search.html that way.
  // The leading \s keeps this off data-action and friends.
  for (const m of s.matchAll(/\s(?:href|src|action)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(https?:|mailto:|data:|#$)/.test(raw)) continue;
    if (raw === '#') { add(f, 'empty fragment href="#"'); continue; }

    if (raw.startsWith('#')) {
      const frag = raw.slice(1);
      if (!idsOf[f].includes(frag)) add(f, `fragment "#${frag}" has no target on this page`);
      continue;
    }
    const [p, frag] = raw.split('#');
    const query = p.split('?')[0];
    if (!fs.existsSync(path.join(dir, query))) { add(f, `broken link "${raw}"`); continue; }
    if (query.endsWith('.html')) linkedTo.add(query);
    if (frag && query.endsWith('.html') && !idsOf[query].includes(frag)) {
      add(f, `link "${raw}" points at an id that ${query} does not have`);
    }
  }

  // --- every control has a label ---
  const labelFor = new Set([...s.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map(m => m[1]));
  for (const m of s.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const [, tag, attrs] = m;
    const type = (attrs.match(/type="([^"]+)"/) || [])[1] || 'text';
    if (tag === 'input' && ['hidden', 'submit', 'reset', 'button'].includes(type)) continue;
    const id = (attrs.match(/\sid="([^"]+)"/) || [])[1];
    if (!id) { add(f, `<${tag} type="${type}"> has no id, so nothing can label it`); continue; }
    if (!labelFor.has(id) && !/aria-label(ledby)?=/.test(attrs)) {
      add(f, `<${tag} id="${id}"> has no <label for>`);
    }
  }
  // labels pointing at controls that do not exist
  for (const id of labelFor) {
    if (!idsOf[f].includes(id)) add(f, `<label for="${id}"> has no control with that id`);
  }

  // --- a required select must open with a placeholder ---
  // HTML5: the first option of a required single select (no multiple, no
  // size > 1) must have an empty value or no text, so that choosing is
  // deliberate rather than whatever happened to be listed first.
  for (const m of s.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)) {
    const [, attrs, body] = m;
    if (!/\srequired\b/.test(attrs)) continue;
    if (/\smultiple\b/.test(attrs)) continue;
    const size = +(attrs.match(/\ssize="(\d+)"/) || [])[1] || 1;
    if (size > 1) continue;
    const first = body.match(/<option\b([^>]*)>([\s\S]*?)<\/option>/);
    if (!first) continue;
    const value = (first[1].match(/value="([^"]*)"/) || [, null])[1];
    const text = first[2].trim();
    if (value !== '' && text !== '') {
      const id = (attrs.match(/\sid="([^"]+)"/) || [])[1] || '?';
      add(f, `<select id="${id}" required> opens with a real option ("${text}"), not a placeholder`);
    }
  }

  // --- aria references resolve ---
  for (const m of s.matchAll(/aria-(describedby|labelledby)="([^"]+)"/g)) {
    for (const ref of m[2].trim().split(/\s+/)) {
      if (!idsOf[f].includes(ref)) add(f, `aria-${m[1]}="${ref}" points at no id`);
    }
  }

  // --- images have alt ---
  for (const m of s.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\salt=/.test(m[1])) add(f, `<img> with no alt: ${m[1].trim().slice(0, 60)}`);
  }

  // --- headings: exactly one h1, no skipped levels ---
  const levels = [...s.matchAll(/<h([1-6])\b/g)].map(m => +m[1]);
  const h1s = levels.filter(l => l === 1).length;
  if (h1s !== 1) add(f, `has ${h1s} <h1> elements, expected exactly 1`);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) add(f, `heading jumps from h${levels[i - 1]} to h${levels[i]}`);
  }

  // --- landmarks and the skip link ---
  for (const need of ['<main', '<footer', '<nav']) {
    if (!s.includes(need)) add(f, `no ${need}> landmark`);
  }
  if (!s.includes('class="skip-link"')) add(f, 'no skip link');
  if (!/<main[^>]*id="main"/.test(s)) add(f, 'the skip link target id="main" is not on <main>');
  if (!/<html lang="/.test(s)) add(f, 'no lang on <html>');
  if (!/<title>/.test(s)) add(f, 'no <title>');
  if (!/<meta name="description"/.test(s)) add(f, 'no meta description');

  // --- stylesheets exist ---
  for (const m of s.matchAll(/<link[^>]*href="(css\/[^"]+)"/g)) {
    if (!fs.existsSync(path.join(dir, m[1]))) add(f, `missing stylesheet ${m[1]}`);
  }
}

// --- orphans: a page nothing links to ---
// The landing page is the entry point: home.html in submission/, index.html in
// project3/ because the host serves that name.
const unlinkedOnPurpose = new Set(['home.html', 'index.html']);
for (const f of files) {
  if (unlinkedOnPurpose.has(f)) continue;
  if (!linkedTo.has(f)) add(f, 'no other page links to it');
}

// --- CSS classes used in HTML but defined nowhere, and vice versa ---
const css = fs.readFileSync(path.join(dir, 'css', 'style.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')   // comments name selectors they do not use
  .replace(/url\([^)]*\)/g, ' ');      // and the icon payloads are full of dots
const defined = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]));
const used = new Map();
for (const f of files) {
  for (const m of src[f].matchAll(/class="([^"]+)"/g)) {
    for (const c of m[1].trim().split(/\s+/)) {
      if (!used.has(c)) used.set(c, new Set());
      used.get(c).add(f);
    }
  }
}
// Classes the scripts apply at runtime never appear in the markup, so read the
// JS too: addClass('x y'), toggleClass('x'), and '.x' inside a selector.
const jsDir = path.join(dir, 'js');
if (fs.existsSync(jsDir)) {
  for (const jf of fs.readdirSync(jsDir).filter(f => f.endsWith('.js'))) {
    const js = fs.readFileSync(path.join(jsDir, jf), 'utf8');
    const note = c => { if (!used.has(c)) used.set(c, new Set()); used.get(c).add('js/' + jf); };
    for (const m of js.matchAll(/(?:add|remove|toggle|has)Class\(\s*'([^']+)'/g)) {
      for (const c of m[1].trim().split(/\s+/)) note(c);
    }
    for (const m of js.matchAll(/'\.([a-zA-Z][\w-]*)/g)) note(m[1]);
  }
}
for (const [c, where] of used) {
  if (!defined.has(c)) problems.push(`css: class "${c}" used in ${[...where].join(', ')} but not in any stylesheet`);
}
// .severity-low completes a scale the report form offers and the backend
// stores; no issue in the sample data happens to be LOW.
const ignoreUnused = new Set(['container', 'severity-low']);
for (const c of defined) {
  if (!used.has(c) && !ignoreUnused.has(c)) problems.push(`css: ".${c}" defined but never used`);
}

console.log(`${files.length} pages: ${files.join(' ')}\n`);
if (problems.length === 0) console.log('No problems found.');
else { console.log(`${problems.length} problem(s):`); for (const p of problems) console.log('  ' + p); }
