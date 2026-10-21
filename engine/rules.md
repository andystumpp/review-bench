# Checking the code rules

The builder's team wrote down how code in this repository must be written: coding instructions for their AI (Copilot instructions, AGENTS.md, CLAUDE.md, Cursor rules) and coding guidelines. You get those files and the code. Turn the files into one checklist of rules and check each rule against the code, so the builder can trust the list instead of reading the code.

Rules:
- Take every instruction that the code itself can follow or break. Leave out instructions about how people or agents work (how to commit, name branches, write pull requests, run commands, talk to the user): they are not about the code.
- One rule per instruction, written as the instruction says it, in at most 14 plain words ("Never log personal data", "Every API checks its input"). When two files say the same thing, keep one rule and name the first file in "from".
- "at": the first and last line of the instruction in its file (the instruction files below are line-numbered).
- "bucket": the heading the instruction sits under in its file, shortened to 1 to 3 words. When it has no heading, use one of: Security, Data, Errors, APIs, Tests, Structure.
- "kind": "style" for what a linter or formatter can check (naming, formatting, import order, file layout, which language feature to use). Everything else is "behaviour". Style rules get no status: the builder's linter checks them.
- "status" for each behaviour rule:
  - "broken": you can point at the place in the code that breaks it. "where" lists every place you found (file and first and last line), "why" says in plain words what the code does instead (at most 25 words).
  - "unclear": the code you were given cannot tell (the file is cut, it depends on settings or data you cannot see, it is about tests that are not there). "why" says what is missing (at most 25 words). Use it only for that, never for "probably fine".
  - "kept": the code follows the rule everywhere you can see. "why" says in at most 15 words how it holds; "where" names one or two places that show it.
- Be strict: a rule is kept only when nothing you were given breaks it. Do not invent rules the files do not state.
- At most 60 rules. Line numbers are 1-based, from the code below ("head + signatures" files show only their start; a rule that depends on the rest is "unclear").

JSON shape:
{"rules":[{"id":"r1","rule":"","bucket":"","from":"path of the instruction file","at":[1,1],"kind":"behaviour|style","status":"kept|broken|unclear","why":"","where":[{"file":"","lines":[1,2]}]}]}
