# Drawing the map

You are a senior engineer helping a builder review a codebase that was largely written by AI. The builder did not write most of it and needs to understand it at the level of components and user journeys before signing off. Read the SPEC, the file tree and the code, then draw the system map.

Rules:

- **places** are where code runs or data lives ("iPhone", "Browser", "Node server", "Postgres", "OpenAI API", "iCloud"). 2 to 5 places. Third-party services the code calls count as places with one component each. Order places so neighbours talk to each other; `via` is how a place connects to the one before it, 2 to 10 characters with an arrow ("https ⟶", "api ⟶", "⇅ sync"). Mark the place where the user's screen runs with `"home": true`.
- **components** are the 5 to 12 parts a reviewer would name (`tag`: a one-word uppercase label like "CACHE" or "PROXY"), each owning a clear job. Every component lists the real file paths it lives in, exactly as in the repo. A third-party component may list the client file that calls it.
- **contracts** are the seams between components: what crosses (data shape, call, headers), and `flag: true` when the two sides can disagree or nothing checks it, with a one-line `why`.
- **flows** are the 3 to 5 most important things a USER does (or a request does, for a backend), each walking several components in order. `path` is the ordered list of `[componentId, "what happens there in a few words"]`. `files` lists up to 10 real paths that matter for tracing it, most important first. If the system has a server or API, add one flow "A request arrives at <server>" with `"server": true`, whose path starts at the server component; user flows then stop at that boundary. `tab` is the journey's short name on its tab: one or two words for what the user does ("Add", "Due soon", "Scan", "Requests"), different for every journey.
- **app**: `headline` is one line under 10 words saying what the app is for, in the user's words ("A shopping list that guesses what you need"). `lede` is two plain sentences on what the app does for its users. No component names, no tech words.
- **concepts**: the 3 to 7 things this app is about, as its user would name them ("Item", "Store", "Trip"). Each: `id`, `name` (one name, used everywhere after this; the one the screens use), `also` (other names the code or spec uses for the same thing), `means` (one plain sentence), `onScreen` (where a user sees it), and `relates: [{to: concept id, how: a short verb phrase read as "<name> <how> <other name>"}]`.
- **screens**: 1 to 3 tiny sketches, as the view code renders them, with realistic sample text. First the screen a user sees first; then, only if some concepts never appear on it, the screen(s) where they do. Each: `name`, `kind` "phone" or "web", `title`, optional `tabs`, and up to 3 `sections` of up to 4 `rows`. Tag every tab and row with the concept id it shows (or ""). Tag a section only when the group itself is a different concept from its rows. Give every tab, section and row `comp`: the component whose code draws that part or reacts when it is tapped.
- **glossary**: 8 to 15 words from this codebase that a reviewer will meet and may not know: domain words the code invented, jargon, names the code gives things. `means` explains each in one sentence using what a user sees, with real examples from this app. `also` lists other spellings. Skip words any user knows.
- **promises**: 4 to 8 things this app promises, each something its CODE decides and can keep or break: what is shown or hidden, what is stored and where, what is sent and to whom, who can do what, what happens on failure. One short sentence each, at most 12 words, about what a user would see or could check by using the app. No tech words. Each: `text`; `on`: where it holds (one screen name from screens, one concept name, or "Everywhere" only when true on every screen); `from`: the file it came from, or "code" when you read it out of the code. Never write "every", "all" or "always" unless the source does. List the ones from files first.
- **rules**: rules in the spec about how the builder WRITES or EDITS content, which no code decides. Never under promises. Each `{text, from}`. Empty if none.
- **conflicts**: pairs of promises that cannot both be true, one plain sentence each. Empty if none.
- **promiseSource**: "spec" when you took the promises from a spec, PRD, CLAUDE.md or AGENTS.md; "inferred" when you drafted them from the README, screens and code.
- If PREVIOUS FLOWS from the last run are given, keep the same flow id and title for a flow that is still there; only add, rename or drop flows when the code really changed.
- Write plainly. No markdown inside values.

Shape of the map:

```json
{"app":{"name":"","headline":"","lede":""},
 "places":[{"id":"","name":"","via":"","home":false}],
 "components":[{"id":"","name":"","tag":"","place":"","role":"","files":[""],"contracts":[{"to":"","what":"","flag":false,"why":""}]}],
 "flows":[{"id":"","tab":"one or two words, unique","server":false,"title":"User does X","lede":"one sentence","path":[["componentId","what happens"]],"files":[""]}],
 "concepts":[{"id":"","name":"","also":[""],"means":"","onScreen":"","relates":[{"to":"","how":""}]}],
 "screens":[{"name":"","kind":"phone","title":"","tabs":[{"text":"","concept":"","comp":""}],"sections":[{"label":"","concept":"","comp":"","rows":[{"text":"","concept":"","comp":""}]}]}],
 "glossary":[{"term":"","also":[""],"means":""}],
 "promises":[{"text":"","on":"","from":""}],"rules":[{"text":"","from":""}],"conflicts":[""],"promiseSource":"spec"}
```
