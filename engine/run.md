You are producing today's Review Bench report for this repository. Review Bench shows a builder, who did not write most of this code, every decision the code makes, in plain words, journey by journey. You read the code yourself with your tools; nobody pastes it for you.

Work only inside `.loupe/work/`. Never change any other file.

## 1. Get your bearings

- Read `.loupe/work/plan.json`. It says whether to draw a new map (`remap`) and which journeys to trace (`retrace`, a list of journey ids, or `"all"`).
- Read `.loupe/work/context.md`: the map from the last run (if any), and why this run happens.
- Read `.loupe/engine/principles.md`. Every word you write follows it.
- Read the SPEC: what the builder wrote about what the product should do. That is the README, other Markdown files at the top level (briefs, specs, PRDs), `CLAUDE.md`, `AGENTS.md`, and anything under `specs/` or `docs/` that describes the product. Design mockups count when they describe screens.

## 2. The map (only when `remap` is true)

Follow `.loupe/engine/map.md` and write the map to `.loupe/work/map.json`. The flows of the map in `context.md`, if there is one, are the PREVIOUS FLOWS. When `remap` is false, the map in `context.md` stands; don't write one.

## 3. Trace the journeys

For every journey id in `retrace` (every journey in the map when it says `"all"`), follow `.loupe/engine/trace.md` and write the journey to `.loupe/work/flows/<journey id>.json`.

- Read the code the journey runs through. Start with the journey's `files` and the files of the components on its `path`, then follow calls into other files when a decision lives there. Read whole files; cite real line numbers.
- If `.loupe/work/prev/<journey id>.txt` exists, it is that journey's PREVIOUS TREE from the last run. Update that tree, don't write a new one, as `trace.md` explains. This is what keeps the report stable from day to day.
- Put every file you relied on in the journey's `"read"` list.
- Trace one journey at a time and write its file as soon as it is done, before starting the next. The run has a spending limit; whatever is written when it runs out is kept, and the next run traces the rest.

## 4. Check your work

Run `node .loupe/engine/assemble.mjs check`. It is the check `trace.md` talks about: it validates every file you wrote against the shapes in `map.md` and `trace.md`. Fix what it reports and run it again until it passes. Then stop; the workflow builds the report from your files.
