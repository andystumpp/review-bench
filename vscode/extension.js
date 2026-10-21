// Review Bench in VS Code: the Review Bench page (engine/app.html) in a panel, with the open workspace as its code
// and the Copilot you are signed in to as its AI. Prompts, check and page all come from the engine folder.
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const SKIP = '**/{node_modules,.git,.svn,build,dist,out,DerivedData,Pods,Carthage,.build,.swiftpm,vendor,__pycache__,.next,.nuxt,coverage,.venv,venv,target,bin,obj,.idea,.vscode,.gradle,.loupe}/**';
const MAX_FILE = 400000, MAX_FILES = 20000;
// families tried in this order when the setting is empty; otherwise the model with the most room
const PREFER = ['claude-sonnet', 'gpt-5', 'gpt-4.1', 'gpt-4o'];

let panel = null;

function activate(ctx) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('reviewBench.open', () => open(ctx)),
    vscode.commands.registerCommand('reviewBench.pickModel', pickModelSetting));
}

const engineDir = ctx => path.join(ctx.extensionPath, 'engine');
const inline = ctx => import(pathToFileURL(path.join(engineDir(ctx), 'inline.mjs')).href);
const look = () => vscode.workspace.getConfiguration('reviewBench').get('look') || 'plain';

async function open(ctx) {
  const root = await pickFolder();
  if (!root) return;
  if (panel && same(panel.root, root)) return panel.reveal();
  panel?.dispose();
  const { withEngine, withLook } = await inline(ctx);
  const many = vscode.workspace.workspaceFolders.length > 1;
  panel = vscode.window.createWebviewPanel('reviewBench', many ? `Review Bench: ${root.name}` : 'Review Bench', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
  const me = panel;
  me.root = root; me.running = new Map(); me.gone = false;
  me.onDidDispose(() => { me.gone = true; for (const c of me.running.values()) c.cancel(); me.running.clear(); if (panel === me) panel = null; });
  const app = withLook(withEngine(fs.readFileSync(path.join(engineDir(ctx), 'app.html'), 'utf8'), engineDir(ctx)), look(), engineDir(ctx));
  me.webview.html = withHost(app, ctx.workspaceState.get(stateKey(root), {}));
  me.webview.onDidReceiveMessage(m => onMessage(ctx, me, m));
}

// one folder: that one; several: ask which (the open one first); none: say so
async function pickFolder() {
  const all = vscode.workspace.workspaceFolders || [];
  if (!all.length) return void vscode.window.showInformationMessage('Review Bench reads the open folder. Open a folder first.');
  if (all.length === 1) return all[0];
  const items = all.map(f => ({ label: f.name, description: panel && same(panel.root, f) ? 'open now' : '', detail: f.uri.fsPath, f }));
  if (panel) items.sort((a, b) => same(b.f, panel.root) - same(a.f, panel.root));
  return (await vscode.window.showQuickPick(items, { placeHolder: 'Which folder should Review Bench review?' }))?.f;
}
const same = (a, b) => a.uri.toString() === b.uri.toString();
// each folder keeps its own progress
const stateKey = root => 'rb:' + root.uri.toString();

// what the page needs from its host, set before the page's own scripts run (see RB_HOST in the app)
function withHost(html, state) {
  const host = `<script>
(() => {
  const vs = acquireVsCodeApi(), wait = {}, state = ${JSON.stringify(state).replace(/</g, '\\u003c')};
  let n = 0, files;
  window.RB_HOST = 'vscode';
  window.RB_AI = { json(prompt, o = {}) { return new Promise((ok, no) => {
    const id = ++n; wait[id] = { ok, no, onText: o.onText };
    if (o.signal) { if (o.signal.aborted) return no({ code: 'cancelled' }); o.signal.addEventListener('abort', () => vs.postMessage({ type: 'ai-stop', id })); }
    vs.postMessage({ type: 'ai', id, prompt }); }); } };
  window.RB_STORE = { get: (k, d) => (k in state && state[k] != null ? state[k] : d), set: (k, v) => { state[k] = v; vs.postMessage({ type: 'store', k, v }); } };
  window.RB_FILES = new Promise((ok, no) => (files = { ok, no }));
  window.RB_SAVE = report => vs.postMessage({ type: 'save', report });
  addEventListener('message', e => { const m = e.data || {}, w = wait[m.id];
    if (m.type === 'files') files.ok(m); else if (m.type === 'files-error') files.no(m);
    else if (m.type === 'ai-text') w?.onText?.({ text: m.text });
    else if (m.type === 'ai-done') { delete wait[m.id]; w?.ok(m.json); }
    else if (m.type === 'ai-error') { delete wait[m.id]; w?.no({ code: m.code, message: m.message }); } });
  vs.postMessage({ type: 'ready' });
})();
</script>
`;
  const at = html.indexOf('<script');
  return html.slice(0, at) + host + html.slice(at);
}

async function onMessage(ctx, me, m) {
  const root = me.root, running = me.running, post = x => me.gone || me.webview.postMessage(x);
  if (m.type === 'ready') {
    try { post({ type: 'files', ...(await readWorkspace(root)) }); }
    catch (e) { post({ type: 'files-error', message: String(e?.message || e) }); }
  } else if (m.type === 'store') {
    const k = stateKey(root), all = ctx.workspaceState.get(k, {}); all[m.k] = m.v; await ctx.workspaceState.update(k, all);
  } else if (m.type === 'ai') {
    const cts = new vscode.CancellationTokenSource(); running.set(m.id, cts);
    try { post({ type: 'ai-done', id: m.id, json: await askJson(m.prompt, cts.token, text => post({ type: 'ai-text', id: m.id, text })) }); }
    catch (e) { post({ type: 'ai-error', id: m.id, code: e.code || 'error', message: String(e?.message || '') }); }
    finally { running.delete(m.id); cts.dispose(); }
  } else if (m.type === 'ai-stop') running.get(m.id)?.cancel();
  else if (m.type === 'save') save(ctx, root, m.report);
}

// the workspace as the page's folder: every text file under 400 KB, paths under the folder's name like a picked folder
async function readWorkspace(root) {
  const uris = await vscode.workspace.findFiles(new vscode.RelativePattern(root, '**/*'), SKIP, MAX_FILES);
  const label = root.name, entries = [];
  for (let i = 0; i < uris.length; i += 64) await Promise.all(uris.slice(i, i + 64).map(async u => {
    const { size } = await vscode.workspace.fs.stat(u); if (size > MAX_FILE) return;
    const buf = await vscode.workspace.fs.readFile(u); if (buf.includes(0)) return;
    entries.push({ path: label + '/' + path.relative(root.uri.fsPath, u.fsPath).split(path.sep).join('/'), size, text: Buffer.from(buf).toString('utf8') });
  }));
  if (!entries.length) throw new Error('No files in this folder.');
  return { entries, label };
}

// ---------- Copilot ----------
const fail = (code, message = '') => Object.assign(new Error(message || code), { code });
async function model() {
  const want = vscode.workspace.getConfiguration('reviewBench').get('model');
  const all = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  if (!all.length) throw fail('sampling_disabled', 'No Copilot model is available. Sign in to GitHub Copilot in VS Code.');
  if (want) return all.find(m => m.family === want || m.id === want) || (() => { throw fail('sampling_disabled', `The Copilot model "${want}" is not available. Run "Review Bench: Choose the model".`); })();
  for (const p of PREFER) { const m = all.filter(m => m.family.startsWith(p)).sort((a, b) => b.maxInputTokens - a.maxInputTokens)[0]; if (m) return m; }
  return [...all].sort((a, b) => b.maxInputTokens - a.maxInputTokens)[0];
}
async function askJson(prompt, token, onText) {
  const m = await model();
  if (m.maxInputTokens && await m.countTokens(prompt, token) > m.maxInputTokens) throw fail('prompt_too_large');
  let res, text = '', last = 0;
  try {
    res = await m.sendRequest([vscode.LanguageModelChatMessage.User(prompt)], { justification: 'Review Bench reads the code of this workspace with Copilot to show the decisions it makes.' }, token);
    for await (const t of res.text) { text += t; if (Date.now() - last > 250) { last = Date.now(); onText(text); } }
  } catch (e) {
    if (token.isCancellationRequested) throw fail('cancelled');
    const c = e instanceof vscode.LanguageModelError ? e.code : '';
    throw fail(c === 'NoPermissions' ? 'not_granted' : c === 'Blocked' ? 'rate_limited' : c === 'NotFound' ? 'sampling_disabled'
      : /context|too long|too large|token limit/i.test(e?.message || '') ? 'prompt_too_large' : 'error', e?.message);
  }
  if (token.isCancellationRequested) throw fail('cancelled');
  onText(text);
  return parseJson(text);
}
// the answer's JSON, also when the model wraps it in a code fence or a sentence
function parseJson(text) {
  const t = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) try { return JSON.parse(t.slice(a, b + 1)); } catch {}
  throw fail('invalid_json');
}

async function pickModelSetting() {
  const all = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  if (!all.length) return vscode.window.showInformationMessage('No Copilot model is available. Sign in to GitHub Copilot in VS Code.');
  const pick = await vscode.window.showQuickPick([{ label: 'Let Review Bench pick', family: '' },
    ...all.map(m => ({ label: m.name, description: m.family, detail: `reads up to ${Math.round(m.maxInputTokens / 1000)}k tokens at once`, family: m.family }))],
    { placeHolder: 'Which Copilot model reads your code' });
  if (pick) await vscode.workspace.getConfiguration('reviewBench').update('model', pick.family, vscode.ConfigurationTarget.Global);
}

// ---------- Save report: the same report.html the daily GitHub Action publishes ----------
async function save(ctx, root, report) {
  const { reportPage } = await inline(ctx);
  const html = reportPage(report, look(), engineDir(ctx));
  if (!html) return vscode.window.showErrorMessage('Review Bench could not build the report page.');
  const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.joinPath(root.uri, 'review-bench-report.html'), filters: { 'Web page': ['html'] } });
  if (!uri) return;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(html, 'utf8'));
  if (await vscode.window.showInformationMessage(`Saved ${path.basename(uri.fsPath)}.`, 'Open in browser') === 'Open in browser') vscode.env.openExternal(uri);
}

function deactivate() {}
module.exports = { activate, deactivate, parseJson };
