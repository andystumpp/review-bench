#!/usr/bin/env node
// Review Bench daily report: the deterministic parts around the agent run.
//   plan   compare the code with last run's report; decide what to map and trace
//   check  validate what the agent wrote in .loupe/work
//   build  merge last run's report with today's work into .loupe/report/ (report.json, report.html, report.md)
//   progress  turn Claude Code's stream-json output into one log line per step, and the cost
// No dependencies. Paths are relative to the repo root (the working directory).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const WORK = '.loupe/work', PREV = '.loupe/prev/report.json', OUT = '.loupe/report';
const SKIP = /(^|\/)(\.loupe|\.github|node_modules|build[^/]*|DerivedData|dist)\/|\.(png|jpe?g|gif|webp|ico|icns|pdf|zip|ttf|otf|woff2?|mp4|mov|lock|pbxproj|xcuserstate|entitlements|plist|xcassets)$|(^|\/)(package-lock\.json|Contents\.json)$/i;

const read = p => fs.readFileSync(p, 'utf8');
const readJson = p => { try { return JSON.parse(read(p)); } catch { return null; } };
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
// same fingerprint as the prototype's, so a report and an opened folder agree on what changed
const fhash = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + '.' + t.length; };
const norm = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = x => String(x || '').trim().split(/\s+/).filter(Boolean).length;
const sh = c => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

function codeFiles() {
  const out = {};
  for (const p of sh('git ls-files').split('\n').filter(Boolean)) {
    if (SKIP.test(p)) continue;
    let t; try { t = read(p); } catch { continue; }
    if (t.includes('\u0000')) continue;
    out[p] = fhash(t);
  }
  return out;
}
const decisions = t => (t?.nodes || []).filter(n => n.kind === 'decision');
// words that only exist in code: never in what a visible row says (principles.md, "Whose words")
const CODE_WORDS = /\b(model calls?|models?|llm|guards?|handlers?|payloads?|null|callbacks?|async|await|cache[sd]?|pars(e|es|ed|ing)|fetch(es|ed|ing)?)\b/i;
const CODE_NAMES = /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b|\b[a-z]+[A-Z][A-Za-z0-9]*\b|\b[45]0\d\b|`/;
const codeTalk = x => (String(x || '').match(CODE_WORDS) || String(x || '').match(CODE_NAMES) || [])[0];

// ---------- plan ----------
function plan() {
  // FRESH=1 (the workflow's "start over" switch) traces everything as if there were no report before
  const fresh = process.env.FRESH === 'true', prev = fresh ? null : readJson(PREV), files = codeFiles(), why = [];
  let remap = false, retrace = [];
  if (!prev?.map) { remap = true; retrace = 'all'; why.push(fresh ? 'Starting over: everything is traced again.' : 'First run: no report from before.'); }
  else {
    const was = prev.files || {};
    const added = Object.keys(files).filter(p => !(p in was)), removed = Object.keys(was).filter(p => !(p in files));
    const changed = Object.keys(files).filter(p => p in was && was[p] !== files[p]);
    if (added.length || removed.length) {
      remap = true; retrace = 'all';
      why.push(`Files were added or removed, so the map is drawn again. Added: ${added.join(', ') || 'none'}. Removed: ${removed.join(', ') || 'none'}.`);
    }
    if (changed.length) why.push(`Changed since last run: ${changed.join(', ')}.`);
    if (!remap) for (const f of prev.map.flows || []) {
      const t = prev.traces?.[f.id], r = t?.read || {};
      if (!t || !Object.keys(r).length) { retrace.push(f.id); why.push(`${f.id}: not traced yet.`); continue; }
      const hit = Object.keys(r).filter(p => files[p] !== r[p]);
      if (hit.length) { retrace.push(f.id); why.push(`${f.id}: its code changed (${hit.join(', ')}).`); }
    }
  }
  const run = remap || retrace === 'all' || retrace.length > 0;
  fs.rmSync(WORK, { recursive: true, force: true });
  write(`${WORK}/plan.json`, JSON.stringify({ remap, retrace, run, fresh }, null, 2) + '\n');
  for (const [id, t] of Object.entries(prev?.traces || {})) {
    const ds = decisions(t); if (!ds.length) continue;
    write(`${WORK}/prev/${id}.txt`, ds.map(n => `${n.id} | ${n.d ?? ''} | ${n.q} | ${n.a} | ${n.file || ''}${n.lines ? ':' + n.lines.join('-') : ''}`).join('\n') +
      `\nSections, in order: ${(t.nodes || []).filter(n => n.kind === 'section').map(n => n.q).join(' / ')}\n`);
  }
  write(`${WORK}/context.md`, `# Why this run\n\n${why.map(x => '- ' + x).join('\n') || '- Nothing changed.'}\n\n` +
    (prev?.map ? `# Map from the last run (${prev.at})\n\nUse these component ids and concept names. ${remap ? 'You are drawing a new map; keep flow ids and titles for flows that are still there.' : 'This map stands for this run.'}\n\n\`\`\`json\n${JSON.stringify(prev.map, null, 1)}\n\`\`\`\n` : ''));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
  console.log(run ? `Plan: ${remap ? 'draw the map, ' : ''}trace ${retrace === 'all' ? 'every journey' : retrace.join(', ')}.` : 'Plan: nothing changed since the last report. No run needed.');
}

// ---------- check ----------
function check() {
  const pl = readJson(`${WORK}/plan.json`), prev = readJson(PREV), errs = [], warns = [];
  if (!pl) { console.error('No plan. Run "assemble.mjs plan" first.'); process.exit(1); }
  const map = pl.remap ? readJson(`${WORK}/map.json`) : prev?.map;
  if (!map) errs.push(pl.remap ? `${WORK}/map.json is missing or is not valid JSON.` : 'No map from the last run.');
  else {
    const comps = new Set((map.components || []).map(c => c.id));
    if (!comps.size) errs.push('map.json: no components.');
    if (!(map.flows || []).length) errs.push('map.json: no flows.');
    for (const c of map.components || []) for (const p of c.files || []) if (!fs.existsSync(p)) warns.push(`map.json: component ${c.id} lists ${p}, which does not exist.`);
    const tabs = (map.flows || []).map(f => norm(f.tab));
    for (const f of map.flows || []) {
      if (!/^[\w-]+$/.test(f.id || '')) errs.push(`map.json: flow id "${f.id}" must be letters, digits, - or _.`);
      if (!f.tab) errs.push(`map.json: flow ${f.id} has no tab.`);
      else if (tabs.filter(x => x === norm(f.tab)).length > 1) errs.push(`map.json: flow ${f.id} has the tab "${f.tab}", which another journey uses too. Every tab names its own journey.`);
      for (const s of f.path || []) if (!comps.has(s[0])) errs.push(`map.json: flow ${f.id} walks through "${s[0]}", which is not a component id.`);
    }
    const ids = pl.retrace === 'all' ? (map.flows || []).map(f => f.id) : pl.retrace;
    for (const id of ids) {
      const p = `${WORK}/flows/${id}.json`, t = readJson(p);
      if (!t) { errs.push(`${p} is missing or is not valid JSON.`); continue; }
      const ds = decisions(t), seen = new Set();
      if (!ds.length) errs.push(`${p}: no decisions.`);
      if (!(t.nodes || []).some(n => n.kind === 'section')) errs.push(`${p}: no sections.`);
      for (const n of (t.nodes || []).filter(n => n.kind === 'section')) { const w = codeTalk(n.q);
        if (w) errs.push(`${p} section "${n.q}": "${w}" is a word from the code. Name the section after what the person does.`); }
      for (const n of ds) {
        const at = `${p} decision "${n.id || n.q}"`;
        if (!n.id) errs.push(`${at}: no id.`); else if (seen.has(n.id)) errs.push(`${at}: id used twice.`); seen.add(n.id);
        if (!n.q) errs.push(`${at}: no question.`);
        if (!Number.isInteger(n.d) || n.d < 0 || n.d > 4) errs.push(`${at}: d must be 0 to 4.`);
        if (n.seen !== 'visible' && n.seen !== 'plumbing') errs.push(`${at}: seen must be "visible" or "plumbing".`);
        if (!n.file || !fs.existsSync(n.file)) errs.push(`${at}: file "${n.file}" does not exist.`);
        if (!Array.isArray(n.lines) || n.lines.length !== 2) errs.push(`${at}: lines must be [start, end].`);
        if (n.comp && !comps.has(n.comp)) warns.push(`${at}: comp "${n.comp}" is not a component id.`);
        // past the limit with some slack is an error; just past it is a warning
        if (words(n.q) > 6) (words(n.q) > 8 ? errs : warns).push(`${at}: question has ${words(n.q)} words (at most 6). Move the detail into "note".`);
        if (words(n.a) > 8) (words(n.a) > 11 ? errs : warns).push(`${at}: answer has ${words(n.a)} words (at most 8). Move the detail into "note".`);
        if (n.seen === 'visible') for (const k of ['q', 'a', 'note', 'does', 'notice']) { const w = codeTalk(n[k]);
          if (w) errs.push(`${at}: "${w}" in ${k} is a word from the code. Say what the person sees instead, or mark the row "plumbing" if they never see it.`); }
        if (n.flag && !n.notice) warns.push(`${at}: flagged but has no "notice".`);
      }
      const plumb = ds.filter(n => n.seen === 'plumbing').length;
      if (ds.length >= 8 && !plumb) warns.push(`${p}: no decision is marked "plumbing"; a typical tree has a third to a half.`);
      if (!(t.read || []).length) errs.push(`${p}: "read" lists no files.`);
      for (const r of t.read || []) if (!fs.existsSync(r)) errs.push(`${p}: read lists "${r}", which does not exist.`);
    }
  }
  for (const w of warns) console.log('warning: ' + w);
  for (const e of errs) console.log('error: ' + e);
  if (errs.length) { console.log(`\n${errs.length} errors. Fix them and run check again.`); process.exit(1); }
  console.log(`Check passed${warns.length ? ` with ${warns.length} warnings (fix them if you can)` : ''}.`);
}

// ---------- build ----------
function compare(t, old, at) {
  const used = new Set(), was = decisions(old);
  for (const n of decisions(t)) {
    const o = was.find(x => !used.has(x.id) && x.id === n.id) || was.find(x => !used.has(x.id) && norm(x.q) === norm(n.q) && (x.file || '') === (n.file || ''));
    if (!o) { n.since = 'new'; continue; }
    used.add(o.id);
    // same decision, different answer, but the agent forgot to say so
    if (!n.change && norm(o.a) !== norm(n.a)) n.change = `was "${o.a}"`;
    n.since = n.change ? 'changed' : '';
  }
  t.diff = { at, gone: was.filter(x => !used.has(x.id)).map(x => ({ q: x.q, a: x.a })), kept: 0 };
}
function build() {
  const pl = readJson(`${WORK}/plan.json`), prev = pl?.fresh ? null : readJson(PREV), files = codeFiles(), notes = [];
  // nothing was traced: last run's report stands; only the page around it is drawn again
  if (pl && !pl.run && prev) return publish(prev);
  const map = (pl?.remap ? readJson(`${WORK}/map.json`) : null) || prev?.map;
  if (!map) { console.error('No map to build a report from.'); process.exit(1); }
  const ids = new Set(pl?.retrace === 'all' ? map.flows.map(f => f.id) : pl?.retrace || []), traces = {};
  for (const f of map.flows) {
    const old = prev?.traces?.[f.id], fresh = ids.has(f.id) ? readJson(`${WORK}/flows/${f.id}.json`) : null;
    if (fresh && decisions(fresh).length) {
      fresh.read = Object.fromEntries((fresh.read || []).filter(p => fs.existsSync(p)).map(p => [p, fhash(read(p))]));
      if (old) compare(fresh, old, prev.at); else decisions(fresh).forEach(n => { delete n.since; });
      traces[f.id] = fresh;
    } else if (old) {
      // unchanged since last run (or today's trace failed): last run's tree, with nothing marked new
      const t = JSON.parse(JSON.stringify(old)); decisions(t).forEach(n => { delete n.since; delete n.change; });
      t.diff = { at: prev.at, gone: [], kept: 0, same: true }; traces[f.id] = t;
      if (ids.has(f.id)) notes.push(`${f.title}: today's trace failed, showing the last one.`);
    } else if (ids.has(f.id)) notes.push(`${f.title}: could not be traced.`);
  }
  const label = path.basename(process.env.GITHUB_REPOSITORY || process.cwd());
  const report = { format: 'review-bench-report', version: 1, label, key: 'r-' + label.toLowerCase(), at: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || sh('git rev-parse HEAD'), prevAt: prev?.at || null, files, map, traces, notes };
  publish(report);
  console.log(`Report: ${map.flows.length} journeys, ${Object.values(traces).reduce((s, t) => s + decisions(t).length, 0)} decisions.`);
}

function publish(report) {
  write(`${OUT}/report.json`, JSON.stringify(report, null, 1) + '\n');
  write(`${OUT}/report.md`, markdown(report));
  const html = page(report);
  if (html) write(`${OUT}/report.html`, html); else console.log('::warning::No usable viewer.html; report.html was not written.');
}

// ---------- the page: Review Bench with this report built in ----------
// LOOK=plain gives the quiet look for work: no logo or glow, system font, one accent, the name only in the footer.
const BOOT = '// boot: where the viewer left off';
function page(r) {
  const dir = path.dirname(new URL(import.meta.url).pathname), viewer = path.join(dir, 'viewer.html');
  if (!fs.existsSync(viewer)) return null;
  let h = read(viewer);
  if (!h.includes(BOOT)) return null;
  const json = JSON.stringify(r).replace(/</g, '\\u003c');
  h = h.replace(BOOT, `const BAKED = ${json};\nif (BAKED) { openReport({ text: async () => JSON.stringify(BAKED) }); } else {\n${BOOT}`)
    .replace(/\} else render\(\);\n\}\)\(\);\n<\/script>\s*$/, '} else render();\n}\n})();\n</script>\n');
  if (process.env.LOOK === 'plain') {
    h = h.replace(/<link rel="(preconnect|stylesheet)" href="https:\/\/fonts\.googleapis\.com[^>]*>\n/g, '')
      .replace('</style>', read(path.join(dir, 'plain.css')) + '</style>')
      .replace('<title>', '<script>document.documentElement.dataset.look = "plain"; document.documentElement.dataset.theme = "light";</script>\n<title>')
      + '<footer class="rb-foot">Review Bench</footer>\n';
  }
  return h;
}

// ---------- the README on the report branch: a short summary that points at the page ----------
const looksWrong = n => n.prov === 'against' || n.flag;
function markdown(r) {
  const day = r.at.slice(0, 10), flows = r.map.flows, L = [];
  const all = flows.flatMap(f => decisions(r.traces[f.id]).map(n => ({ f, n })));
  const bad = all.filter(x => (x.n.prov === 'unasked' || x.n.prov === 'against') && looksWrong(x.n));
  const unasked = all.filter(x => x.n.prov === 'unasked' || x.n.prov === 'against').length;
  const nw = all.filter(x => x.n.since === 'new').length, ch = all.filter(x => x.n.since === 'changed').length;
  L.push(`# ${r.map.app?.name || r.label}: what the code decides`, '',
    `Report from ${day} for commit \`${String(r.commit).slice(0, 7)}\`.`, '',
    `**${bad.length} probably not what you want** · ${unasked} decisions nobody asked for · ${all.length} decisions in ${flows.length} journeys`, '');
  if (r.prevAt) L.push(nw || ch ? `Since ${r.prevAt.slice(0, 10)}: ${[ch && `${ch} changed`, nw && `${nw} new`].filter(Boolean).join(', ')}.` : `Nothing changed since ${r.prevAt.slice(0, 10)}.`, '');
  for (const n of r.notes || []) L.push(`> ${n}`, '');
  if (bad.length) {
    L.push('## Probably not what you want', '');
    for (const { f, n } of bad) L.push(`- **${n.q}** ${n.a}${n.notice ? `. ${n.notice}` : ''} _(${f.title})_`);
    L.push('');
  }
  L.push('## See the whole report', '',
    'Open [report.html](report.html), press **Download raw file**, and open the file in your browser. It shows every journey, its screen and every decision. Nothing is sent anywhere.', '');
  return L.join('\n');
}

// ---------- progress ----------
async function progress() {
  const t0 = Date.now(), at = () => `[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s]`;
  let buf = '';
  for await (const chunk of process.stdin) {
    buf += chunk; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      let e; try { e = JSON.parse(line); } catch { continue; }
      if (e.type === 'assistant') for (const c of e.message?.content || []) {
        if (c.type !== 'tool_use') continue;
        const x = c.input || {}, what = x.file_path || x.pattern || x.command || x.path || '';
        console.log(`${at()} ${c.name} ${String(what).replace(process.cwd() + '/', '')}`);
      }
      if (e.type === 'result') console.log(`${at()} done: ${e.subtype}, ${e.num_turns} turns, $${(e.total_cost_usd ?? 0).toFixed(2)}`);
    }
  }
}

const cmd = process.argv[2];
if (cmd === 'plan') plan(); else if (cmd === 'check') check(); else if (cmd === 'build') build(); else if (cmd === 'progress') progress();
else { console.error('usage: node .loupe/engine/assemble.mjs plan|check|build|progress'); process.exit(2); }
