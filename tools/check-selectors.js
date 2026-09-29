// Every #id the scripts reach for must exist in at least one page, and every
// data-attribute they match must be on an element somewhere. A syntax check
// will not catch a selector that simply finds nothing, which is the usual way
// this kind of code fails silently.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const pages = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
const html = pages.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');

const jsDir = path.join(dir, 'js');
const scripts = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const problems = [];

// Ids the scripts create at runtime are legitimate targets even though no page
// contains them. Collect those first, and note any that collide with markup.
const created = new Set();
for (const f of scripts) {
  const js = fs.readFileSync(path.join(jsDir, f), 'utf8');
  for (const m of js.matchAll(/attr\(\s*'id',\s*'([\w-]+)'/g)) {
    if (ids.has(m[1])) problems.push(`${f}: creates id "${m[1]}" but the markup already has one`);
    created.add(m[1]);
  }
}
const known = id => ids.has(id) || created.has(id);

for (const f of scripts) {
  const js = fs.readFileSync(path.join(jsDir, f), 'utf8');

  // $('#thing') and $('#thing ...')
  for (const m of js.matchAll(/\$\(\s*'#([\w-]+)/g)) {
    if (!known(m[1])) problems.push(`${f}: $('#${m[1]}') matches no element in any page`);
  }
  // .find('#thing'), .siblings('#thing'), .children('#thing')
  for (const m of js.matchAll(/\.(?:find|siblings|children|closest)\(\s*'#([\w-]+)/g)) {
    if (!known(m[1])) problems.push(`${f}: '#${m[1]}' matches no element in any page`);
  }
  // Attribute selectors like [data-action="advance"]. Ones built by string
  // concatenation are skipped; their value is only known at runtime.
  for (const m of js.matchAll(/\[([a-z-]+)="([^"]+)"\]/g)) {
    const [, attr, value] = m;
    if (/['+]/.test(value)) continue;
    if (!new RegExp(`${attr}="${value}"`).test(html) && !js.includes(`'${attr}', '${value}'`)) {
      problems.push(`${f}: [${attr}="${value}"] is neither in the markup nor set by the script`);
    }
  }
}

// Every page that loads the script should load jQuery first.
for (const f of pages) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  const own = s.indexOf('js/main.js"');
  const jq = s.indexOf('jquery');
  if (own === -1) problems.push(`${f}: does not load js/main.js`);
  else if (jq === -1) problems.push(`${f}: loads main.js without jQuery`);
  else if (jq > own) problems.push(`${f}: loads jQuery after main.js`);
}

console.log(`${pages.length} pages, ${scripts.length} script(s), ${ids.size} ids in markup`);
if (problems.length === 0) console.log('Every selector resolves.');
else { console.log(`${problems.length} problem(s):`); problems.forEach(p => console.log('  ' + p)); }
