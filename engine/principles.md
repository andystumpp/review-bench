# Principles for what Review Bench shows

How every tree, row, note and finding is worded. `trace.md` and `map.md`
follow these.

## Whose words

1. **The person's words, not the code's.** Every row reads as the person using
   the product would say it. "Is the answer back yet?", not "Has the model seen
   this exact text?". Sections are named after what the person does ("When you
   press return"), not after what the code does ("Committing the add").
2. **Allowed vocabulary = the spec plus the product's own concepts.** A word
   used in the spec, README or the product's screens is the person's word, even
   when it is technical: a backend product's user says request, token, webhook.
   Words that exist only in the code are out of visible rows: guard, handler,
   model call, commit, submit, cache, parse, payload, null, flag.
3. **Technical words live in technical rows.** Rows marked as plumbing, and the
   "Lives in" code section of the panel, may use developer words. The fold
   between visible and technical steps is also the line between the two
   vocabularies.
4. **Bridge in brackets, once.** When a plain phrase needs the code's name so
   someone can search for it, the note carries it in brackets after the plain
   words: "waits for the AI's answer (the model call)". Never in the question or
   the answer.
5. **Chips carry the technical facts.** "saves data", "costs $", "can't undo",
   "network" say write, model call, irreversible, request without the words.
   The text stays about what happens to the person.
6. **One name per thing.** A concept has one name everywhere: in the overview,
   every tree, every finding. No synonyms ("the log" and "log list"), no
   function or variable names.

## What a row says

7. **Behaviour, never structure.** A row says what happens, not how the code is
   organised. Code is one click away.
8. **Concrete values, sample data.** "ratio ≥ 0.80", "after 90 days", "You type
   'oat milk', press return, keep typing". Not "a threshold", "some time".
9. **A finding in three lines.** Spec says / Code does / What you'd notice.
   The third line is one moment with sample data from this product.
10. **In the spec but done wrong is one phrase.** "In the spec, but the check
    is broken", not a tick plus a flag.
11. **Short.** Question at most 6 words, answer at most 8, the rest in the note.

## What the tree shows

12. **Visualise, don't make people read.** Trees, screens and lit rows before
    paragraphs. Anything that needs a legend is wrong.
13. **Essence first.** Rows a person would notice are shown; plumbing folds
    away unless flagged, changed or against the spec.
14. **Generic.** Nothing assumes a screen, a phone or a UI. Labels work for a
    backend as well as for a web page.
15. **Surprises loud, ranked by confidence.** Probably not what you want /
    Worth a look / Small calls.
