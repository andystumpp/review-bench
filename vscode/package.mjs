// Packages the extension: copies the engine in next to extension.js, then builds review-bench.vsix with vsce.
//   node vscode/package.mjs   (needs npx and network the first time, for @vscode/vsce)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), engine = path.join(here, '..', 'engine'), to = path.join(here, 'engine');
fs.rmSync(to, { recursive: true, force: true }); fs.mkdirSync(to);
// everything the panel and Save report use; run.md and assemble.mjs belong to the GitHub Action
for (const f of fs.readdirSync(engine)) if (!['run.md', 'assemble.mjs'].includes(f)) fs.copyFileSync(path.join(engine, f), path.join(to, f));
fs.copyFileSync(path.join(here, '..', 'LICENSE'), path.join(here, 'LICENSE'));
execSync('npx --yes @vscode/vsce@3 package --no-dependencies --allow-missing-repository -o review-bench.vsix', { cwd: here, stdio: 'inherit' });
