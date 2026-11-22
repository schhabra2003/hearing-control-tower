# Live run of the two AI readers through `node cli/sheet.js --paste` (21 Nov 2026)

Run once on 21 Nov 2026, 18:07 UTC, in a separate copy of the prototype of that day. Only the six fictional messages of `prototype/data/paste-example/new-messages.json` were sent. The key was read from a local file outside the repository into the environment and never printed or written.

Command: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<proxy CA> OPENAI_API_KEY=<key> node cli/sheet.js --paste data/paste-example/new-messages.json --out paste_live.tsv`

## Results (measured)

- First attempt without `NODE_USE_ENV_PROXY=1`: all 4 messages failed with "The API could not be reached (network or timeout)". Node's built-in fetch ignores the proxy unless told to. 0 requests reached the API, no cost. The failure was handled as designed: each failed message got one NOT READ row for a person.
- Second attempt, with the proxy setting: "Read live: 4 of the 6 messages (H031, H036, U001, new-1) ... No reader failure." The two example messages 66 and 72 were replayed from recorded answers, as designed.
- Cost reported by the API's usage: **$0.0911 for 8 requests** (2 per message). Wall time 76.8 s.
- Live against recorded answers, row by row (Case, Proof cell, proposal): H031 5 of 5 rows identical, H036 3 of 3 identical (the HOLD on Caldmere's process change), U001 1 of 1 identical (handed to a person because the readers disagreed). 9 of 9 rows equal.
- new-1 ("Room C stays as confirmed for June 11. Nothing else has changed."), which has no recorded answer: read live and marked REPEAT for Hearings I on AX-123 and AX-124 ("the same statement as message 67: type nothing"), with the words quoted. Checked by hand against messages 67 and 70: correct, nothing new is stated.
- Output: 23 rows (live) against 22 (recorded; new-1 NOT READ). The two output files (`paste-live-21nov.tsv`, `paste-recorded-21nov.tsv`) are test intermediates and are not published.

## Limits

- Four messages test the live path, not accuracy. Accuracy is measured on the labelled sets: 72 of 79 recorded and 73 of 81 live on unseen set 2 ([../evaluation/live-readers-22nov.md](../evaluation/live-readers-22nov.md)).
- The readers still know only the 24 packet hearings; the firm's own rows are not connected. No mailbox was read.
- Behind a proxy, Node needs `NODE_USE_ENV_PROXY=1` (Node 22.21 or newer). The prototype README says so next to the --paste command.
