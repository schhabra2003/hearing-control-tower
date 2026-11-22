# Live run of the two AI readers on every labelled set (22 Nov 2026)

Run in a separate copy of `prototype/`; the published folder was not changed. Only the fictional messages of the packet and of the two unseen sets were sent to the API. The key was loaded from a key file into the environment of each Node process through the evaluator's own `--key-file` option. It was never printed, logged, copied or written, and every output was passed through a filter that masks anything shaped like a key.

Every number in this note is measured in this run unless it is labelled "recorded", which means it comes from the paid runs of 18 November (72 examples and unseen set 1) and 20 November (unseen set 2) that the prototype replays without a key.

## Method

- Readers: gpt-6.1-sol reads, gpt-6-luna checks, with the instructions `reader-1`, hash `eb88cb65dd1f6bae` (first reader) and `e38fe29a0b618d81` (second reader). These are the same instructions as in the recorded runs (measured: the hashes match). Reasoning effort was left at each model's default, as in the recorded runs. Four messages were read at a time (the evaluator's default).
- Tool: `eval/run.js`, the prototype's own reader evaluation, which sends each message to both readers, settles the two answers through the code guard, the cross-check and the verifier, and scores the result against the answer key of the set. `--save-reads` kept every raw answer, so each live run can be replayed offline.
- Then `eval/autofile.js` was run on the saved live answers, which gives the "agreed and verified" figures (the measure behind "72 of 79" on unseen set 2) and, for the 72 examples, the proof links on the gate sheet.
- Truth: the answer key each tool already uses. For the 72 examples that is `data/gold_dev.json`; for unseen set 1 it is the labels in `data/heldout.json` (30 office messages); for unseen set 2 it is the labels in `data/unseen2.json` (100 messages).
- The 72 examples were read twice (run A and run B) to measure how much two live runs agree.
- Intervals are 95 per cent Wilson intervals, computed with the prototype's own `src/stats.js`.
- Cost is what the evaluator reports: the token usage the API returned for each request times the price table in `src/extract/openai.js` (prices read on 17 Nov 2026). It is not a figure from the OpenAI billing page.
- Seconds per message: the first reader and then the second reader are called one after the other for each message, so the time for a message is the sum of its two request times, taken from the saved answers.

## Commands (run in the separate copy; the key file is not named here)

```
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<proxy CA> node eval/run.js --set data/gold_dev.json --reader openai:gpt-6.1-sol --crosscheck openai:gpt-6-luna --key-file <key file> --save-reads out/reads-A.json --out out/live-runs-A72.json -v
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<proxy CA> node eval/run.js --set data/gold_dev.json --reader openai:gpt-6.1-sol --crosscheck openai:gpt-6-luna --key-file <key file> --save-reads out/reads-B.json --out out/live-runs-B72.json -v
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<proxy CA> node eval/run.js --set data/heldout.json --reader openai:gpt-6.1-sol --crosscheck openai:gpt-6-luna --key-file <key file> --save-reads out/reads-A.json --out out/live-runs-U1.json -v
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<proxy CA> node eval/run.js --set data/unseen2.json --reader openai:gpt-6.1-sol --crosscheck openai:gpt-6-luna --key-file <key file> --save-reads out/reads-U2.json --out out/live-runs-U2.json -v --baseline none --labels-current
```

Then, with no model call: `node eval/autofile.js --no-write` with `data/recorded_reads.json` in the separate copy replaced by `reads-A.json` and then by `reads-B.json`, and `node eval/autofile.js --set data/unseen2.json --reads data/live_reads_U2.json --out eval/autofile_liveU2.json` followed by `node eval/analyse_unseen2.mjs . data/unseen2_key_status.json data/unseen2_author_key.json` for the split by sender. Before the live runs, the three recorded commands of the README were run in the separate copy and gave the README's figures (measured: 208 found and 7 missed on the 72, 51 and 6 on unseen set 1, 152 and 44 on unseen set 2, and 72 of 79 agreed and verified right on unseen set 2).

A smoke test on the first 2 example messages came first (measured: 4 requests, $0.0088, no failure).

## Cost and time (measured)

| Run | Messages | Requests | Cost | Median seconds per message | Median seconds per request (95th percentile) | Failed reads |
|---|---|---|---|---|---|---|
| Smoke test | 2 | 4 | $0.0088 | not computed | 5.4 (5.9) | 0 |
| 72 examples, run A | 72 | 144 | $0.2898 | 7.2 | 3.7 (6.5) | 0 |
| 72 examples, run B | 72 | 144 | $0.2615 | 7.8 | 3.7 (7.0) | 0 |
| Unseen set 1 | 30 | 60 | $0.1249 | 9.0 | 4.5 (9.8) | 0 |
| Unseen set 2 | 100 (99 read) | 198 | $0.4767 | 10.3 | 5.0 (9.6) | 0 |
| **Total** | **275 messages sent** | **550** | **$1.1617** | | | **0** |

The total cost of this job was $1.1617 (measured, from usage times the price table), far under the $30 limit. One message of unseen set 2 (U078) matched no hearing, so the evaluator did not send it (as in the recorded run); that is why 550 requests cover 275 messages sent, two requests a message. Wall time was 147 seconds for run A and 146 seconds for run B of the 72, 82 seconds for unseen set 1 and 280 seconds for unseen set 2 (measured; runs A and B were run side by side).

## Results by set (measured, live)

"Found of expected" is the statements in the answer key that the settled reading found. "Right of found" is found divided by found plus extra statements (statements the key does not hold). "Wrong closings" is the evaluator's count of closing statements (ones that can close a gate or set an official fact) that the key does not hold; every one of them was one the verifier would apply. "Handed to a person" is the messages the reading sends to a person.

| Set | Found of expected | Right of found | Wrong closings, of closing statements read | Handed to a person | Messages read exactly |
|---|---|---|---|---|---|
| 72 examples, run A | 200 of 215, 93.0% (88.8% to 95.7%) | 200 of 206, 97.1% (93.8% to 98.7%) | 0 of 120, 0.0% (0.0% to 3.1%) | 17 of 72, 23.6% (15.3% to 34.6%) | 59 of 72, 81.9% (71.5% to 89.1%) |
| 72 examples, run B | 203 of 215, 94.4% (90.5% to 96.8%) | 203 of 207, 98.1% (95.1% to 99.2%) | 0 of 122, 0.0% (0.0% to 3.1%) | 11 of 72, 15.3% (8.8% to 25.3%) | 63 of 72, 87.5% (77.9% to 93.3%) |
| Unseen set 1 | 49 of 57, 86.0% (74.7% to 92.7%) | 49 of 51, 96.1% (86.8% to 98.9%) | 1 of 30, 3.3% (0.6% to 16.7%) | 12 of 30, 40.0% (24.6% to 57.7%) | 22 of 30, 73.3% (55.6% to 85.8%) |
| Unseen set 2 | 146 of 196, 74.5% (68.0% to 80.1%) | 146 of 172, 84.9% (78.8% to 89.5%) | 7 of 85, 8.2% (4.0% to 16.0%), plus 1 right statement with a wrong key detail | 57 of 100, 57.0% (47.2% to 66.3%) | 57 of 100, 57.0% (47.2% to 66.3%) |

The same measures from the recorded runs, replayed in the separate copy for comparison: 72 examples 208 of 215 found, 208 of 216 right, 1 of 128 wrong closings, 8 of 72 to a person; unseen set 1 51 of 57, 51 of 53, 1 of 32, 8 of 30; unseen set 2 152 of 196, 152 of 179, 6 of 87 (plus 2 with a wrong key detail), 59 of 100.

Wrong closings, live: unseen set 1 H059 (schedule changed for AX-119, the same one as in the recorded run). Unseen set 2 U005, U054, U073 (twice), U081, U083 and U100; U005, U073, U081 and U083 are also among the wrong agreed and verified readings of the recorded run listed in the README; U054 and U100 are not.

## Agreed and verified readings (measured, live, from eval/autofile.js)

These are the closing readings both readers agreed on and the verifier passed as a fact: the ones auto-filing would file without a person.

| Set | Agreed by both | Agreed and passed | Right of agreed and passed | Held back by the cross-check |
|---|---|---|---|---|
| 72 examples, run A | 120 | 117 | 117 of 117, 100.0% (96.8% to 100.0%) | 19 (12 in the key): first reader only 13, second reader only 2, readers disagreed 4 |
| 72 examples, run B | 122 | 119 | 119 of 119, 100.0% (96.9% to 100.0%) | 13 (10 in the key): first reader only 6, second reader only 5, readers disagreed 2 |
| Unseen set 1 | 34 | 28 | 23 of 24 the key can judge, 95.8% (79.8% to 99.3%); strict count 23 of 28, 82.1% (64.4% to 92.1%) | 5 (4 in the key): first reader only 2, second reader only 2, readers disagreed 1 |
| Unseen set 2 | 85 | 81 | 73 of 81, 90.1% (81.7% to 94.9%) | 26 (20 in the key): first reader only 24, second reader only 2 |

Recorded, for comparison: 124 of 125 on the 72, 25 of 26 on unseen set 1, and 72 of 79 on unseen set 2. On unseen set 2 the live split by sender is office 39 of 43 right, consultant 31 of 33, other 3 of 5 (measured). Of the 8 wrong live readings on unseen set 2, 7 are statements not in the key at all and 1 (U018) has a date the key does not hold; 5 of the 8 are on messages the key marks as ambiguous.

As proof links on the gate sheet (72 examples): run A proposed 62, all agreed and passed, 62 of 62 right, 94.2% to 100.0%; 3 links in the key were not proposed. Run B proposed 58, all agreed and passed, 57 of 58 right, 98.3% (90.9% to 99.7%); 8 links in the key were not proposed. Run B's wrong link is message 13 as the schedule proof for AX-105 (Hearings I). The statement in message 13 is right, but run B missed the move to June 18 in message 17, so the sheet would hold a proof for the old date. Recorded: 63 of 63. Hearings whose five cells match the key: run A 21 of 24, run B 20 of 24, recorded 23 of 24.

## Run-to-run agreement on the 72 examples (measured)

- Run A against run B: the same applied statements on 62 of 72 messages, 86.1% (76.3% to 92.3%). The same decision to hand a message to a person on 62 of 72, 86.1% (76.3% to 92.3%). Of 213 applied statements in either run, 198 are in both (93.0%); 8 are only in A and 7 only in B. Messages that differ: 9, 11, 17, 18, 19, 30, 34, 52, 66, 69.
- Run A against the recorded run: the same applied statements on 62 of 72; 203 of 217 statements in both.
- Run B against the recorded run: the same applied statements on 62 of 72; 201 of 218 statements in both.

Two live runs differ from each other about as much as each differs from the recorded run. The share handed to a person moved from 17 of 72 (run A) to 11 of 72 (run B) on the same messages, and the recorded run had 8 of 72. Its intervals overlap, but a single run's figure for this should not be quoted as fixed.

## What this shows

- The live readers reproduce the recorded accuracy within the intervals on every set. Unseen set 2 live gives 73 of 81 agreed and verified readings right, against 72 of 79 recorded. About 1 in 10 agreed and verified readings on everyday unseen mail is wrong in both runs, which supports keeping auto-filing off.
- No wrong closing appeared on the 72 examples in either live run (0 of 120 and 0 of 122). The examples were used while the instructions were written, so this is not a fair test.
- Live runs send more messages to a person than the recorded run did on the 72 (17 and 11 against 8), mostly because the cross-check held back more closing statements (19 and 13 held back, against 7). Most of them were found by one reader only; 4 in run A and 2 in run B were found by both readers with different details.
- The live path never failed: 0 failed reads in 550 requests.

## Limits

- The sets are small and fictional. Unseen set 1 holds 30 hard office messages labelled by one person; unseen set 2 holds 100 messages written by an AI author and labelled by two AI labellers and an adjudicator. Neither is a sample of a real mailbox.
- Each set was read once live, except the 72, which was read twice. Two runs are not enough to give a run-to-run spread with an interval of its own.
- The cost is the evaluator's estimate from reported token usage and a price table read on 17 Nov 2026. The OpenAI billing page is the authority.

## Files

The raw outputs of the runs (printed reports, full results, saved raw answers and auto-file outputs) were kept on the build machine and are not published. The saved raw answers let each run be replayed offline with `eval/run.js`.

## Independent check (22 Nov 2026)

A second pass recomputed the figures of this note with its own script, from the raw outputs and the answer keys, without calling any model. What it did:

- It replayed `eval/run.js` offline from the saved raw answers (`reads-A.json`, `reads-B.json`, `reads-U2.json`) in a separate copy of the prototype. The per-message results were identical to the live results on 72 of 72, 72 of 72, 30 of 30 and 100 of 100 messages (measured).
- It counted found, missed and extra statements itself from the settled readings and the answer keys, and computed every interval with its own Wilson formula. All counts and intervals in the table "Results by set" agree (measured). The 215 statements of the 72 examples count message 69's document receipts once for each kind of document, as the evaluator does; counted by type and hearing only, the key holds 213.
- It summed the cost and time of every saved request: $0.2898, $0.2615, $0.1249 and $0.4767, together $1.1528 for 546 requests, and the medians per message and per request in the table (measured). The smoke test ($0.0088, 4 requests) left no saved file, so its figure is the runner's and could not be checked; the total of $1.1617 includes it. The 95th percentile per request for unseen set 1 is the evaluator's (9.8 seconds); a nearest-rank percentile on the saved times gives 9.5 seconds.
- It replayed `eval/autofile.js` offline on the saved answers and judged every agreed and passed reading of the two unseen sets against the key itself. The figures agree (measured): 117 of 117 and 119 of 119 on the 72, 23 of 24 (strict 23 of 28) on unseen set 1, 73 of 81 on unseen set 2 with the same 8 wrong readings, 5 of the 8 on messages marked ambiguous, and the split by sender of 39 of 43, 31 of 33 and 3 of 5. The proof links on the gate sheet (62 of 62 in run A, 57 of 58 in run B with message 13 for AX-105) and the hearings that match the key (21 and 20 of 24) also agree. Replaying the recorded answers of unseen set 2 gave 72 of 79, as in the README.
- It recomputed the run-to-run comparisons from the settled readings; all agree (measured).
- It searched 167 files (the separate copy of the prototype, every output file, the check's own files and this note) for the key, for parts of it and for anything shaped like a key. None was found.
