// Review Bench core: the logic every host shares. The workflow (assemble.mjs) imports it;
// the app gets a copy built into its page. No dependencies, no Node APIs: it runs in a browser too.

// fingerprint of a file's text, so a report and an opened folder agree on what changed
export const fhash = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + '.' + t.length; };
export const norm = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const words = x => String(x || '').trim().split(/\s+/).filter(Boolean).length;
export const decisions = t => (t?.nodes || []).filter(n => n.kind === 'decision');

// fills {{name}} in a prompt from the engine folder
export const fill = (tpl, vars) => String(tpl).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k] ?? '') : m));

// words that only exist in code: never in what a visible row says (principles.md, "Whose words")
export const CODE_WORDS = /\b(model calls?|models?|llm|guards?|handlers?|payloads?|null|callbacks?|async|await|cache[sd]?|pars(e|es|ed|ing)|fetch(es|ed|ing)?)\b/i;
export const CODE_NAMES = /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b|\b[a-z]+[A-Z][A-Za-z0-9]*\b|\b[45]0\d\b|`/;
export const codeTalk = x => (String(x || '').match(CODE_WORDS) || String(x || '').match(CODE_NAMES) || [])[0];

// last run's tree of one journey, as the PREVIOUS TREE that trace.md describes
export function prevTreeText(t) {
  return decisions(t).map(n => `${n.id} | ${n.d ?? ''} | ${n.q} | ${n.a} | ${n.file || ''}${n.lines ? ':' + n.lines.join('-') : ''}`).join('\n') +
    `\nSections, in order: ${(t.nodes || []).filter(n => n.kind === 'section').map(n => n.q).join(' / ')}\n`;
}

// ---------- the check: what map.md and trace.md ask for ----------
// has(path) says whether a file exists in the code. Returns { errs, warns }: errors go back to the AI to fix.
export function checkMap(map, has, at = 'map') {
  const errs = [], warns = [];
  const comps = new Set((map?.components || []).map(c => c.id));
  if (!comps.size) errs.push(`${at}: no components.`);
  if (!(map?.flows || []).length) errs.push(`${at}: no flows.`);
  for (const c of map?.components || []) for (const p of c.files || []) if (!has(p)) warns.push(`${at}: component ${c.id} lists ${p}, which does not exist.`);
  const tabs = (map?.flows || []).map(f => norm(f.tab));
  for (const f of map?.flows || []) {
    if (!/^[\w-]+$/.test(f.id || '')) errs.push(`${at}: flow id "${f.id}" must be letters, digits, - or _.`);
    if (!f.tab) errs.push(`${at}: flow ${f.id} has no tab.`);
    else if (tabs.filter(x => x === norm(f.tab)).length > 1) errs.push(`${at}: flow ${f.id} has the tab "${f.tab}", which another journey uses too. Every tab names its own journey.`);
    for (const s of f.path || []) if (!comps.has(s[0])) errs.push(`${at}: flow ${f.id} walks through "${s[0]}", which is not a component id.`);
  }
  return { errs, warns };
}
// needRead: the journey must list the files it relied on (the workflow needs that; the app knows what it sent)
export function checkTrace(t, comps, has, at = 'journey', needRead = true) {
  const errs = [], warns = [], ds = decisions(t), seen = new Set();
  if (!ds.length) errs.push(`${at}: no decisions.`);
  if (!(t?.nodes || []).some(n => n.kind === 'section')) errs.push(`${at}: no sections.`);
  for (const n of (t?.nodes || []).filter(n => n.kind === 'section')) { const w = codeTalk(n.q);
    if (w) errs.push(`${at} section "${n.q}": "${w}" is a word from the code. Name the section after what the person does.`); }
  for (const n of ds) {
    const where = `${at} decision "${n.id || n.q}"`;
    if (!n.id) errs.push(`${where}: no id.`); else if (seen.has(n.id)) errs.push(`${where}: id used twice.`); seen.add(n.id);
    if (!n.q) errs.push(`${where}: no question.`);
    if (!Number.isInteger(n.d) || n.d < 0 || n.d > 4) errs.push(`${where}: d must be 0 to 4.`);
    if (n.seen !== 'visible' && n.seen !== 'plumbing') errs.push(`${where}: seen must be "visible" or "plumbing".`);
    if (!n.file || !has(n.file)) errs.push(`${where}: file "${n.file}" does not exist.`);
    if (!Array.isArray(n.lines) || n.lines.length !== 2) errs.push(`${where}: lines must be [start, end].`);
    if (n.comp && !comps.has(n.comp)) warns.push(`${where}: comp "${n.comp}" is not a component id.`);
    // past the limit with some slack is an error; just past it is a warning
    if (words(n.q) > 6) (words(n.q) > 8 ? errs : warns).push(`${where}: question has ${words(n.q)} words (at most 6). Move the detail into "note".`);
    if (words(n.a) > 8) (words(n.a) > 11 ? errs : warns).push(`${where}: answer has ${words(n.a)} words (at most 8). Move the detail into "note".`);
    if (n.seen === 'visible') for (const k of ['q', 'a', 'note', 'does', 'notice']) { const w = codeTalk(n[k]);
      if (w) errs.push(`${where}: "${w}" in ${k} is a word from the code. Say what the person sees instead, or mark the row "plumbing" if they never see it.`); }
    if (n.flag && !n.notice) warns.push(`${where}: flagged but has no "notice".`);
  }
  const plumb = ds.filter(n => n.seen === 'plumbing').length;
  if (ds.length >= 8 && !plumb) warns.push(`${at}: no decision is marked "plumbing"; a typical tree has a third to a half.`);
  if (needRead) {
    if (!(t?.read || []).length) errs.push(`${at}: "read" lists no files.`);
    for (const r of t?.read || []) if (!has(r)) errs.push(`${at}: read lists "${r}", which does not exist.`);
  }
  return { errs, warns };
}
