# Review Bench

Every decision your code makes, journey by journey, in plain words.

Once a day this action reads your repository with an AI and writes a report:
the journeys a person takes through your product, every decision the code makes
along each one, and which of those nobody asked for. Journeys whose code did not
change keep yesterday's tree, so a quiet day costs nothing.

Each run publishes three files to the `loupe-report` branch, and attaches
`report.html` to the run:

| File | What it is |
|---|---|
| `report.html` | The report. Download it and open it in a browser. Nothing is sent anywhere. |
| `report.json` | The same report as data. |
| `README.md` | A short summary with the decisions that are probably not what you want. |

## Set it up

1. Copy a template to `.github/workflows/review-bench.yml`:
   - [`templates/review-bench-claude.yml`](templates/review-bench-claude.yml) runs Claude Code. Add the secret `ANTHROPIC_API_KEY`.
   - [`templates/review-bench-copilot.yml`](templates/review-bench-copilot.yml) runs GitHub Copilot. Add the secret `COPILOT_TOKEN`.
2. Run it once from the Actions tab (Review Bench report, Run workflow), or wait for 06:00 UTC.

## Inputs

| Input | Default | What it does |
|---|---|---|
| `agent` | `claude` | Which AI reads the code: `claude` or `copilot` |
| `token` | | The agent's key: an Anthropic API key, or a token with Copilot access |
| `model` | | Empty picks `sonnet` for Claude and Copilot's own pick for Copilot |
| `budget` | `3` | Most one run may spend, in US dollars (Claude only). Journeys left over are traced on the next run |
| `look` | `full` | `plain` gives report.html a quiet look |
| `fresh` | `false` | Start over: trace every journey again, ignoring the last report |
| `branch` | `loupe-report` | Where the report is published. Empty publishes only to the run page |

The workflow needs `permissions: contents: write` to publish the branch.

## How it works

The `engine` folder is what the AI follows, wherever Review Bench runs:
`map.md` (the journeys and parts), `trace.md` (one journey's decision tree),
`principles.md` (how every row is worded), and the prompts behind search
(`search.md`), What if (`whatif.md`), Ask (`ask.md`), the second try after a
failed check (`fix.md`) and the prompt you copy for your AI (`changes.md`).
`run.md` is the task for this action. `core.mjs` is the check every answer has
to pass. `assemble.mjs` does the parts that need no AI: what changed since the
last report, checking what the AI wrote, and building the report. `app.html` is
the Review Bench page; `inline.mjs` builds the prompts and the check into it.

## Licence

© 2026 Andy Stumpp. All rights reserved. You may use this action as is; see
[LICENSE](LICENSE).
