// Builds the claude.ai version of Review Bench: engine/app.html with the engine built in and the Restock demo added.
// The demo is a separate file kept outside this repo.
//   node tools/claude-ai.mjs [--demo ../loupe/demo.js] [--out dist/review-bench.html]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const demo = path.resolve(arg('--demo', path.join(root, '../loupe/demo.js')));
const out = path.resolve(arg('--out', path.join(root, 'dist/review-bench.html')));
const { withEngine } = await import(path.join(root, 'engine/inline.mjs'));

const page = withEngine(fs.readFileSync(path.join(root, 'engine/app.html'), 'utf8'));
if (!page) throw new Error('engine/app.html has no /*@engine*/ slot');
const SLOT = /\/\/ ---------- demo data: none here[^\n]*\nconst DEMO = null;\n/;
if (!SLOT.test(page)) throw new Error('engine/app.html has no demo placeholder');
const built = page.replace(SLOT, () => fs.readFileSync(demo, 'utf8'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, built);
console.log(`${out}: ${(built.length / 1024).toFixed(0)} KB`);
