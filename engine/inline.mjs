// Builds the engine into the app page: app.html leaves a slot, and every host fills it from this folder,
// so the page always carries the prompts and the check that sit next to it. Node only.
import fs from 'node:fs';
import path from 'node:path';

const PROMPTS = ['map', 'trace', 'principles', 'search', 'whatif', 'ask', 'fix', 'changes'];
const SLOT = /\/\*@engine:[^*]*\*\/\n/;

export function withEngine(html, dir = path.dirname(new URL(import.meta.url).pathname)) {
  if (!SLOT.test(html)) return null;
  const prompts = Object.fromEntries(PROMPTS.map(k => [k, fs.readFileSync(path.join(dir, k + '.md'), 'utf8').trim()]));
  const core = fs.readFileSync(path.join(dir, 'core.mjs'), 'utf8').replace(/^export /gm, '');
  const block = `// ---------- the engine (built in from engine/; edit it there) ----------\nconst ENGINE = { prompts: ${JSON.stringify(prompts, null, 1)} };\n${core}`
    .replace(/<\/(script)/gi, '<\\/$1');
  return html.replace(SLOT, () => block + '\n');
}
