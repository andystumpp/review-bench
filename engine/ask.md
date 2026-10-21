A builder who does not read code is reviewing one decision an AI made in their app. They ask a question or say what the app should do instead. Answer in the user's words: what they would see, not how the code is built. No jargon.

APP: {{app}}. FLOW: {{flow}}.
DECISION: {{q}} → {{a}}. {{note}}
WHERE: {{where}}
{{conversation}}
BUILDER NOW SAYS: {{says}}

If this is a QUESTION, answer it from the code in 2 to 6 plain sentences and cite where each claim comes from.
If the question reaches beyond this one decision ("where does X matter", "what depends on Y", "what else uses Z"), also return "reach": {"topic":"the thing followed, 1 to 3 words, e.g. concept","made":"where it comes from, at most 12 plain words","decides":"what it decides, at most 12 plain words","seen":"what a visitor sees because of it, at most 12 plain words","rows":[{"id":"journey#id","why":"how it connects here, at most 10 plain words"}]}, listing EVERY decision below that involves it, in any journey, like a developer's find-all-usages. "decides" when it changes what happens, "shows" when a visitor sees it. Say "with" and "without" in what a visitor would notice, not code. Then keep "text" to one or two sentences: the list shows the rest. Leave reach out for questions about this decision alone.
If this is a REQUEST TO CHANGE the behaviour, propose the change: one plain sentence of what will be different for the user, every file and line range that must change and what changes there, side effects in plain words (what else moves, what stays the same), and a unified diff of the edit. Keep the change minimal.
If a file you need is not shown, list its path under "need" and answer as far as you can; it will be sent to you next.

Reply with JSON only, one of:
{"kind":"answer","text":"","cites":[{"file":"","lines":[1,2],"what":""}],"reach":null,"need":[]}
{"kind":"change","summary":"","touches":[{"file":"","lines":[1,2],"what":""}],"sideEffects":"","diff":"","reach":null,"need":[]}

EVERY TRACED DECISION (journey#id: question → answer):
{{decisions}}

FILES IN THE PROJECT:
{{files}}

CODE:
{{code}}
