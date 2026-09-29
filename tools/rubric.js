// Check the submission folder against every checkable line of the Project 2 spec.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const pages = ['home.html', 'dashboard.html', 'list.html', 'detail.html', 'add.html'];
const src = {};
for (const p of pages) src[p] = fs.readFileSync(path.join(dir, p), 'utf8');
const css = fs.readFileSync(path.join(dir, 'css', 'style.css'), 'utf8');
const all = pages.map(p => src[p]).join('\n');

const rows = [];
const check = (req, ok, detail) => rows.push([ok ? 'PASS' : 'FAIL', req, detail]);

// ---- content ----
check('HTML5 doctype on every page',
  pages.every(p => /^<!DOCTYPE html>/i.test(src[p].trim())), '5/5');
check('at least 5 HTML pages', pages.length >= 5, `${pages.length} pages`);
const elements = new Set([...all.matchAll(/<([a-z][a-z0-9]*)[\s>]/g)].map(m => m[1]));
check('at least 5 different HTML elements', elements.size >= 5, `${elements.size} distinct`);
const imgs = new Set([...all.matchAll(/src="(images\/[^"]+)"/g)].map(m => m[1]));
check('at least 2 images', imgs.size >= 2, `${imgs.size} images`);
check('no Lorem ipsum', !/lorem\s+ipsum/i.test(all), '');
const forms = (all.match(/<form\b/g) || []).length;
const inputTypes = new Set([...all.matchAll(/<input[^>]*type="([a-z]+)"/g)].map(m => m[1]));
const buttons = (all.match(/<button\b/g) || []).length;
check('form + 2 input types + a button', forms >= 1 && inputTypes.size >= 2 && buttons >= 1,
  `${forms} forms, ${inputTypes.size} input types, ${buttons} buttons`);
check('primary navigation menu',
  pages.every(p => /<nav[\s>][\s\S]*?<ul[\s\S]*?<a /.test(src[p])),
  '5/5 have a nav holding a list of links');
// every page reachable from every other
const links = {};
for (const p of pages) links[p] = new Set([...src[p].matchAll(/href="([a-z0-9]+\.html)"/g)].map(m => m[1]));
const unreachable = pages.filter(t => !pages.some(f => f !== t && links[f].has(t)));
check('all pages hyperlinked to each other', unreachable.length === 0,
  unreachable.length ? 'orphan: ' + unreachable.join(', ') : 'every page linked from another');
check('images credited in comments',
  fs.readdirSync(path.join(dir, 'images')).every(f =>
    /\.(svg|png)$/.test(f) &&
    (f.endsWith('.png') ? /Image 1 of 6/.test(all)
      : /Original artwork created by/.test(fs.readFileSync(path.join(dir, 'images', f), 'utf8')))),
  'SVGs carry credit comments; PNG credited in HTML');

// ---- accessibility ----
for (const tag of ['header', 'nav', 'main', 'footer']) {
  check(`landmark <${tag}> on every page`,
    pages.every(p => new RegExp(`<${tag}[\\s>]`).test(src[p])), '5/5');
}
check('exactly one <main> per page',
  pages.every(p => (src[p].match(/<main[\s>]/g) || []).length === 1), '5/5');
check('exactly one <h1> per page',
  pages.every(p => (src[p].match(/<h1[\s>]/g) || []).length === 1), '5/5');
let skipped = [];
for (const p of pages) {
  const lv = [...src[p].matchAll(/<h([1-6])[\s>]/g)].map(m => +m[1]);
  for (let i = 1; i < lv.length; i++) if (lv[i] > lv[i - 1] + 1) skipped.push(p);
}
check('no skipped heading levels', skipped.length === 0, skipped.join(', ') || 'h1->h2->h3 only');
const noAlt = [...all.matchAll(/<img\b([^>]*)>/g)].filter(m => !/\salt=/.test(m[1]));
check('alt on every image', noAlt.length === 0, `${(all.match(/<img\b/g) || []).length} images, all have alt`);
check('decorative images use alt=""', /alt=""/.test(all), 'present');

// ---- presentation ----
check('stylesheet linked from all pages',
  pages.every(p => /<link[^>]*href="css\/style\.css"/.test(src[p])), '5/5');
check('no inline or embedded styles',
  !/\sstyle="/.test(all) && !/<style[\s>]/.test(all), 'zero');
check('no front-end framework',
  !/bootstrap|tailwind|foundation|bulma|materialize/i.test(all + css), 'none referenced');
// Roboto Mono is declared once on the --mono custom property and read through
// var(--mono), so a plain font-family scan misses it.
const families = new Set([...css.matchAll(/(?:font-family:|--mono:)\s*"([^"]+)"/g)].map(m => m[1]));
check('two different font families', families.size >= 2, [...families].join(', '));
// element (non-class) selectors carrying declarations
const elementSelectors = new Set();
for (const m of css.matchAll(/(^|\})\s*([^{}@]+)\{/g)) {
  for (const sel of m[2].split(',')) {
    const s = sel.trim();
    if (!s || s.startsWith('.') || s.startsWith(':') || s.startsWith('*') || s.startsWith('@')) continue;
    const first = s.match(/^([a-z][a-z0-9]*)/);
    if (first && !s.includes('.')) elementSelectors.add(first[1]);
  }
}
check('unique styles on 5+ different HTML elements', elementSelectors.size >= 5,
  `${elementSelectors.size}: ${[...elementSelectors].slice(0, 12).join(' ')}`);
const mq = [...css.matchAll(/@media[^{]*\(([^)]+)\)/g)].map(m => m[1].trim());
check('media queries (responsive)', mq.length >= 1, mq.join(' | '));
check('fluid layouts', /minmax\(|%;|max-width:\s*\d+(ch|rem|px)/.test(css), 'minmax(), % widths, max-width measures');
check('flexible media', /img\s*\{[^}]*max-width:\s*100%/.test(css), 'img { max-width: 100% }');
check('CSS: inheritance', /body\s*\{[^}]*font-family[^}]*\}/s.test(css), 'font/colour/line-height set on body');
// The taught combinators, rather than one particular attribute selector.
check('CSS: selectors, chaining, overrides',
  /\.[\w-]+ \.[\w-]+/.test(css) && / > /.test(css) && / \+ /.test(css),
  'descendant, child (>) and sibling (+) selectors');
check('CSS: box model', /box-sizing:\s*border-box/.test(css), 'global border-box');
check('CSS: page layout', /display:\s*grid/.test(css) && /display:\s*flex/.test(css), 'grid + flexbox');
check('CSS: block vs inline / float-clear',
  /float:\s*left/.test(css) && /clear:\s*both/.test(css), 'floated legend cleared');
check('CSS: positioning',
  /position:\s*sticky/.test(css) && /position:\s*fixed/.test(css) && /position:\s*absolute/.test(css),
  'sticky + fixed + absolute');

const w = Math.max(...rows.map(r => r[1].length));
let fails = 0;
for (const [ok, req, detail] of rows) {
  if (ok === 'FAIL') fails++;
  console.log(`${ok}  ${req.padEnd(w)}  ${detail}`);
}
console.log(`\n${rows.length - fails}/${rows.length} checkable requirements pass`);
