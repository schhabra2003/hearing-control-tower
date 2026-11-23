# The prototype folder: the season-one tools, and the later control tower

Everything here is fictional: the names, addresses and messages are the firm's example packet.
Nothing is sent anywhere, no command changes the gate sheet, and no command needs a network
unless you choose to read a new message with your own model key.

The folder holds two different things. Keep them apart when you read the results.

| | What it is | When the firm uses it |
|---|---|---|
| **Season-one tools** (sections 2 to 4) | Small command-line tools beside the gate sheet: the reply rule, the office rule, the inbox connector for exported messages, the two AI readers that only suggest, and the checks | This season, with `docs/week-one-kit.md` and `sheet/gate-sheet.xlsx` |
| **The control tower** (section 5) | `control-tower.html`, one file that opens in a browser, and the engine in `src/` behind it | Later. It is not built for live use this season. The build decision is made in September on the firm's own timed minutes |

Hearing Desk, the web app (`app/dist/index.html`), shows the season-one plan in one offline HTML
file; a hosted copy with the live readers runs at https://hearing-desk.onrender.com/, which also
serves `control-tower.html`. It is described in the root README and is not checked in this file.

## 1. What you need

- **Node 22.** Every command below was run on Node v22.23.4 on Linux on 22 November 2026, on a
  copy of this folder with no key set. Node 20 and other versions are untested.
- **No install step.** There is no `package.json` and no `npm install`. Node 22 reads each file
  by its syntax: older files use `import`, newer ones (`src/office_rule.js`, `cli/office.js`,
  `cli/check_office.js`, `cli/inbox.js`, `eval/autofile.js`) are CommonJS. Do not add a
  `package.json` with a `"type"` line, because it would break one of the two groups.
- **Python 3 with openpyxl, for one script only.** `eval/sheet_threads.py` reads the gate sheet
  (`pip install openpyxl`; run here with openpyxl 3.1.5). The firm does not need Python.
- **An OpenAI key, for the optional live commands only.** `node cli/reading.js --try` and
  `node cli/sheet.js --paste` read new messages with two AI readers when `OPENAI_API_KEY` is set;
  `node eval/run.js` also takes `--key-file <file>`. Without a key they replay recorded answers and
  say so. Behind a proxy, start Node with `NODE_USE_ENV_PROXY=1` (Node 22.21 or newer). The web
  app's live mode (`npm run live` in `../app/`) runs the same readers; see `../app/README.md`.
- **The gate sheet** is opened in a spreadsheet program, not from here. It was built and checked
  in LibreOffice 24.2. Excel for Mac and Google Sheets ran on an earlier build only.

Run every command from this folder (`prototype/`).

## 2. The checks: each command and the line to look for

| Command | What it checks | The line to look for |
|---|---|---|
| `node cli/check.js` | All 216 checks: the engine, the season-one tools, and the tools' agreement with the sheet. About 18 seconds. Add `-v` to see each one | `216 of 216 problems pass  (17819 ms)` (the time varies). The last line is `Actions by level: automatic 16, one click 25, drafted for a person 4, person only 5.` |
| `node cli/replies.js` | The reply rule on 39 fictional example replies | `39 replies: 17 filed by rule, 22 handed to a person.` and `Self-test against what a coordinator would decide by hand: 39 of 39 agree.` The last line says the author of the rule wrote the replies |
| `node cli/check_office.js` | The office rule and the submission simulator | `91 of 91 office checks pass.` |
| `python3 eval/sheet_threads.py` | The installed gate sheet against the 11 example threads and every written rule. With no argument it finds `../sheet/gate-sheet.xlsx`; a path as the first argument checks another copy | 180 lines start with `pass` and none with `FAIL`. Exit code 0 |

The summary lines of `python3 eval/sheet_threads.py`, in the order printed. Rules S1 to S16 and
fixes F1 to F9 are the sheet's first rule groups; Parts I to L are the later parts of the sheet's
rule book:

```
24 of 24 hearings as expected; 11 of 11 threads.
18 of 18 checks on the other tabs as expected.
17 of 17 checks on rules S1 to S5 as expected.
19 of 19 checks on rules S6 to S10 as expected.
19 of 19 checks on rules S11 to S16 as expected.
5 of 5 checks on Reader suggestions, Offices proposals and the arrival time as expected.
4 of 4 checks on the fixes after the independent test (F1 to F4) as expected.
3 of 3 checks on fixes F5 to F7 as expected.
8 of 8 checks on fixes F8 and F9, a date typed as text, the wording and the questions for the firm as expected.
17 of 17 checks on Part I of the rule book as expected.
17 of 17 checks on Part J of the rule book as expected.
11 of 11 checks on Part K of the rule book as expected.
6 of 6 checks on Part L of the rule book as expected.
4 of 4 checks on the command-line tools against this sheet (Part I) as expected.
3 of 3 checks on the command-line tools against this sheet (Part J) as expected.
5 of 5 checks on the command-line tools against this sheet (Part K) as expected.
```

Each line covers one group of rules in the sheet's rule book; all must say "as expected". Part L
is the newest: who asked an office to move a date, the states where a consultant may appear and
sign, and removing a departed consultant's access to the case files. The independent tester's
model of the rules (0 cells different in 893,010, measured) was run on the sheet before Part L;
Part L has only the sheet's own 6 checks above.

Two commands rewrite a file in this folder with the same content each time: `node cli/check.js`
writes `eval/coverage.json`, and `node cli/scale.js` writes `eval/scale.json`.
`node cli/calendar.js` writes `hearings.ics` into the current folder unless you pass `--out` or
`--stdout`. No other command in sections 2 to 4 writes anything unless you pass `--csv`,
`--json` or `--out`.

## 3. The season-one tools, one by one

### The reply rule (`node cli/replies.js`)

The one piece of code season one needs. It reads a consultant's reply to a numbered offer, the
Wednesday text (YES ALL), a day-before text, an arrival request, a case-files text (GOT IT with
the version) or a change notice (OK), by text or in the first line of an email, and files it by
rule or hands it to a person with the reason. Fixed code, no model. `--csv out.csv` writes the
table. When the caller gives the consultant's daily cap and the hearings they hold that day, a
YES that would pass the cap goes to a person: of the 19 example replies to an offer, 7 come with
those numbers, and the cap sends 4 of the 7 to a person.

```
node cli/replies.js --try "YES 1 3" --kind offer --open 1,3
node cli/replies.js --try "Got it 2\n> Reply GOT IT when every file opens." --kind files --version 2 --held 1,2 --channel email
node cli/replies.js --try "Yes, but not before 10" --kind day_before --held 1,2
node cli/replies.js --try "YES ALL" --kind offer --open 1,2 --cap 4 --held-today 3 --offered-today 0
```

The last lines of those four runs:

```
The rule files it: fill the YES proof for hearing 1, 3. Why: YES with offered numbers
The rule files it: record the files received for hearing 1, 2, version 2. Why: GOT IT 2, the current version (first line of the email used: "Got it 2")
The rule hands it TO A PERSON. Why: the day-before reply is not a plain YES
The rule hands it TO A PERSON. Why: over the daily cap: Leo Arlen holds 3 hearings that day and this YES takes 2 more, which makes 5; the cap is 4
```

The flags: `--kind` (offer, week, day_before, arrival, files or change), `--open 1,3` for an
offer, `--held 1,2` for day_before, arrival, files and change, `--dockets "a;b"` for the
Wednesday text, `--version 2` for the case files, `--format video` for an arrival (in person when
left out), `--channel email` (text when left out), and `--cap`, `--held-today` and
`--offered-today` for the daily cap. The message goes to Leo Arlen; `--from "<name>"` shows the
sender check. In the reply, `\n` starts a new line.

### The office rule and the submission simulator (`node cli/office.js`)

Fixed code, no model. It sorts an office's message (an acknowledgment, a notice it cannot find, a
deadline, a date or time change, a cancellation, a video link, a change of the office's process)
and says what a person should type into which cell of the sheet. It only suggests.

```
node cli/office.js
node cli/office.js --try "We cannot find your staffing form." --county Tesswick
node cli/office.js --measure
```

- `node cli/office.js` plays a submission to each of the ten offices by its saved process:
  `90 simulated answers at 10 offices: the rule sorted 90 of 90 as the kind they were prepared as.`
  The last line says this shows handling, not accuracy, because the author of the rule wrote the
  answers.
- `--try` sorts an answer you type. The example prints
  `The rule sorts it as: The office cannot find our notice or form, or says none has arrived (cannot_find).`
  and then what the sheet shows and what the coordinator does next. An answer that changes how
  the office works prints HOLD, a block in the sheet's own words: NO NOTICE GOES TO THIS OFFICE
  UNTIL A PERSON APPROVES THE CHANGE TODAY. A person types their name in Offices AQ and the date
  in Offices AR. The tool proposes Offices M, AS and AT and never the approval cells.
- `--measure` prints the count on the packet:
  `Packet office messages: 31 messages. Kind right: 31 of 31.` (the rule was written from those
  messages) and `Unseen office messages: 30 messages. Kind right: 13 of 30.` with 24 of the 30
  handed to a person. Its last line is
  `unseen H060 | for_person | for_person | right | right`. So the rule is a simulator and a
  detector of process changes, not an accurate filer, and everything it proposes is for a person.

### The inbox connector (`node cli/inbox.js`)

It runs the reply rule, the office rule and the recorded readers over a folder of exported
messages (`.eml` emails and text-line JSON files) and writes one list of proposed filings: tab,
row, column, value, link, who proposed it, and "files itself" or "for a person". Without a folder
it reads `data/inbox-example/`.

| Command | Lines to look for |
|---|---|
| `node cli/inbox.js` | `Inbox folder data/inbox-example: 15 files (13 emails, 2 texts). Nothing was sent and no sheet was changed.`, `Proposed filings: 33. Files itself: 0. For a person: 33.`, `Repeats: 8. A repeat is not a proposal: the cell keeps its first link and nothing is typed.` and `Messages for a person: 4 of 15.` |
| `node cli/inbox.js --autofile` | `Proposed filings: 33. Files itself: 17. For a person: 16.` |
| `node cli/inbox.js --help` | The file types it reads, and two questions for the firm |

Auto-filing is off unless you pass `--autofile`, and the plan keeps it off this season. The
connector writes to no sheet: a person types from its list. The live connection to the firm's
mailbox and text line is not built. It needs the firm's own accounts and the answers to two
questions printed on the sheet's "Day 1 count" tab (rows 20 and 21): which mail service holds the
hearing mailbox and who can give read-only access, and which service runs the consultants' text
line and whether it can export texts.

A message that says again what an earlier message already linked in the same cell is listed
under "Repeats" and not as a proposal. The test is the kit's: a later message replaces the first
link only when it states something the cell needs that the first did not.

### The two AI readers beside the sheet (`node cli/sheet.js`)

The readers' answers on the 72 example messages were recorded from paid runs, so these commands
call no model and need no key.

| Command | Lines to look for |
|---|---|
| `node cli/sheet.js` | `Proposed for the sheet: 63 proof links to accept, 40 cells to leave open with the reason.` and `Handed to a person because the readers disagreed or could not place a passage: 8 of 72 messages.` `--csv out.csv` writes the proposals |
| `node cli/sheet.js --process-changes` | The fixed detector of a change in an office's process. On the 72 examples it flags 1 (message 22), right 1 of 1, false alarms 0 of 33; on the 30 unseen messages it flags 2 (H036, H057), right 2 of 2, false alarms 0 of 28. It says that three process changes in 102 messages is a small sample |
| `node cli/sheet.js --dockets` | First line: `9 dockets from 19 hearings, as the two readers see the example week. This is a list only. Nothing sent.` Last line: `2030-06-18 Orimere, by video: one hearing, held now by nobody, open: 1` |
| `node cli/sheet.js --new-cells` | First line: `37 proposals for the cells the gate sheet gained in rounds 16 and 18 (22 and 15), from the 72 example messages. Fixed code, no model. Every line is for a person. Nothing sent, no record changed.` The sheet lists all 37 on its "Reader suggestions" tab, rows 174 to 210 (read from the sheet). Office addresses, who decided a date change and the day a notice arrived are never proposed, because no message states them |
| `node cli/sheet.js --repeats` | First line starts `18 repeats in the 72 example messages` |
| `node cli/sheet.js --questions` | First line: `8 proposals for Hearings BN from 4 questions that consultants ask in the 72 example messages. Every line is for a person. Nothing sent, no record changed.` |
| `node cli/sheet.js --paste data/paste-example/new-messages.json --out /tmp/paste.tsv` | New mail as rows for the Reader suggestions tab (next section) |

The offer and day-before texts of each docket come from the sheet's Dockets tab (columns H and
I), because only the sheet works out the office time and DO NOT SEND YET. `--dockets` marks
every consultant with no mobile number on file as `(EMAIL ONLY)`, as the Dockets tab does.

### New mail onto the Reader suggestions tab (`node cli/sheet.js --paste`)

The Reader suggestions tab holds what the readers proposed for the 72 example messages. This
command is the written way for new mail to get there. A person saves the new messages as one JSON
file in the packet's message format (`data/paste-example/new-messages.json` has 6), runs the
command, copies the file it writes into column A of the first empty row of the tab, then types
yes or no in column G and types the cell.

```
node cli/sheet.js --paste data/paste-example/new-messages.json --out /tmp/paste.tsv
node cli/sheet.js --paste-help
```

Lines to look for, with no key set:

```
No key is set (the environment variable OPENAI_API_KEY is empty), so NO MODEL WAS CALLED: this run replayed recorded answers of the two readers (gpt-6.1-sol checked by gpt-6-luna).
Recorded answers replayed for 5 of the 6 messages (66, 72, H031, H036, U001); 2 of them are example messages of the packet, read at their own place.
There is NO recorded answer for 1 of the 6 messages (new-1): it was NOT READ by any reader. ...
Wrote /tmp/paste.tsv: 26 rows for 6 new messages from data/paste-example/new-messages.json. Proof links to accept or refuse: 2. ...
```

It does not read a mailbox, and it knows the packet's 24 hearings only: for the firm's own
hearings it must first be given the firm's rows, which is not built. With a key each new message
goes to the two readers, two requests a message. **That path was run once with a real key**, on
21 November 2026, on an earlier version of this command: 4 new messages read live in 8 requests
for $0.09 and 76.8 seconds, the live rows equal to the recorded ones in 9 of 9 (measured). It
is a test of the path, not of accuracy. On 22 Nov 2026 both readers ran live on every labelled set
with `node eval/run.js --reader openai:gpt-6.1-sol --crosscheck openai:gpt-6-luna --key-file <file>`:
117 of 117 and 119 of 119 agreed and verified readings right on the 72 examples (two runs), 73 of
81 (90.1%) on unseen set 2 against 72 of 79 recorded, 550 requests, 0 failed, $1.16 (measured;
`../docs/evaluation/live-readers-22nov.md`). Behind a proxy use
`NODE_USE_ENV_PROXY=1 node cli/sheet.js --paste new.json`; without it every message gets one
NOT READ row for a person.

### The calendar file (`node cli/calendar.js`)

It writes the hearings that `--dockets` lists as an iCalendar file in UTC, then reads it back
with a parser written from RFC 5545 and checks it. The sheet has the same file on its "Calendar
file" tab; a coordinator uses the sheet's.

```
node cli/calendar.js --out /tmp/hearings.ics
```

Lines to look for (the path is the one you gave):

```
Hearings in person: 6. For 6 of them (Larkmere, Tesswick) the office's street address, room and place to report are not on record, so LOCATION reads ADDRESS NOT ON RECORD and names the cell of Offices BA, as the gate sheet does. Give an answer with --address "County=...".
Checked /tmp/hearings.ics: 19 events for 19 hearings, 249 lines, the longest 75 octets (limit 75).
PASS: every event parses, and the UTC start of 19 of 19 timed events equals the local time minus the office's hours from UTC (UTC-05:00; for UTC-05:00 that is local time plus 5 hours).
```

The last line says the file was not imported into a calendar product here. The sheet's own file
for the example (17 events) was imported into Apple Calendar on 21 November 2026 with no error,
on an earlier build; Google Calendar and Outlook were not tried. `--address "Larkmere=..."` gives
an office's address; `--clocks "Larkmere=yes"` gives its answer to the clock-change question.

### Auto-filing, measured (`node eval/autofile.js --no-write`)

Should a proposal that both readers agree on and the verifier passes fill its cell without a
person? This command counts, from the recorded runs only.

| | 72 example messages | 30 unseen messages |
|---|---|---|
| Agreed by both readers and passed by the verifier | 125 | 30 |
| Right, of those the answer key can judge | 124 of 125 (95% interval 95.6% to 99.9%) | 25 of 26 (95% interval 81.1% to 99.3%) |
| Strict count (the 4 the key cannot judge counted as wrong) | the same | 25 of 30 (95% interval 66.4% to 92.7%) |

As proof links on the 72 examples:
`Proof links proposed: 63. Agreed and passed: 63 of 63. Right against the answer key: 63 of 63 (100.0%, 95% interval 94.3% to 100.0%), wrong 0.`
One person, the author of the readers' instructions, wrote the answer key, and the 72 examples
were used while those instructions were written.

**A second unseen set, 100 messages in an everyday mix** (recorded on 20 November 2026; no model
is called):

```
node eval/autofile.js --set data/unseen2.json --reads data/recorded_reads_unseen2.json --out /tmp/y.json
```

It prints `Closing readings both readers agreed on: 87. Of those 87, the verifier passed 79 as a fact and did not pass 8 (signal 6, belief 1, provisional 1).`
and `Of the 79 agreed and passed: right 72 (91.1%, 95% interval 82.8% to 95.6%), wrong 7.`
The set was written by an AI author who did not see the readers' instructions, and labelled by two
AI labellers and an adjudicator; no human labelled it. Pooled with the first unseen set: 97 of 105
right. `node eval/analyse_unseen2.mjs . data/unseen2_key_status.json data/unseen2_author_key.json`
gives the same count by sender.

**The plan keeps auto-filing off this season.** About 1 wrong proof in 11 on everyday unseen mail
is too many for a cell that decides whether a hearing is covered. The condition for switching it
on is the sheet's own sentence (Reader suggestions A168); the firm's log is the measurement.

### Try the readers on a message of your own (`node cli/reading.js --try`)

```
node cli/reading.js --try "Both packets received. Video room C is confirmed." --from "Velloran office"
```

Without a key the first line starts
`No key is set: the environment variable OPENAI_API_KEY is empty, so no model was called and your message was not read.`
It then replays the recorded reading of example message 62; the last line is
`For a person: no reason found by the readers or the checks.` With `OPENAI_API_KEY` set, two
models read your message and the same checks run. This command was never run with a real key.
Send only fictional or approved text; before the readers read real mail, Alice and counsel give
their written yes (Day 1 count tab, row 18).

### The business case as tables (`node cli/economics.js`)

Prints the estimates the write-up quotes. Change any input, for example
`node cli/economics.js hearingsPerYear=20000 winRate=1`. Every figure is an estimate. Last line:
`A READER'S CHECK, REPRODUCED: 12.4 minutes saved at $35 to $50 an hour is $7.23 to $10.33 per hearing. An engineer at $150,000 to $200,000 breaks even at 14,516 to 27,650 hearings a year, the lean build (at $40,000 to $70,000 a year) at 3,871 to 9,677.`
Its 17.8 coordinator minutes a hearing do not count the checks added since; with them the
estimate is 18.7 to 19.6 minutes against 19.6 today. No saving in minutes is claimed for season
one.

## 4. Playing a whole case with the season-one tools

1. Open `../sheet/gate-sheet.xlsx` and read the "How to use" tab. The 24 example hearings
   are the rows; column W is the status and column BE says what to do next.
2. `node cli/inbox.js` shows what the tools would propose for 15 exported messages. Compare a
   line with the same row on the sheet's "Reader suggestions" tab.
3. `node cli/replies.js --try ...` plays a consultant. `node cli/office.js --try ... --county ...`
   plays an office.
4. `python3 eval/sheet_threads.py` shows that the sheet reads every example thread as expected.
5. `node cli/sheet.js --paste data/paste-example/new-messages.json --out /tmp/paste.tsv` writes
   rows for new mail, and `node cli/calendar.js --out /tmp/hearings.ics` writes a calendar file.

## 5. The control tower (the later step)

The design for the 5,000-hearing season. It gets no credit in the season-one plan; it is here so
the firm can see where the plan leads.

**Double-click `control-tower.html`.** It opens in any current browser with no server and no
network, and holds the engine, the app and the data in one file.

| Page | What to do there |
|---|---|
| **Start here** | The numbers of the example week and a five-minute tour |
| **Board** | The 24 example hearings and their five gates. Click a hearing to see the message that closed each gate. "Replay the week" replays the 72 example messages in order |
| **Work queue** | One card per open action, with the draft, the reason and the timer. You play the offices and consultants; every answer goes through the same reading and checks as a real message |
| **Messages** | Every message with its trace: who spoke, which hearing, what each statement was allowed to change, and why |
| **Try a message** | Write any message from any sender. Thirteen presets cover a forged office address, a rumour, a phone call, a "not" that matters, and a message that tries to give the AI orders |
| **Counties** | The ten county process files. Change a rule for every county, or add an eleventh with no code change |
| **Scale** | The scale runs (45,300 simulated hearings) and a smaller test you can run in the browser |
| **Business case** | Cost per hearing, what the kit and the tower are each worth, and staffing for a peak week. Every input is a slider with its basis |
| **Checks** | 144 checks you can re-run in the browser (the other 72 of the 216 are for the season-one tools), the readers' results, and the cost and time of every model call |
| **How it works** | The design in plain words: the ledger, the authority table, the gates, the planner |

The clock is simulated; the buttons at the top move time forward. *Undo* takes back the last step
and *Reset* returns to the end of the example week. Nothing is saved.

**Live readers on "Try a message" (optional, needs a key).** Create `.env` in this folder with
`OPENAI_API_KEY=...`, run `node app/server.js` and open http://localhost:4173. This server is the
only program here that reads a key from a file; the key stays in the server process and the
server listens on this computer only. It was not started for this release. Only OpenAI was
measured (`gpt-6.1-sol` checked by `gpt-6-luna`). An Anthropic adapter and an adapter for any
OpenAI-compatible endpoint (`src/extract/compat.js`) exist but were never run against a live API.

**The tower's commands:**

| Command | What it does | Line to look for |
|---|---|---|
| `node cli/trace.js` | Every recorded model call: cost, time, agreement, alarms | First line: `MODEL CALLS: 204 calls for 102 messages, $0.3545 in all, $0.00348 per message` |
| `node cli/scale.js --quick` | A small scale run, under a minute; does not overwrite the results | `Written: eval/scale_quick.json` |
| `node cli/scale.js` | All 51 scale runs on all cores; 299 seconds on 4 threads in its last run, not rerun for this release. Rewrites `eval/scale.json` | First line: `51 runs (17 settings, 3 seeds each), 45300 simulated hearings, on 4 threads.` |
| `node cli/build.js` | Rebuilds `control-tower.html` from the source | `Wrote <this folder>/control-tower.html  (1345 KB, 38 modules). Open it in a browser: nothing to install.` |

The reader results can be reproduced without a key:

```
node eval/run.js --set data/heldout.json  --reader recorded:data/recorded_reads.json --crosscheck recorded:data/recorded_reads.json
node eval/run.js --set data/gold_dev.json --reader recorded:data/recorded_reads.json --crosscheck recorded:data/recorded_reads.json
node eval/run.js --set data/heldout.json  --reader rules
```

Each ends with one line of JSON. The fields to read:
`"messages":30,"found":51,"missed":6` and `"false_closings":1` for the first;
`"messages":72,"found":208,"missed":7` and `"false_closings":1` for the second;
`"messages":30,"found":5,"missed":52` for the third (the offline pattern reader on unseen wording).
A fresh paid run with your own key costs about 20 cents (estimate from the earlier paid runs).

## 6. What is real, what is simulated, what is an estimate

| | |
|---|---|
| **Measured** | The checks in section 2. The reply rule on its 39 example replies. The office rule on the packet's office messages and on 30 unseen ones. The AI readers' recorded answers on 102 labelled messages and on the 100 messages of the second unseen set. The counts in the scale runs |
| **Simulated** | Every counterparty. In `node cli/office.js` the offices' answers are prepared ones. In the scale runs, generated offices, consultants and homeowners answer, stay silent and make mistakes at rates set by a scenario |
| **Estimates** | Every number in minutes or dollars, including everything `node cli/economics.js` prints and the Business case page. Nobody has timed the real firm |

From the tower's scale runs (simulated): 0 of 7 safety rules broken in 45,300 hearings, and 5.6
to 5.8 person-minutes per hearing from 100 to 3,200 hearings against 35.5 to 38.0 by hand. Those
runs assume near-perfect reading; with measured reading added back it is 6.1 to 14.9.

## 7. Known limits

- **Small samples, written for the test.** The first unseen set has 30 office messages labelled
  by one person; the second has 100, written and labelled by AI with no human. Neither is a real
  mailbox. The 39 example replies and the office rule's labels were written by the rule's author.
- **Nothing live is connected.** No mailbox, text line, calendar, case system or county portal.
- **New mail reaches the sheet only by hand**, through `node cli/sheet.js --paste`, which knows
  the packet's 24 hearings only.
- **Untested:** `node cli/reading.js --try` with a real key, the latest `--paste` with a real key,
  any open-weight model, Node 20, and the sheet as it is now outside LibreOffice 24.2.
- **Part L of the sheet** has its own 6 checks only; the independent test was not run on it.
- **The office rule is weak on new mail**: 13 of 30 unseen office messages sorted right, 24 of 30
  handed to a person.
- The offline pattern reader finds 5 of 57 statements on unseen wording. It lets the tower run
  without a key; it is not the product.
- The tower keeps its state in the browser's memory. A real deployment needs a database, sign-in
  and an audit log.

## 8. Where things are

```
cli/replies.js, src/replies.js          the reply rule
cli/office.js, src/office_rule.js       the office rule and the submission simulator
cli/inbox.js, data/inbox-example/       the inbox connector and its example folder (15 messages)
cli/sheet.js, cli/reading.js            the two AI readers beside the sheet
cli/calendar.js                         the calendar file in UTC, with its check
eval/autofile.js                        the auto-file analysis
cli/check.js, cli/check_office.js       the checks
eval/sheet_threads.py                   the gate sheet against the example threads (Python, openpyxl)
cli/economics.js                        the business case as tables
control-tower.html                      the later control tower in one file
app/                                    the tower's web app and its small local server
src/                                    the tower's engine: ledger, verify, derive (gates), plan, playbook, sim
src/extract/                            the readers: rules (offline), openai, claude, recorded, cross-check
playbooks/                              one data file per county, plus the default
data/                                   the example packet, the labels, the unseen test sets, the recorded reads
eval/                                   the checks' data, the reader evaluation, the scale results
```
