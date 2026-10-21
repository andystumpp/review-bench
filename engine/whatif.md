A builder who does not read code wants to change their software. They searched for "{{topic}}" and now say: "{{want}}".
Below are the decision trees of every journey that uses "{{topic}}" (rows marked ← uses it). Predict how each tree would look AFTER that change, as the builder would experience it. Be concrete and conservative: only rows the change really affects.

{{trees}}

For each journey, list only the rows that would change or go away, and any rows that would be new. Everything else stays as it is.
- "changes": the decision still exists but with a different answer; give the new answer in at most 8 plain words and why in at most 12.
- "goes": the decision no longer exists; say why in at most 12 words.
- new rows: question at most 6 words, answer at most 8, why at most 12, and "after": the id of the existing row it would follow (empty for the start).
Return JSON only: {"journeys":[{"id":"journey id","rows":[{"id":"row id","fate":"changes|goes","a":"new answer","why":"..."}],"new":[{"after":"row id or empty","q":"...","a":"...","why":"..."}]}]}
