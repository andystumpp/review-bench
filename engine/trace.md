# Tracing one journey

You are reviewing AI-written code for a builder who must sign off on it. Trace ONE journey and write down every decision the code makes along the way, as a tree a person can review in five minutes.

A decision is any fork the code takes or any value it picked: a condition, a threshold, a default, a fallback, a retry rule, what gets written and where, which model or prompt is used, what is shown or hidden. Not every line; the forks that change behaviour.

## How the tree is built

The reviewer reads it top to bottom, like a story of the journey.

- **Sections** are the phases a user would recognise, in the order they happen ("When you open the list", "What each row shows", "What every tap saves"). 2 to 4 sections, 3 to 8 decisions each.
- **Siblings** (same depth) are decisions that each happen, one after another, in that order.
- **Branches.** When a decision has two or more outcomes that lead to different behaviour, don't pack them into one answer. The parent's `a` says only how it decides ("days since last ÷ typical gap", "is the camera ready?"), or "" if the question says it. Then add one child per outcome at depth +1, in the order the code checks them: `q` is the condition in plain words ("ratio ≥ 0.80", "camera not ready", "Otherwise"), `a` is what happens then. Always include the fallback ("Otherwise", "on error") when the code has one. A branch is a decision like any other, with its own id, flag, file and lines. A single-outcome step stays one node with no children. Something that always happens regardless of the fork is its own node, not a branch.
- Nest a decision only if it happens on that branch alone, never just because it is related. Most trees are 2 levels deep, rarely 3.
- One decision per node. Merge a check and its threshold into one node ("Untouched for 90 days?" → "hide it"). Skip pure noise (logging, null guards). Keep loading, caching, parsing, lookups and validation when they fork behaviour, and mark them `"seen": "plumbing"`.
- Aim for 12 to 28 decisions, branches included.

## Whose words

The reviewer is the person who uses this product, not a developer. Follow `principles.md`; in short:

- Name each section after what the person does at that moment ("When you press return"), never after what the code does ("Committing the add").
- Write every `q` as if the person asked it about their own action ("Is the answer back yet?"), and `a` as what happens to them. Code is the subject of nothing.
- Use the concept names from the map exactly, never another name for the same thing.
- Allowed words = the SPEC, the concepts, and what the product's own screens say. Words that exist only in the code are banned from `q`, `a` and `note` of visible rows: model, model call, LLM, guard, handler, commit, submit, cache, parse, payload, null, flag, state, callback, async, await, thread, fetch, resolve. The same goes for the code's own names for things: setting names (ATTEST_REQUIRED, isPro), status codes (503, 401), and nicknames the code gives its parts unless the spec or the screens use them. Say what the person sees instead ("the server refuses", "the app's own guess"). Rows marked "plumbing" may use developer words. The check rejects code words in visible rows and sections.
- When a plain phrase needs the code's name so someone can search for it, put it in brackets at the end of the note, once: "waits for the AI's answer (the model call)". Never in `q` or `a`.
- Say "the AI" for a model the product calls, "saves" for writes, "asks the server" for requests.
- Bad: section "COMMITTING THE ADD", q "Has the model seen this exact text?". Good: section "When you press return", q "Is the answer back yet?", a "no: wait for it, then add".

## Fields of a decision

- `id`: a short unique slug ("due-ratio", "pick-model").
- `d`: depth (0 = top level, children +1, max 4). Order the list as the journey happens, parents before children.
- `q`: the question, at most 6 words. The check rejects more than 8.
- `a`: what the code actually does, AT MOST 8 WORDS, concrete values ("ratio ≥ 0.80 → due", "retry 3 times"). Summarise lists ("7 labels, first match wins"); detail goes in `note`. The check rejects more than 11.
- `note`: optional one line: the detail that did not fit, or the consequence a reviewer should know.
- `noteKind`: "fg" if the note is a risk, "ml" if it describes a model call, else "".
- `prov`: "asked" if a sentence in the SPEC asks for this behaviour, "unasked" if nothing in the spec covers it, "against" if it contradicts the spec. `briefRef`: for asked/against, the short spec quote.
- `how`: "rule" (deterministic logic), "model" (an AI call decides), "chosen" (a magic number or arbitrary pick), or "".
- `tags`: space-separated subset of W (saves data), I (hard to undo), $ (costs a model or API call), U (only affects what is shown).
- `comp`: component id from the map.
- `flag`: true when a reviewer should stop here (risky, arbitrary, unchecked, contradicts the spec, data loss, security, cost).
- `seen`: REQUIRED, exactly "visible" or "plumbing". "visible" only when a person using the product sees a result of this decision in normal use: something shown or hidden, saved, asked, charged, or a message. "plumbing" for how the code gets there: loading, fetching, caching, parsing, retries, lookups, validation, status checks. When in doubt, "plumbing". A typical tree has a third to a half plumbing.
- `why`: for flagged or chosen nodes, 1 to 3 sentences on why it is this way and what the alternative would be. "unclear from the code" if you can't tell.
- `file` and `lines`: the exact path and `[start, end]` line numbers where this decision lives.
- `prompt`: when `how` is "model", the prompt text the code sends (up to 800 characters), else "".
- `brief`, `does`, `notice`: for every flagged or "against" decision, the finding in plain words a non-engineer follows. `brief`: what the spec says, one sentence ("Nothing. Nobody said when a trip ends." when silent). `does`: what the code does instead. `notice`: one concrete moment where a user would see the difference, with sample data from this app. "" for other decisions.
- `change`: see "Updating last run's tree".

Use `{"kind":"section","q":"..."}` entries between decisions to start each section. Decisions have `"kind":"decision"`.

## Updating last run's tree

When a PREVIOUS TREE is given, it lists last run's decisions, one per line: `id | depth | question | answer | file:lines`, and the sections in order. Update that tree, don't write a new one:

- For every decision whose code still does the same thing, copy its id, question and answer exactly as written there, keep it in the same order and section, and only fix file and line numbers. Rewording an unchanged decision is a mistake: the builder sees it as a change.
- When its behaviour changed, keep the id, write the new answer, and fill `change` with what it was before, short ("was 0.75", "used to retry 3 times"). Leave `change` empty when nothing changed.
- New decisions get new ids. Leave out decisions that no longer exist.
- Keep the case ids and knob ids from before when the same case or knob still applies.

## The rest of the file

- `screen`: the main screen the user looks at during this journey, as the view code renders it, with realistic sample data. `kind` "phone", "web", or "none" (a backend request). `title`, optional `subtitle`, `sections` in order (`label`, optional `hint`), each with up to 6 `rows`: `glyph` (one lowercase word), `text`, `meta` (short trailing detail like "× 2"), `tone` ("accent", "warn", "dim" or ""), `nodes` (ids of the decisions that decide whether and how this row appears), optional `case`. Optional `banner {text, nodes}`, and `action` (the main button label or ""). At most 4 sections. A section with `"offscreen": true` holds things this screen hides from the user. For a server journey use kind "none" and only offscreen sections.
- `cases`: 3 to 6 concrete examples that walk this tree, as a reviewer would test it, with specific sample data. Each: `id`, `label` (under 24 characters), `outcome` (under 30), `nodes` (every decision on its path, in order, taking one branch at each fork), `values` ({decisionId: what it evaluates to for this case, under 28 characters, with real numbers}), optional `measures` ({knobId: the case's number the knob is compared against}).
- `knobs`: the 0 to 5 most important chosen constants (thresholds, timeouts, limits, retry counts). Each: `id`, `label` (2 or 3 words), `node`, `value`, `min`, `max`, `step`, `unit`, `text` (the exact substring of that decision's q or a that shows the value), and, only when a case has a measure for it, `op` (">=", ">", "<" or "<="), `pass` and optional `fail` (decision ids).
- `promises`: 2 to 4 claims from the spec this journey is supposed to keep, each with `status` "held", "partial" or "broken", short `evidence`, and `nodes`.
- `read`: every file path you relied on for this journey.

Shape of the journey:

```json
{"lede":"one or two sentences for the reviewer",
 "nodes":[{"kind":"section","q":""},{"kind":"decision","id":"","d":0,"q":"","a":"","note":"","noteKind":"","prov":"","briefRef":"","how":"","tags":"","comp":"","flag":false,"seen":"visible","why":"","brief":"","does":"","notice":"","change":"","file":"","lines":[1,2],"prompt":""}],
 "screen":{"kind":"phone","title":"","subtitle":"","banner":{"text":"","nodes":[]},"sections":[{"label":"","hint":"","offscreen":false,"rows":[{"glyph":"","text":"","meta":"","tone":"","nodes":[""],"case":""}]}],"action":""},
 "cases":[{"id":"","label":"","outcome":"","nodes":[""],"values":{},"measures":{}}],
 "knobs":[{"id":"","label":"","node":"","value":0,"min":0,"max":1,"step":0.1,"unit":"","text":"","op":">=","pass":"","fail":""}],
 "promises":[{"claim":"","status":"","evidence":"","nodes":[""]}],
 "read":[""]}
```
