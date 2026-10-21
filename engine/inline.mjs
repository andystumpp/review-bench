// Builds the engine into the app page: app.html leaves a slot, and every host fills it from this folder,
// so the page always carries the prompts and the check that sit next to it. Node only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS = ['map', 'trace', 'principles', 'search', 'whatif', 'ask', 'fix', 'changes'];
const SLOT = /\/\*@engine:[^*]*\*\/\n/;

export function withEngine(html, dir = HERE) {
  if (!SLOT.test(html)) return null;
  const prompts = Object.fromEntries(PROMPTS.map(k => [k, fs.readFileSync(path.join(dir, k + '.md'), 'utf8').trim()]));
  const core = fs.readFileSync(path.join(dir, 'core.mjs'), 'utf8').replace(/^export /gm, '');
  const block = `// ---------- the engine (built in from engine/; edit it there) ----------\nconst ENGINE = { prompts: ${JSON.stringify(prompts, null, 1)} };\n${core}`
    .replace(/<\/(script)/gi, '<\\/$1');
  return html.replace(SLOT, () => block + '\n');
}

// look "plain" is the quiet one for work: no logo or glow, system font, one accent, the name only in the footer
export function withLook(html, look, dir = HERE) {
  if (look !== 'plain') return html;
  return html.replace(/<link rel="(preconnect|stylesheet)" href="https:\/\/fonts\.googleapis\.com[^>]*>\n/g, '')
    .replace('</style>', fs.readFileSync(path.join(dir, 'plain.css'), 'utf8') + '</style>')
    .replace('<title>', '<script>document.documentElement.dataset.look = "plain"; document.documentElement.dataset.theme = "light";</script>\n<title>')
    + '<footer class="rb-foot">Review Bench</footer>\n';
}

// report.html: the app with one report built in, opened where the viewer would otherwise boot
const BOOT = '// boot: where the viewer left off';
export function reportPage(report, look, dir = HERE) {
  const app = path.join(dir, 'app.html');
  if (!fs.existsSync(app)) return null;
  let h = withEngine(fs.readFileSync(app, 'utf8'), dir);
  if (!h || !h.includes(BOOT)) return null;
  const json = JSON.stringify(report).replace(/</g, '\\u003c');
  h = h.replace(BOOT, `const BAKED = ${json};\nif (BAKED) { openReport({ text: async () => JSON.stringify(BAKED) }); } else {\n${BOOT}`)
    .replace(/\} else render\(\);\n\}\)\(\);\n<\/script>\s*$/, '} else render();\n}\n})();\n</script>\n');
  return withLook(h, look, dir);
}
