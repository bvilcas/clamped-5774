// Nesting check: every non-void element opens and closes in order.
const fs = require('fs');
const path = require('path');
const void_ = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const dir = process.argv[2];
let bad = 0;

for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort()) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  const errs = [];
  for (const m of s.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, close, tag, attrs, self] = m;
    const t = tag.toLowerCase();
    if (t === '!doctype' || void_.has(t) || self === '/') continue;
    if (!close) stack.push(t);
    else {
      const top = stack.pop();
      if (top !== t) errs.push(`</${t}> closes <${top}>`);
    }
  }
  if (stack.length) errs.push(`left open: ${stack.join(' > ')}`);
  if (errs.length) { bad++; console.log(`${f}:`); errs.forEach(e => console.log('  ' + e)); }
}
console.log(bad === 0 ? 'All pages nest correctly.' : `${bad} page(s) with nesting problems.`);
