# Evaluation

Every result below was produced on fictional data: the case's example packet and messages written
for the tests. Each number carries a label. The commands that reproduce the measured ones, and
their last output, are in [../../CHECKS.md](../../CHECKS.md).

## Results

| What was tested | Result | Label | Files |
|---|---|---|---|
| Automatic checks on the engine and the season-one tools | 216 of 216 pass | measured | `prototype/eval/problems.js`, `prototype/eval/coverage.json` |
| Reply rule against what a coordinator would decide by hand | 39 of 39 agree; 17 filed by rule, 22 handed to a person | measured. The author of the rule wrote the 39 replies, so this shows the rule does what it says, not how often real replies fit it | `node cli/replies.js` in `prototype/` |
| Office rule | 91 of 91 office checks pass | measured | `prototype/eval/office_examples.json` |
| Office rule on 30 unseen office messages | 13 of 30 sorted right, 24 of 30 handed to a person | measured, small sample | `node cli/office.js --measure` in `prototype/` |
| Two AI readers on 100 unseen everyday messages | 72 of 79 readings right where both readers agree and the verifier passes | measured from recorded answers. The set was written and labelled by AI, with no human | `prototype/eval/reader_runs_unseen2.json`, `prototype/eval/autofile_unseen2.json`, `docs/PROBLEM_COVERAGE.md` section 5 |
| The same two readers run live on every labelled set, 22 Nov 2026 | 117 of 117 and 119 of 119 agreed and verified readings right on the 72 examples (two runs; not a fair test, the instructions were written on them); 73 of 81 (90.1%) on unseen set 2; 0 of 550 requests failed; $1.16 for 275 messages | measured, live | [live-readers-22nov.md](live-readers-22nov.md) |
| Cost of reading one message with two AI readers | 0.35 cents ($0.3545 for 204 recorded calls on 102 messages) | measured | `node cli/trace.js` in `prototype/` |
| Gate sheet against the 11 example threads and its rules | 180 `pass` lines, 0 `FAIL` | measured | `prototype/eval/sheet_threads.py` |
| Control tower at volume | 0 of 7 safety rules broken in 45,300 hearings | simulated | `prototype/eval/scale.json` |
| Person-minutes a hearing | 5.6 to 5.8 with the tower, against 35.5 to 38.0 by hand | simulated; the minutes per step are estimates | `prototype/eval/scale.json` |

About 1 wrong proof in 11 readings (7 of 79, measured) is too many to file without a person, so a
person accepts every proposal.

## The audit of 125 problems

[audit-results.md](audit-results.md) summarizes a separate review of the season-one plan against
125 problems found in the example, and [audit-record.json](audit-record.json) is the full record.

## Outside the build machine

The sheet was opened in Excel for Mac and an 80-row copy in Google Sheets, its calendar file was
imported into Apple Calendar, and the AI readers ran live with a real key (a 4-message test of the
paste command on 21 Nov, and every labelled set on 22 Nov in [live-readers-22nov.md](live-readers-22nov.md)).
The reports are in [../outside-tests/](../outside-tests/).
