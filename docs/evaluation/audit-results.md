# Audit of the season-one plan: 125 problems

The example packet was read for everything that could make a hearing go wrong. That produced a
list of 125 problems, each with an id: W (the work the firm describes), R (the requirements of the
task), A to K (problems in the example messages, by property) and X (problems added in later
passes). Every case, office and person in them is fictional.

Each problem was then judged against the season-one plan (the week-one kit, the gate sheet and the
reply rule) by three separate review passes, recorded in the file as `ops` (an operations reader),
`skeptic` and `newhire` (a new coordinator following the kit). The final verdict is in the field
`final`. The control tower gets no credit in this audit.

## Result (measured from [audit-record.json](audit-record.json), 21 Nov 2026)

| Final verdict | Problems |
|---|---|
| Yes | 109 |
| Yes, pending the firm's answer | 8 |
| Partly | 8 |
| No | 0 |
| **Total** | **125** |

The three passes agreed on 106 of the 125 (measured).

**Yes, pending the firm's answer (8):** W6, R21, E6, X1, X20, X26, X27, X29. The procedure, the
question and the sheet cell exist, and the fact must come from the firm, an office or a homeowner.

**Partly (8):** W8, R1, R2, R19, R20, R22, G1, K1. Most say the same thing: in season one a person
still does most of the work per hearing, so coordinator work grows almost in a straight line with
volume, and no saving is claimed. R22 says the 72 example messages were used to build the rules,
so they are not a fair test; the unseen sets in [README.md](README.md) are the test. G1 and K1 say
that some clean hearings in the example do not reach READY without a person's step.

Each entry in the file gives, for every pass, where the plan answers the problem, what gap
remains and the question for the firm. The plan's answer to each problem is in
[../PROBLEM_COVERAGE.md](../PROBLEM_COVERAGE.md), section 11.
