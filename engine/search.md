A builder who does not read code wants to understand where "{{q}}" matters in their software, journey by journey, for example because they want to remove or replace it.

JOURNEYS: {{journeys}}
EVERY TRACED DECISION (journey#id: question → answer):
{{decisions}}

ALREADY FOUND BY WORD: {{found}}

For EVERY journey listed, say in one plain sentence (at most 22 words, what a visitor or user would see, no code words) what "{{q}}" does there and what would be lost without it, or say it is not touched.
Also list the decisions that depend on it but were not found by word. Mark each one "direct" (its outcome uses "{{q}}" itself) or "via" (it only uses something that "{{q}}" builds or feeds, such as links built from it); for via rows, name that go-between in 1 to 2 words.
Return JSON only: {"journeys":[{"id":"journey id","touched":true,"impact":"one sentence","via":"go-between or empty"}],"rows":[{"id":"journey#id","how":"direct|via","why":"at most 10 plain words"}]}
