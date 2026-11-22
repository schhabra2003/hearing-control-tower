# Problem coverage: what is solved, what is not, and how I know

**Short answer: no, not every problem is solved, and "best possible" cannot be proven.** Every problem I could find has an answer and a check, and all checks pass. The firm's real minutes, real mail and real offices have not been met. The unsolved parts are named in sections 6 to 9 and in the last column of section 11.

Every number is labelled **measured** (counted from a run you can repeat), **simulated** (counted, in a generated world), **sourced** (from a public document or the case packet) or **estimate** (my assumption). Figures are as of 22 November 2026.

Two lists answer different questions:

- **Section 11: what the firm does this season, problem by problem.** The 125 items of the independent audit, plus three found after it (X32 to X34), each with the answer the firm runs this season, where it lives, and what only the firm, an office, counsel or a consultant can supply. A person at the firm should start there.
- **Section 10: the 216 automatic checks**, most of them on the engine of the later control tower.

## 1. The verdict

- **Every problem in the 72 example messages has a check, and all pass: 63 of 63** (measured).
- **81 problems the examples do not contain** (rules, silence, people, scale, wording, the business arithmetic, watching the AI readers, faults reviews found in my own work) also pass: **81 of 81** (measured).
- **72 more checks cover the season-one tools** (reply rule, daily cap, typed messages, the words shown for a yes, the process-change detector, auto-filing, the inbox connector, and the tools' agreement with the sheet): **72 of 72** (measured). Total **216 of 216**. The office rule has its own **91 of 91** and the reply rule **39 of 39** (measured).
- **The gate sheet** shows each of the 11 example threads as a careful coordinator would: **180 pass lines, 0 FAIL** on the installed sheet (md5 2e74089c917b1bcc1ac36f5f7de3e7ce; `python3 prototype/eval/sheet_threads.py`, 22 Nov 2026) (measured).
- **An independent tester** built a model of the sheet from the written rules, without the sheet's generator. On nine generated worlds of 1,000 to 1,199 hearings: 893,010 cells compared, 0 differences, 0 error values (measured by the tester, on the sheet before Part L). **The independent test of Part L (X32 to X34) did not run**; Part L was checked by the sheet's author and by the thread check above.
- **The reply rule** decides 39 of 39 fictional example replies as a coordinator would: 17 filed, 22 to a person (measured; the rule's author wrote the replies).
- **Seven safety rules were never broken in 45,300 simulated hearings** of the later control tower (simulated).

| Aspect | Verdict | Confidence | Why not higher |
|---|---|---|---|
| Answers what the assignment asks for | Yes, all 12 asks (section 2) | High | It is my reading of the brief |
| Problems in the 72 examples | 63 of 63 checks pass | High for the engine | I wrote both the code and the checks |
| The season-one plan against the audit | 125 audited items: 109 Yes, 8 Yes pending the firm, 8 Partly, 0 No. X32 to X34 were added after the audit and are handled on the sheet, not yet audited | Medium | Nobody has re-audited since. The Partly items are partly answered by design, with no saving claimed |
| The gate sheet's formulas | 0 differences from an independent model in 893,010 cells | High in LibreOffice 24.2 | Excel and Google Sheets ran an earlier build only; Part L not independently tested |
| Safety when the AI is wrong or attacked | 0 of 7 rules broken; forged and injected messages change nothing | High | Tested by me and two reviews, not an outside red team |
| Scaling with volume and counties | Flat with volume, slow rise with counties | Medium | Simulated world, estimated minutes |
| Reading real messages | First unseen set: 89% found, 96% right. Second, everyday set: 72 of 79 agreed and verified filings right | Medium to low | 30 and 100 messages written for the test; no human labeller on the second |
| Fit to the real firm | Unknown | Low | No real data, no timed week, no real county |

The largest unsolved parts: no real mailbox, text line or county is connected; the minutes are estimates and no saving of coordinator minutes in season one is claimed; the AI reader and office rule tests are small and use messages written for the test; the sheet was tested in LibreOffice only on its current build; growing past one workbook is designed and was not run.

## 2. What the assignment asks for, and where it is

| # | The ask (paraphrased) | Where it is answered | Status |
|---|---|---|---|
| 1 | More hearings, less human work, fewer errors | Section 11, items R1 to R3 and R19; section 4 for the later tower | This season: capacity and checks, no measured saving of work. Later: simulated |
| 2 | Measures (KPIs) | One-page write-up; design document section 10 | Done |
| 3 | Priorities, first to later, and why | One-page write-up; design document section 12 | Done |
| 4 | Process for the first priority | `docs/week-one-kit.md` and `sheet/gate-sheet.xlsx` | Done |
| 5 | Prototype of the solution and agents | The season-one tools, Hearing Desk (the web app) and `prototype/control-tower.html` | Done |
| 6 | Where people are needed | Design document section 9; the sheet's daily list | Done |
| 7 | How the firm knows the work is complete | The Status column: OPEN, READY, CONFIRMED, then DONE once the result, arrival time and written decision are logged; the Friday Record check | Done |
| 8 | Assumptions, people, tools, budget | One-page write-up; design document sections 4 and 13 | Done, estimates |
| 9 | Use the access described; simulate outside messages | Nothing is sent. `node cli/replies.js --try` plays a consultant, `node cli/office.js --try` an office; `node cli/inbox.js` reads exported messages | Done; office answers are prepared ones |
| 10 | One-page write-up | `docs/write-up/one-page-write-up.pdf` | Done |
| 11 | Instructions to play with it | README and `prototype/README.md`, every command with the line it prints | Done on Node 22 |
| 12 | A visual if it helps | The process diagram in the write-up; the web app | Done |

The firm cares most about scaling. Section 4 answers that.

## 3. The problems, by kind

The full list of all 216 checks is in section 10.

| Group | Checks | What kind of problem |
|---|---|---|
| The 11 example threads (A to K) | 63 | A "maybe" written down as a yes. A calendar edited before the county agreed. A consultant who accepts one of two hearings. A process changed by phone. A wrong signature. An old packet version. Illness the evening before. A homeowner who goes to the county directly. An unconfirmed withdrawal. A deadline on a Saturday |
| Operating rules (R) | 11 | Only the county moves a date. Look-alike addresses. Text that gives the AI orders. Duplicates. Messages out of order. Consultant limits and channels |
| Silence and repeats (T) | 8 | No answer. A late yes after someone else was asked. Two people say yes. Double clicks |
| People (P) | 11 | Homeowner consent. A stranger as "the new clerk". Messages the reader does not understand. A person who corrects a reading cannot change who said it |
| Postponement (N) | 2 | A ready hearing taken off the calendar; a phone call that may be wrong |
| Scale (S) | 7 | An eleventh county. A rule that changes everywhere. Offices that never confirm |
| Output quality (Q) | 5 | Template faults. Same answer after a restart. Every status traceable |
| Not said plainly (V) | 8 | Guesses, questions, conditions, promises and denials that look like a yes |
| Found by review (W) | 21 | Faults in my own earlier versions, each kept as a check |
| Business case (M) | 5 | Return on investment, an engineer, what a miss is worth, figures that add up, sliders at their ends |
| Observability (O) | 3 | Traces with no homeowner mail; costs that add up; drift that raises an alarm |
| Season-one tools | 72 | A YES over a consultant's daily cap. A typed message with no model key. A process change by phone. Whether agreed proposals may file themselves. Exported mail. The tools printing what the installed sheet says. New mail onto the sheet. Repeats. A consultant's question |

### Rules on the sheet, and the problem each solves

The sheet is a spreadsheet, not the engine, so these rules are checked on the sheet itself (`sheet_threads.py`) and, before Part L, in the independent test. The ids are those of section 11.

| Rule on the sheet | The problem it solves |
|---|---|
| A GOT IT or day-before YES counts only for the consultant named beside it (Hearings BW, BX); BE names every cell to clear on a replacement | A replacement inherited the old consultant's proofs (W5) |
| A silent consultant at 2:00 p.m. becomes one "not free" row; the hearing turns open, is offered with a one-hour deadline, and Ask next leaves them out | The sheet still counted a silent consultant as staffed |
| Offers ask for an answer in one hour (next working day), two hours (within three working days) or by noon next working day | The text said two hours where the 4:00 p.m. step needed less |
| A room letter is not a link; a video hearing is ready only with a link or number, or the office's word that the room is all it sends | "Video room C" closed the check (X11) |
| A receipt closes the files check only for the version it names or "current" | "Packets received" counted as proof of the current version (X12) |
| The in-person day-before text gives one clock time; a later time from the consultant prints REPLY TODAY. A time the consultant said they cannot make is not printed | Consultants named later times; the rule once asked Maya to arrive when she was not free (X16, X24) |
| A hearing at the office's opening is prepared a working day before and reads OPENING NOT ARRANGED until arranged | The morning call would reach a closed office (X13) |
| An offer that is out counts toward the consultant's daily cap | Two same-day dockets could pass the cap together (X7) |
| Every text, the TELL line and the notice say whose clock a time is on; the calendar is an iCalendar file in UTC, with clock changes computed | Bare times across time zones (X9) |
| An office's rules are typed once and read by formulas: naming deadline, who signs, travel gaps, hearing length, notice fields, phone number, address, last day for a date request | An office's answer changed nothing until retyped row by row (W3, W6, R20, X20, X27, X29) |
| A changed office route blocks every notice until a person approves it the same day | A notice went by a route the office no longer accepted (D2) |
| A notice the office cannot find is shown as sent and not found | A lost notice read like one never sent (D3) |
| A call an office asks for is a task with the office's hours; a call never closes a check | The call was in the kit only (D4) |
| A held hearing is not DONE without an arrival or join time; a record with no row counts as a disagreement | DONE ignored the arrival (R10) |
| A consultant with no mobile number is flagged, and every step that would text them prints the email fallback | Only two of six were flagged (X14) |
| An illness report puts that consultant's hearings in the next 7 days at the top of the list until their own yes | A consultant ill on Thursday still held Monday's hearing (X17) |
| A date-change request needs the bench asked first, the homeowner's yes and a named decider; the office's answer is recorded | The firm asked offices to move hearings for one consultant (X21) |
| A settlement lists six missing parts and stays staffed until the office says it is off the schedule | "Ready to sign" had no acceptance or deadline (X22) |
| Before a document is collected again, a person checks the current case files | An office asked for what the files already held (X23) |
| A clearer copy asked for once is not asked again; the fallback falls due at noon next working day | The wait was in the kit only (E4) |
| The homeowner is named on every row; a move prints CALL THE HOMEOWNER, and one call covers two hearings | Nobody said whom to call (X26, H6) |
| Each office's route reads CONFIRM IN WRITING until dated, and again after six months | Only one office's instructions had a date (X28) |
| After an office moves a hearing, its record of our name counts only for the date it was given | The old record closed G3 for the new date (C2, C3, H4, X30) |
| A result is typed with who reported it, when, and the link; an unclear result reads RESULT NOT CLEAR | A phoned result had no source (J1) |
| "Tomorrow" or "this week" gets a real date; a paper notice gets its arrival day | Words gave no date to count from (D4, H1, X31) |
| **Part L.** A move records who asked; a consultant who asked the office without the firm is asked why that day and told the rule | Every county lets consultants request a date change (X32) |
| **Part L.** Each consultant's states to appear and sign (Bench S). Once answered, no offer in another state; while a question, a warning on the offer and a question to counsel on anything to be signed | Eligibility follows state lines; Owen signed in Brindlefen (X33) |
| **Part L.** When a consultant leaves a hearing after files went to them, their access to the folder links is removed and dated (Hearings EC) | Files stayed open to consultants who left (X34) |

**What was tested outside LibreOffice.** Excel for Mac (20 Nov 2026) recalculated an earlier 1,200-row build with every formula kept and no error value; Google Sheets (21 Nov 2026) did the same for an 80-row copy; Apple Calendar imported the example's 17 events on the expected days. None was re-run on the current sheet. Not tested anywhere: the full sheet in Google Sheets, Excel for Windows, row actions (cut, paste, insert, delete, sort) outside LibreOffice, Google Calendar and Outlook. Details are in `CHECKS.md`.

## 4. Scaling: the question the firm cares about most

All simulated: 51 runs, 45,300 hearings, three seeds per setting. The minutes are estimates.

| Question | Result |
|---|---|
| 32 times more hearings (100 to 3,200, 20 counties) | 5.6 to 5.8 person-minutes a hearing with the tower; 35.5 to 38.0 by hand |
| 32 times more counties (5 to 160, 800 hearings) | 5.5 rising to 7.1; the rise comes from offices that need phone calls |
| A worse season (none, calm, typical, rough) | 1.8, 2.9, 5.6, 14.6 with the tower; 23.6, 27.9, 37.5, 57.8 by hand |
| Ready when the hearing is held | 100%, 99.3%, 94.2%, 74.3% |
| More autonomy (typical season) | 2.49 to 0.40 touches a hearing, 5.6 to 3.9 minutes |
| Safety rules broken | 0 of 7, in every run |
| Shown ready equals audited ready | 17 of 17 settings |

**A correction against my own result.** The scale runs assume almost every message is read without a person (about 0.4%). Measured reading sends 11% (examples) to 27% (unseen) of messages to a person. With that, a typical season costs **6.1 to 14.9 person-minutes a hearing, not 5.6**: still 60% to 84% less than by hand (arithmetic, not a run).

**The business view** (estimates, `node cli/economics.js`):

- A hearing costs about $104, $90 of it the consultant. What it earns is not known ($97 to $387 on public figures). A fee under $104 on day 1 reverses the order: a booking rule comes first.
- Season one costs about $12,000 of set-up at 300 hearings and $23,000 at 1,000. It buys reliability and capacity, not a saving of work: with the confirmation checks the plan is 18.7 to 19.6 productive minutes a hearing against 19.6 today.
- Coordination still grows nearly in a straight line: 9.9 to 8.8 coordinators per 1,000 peak-week hearings with the plan, 10.9 today, 4.8 with the tower. At 5,000 hearings the tower frees about $40,200 of coordinator time a year, $24,100 of it in cash, against a lean build of $40,000 to $70,000. September decides on the firm's timed minutes.
- **The limit on growth is the bench**: 16 to 27 names at 1,000 hearings and 79 to 131 at 5,000 at 2.4 hearings a consultant-day, depending on the days each gives; 6 to 10 at 300.

**What does not scale yet.** In a rough season 68% of the remaining person time is phone calls and decisions after someone stayed silent. Portal connectors, a deeper bench and call transcription address that; they are in "Later".

## 5. The AI readers (measured, recorded paid runs, fictional messages only)

One model checked by a second, cheaper one. A statement that closes a gate needs both; one that opens work needs one.

| | 30 unseen office messages | 72 examples (not a fair test) |
|---|---|---|
| Statements found | 51 of 57 (89%, interval 79 to 95) | 208 of 215 (97%) |
| Applied statements that were right | 51 of 53 (96%, interval 87 to 99) | 208 of 216 (96%) |
| Wrong closings | 1 of 32 | 1 of 128 |
| Messages to a person | 8 of 30 (27%) | 8 of 72 (11%) |

Both wrong closings restate a date the record already holds. Cost: $0.0035 a message for both readers, about 4.4 seconds a request; about $2.02 spent on all runs.

| Measured, from recorded runs or fixed code | 72 examples | 30 unseen |
|---|---|---|
| Agreed and verified readings that are right (`node eval/autofile.js --no-write`) | 124 of 125 | 25 of 26 the key can judge; 25 of 30 strict |
| Proposed proof links right | 63 of 63 | n/a |
| Process-change detector | 1 flagged of 34, 0 false alarms | 2 flagged of 30, 0 false alarms |
| Office rule (`node cli/office.js --measure`) | 31 of 31 after one fix (written from these) | 13 of 30 sorted right, 24 to a person |

**Second unseen set, 20 November 2026** (100 everyday messages: 44 office, 39 consultant, 9 staff, 8 homeowner; written by an AI author who did not see the readers' instructions; two AI labellers agreed on 183 of 200 statements, kappa 0.94, an adjudicator settled 17; no human labelled it; $0.53):

| Measured | Result |
|---|---|
| Statements found, missed, extra | 152, 44, 27 |
| Messages to a person | 59 of 100 |
| Agreed and verified closing readings that were right | 72 of 79 (91.1%, interval 82.8 to 95.6) |
| By sender | office 38 of 42, consultant 31 of 32, other 3 of 5 |
| False filings on the 19 messages with nothing to file | 0 |
| Pooled with the first unseen set | 97 of 105 (92.4%, interval 85.7 to 96.1) |

**Decision for this season: auto-filing stays off.** About 1 wrong proof in 11 on everyday mail is too many for a cell that decides whether a hearing is covered. The condition for switching it on for one kind of proof is on the sheet (Reader suggestions tab, row 168; question 35 in section 11.7).

## 6. Designed, not built

| Missing | Why it matters | What stands in |
|---|---|---|
| A real mailbox, text line, calendar and county portals | Nothing has met real mail | `node cli/inbox.js` reads exported messages and proposes filings; a person types the cells. The calendar is a file a person imports |
| A lock on the sheet | A spreadsheet cannot hold back a message or protect a cell | The kit makes approval a named person's step; a bought tracker must lock it |
| More than one workbook | The split, loans between teams and the weekly roll-up were not run | Kit appendix, section 15, labelled designed and not run |
| A database, sign-in and a durable audit log (tower) | State lives in the browser's memory | The ledger is append-only and replayable by design |
| A second model provider and open-weight models | Only OpenAI was measured; the Claude and OpenAI-compatible adapters never ran live | One reader interface and the same labelled messages to score them |
| A tracing backend | Trace records and alarms exist but ship nowhere | The records use OpenTelemetry's names |
| Call transcription and portal connectors | The largest remaining cost in a rough season | Phone work stays with a person |
| County rules beyond the ten examples | Real boards have reschedule limits, notarised forms and yearly changes | A county is a data file with layers |

## 7. Needs a person, the county or the homeowner, by design

- Everything said to a homeowner, and consent for a withdrawal.
- Phone calls. A call opens work and closes nothing until it is in writing.
- A statement the two readers do not agree on.
- Approving a new county's process, and any change to a rule.
- Choosing between two bad options.
- The county itself: if an office never answers, nothing can close the gate. In the rough season this is why 25.7% of hearings are not proven ready when held (simulated).
- Who may appear and sign in each state: counsel's answer, typed in Bench S.

## 8. Not measured

1. **The firm's real minutes.** Every minute is my estimate.
2. **The real share of messages that need a person.** 11% and 27% come from sets written to be hard. It moves the tower's result from about 6 to 14.9 minutes.
3. **Real rates of silence, changes and illness.**
4. **Consultant and homeowner messages on real wording.** The second unseen set has 39 consultant and 8 homeowner messages, written by AI and labelled by no human.
5. **Waiting time** for a person to confirm a reading.
6. **Attachments, photos, scans and voicemail audio.** The prototype reads text.
7. **The firm's money:** fee per hearing, share of cases that reach a hearing, volume, miss rate, peak staffing.
8. **Any open-weight model.**
9. **Run-to-run variation.** Three live runs of the same pair found 51, 49 and 48 of 57.

## 9. Checks on my own work that did not happen

- Of 23 planned independent technical reviews, 2 ran. With the scale simulation and the unseen set they exposed 18 faults, all fixed and kept as checks (W1 to W18). More reviews would likely find more.
- The independent test of Part L (X32 to X34) did not run.
- Of 6 planned parts of the unseen test set, 1 was built (30 office messages), plus the second set of 100.
- I wrote the code and the checks. A check proves the behaviour I thought of.
- The independent sheet test and the outside tests were read from their reports, not re-run for this file. The prototype commands and `sheet_threads.py` were re-run on 22 November 2026 on Node 22, on the installed sheet.
- Nothing ran on Node 20. `reading.js --try` never ran with a real key. `node cli/sheet.js --paste` ran once with a real key on 21 November 2026, on an earlier version of the command: 4 messages in 8 requests for $0.09, live rows equal to recorded ones in 9 of 9 (a smoke test, not an accuracy measure). On 22 Nov 2026 the two readers (gpt-6.1-sol reads, gpt-6-luna checks) were run live on every labelled set: 275 fictional messages, 550 requests, 0 failed, $1.16; 73 of 81 agreed and verified readings right on unseen set 2, against 72 of 79 recorded (measured; docs/evaluation/live-readers-22nov.md).
- The answers in section 11 have not been re-audited since the audit of 125 items.

## 10. Every problem, one by one

Generated from `prototype/eval/coverage.json`; `node cli/check.js` runs every row, and all 216 pass (measured). "Then" is the behaviour the check demands. Rows D2 to D4, G1 and K1 here describe the later control tower's engine; section 11 says what the firm does this season.

### Examples 1-6 · Willow Lane, Larkmere

| Id | Problem | Then |
|---|---|---|
| A1 | Maya says she is "usually free" and needs to check. The firm writes her name on the planning sheet anyway. | A maybe is not a commitment. Neither hearing counts as covered, and the system asks Maya for a yes or no. |
| A2 | The office asks three times who will attend, the last time with a deadline of 4 p.m. on June 7. | The three requests are counted, the deadline is captured, and the "representative recorded" gate shows a problem. |
| A3 | Maya accepts only the 9:30 hearing. The 9 a.m. hearing has nobody, but the case record shows Maya on both. | Acceptance is tracked per hearing: 28 Willow Lane is covered by Maya, 14 Willow Lane is uncovered and flagged. |
| A4 | Someone must cover 14 Willow Lane at 9 a.m. on June 10, in person. | The staffing solver proposes Leo: he is already at the Larkmere office that morning and said he left the morning free (message 62). |
| A5 | The draft staffing notice on file for 14 Willow Lane names Maya, who declined that hearing. | The draft is flagged and never sent. Notices are generated from the evidence once someone accepts. |
| A6 | Larkmere needs a staffing notice for 28 Willow Lane by 4 p.m. on June 7. None has been sent. | A staffing notice naming Maya is drafted for 28 Willow Lane only, in Larkmere's format, due at the office deadline. |
| A7 | Maya asks for the files "for the one I can cover". | Maya is sent the packet for 28 Willow Lane only, not for the hearing she declined. |
| A8 | Maya answers by text message, not email. | A text from a known consultant carries the same weight as an email for her own commitment. |

### Examples 7-12 · Garden Street, Velloran

| Id | Problem | Then |
|---|---|---|
| B1 | The firm asks the office to move both hearings to June 13. | A request changes nothing. The official date stays June 11 until the office approves. |
| B2 | Leo moves both hearings to June 13 in the shared calendar, and the internal case records now show June 13. | A calendar edit is recorded as a belief. The official date stays June 11 and the mismatch is flagged. |
| B3 | Leo has a conflict on June 11 and says June 13 "works for me". | That is a decline for the official date plus a conditional offer. Both hearings are uncovered. |
| B4 | The office says the hearings remain June 11 and that it "can record Leo". | The move is denied and nothing moves. "Can record" is an offer, not a record, so the representative gate stays open. |
| B5 | The case records show June 13 and Leo. Both are wrong. | The record audit marks date and consultant as contradicted for both cases. |
| B6 | Leo asks which date he is being asked to cover. | An answer is drafted from the evidence: official date June 11, his calendar is wrong, the move was denied, and he told us he cannot attend. |
| B7 | Both Garden Street hearings on June 11 need a new consultant. | One offer covers both hearings. Leo is excluded (he declined). Owen ranks as the near-certain option because he said he has no other hearings that afternoon (message 68). |
| B8 | The shared calendar still shows June 13. | The calendar is regenerated from the official record. A calendar is an output, never an input. |

### Examples 13-18 · Orchard Road, Orimere

| Id | Problem | Then |
|---|---|---|
| C1 | Nora can cover the morning hearing but not the afternoon one. She could cover both on June 18 "if the county can move them". | Morning hearing covered, afternoon hearing uncovered, and June 18 held as a condition, not a commitment. |
| C2 | The office records Nora for 9 Orchard Road only, has no assignment for 24 Orchard Road, and is still reviewing the move. | Each case is tracked separately: one recorded, one missing, change request pending. The hearings stay on June 12. |
| C3 | The office moves one hearing to June 18 and refuses to move the other. | A split decision is applied per case: 9 Orchard Road moves, 24 Orchard Road stays June 12 at 2 p.m. Nora's yes for June 12 does not carry over without a check. |
| C4 | Nora clears June 12 and puts both hearings on June 18. Only one of them moved. | 9 Orchard Road is covered on June 18. 24 Orchard Road is flagged: Nora's calendar is wrong and nobody covers June 12 at 2 p.m. |
| C5 | The case record still shows 9 Orchard Road on June 12, and the draft notice on file for 24 Orchard Road names Nora, who declined it. | The audit marks the date as contradicted, and the wrong draft notice is flagged and never sent. |
| C6 | 24 Orchard Road (June 12, 2 p.m., video) needs a consultant. Owen has in-person hearings in Tesswick until noon that day. | Nora is excluded (declined). Leo is proposed (he prefers afternoons). Owen stays feasible because the 60-minute travel gap is met. |
| C7 | Nora asks for the files and believes both hearings are on June 18. | One message tells Nora both facts: she is confirmed for June 18, and 24 Orchard Road stays June 12. She gets the packet for her hearing only. |

### Examples 19-24 · Meadow Avenue, Tesswick

| Id | Problem | Then |
|---|---|---|
| D1 | The firm leaves a voicemail with the representative's name. | A voicemail confirms nothing. The representative gate stays open. |
| D2 | A clerk says by phone that emailing names is no longer enough: the office now wants its staffing form, then a call. The saved instructions (dated May 15) say to email. | The system detects that the county changed its process, proposes a change to the Tesswick playbook, and blocks further sends until a person approves it. |
| D3 | The firm emails the form details. A second clerk cannot find the form and cannot confirm who is on the list. | Sending a form is not the office processing it. The gate shows a problem ("sent, but the office cannot find it"), and the stale process blocks an email chaser. |
| D4 | Once the new process is accepted, the next step is a phone call in office hours ("please call tomorrow morning"). | After one approval the Tesswick playbook is version 2 (form, then call). The next action becomes a call task for a person, with office hours shown. No code changed. |
| D5 | The clerk confirms the representative on the phone. | A phone confirmation is held as provisional. The gate closes only when the office confirms in writing, and the system asks for that. |
| D6 | Owen accepted both in-person hearings, but nobody has sent the packets to him or to the office. | Packet sends to Owen and to Tesswick are queued, due 48 hours before the hearing. |

### Examples 25-30 · Birch Lane, Brindlefen

| Id | Problem | Then |
|---|---|---|
| E1 | The office wants a name for each hearing. Priya accepts both and asks the firm to tell the county. | Both hearings are covered by Priya. The representative gate stays open until the office confirms. |
| E2 | A settlement offer for 16 Birch Lane needs the attending consultant's signature (a Brindlefen rule). | An open obligation is created with Priya as signer. The signing request is draft-only and carries the check "homeowner approval first". |
| E3 | The withdrawal statement for 42 Birch Lane was signed by Owen, but the office has Priya on record. The office rejects it. | The rejection is recorded, the new signature request goes to Priya (the name on the office's record), and the hearing stays scheduled and staffed. |
| E4 | Priya signs and sends a phone photo. The case number and date cannot be read. The firm has already asked for a clearer copy. | The copy is marked unreadable. No second request is sent: the system waits, and falls back to a signing link if nothing readable arrives. |
| E5 | The firm's own file marks the staffing notice for 16 Birch Lane as "recorded", but no message from the office says so. The notice on file for 42 Birch Lane has no "County" line. | A file in the firm's folder is not the office's record: the system asks Brindlefen to confirm. The incomplete notice is flagged. |
| E6 | Priya prefers to be contacted by phone, and has asked for the case files. | Messages to Priya are routed by her stated preference (phone, then text), and both packets are queued for her. |

### Examples 31-36 · Elm Street, Caldmere

| Id | Problem | Then |
|---|---|---|
| F1 | Eli accepts and says he "will review the case files this week". | An intention to review is not a receipt. The packet gate stays open. |
| F2 | Version 2 goes to the clerk, but the consultant's links still open version 1. Then the clerk can open one file and not the other. | Receipts are tracked per file and per recipient: 75 Elm Street is confirmed by the clerk, 96 Elm Street must be resent, and the stale links are flagged. |
| F3 | Eli's links open version 1 and he asks what changed. The firm explains, but nothing shows Eli has version 2. | One message to Eli carries the current links, what changed, and the answer to his question. The gate stays open until Eli confirms. |
| F4 | The case records still point to packet version 1. | The audit marks the packet reference as contradicted for both cases. |

### Examples 37-42 · Brook Road, Fenwick Vale

| Id | Problem | Then |
|---|---|---|
| G1 | A normal case: recorded, accepted, packets confirmed. The office adds "arrive 15 minutes before the first case". | Both hearings show READY with no human work. The arrival instruction is captured and passed on to Maya. |
| G2 | Maya texts the evening before that she is ill (the packet gives no hour; the prototype's replay places the text at 6:12 p.m., from the simulated timeline in data/timeline.json). Two in-person hearings at 9 a.m. now have nobody, and the office is closed. | Both hearings turn at-risk at once. With under 24 hours left, every feasible consultant is asked at the same time and the first yes wins. Maya is excluded. |
| G3 | Owen volunteers but asks the firm to confirm the assignment and send the files. He has not seen these cases. | A volunteer is not yet a commitment. One approval confirms Owen, sends both packets and passes on the arrival instruction. |
| G4 | The office still has Maya on both staffing notices. | After Owen is confirmed, an updated staffing notice per case is drafted naming Owen as the replacement for Maya, which is Fenwick Vale's rule. |
| G5 | The examples end with nobody confirmed. By June 7 the hearing time has passed, and the record still shows Maya. | The hearings are flagged as past with no confirmed attendee and no outcome, and a person is asked to find out what happened. |

### Examples 43-48 · Linden Avenue, Harthmere

| Id | Problem | Then |
|---|---|---|
| H1 | The schedule arrives as a paper notice (mail transcript). | Mail from the office is a written government source: date, times, room B and the listed representative are all taken as official. |
| H2 | The office changes the video room from B to D after Leo accepted. | The room changes, the times do not, and Leo is told about the new room. |
| H3 | A clerk says by phone that one hearing moved to June 13 after a request from the homeowner. Written notice "will follow". | The phone report is held as provisional. June 6 stays official, the system asks for written notice, and Leo is warned about the possible move. |
| H4 | The written notice arrives: 48 Linden Avenue is now June 13 at 10 a.m. Leo accepted June 6. | The official date moves. Leo's yes for June 6 does not carry over: the hearing is uncovered until he confirms the new date. 66 Linden Avenue is untouched. |
| H5 | Leo still believes both hearings are on June 6 and says he cannot attend on June 13. | 48 Linden Avenue is uncovered. A replacement is proposed, and Leo gets an answer that states what changed. |
| H6 | The homeowner went to the county directly, without telling the firm. | A person calls the homeowner. The system never writes to a homeowner by itself and never invites one to a hearing. |
| H7 | The office still lists Leo for 48 Linden Avenue, the record still shows June 6, and nobody reported what happened at 66 Linden Avenue on June 6. | Wrong representative flagged, record marked contradicted on date and consultant, and Leo is asked for the outcome of 66 Linden Avenue. |

### Examples 49-54 · Maple Lane, Iverfen

| Id | Problem | Then |
|---|---|---|
| I1 | The homeowner asked the county to withdraw one appeal. The office asks the firm to confirm. | An open obligation is created, a person is asked to confirm with the homeowner, and the hearing stays on the schedule. |
| I2 | The firm marks the case "canceled internally" and emails a withdrawal request. Two days later the office's reminder still lists both hearings. | Not processed means still scheduled. The hearing stays staffed, the record's "canceled" is marked contradicted, and a chaser to the office is drafted. It is held until a person has confirmed the withdrawal with the homeowner. |
| I3 | Nora asks whether she should prepare for both hearings. | The answer comes from the evidence: yes, prepare for both until the office processes the withdrawal. |
| I4 | How does the firm know the withdrawal is finished? | Only the office's written confirmation closes it. The case then closes, Nora is released from that hearing, and her other hearing is untouched. |

### Examples 55-60 · Clover Road, Juniper Reach

| Id | Problem | Then |
|---|---|---|
| J1 | After the hearings Owen phones in the results: one continued, one heard. | An outcome from the consultant who attended is accepted, per case, even by phone note. |
| J2 | The firm marks 57 Clover Road "awaiting reschedule". The office says no further hearing is scheduled: a homeowner statement is due by June 8 at 4 p.m. | The real open item is a deadline, not a hearing. An obligation with the deadline is created and the record's status is marked contradicted. |
| J3 | The office asks a second time. June 8, 2030 is a Saturday and the office is open Monday to Friday. | The reminder escalates the item. The working deadline is pulled back to Friday June 7 at 4 p.m., the last hour the office is open. |
| J4 | A homeowner statement has to be collected from the homeowner and sent. | This is a job for a person. The cover email is drafted but cannot go out until someone attaches the statement, and the item closes only when the office confirms receipt. |

### Examples 61-72 · the two clean threads

| Id | Problem | Then |
|---|---|---|
| K1 | Two threads go right: notices accepted, consultant accepted, packets confirmed by both sides. | All four hearings reach READY from the evidence alone, with no action for a person. |
| K2 | The office sends "the same confirmation again" (messages 66 and 72). | A duplicate changes nothing and creates no work. |
| K3 | Useful facts sit inside routine replies: Leo "left the morning free", Owen has "no other hearings that afternoon". | Stated availability is captured and used by the staffing solver elsewhere. |
| K4 | The office confirms video room C after Owen accepted. | A room added later is passed on, unless the consultant shows he already has it. Owen writes "Room C" himself, so nothing is sent. |

### Operating rules · tested with new messages

| Id | Problem | Then |
|---|---|---|
| R1 | Only the government can approve a date change. | A consultant who states a new date changes nothing. It is kept as a lead to verify with the office. |
| R2 | A message that looks like it is from the office arrives from an address the firm does not know. | An unknown sender has no authority. Nothing moves and no gate closes. |
| R3 | A message contains text that tries to instruct the AI, and the AI reader is fooled into producing claims. | Even then nothing happens. A consultant cannot make the office's statements, a case outside the thread is refused, and a quote that is not in the message is refused. |
| R4 | An office writes about a case in another county. | An office can only speak for its own cases. The message matches no case of that office, and even if it is forced onto the other county's case the claim is refused. |
| R5 | The same message is delivered twice (a retry, a forward, a duplicate webhook). | Replaying a message is harmless: no gate changes and no new work appears. |
| R6 | A message arrives that matches no known case. | It changes nothing and is marked unresolved for a person to look at. |
| R7 | Messages arrive out of order: the written notice lands before the phone note about the same change. | The result is the same as the normal order: June 13 is official and no stale "phone only" warning is left behind. |
| R8 | Consultants work part time, most share no calendar, and each has limits: counties, hearings per day, travel time between offices. | The solver uses commitments and stated availability, never an assumed calendar. It never proposes someone outside their counties and it respects daily limits and travel gaps. |
| R9 | Consultants want to be reached in different ways: Nora by text, Priya by phone, the rest by email. | Every outbound draft uses the recipient's stated preference. |
| R10 | The display name says "Larkmere hearing office", but the address is a look-alike and not the address on file. | Identity is the address on file, never the name shown. The message has no authority, nothing moves, and the office is asked at its real address. |
| R11 | A statement from someone without authority must not be ignored either: it may be true. | The system asks the office (one click). When the office answers in writing, the open question closes and the hearing is READY on the official date. |

### Silence, double answers and repeat clicks

| Id | Problem | Then |
|---|---|---|
| T1 | A consultant does not answer an offer. | Every offer carries a reply-by time: a third of the working time left before the office needs the name, at least one working hour and at most one working day. When it passes, silence counts as a no for this round. The next consultant is asked and the reason is shown. |
| T2 | The consultant who stayed silent says yes after the next person was already asked. | First yes wins, whoever gives it. The late yes covers both hearings, and the second consultant is told the offer is closed. |
| T3 | An urgent offer goes to several consultants at once, and two of them say yes. | The first yes holds the hearing. The second is kept as a standby and is told to stand down, so two people do not turn up and only one fee is due. |
| T4 | An office does not acknowledge a staffing notice. Sending a form does not mean the government has processed it. | Silence has a timer. The system sends a reminder, then a second one, and after that asks a person to call, with what was sent as the script. The gate stays open the whole time. |
| T7 | A reminder falls due at night or at the weekend. | Consultants are not chased at night: the reminder waits until 8 a.m. An office is reminded only once it has had a full working day to answer. |
| T8 | One consultant has not answered two different requests (a packet and a signature). | After two reminders a person makes one call that covers both requests. From then on the matter stays with a person and is not handed back to automatic reminders. |
| T5 | The same action is triggered twice: a double click, a retry after a timeout, two coordinators on the same item. | The second attempt sends nothing. An action goes out only while the evidence still calls for it. |
| T6 | A person approves a draft after the facts have changed, or tries to send an action that is blocked. | Both are refused, with the reason shown. A draft prepared before a new message arrived cannot go out on old facts. |

### People in the loop · homeowners, unread messages, corrections

| Id | Problem | Then |
|---|---|---|
| P1 | The office says a homeowner asked to withdraw an appeal. The firm had already sent a withdrawal without asking the homeowner. | A person calls the homeowner with a script that asks and does not assume. Making the call and logging the answer are separate steps, and the chaser to the office stays blocked until the homeowner has confirmed. |
| P2 | The homeowner says they never asked to withdraw, or has changed their mind. A processed withdrawal cannot be undone. | The withdrawal is marked disputed, nothing more is sent in support of it, and a message telling the office not to process it is drafted for a person to send. It names the earlier withdrawal to disregard. The hearing stays staffed. The matter closes only when the office confirms in writing that the appeal stays active. |
| P3 | The office processes the withdrawal even though the homeowner did not want it. | The case is not shown as cleanly closed. It is at risk, and a person is asked to call the office the same day about reinstating the appeal. |
| P4 | The homeowner does not pick up. | Nothing is assumed. The task waits for a logged answer, and the next day the call is back on the list. The withdrawal is not confirmed in the meantime. |
| P5 | A homeowner had the county move a hearing. The firm does not invite homeowners to hearings, and the homeowner might say they never asked. | The call script tells the homeowner that the representative attends for them and that they do not need to come. If they say they did not ask, the office is asked in writing which date stands, and the official date is untouched until it answers. |
| P6 | A stranger writes as "the new clerk" and states that a representative is recorded and that a hearing has moved. | An unknown address has no authority. Nothing official changes, no gate closes, and the message goes to a person to read. |
| P7 | A message arrives in which the reader recognises nothing. It may be a pleasantry, or something important in words the reader does not know. | It is never dropped silently: a person gets it to read. Once read it leaves the list, and a second click does nothing. |
| P8 | A homeowner writes to the firm: the county moved my hearing, the consultant will be there, and I would like to come along. | A homeowner is a known party, but only a person answers them. Nothing changes on the record even when the reader takes every sentence at face value, nothing is sent to the homeowner automatically, and a person is asked to call them back. |
| P9 | An office sends a message that names no case and sits in no known thread. | It cannot be filed automatically, so a person files it. The task exists even though no case is attached to it. |
| P10 | A safety net that sends every message to a person would undo the saving. | On the 72 example messages the reader recognises every incoming message, so none needs a person just to be read. |
| P11 | The reader does not understand an office email written in unusual words. A person reads it and enters what it says. Could a person then also turn hearsay into an official fact? | A person can correct WHAT a message says, never WHO said it. Entered for the office email, the new time becomes official and the consultant is asked to reconfirm. Entered for a consultant email, the same statement stays a lead that the office is asked to verify. |

### Beyond the examples · a hearing is postponed

| Id | Problem | Then |
|---|---|---|
| N1 | An office postpones two hearings that were fully ready and gives no new date. | The hearings leave the calendar and are neither ready nor at risk. The booked consultant is told at once not to attend. Nothing else is chased. When the new date arrives the consultant is asked to confirm it: the old yes does not carry over. |
| N2 | A clerk says on the phone that two hearings are off. If that is wrong and nobody attends, the hearings are lost. If it is right and someone attends, one fee is wasted. | The two errors do not cost the same, so a spoken postponement changes nothing: the hearings stay official, the consultant stays booked, and one message asks the office to confirm in writing. |

### Scale · more hearings and different local processes

| Id | Problem | Then |
|---|---|---|
| S1 | The firm opens in an eleventh county with its own rules: 72-hour packet rule, office open 10 to 3, staffing by email. | One small data file is added (under 20 fields) and no code. A new hearing in that county runs from first notice to READY through the same gates, with its own 72-hour deadline and office hours. |
| S2 | A rule that applies everywhere changes (for example the packet rule goes from 48 to 72 hours). | One edit to the shared default layer changes the deadline for all ten counties at once. |
| S3 | Ten counties must not mean ten separate procedures to maintain. | Each county file holds only what differs: under 20 fields of its own, and at least twice as many inherited from the shared layer. |
| S4 | Work should grow with office-days, not with cases: two hearings at the same office on the same day are one conversation. | Outbound messages are grouped by office-day and by consultant. The planner produces fewer messages than hearing-tasks. |
| S5 | Does following the system's own next actions actually finish the work? | Starting from the end of the examples and taking each proposed action with a cooperative reply, every upcoming hearing reaches READY or is closed. No reply is rejected. |
| S6 | How much of that work needs a person? | Most actions are automatic or one click. The actions left to a person are the judgment calls: homeowner contact, a process change, a phone call, a signature or statement. |
| S7 | Offices differ in the proof they give. Some never confirm that a packet arrived. | What counts as proof is one field in the county file. By default a packet counts only when the clerk confirms it. For an office that sends no receipts, an on-time send is enough, and no other county changes. |

### Quality of the output

| Id | Problem | Then |
|---|---|---|
| Q1 | A generated message with a template fault (an unfilled value, a doubled full stop) would reach a clerk or a consultant. | Every draft, simulated reply, title and status line produced between the end of the examples and the finish is scanned. None has a fault. |
| Q2 | A restart or a replay must not give a different answer. | The state is rebuilt from the messages alone. Two independent replays give identical gates and issues for all 24 cases. |
| Q3 | A status nobody can trace is the problem the firm has today: the planning sheet, the shared calendar, the case record. | Every closed gate on all 24 cases cites at least one message as its evidence. |
| Q4 | The offline reader must not miss or invent statements on the 72 example messages. | It finds all labelled statements with no extras. This is a development score only: the reader was written while looking at these messages, so it says nothing about unseen ones. |
| Q5 | The audit trail (what each message changed, in words) is read by people. A template fault there is as bad as one in a draft. | Every line of the audit trail for the 72 examples is free of unfilled values and doubled full stops. |

### Not said plainly · guesses, questions, conditions, promises

| Id | Problem | Then |
|---|---|---|
| V1 | The right office writes about the right hearing, but only guesses: "I believe Maya is recorded, but I will need to check the list." | Authority is not enough. The sentence is held, no representative is recorded, the gate stays open, and nobody has to read the message: the normal follow-up continues. |
| V2 | A reader (rules or AI) can be wrong about tone. Fifteen sentences that close something on paper but are a guess, a question, a condition, a promise or a denial. | Whatever the reader claims, the verifier holds all fifteen, each with the reason, because the check sits after the reader. |
| V3 | A guard that holds too much creates work: every false hold is one more question to an office or a consultant. | Twelve plain statements pass, including notices with boilerplate ("unless you are notified otherwise", "room to be confirmed") and a yes for one hearing next to a no for another. None of the 89 closing statements in the 72 examples is held. |
| V4 | The office writes that a ready hearing "may be moved". Nothing waits on a gate here, so nothing would follow up by itself. | The date on record stays and the hearing stays READY. The office is asked once, with its own sentence quoted, for a plain answer. Its plain answer closes the question. |
| V5 | An AI reader reports two guesses as a yes: Leo, who holds a hearing, writes "I think I can still make it", and Nora writes she "might be able to cover" an uncovered one. | Neither is a commitment. Nora is recorded as a maybe and the hearing stays uncovered. Nothing is taken away from Leo on a guess: he keeps the hearing, and a person is asked to check with him. |
| V6 | One forged message names two hearings. Asking the office twice about one message is noise for the clerk and two clicks for the coordinator. | One question to the real office covers both hearings, each with its own time on record. One answer closes it, and each hearing keeps its own time. |
| V7 | A statement from someone without authority repeats what the record already says ("the hearing is confirmed for June 10"). | There is nothing to verify, so the office is not asked. The other statement (a representative recorded) still goes to a person. |
| V8 | Two parts of the system must agree on which statements close something: the verifier that holds unclear ones, and the cross-check that wants two readers to agree. | Both use the same 16 claim types. |

### Independent review · what two reviewers broke, and the fixes

Each row was a fault in an earlier version, found by two independent reviews, the scale simulation or the unseen test set (W1 to W18), or a later fix to the readers (W19 to W21). Each is now a check.

| Id | Problem | Then |
|---|---|---|
| W1 | A consultant answers our numbered offer as asked ("YES 1, NO 2") by text, naming no case. The reader understood none of it | The reply is matched to the numbered question: yes for 1, no for 2 |
| W2 | Short answers: reading too little wastes a clear yes; too much turns "Yes, but only the first" into yes for everything | 30 short replies read exactly: 21 answers, 9 left for a person. A bare YES to no question changes nothing |
| W3 | Two questions open from two messages; the consultant texts "YES" | Nothing assumed; to a person with the reason |
| W4 | A consultant not on the roster for that county says yes, and the gate closed | The yes is kept and shown but is not cover; someone else is asked |
| W5 | A yes for two hearings at the times of two he already holds | The new yes does not count; he is told which clash |
| W6 | After the office refused a move, Leo again offers the new date; this erased his conflict on the real date | A yes for another date is not a yes for this hearing; cover is still sought |
| W7 | One office sentence carries two times or two names; every hearing got the first value | Each value goes to the hearing it was said about |
| W8 | A sentence that cannot be paired exactly (one time for two hearings) | No guess: the reader says what it could not read and a person reads it |
| W9 | The next consultant's offer was re-sent on every pass (12 times in the test) | Asked once; then shown as waiting |
| W10 | Friday 11:16 a.m., name due 4 p.m.: consultants were asked one at a time across the weekend | Urgency counted in working hours to the office's deadline; everyone asked at once |
| W11 | A "maybe" held both hearings for 94 hours | A maybe holds a hearing for one working day |
| W12 | After Maya fell ill and Leo took over, the system waited for an acknowledgment of a notice never sent | An updated notice naming Leo as replacement is ready once he accepts |
| W13 | The office accepted Leo before his own yes arrived, which raised a false alarm and a new offer | Whoever the office has recorded is asked first; no alarm |
| W14 | "The hearing is now covered" was sent while the other hearing's question was still open | The message says which is covered and which still needs an answer |
| W15 | A second notice hid inside the first notice's "waiting" line for 77 minutes | Two lines: one to send, one waiting |
| W16 | Illness reported in one thread left a second same-day hearing "ready" | Illness is about the day: every hearing that day is opened |
| W17 | Every "Thanks!" became a task for a person | Thanks alone needs nobody, unless the firm is waiting for that sender |
| W18 | A voicemail transcript was treated as writing because the channel name contains "mail" | A voicemail is speech: likely, not official; the office is asked in writing |
| W19 | A reader quoted one property from a sentence about two by leaving words out, and the reading was dropped | A quote that leaves words out is accepted under a strict rule, with no negation or condition left out |
| W20 | Leaving out "not" turns "has not moved" into "moved" | A quote that leaves out a negation or condition fails |
| W21 | A repeat receipt replaced the first one as evidence | The first receipt stays the evidence |

### Business case · the arithmetic a founder will run

| Id | Problem | Then |
|---|---|---|
| M1 | A reader ran the return on investment: 12.4 minutes saved at $35 to $50 an hour is $7 to $10 per hearing, so a dedicated engineer at $150,000 to $200,000 needs about 15,000 to 28,000 hearings a year. The plan must run this sum itself. | The economics module reproduces the reader's figures: $7.23 to $10.33 per hearing, and 14,516 to 27,650 hearings a year for an engineer. |
| M2 | A plan that hires an engineer before the volume pays for one is a bet the firm cannot afford. | At the default inputs a dedicated engineer pays only above 14,000 hearings a year and the lean build before it, at the cautious and the hopeful end too. The software is measured against the minutes it removes from today’s process, never against the sheet’s extra minutes or the misses the kit already prevents. The standing control is not sold as a saving: with no block rate agreed it costs money and the model says "never". If the tower removes 30% of the minutes and not 60%, the lean build needs more than 10,000 hearings. |
| M3 | A missed hearing loses the fee on that appeal. The plan must say what that is worth, and must not overstate it. | One missed hearing loses the share of this year’s fee that the office’s rules take away, and later yearly fees only for the clients who leave. Preventing it costs the consultant who now attends. The page says at which miss rate misses are worth as much as the time saved, and with the default inputs that rate is above 5%. The default counts a quarter of the misses as prevented, which is what reminder trials support, not half. It also says what a missed hearing must cost the firm, all in, for the sheet to pay for itself, and how much win chance a consultant in the room has to add, as a range over the unknown fee. |
| M4 | Figures in a business case must add up: the margin gained is the time saved, and a year is the hearing times the volume. | One assumption about productive hours sets both the dollars and the head count: the coordinators a peak week needs, paid for 40 hours, cost exactly the week’s hearings times the coordination cost per hearing. The kit is worth its prevented misses and any agreed block rate less the minutes the sheet takes. The yearly effect equals the per-hearing effect times the hearings. Coordinators at peak fall by exactly the share of minutes removed. The build decision in timed minutes is the break-even solved for minutes, and it is also stated as minutes to remove, with no ratio in it. Paying stacked mornings by the half day is an illustration whose yearly figure is the per-hearing figure times the volume. |
| M5 | A visitor will drag every slider to its end. A page that then shows NaN, or a break-even for a change that is worth nothing, would be wrong at the moment it matters. | At every corner of the inputs all figures are numbers. A change worth nothing never pays ("never", not a number). When a hearing costs more than it earns, the margin is negative and the page can say so. |

### Observability · the AI readers can drift without an error

| Id | Problem | Then |
|---|---|---|
| O1 | A trace of model calls that contains the messages would copy homeowners' mail into a monitoring tool. | Every model call becomes one trace record with the model, the provider, the hash of the instructions, tokens, cost and time, under OpenTelemetry's names. No record contains message text or the answer. |
| O2 | A cost or a latency figure that does not add up to the records behind it cannot be trusted when it moves. | The summary per model equals the sum of its calls. The pair's agreement counts only statements that need two keys, and a message where the second reader misses one counts as a disagreement. |
| O3 | Numbers nobody looks at protect nothing. Drift has to raise an alarm by itself. | Healthy numbers raise nothing. A slow provider, a costly model, a pair that stopped agreeing, too many messages to a person, a cold cache and a wrong closing each raise their own alarm. |

### The season-one tools (72 checks)

Each group is listed in full by `node cli/check.js`.

| Group | Checks | What is checked |
|---|---|---|
| Reply rule and daily cap | 9 | Fixed-form replies filed; a YES over the consultant's daily cap goes to a person |
| A message typed by the user | 4 | With no model key the reader says so and shows a recorded example |
| The words shown for a yes | 5 | The words shown are the acceptance itself |
| Process-change detector | 3 | A changed office process is flagged; the approval is never proposed |
| Auto-file analysis | 4 | Agreed and verified readings counted against the key; nothing files itself |
| Inbox connector | 6 | Exported mail and texts read into proposed filings; repeats marked |
| The tools say what the installed sheet says | 8 | Sentences, headings, counts and docket texts equal the sheet's own |
| The tools follow the sheet's rules (Parts I and J) | 26 | Route approval, a lost notice, call tasks, illness, settlements, reach, the calendar file; new mail onto the sheet, repeats, a consultant's question |
| The tools follow Part K, and the live `--paste` | 7 | A record from before a move, the source of a result, dates instead of words, addresses; the help text matches the one live run |

## 11. The audit items, one by one: what the firm does this season

This section is about the plan the firm runs this season: the kit, the gate sheet and the reply rule, with the small command-line tools beside them. The control tower gets no credit here.

**Where the list comes from.** An independent audit on 19 November 2026 listed 104 items; later reviews added 21 (X11 to X31), for 125. The last audit of all 125 gave 109 Yes, 8 Yes pending the firm's answer (W6, R21, E6, X1, X20, X26, X27, X29), 8 Partly (W8, R1, R2, R19, R20, R22, G1, K1) and 0 No. A review after that found three more (X32 to X34); they are answered on the sheet (Part L) and have not been audited. The Partly items stay partly answered by design: people still do the work they describe, and no saving is claimed.

**How to read it.** Ids A1 to K4 are the same problems as the first 63 checks of section 10; the W, R and X ids here are the audit's, not the check ids of section 10. Cells are as the installed sheet stands on the example day, Friday 7 June 2030, 2:00 p.m. Example rows on the Hearings tab: 2 and 3 Clover Road, 4 and 5 Brook Road, 6 and 22 Linden Avenue, 7 to 10 Willow Lane, 11 to 14 Garden Street, 15 and 25 Orchard Road, 16 and 17 Meadow Avenue, 18 and 19 Birch Lane, 20 and 21 Elm Street, 23 and 24 Maple Lane. "A yes that counts" is the consultant's own yes, linked in J, from someone who has not since said they are not free. The last column says what only the firm, an office, counsel or a consultant can supply, and what is still open.

### 11.1 The problems the brief says the firm has today (W1 to W8)

| Id | The problem | What the firm does this season | Where it lives | Firm-only, or still open |
|---|---|---|---|---|
| W1 | Some consultants use no digital calendar or do not share it | No calendar is read as availability. A hearing has a consultant only when their own YES is linked. What a consultant says about being free is one row with the link, and Ask next ranks from those rows. The firm publishes its own calendar from the sheet; consultants never edit it | Hearings J; Availability; Dockets O; Who can take it; Calendar | Each consultant's promised weekdays (Bench I) |
| W2 | The firm confirms who can attend each hearing or group | One numbered offer per docket. The reply rule files YES ALL, YES with numbers or NO and hands everything else to a person (39 example replies: 17 filed, 22 to a person; measured). CONFIRMED only after the day-before YES. In the example 14 of 19 coming hearings have a yes that counts | Dockets H, I; Hearings J, Q, BX, W; `node cli/replies.js` | The rule is not connected to the text line or mailbox (questions 30, 31) |
| W3 | The firm tells each office who attends, by that office's own process | "Tell the office" writes each notice from YES replies only, in the office's route and fields. The check closes only on the office's written reply. A standing deadline is typed once per office and formulas apply it | Dockets N; Hearings K, AW, CC, BE; Offices F, G, AB, AF, AK | Nine offices' naming deadlines (Offices O, AF); each office's written route confirmation (Offices L) |
| W4 | The firm sends case files and hearing details | Each row shows the send-by moment, 48 hours ahead in working days, and PAST THE 48-HOUR MARK once passed (4 rows). The files email names every file and version; GOT IT and the clerk's receipt close the check only for the version named | Hearings BM, AX, AY, AZ, L, M, BW, BE; Settings B15 | The offices' closure days (Holidays B2 to K2) |
| W5 | If someone cancels: replace, send files, update the office | One "not free" row; the hearing opens and is offered down Ask next. Proofs count only for the consultant named beside them, so a replacement inherits nothing; BE lists the cells to clear. The replacement notice is written; BD keeps the old name until the office answers. The leaver's file access is removed (X34) | Availability; Dockets H, N, O; Hearings H, J, M, BW, BX, CH, BD, EC, BE | Whether an attorney may be the alternate (Offices T) |
| W6 | Consultants may need to sign settlements or withdrawals | Nothing is signed until the homeowner's written yes is linked. The sheet names who signs from the office's rule (Brindlefen known from message 28). Whether the signer may sign in that state is asked of counsel (X33) | Hearings BG, BP, BE; Offices AC, AG, AD; Bench S | **Pending the firm.** Nine offices' signer rule; signature forms accepted (Offices AD); counsel on who may appear and sign by state (Offices R; Bench S) |
| W7 | Only the government changes a hearing date | A row's date changes only with the office's written notice linked. A date the firm asked for moves nothing. The calendar is built from the sheet. The Friday record check flags every record whose date differs (4 in the example) | Hearings D, E, I, BI, BJ, BE; Calendar; Record check | Nothing |
| W8 | People still do much of the coordination | **Partly, by design.** A person accepts every proof link at 9:00 a.m., sends every offer and notice, and makes every call: 10 actions a hearing at Larkmere, 7 at Velloran, 4 at Brook Road (measured counts, not timings). A wrong proof can leave a hearing unattended, and the readers were wrong in 7 of 79 agreed filings on unseen everyday mail. Code writes the texts and next steps and files fixed-form replies | Kit, "How replies arrive"; Reader suggestions row 168; `node cli/inbox.js` | Open. Mailbox and text line not connected; new mail reaches the sheet only via `node cli/sheet.js --paste`. No saving claimed |

### 11.2 What the brief asks for (R1 to R23)

| Id | The ask | What the firm does this season | Where it lives | Firm-only, or still open |
|---|---|---|---|---|
| R1 | Handle more hearings | **Partly.** More names on the bench and fuller consultant-days. The sheet ranks 40 consultants and reads 39 offices and 1,199 hearings. Whole dockets go to one consultant (1.7 hearings a consultant-day in the example, measured). Past one workbook there is a written procedure with trigger numbers | Bench; Who can take it; Dockets; Measures; kit appendix, section 15 | The procedure was not run. Recalculating 1,000 rows takes about 29 seconds in LibreOffice (measured); the firm's own program is not timed. Alice's forecast sets the bench |
| R2 | With less human work | **Partly. Not shown this season, and not claimed.** With the confirmation checks the plan is 18.7 to 19.6 productive minutes a hearing against 19.6 today (estimate). The case rests on missed hearings prevented | Measures B18, C18; `node cli/economics.js` | Open. Only the firm's timings of 25 hearings can settle it |
| R3 | And fewer errors | Five checks on every hearing, each closed only by the party who owns the fact, and the Friday record check (11 of 24 records wrong in the example, measured) | Hearings U, W; Record check; Measures rows 3 to 10 | Last season's error count (Day 1 count). No reduction measured yet |
| R4 | Choose the KPIs | The Measures tab: value now, target, where counted, and a weekly log | Measures; one-page write-up | Targets that need the firm's counts are marked |
| R5 | Priorities and why | First: a named, confirmed consultant on every hearing three working days ahead. Next: fuller consultant-days. Later: the tower, decided in September | One-page write-up; design section 12 | The fee per hearing can reverse the order (Day 1 count B4) |
| R6 | Process for the first priority | The week-one kit, and column BE printing the next step for each row | Kit; "How to use" tab | Nothing |
| R7 | A prototype of the solution | The gate sheet, the reply rule, the office rule, the inbox connector, the checks, Hearing Desk (the web app) and the control tower | `sheet/gate-sheet.xlsx`; `prototype/README.md` | Sheet tested in LibreOffice; Excel and Google Sheets ran an earlier build |
| R8 | ...and agents | This season the only AI agents are two readers that propose proof links and act on nothing. The reply rule, office rule and process-change detector are fixed code. New mail reaches the sheet by `node cli/sheet.js --paste`; a person answers yes or no on each row | Reader suggestions; `node cli/sheet.js` | Alice's and counsel's written yes before real mail is read (Day 1 count row 18). The live path ran with a real key on 21 Nov (smoke test, 9 of 9 rows equal to recorded) and on every labelled set on 22 Nov (0 of 550 requests failed; 73 of 81 agreed readings right on unseen set 2, measured) |
| R9 | Where people are needed | A person accepts proofs at 9:00 a.m., works the daily list at 2:00 p.m., makes every call, speaks to every homeowner, approves process changes, and decides every reply the rule does not file | Hearings X, BE; kit | Who reads texts after 4:00 p.m. (Settings B9) |
| R10 | How the firm knows the work is complete | Status: OPEN with proofs missing, READY, CONFIRMED, then after the hearing RESULT DUE and DONE once the result, arrival time, error entry and written decision are logged. A missed hearing stays on the list until the good-cause letter and the office's answer are linked | Hearings R, W, X, BE; Measures B95, B96; Record check | Two example rows wait for an arrival time from the consultant |
| R11 | You may change existing workflows | Whole dockets with fixed-form answers; an office hears a name only after a yes; the Friday record check; date requests go through the firm | Kit; X15 | See X15 |
| R12 | Use Claude, Gemini, Codex or others | Two models, one checking the other, measured on recorded paid runs; the interface takes other providers | `prototype/README.md` | Not measured: open-weight models; the Anthropic adapter live |
| R13 | State assumptions, people, tools, budget | People (coordinator, deputy, associate), about three days of technical help, costs labelled as estimates | Kit section 6; one-page write-up; design sections 4, 13 | Every cost is an estimate until day 1 |
| R14 | Use the access described; propose integrations | Shared mailbox, texts, phone notes, case records and notices on file. Proposed: exported mail and texts into `node cli/inbox.js`; the calendar file out of the sheet | `node cli/inbox.js`; Calendar file tab | Questions 30 to 33. Nothing is connected |
| R15 | Simulate outside messages | `node cli/office.js` plays each office's process; `--try` takes an answer you type. `node cli/replies.js --try` plays a consultant. Nothing is sent | `node cli/check_office.js` (91 of 91) | On 30 unseen office messages the rule sorts 13 right and hands 24 to a person: a simulator, not a filer |
| R16 | A one-page write-up | One Letter page | `docs/write-up/one-page-write-up.pdf` | Nothing |
| R17 | Instructions to play with it | Each command with the line it prints, run on Node 22. Without a key, the reading commands replay recorded answers and say so | README; `prototype/README.md` | Not tested: Node 20; `reading.js --try` with a real key |
| R18 | A visual | The process strip on the write-up; status colours; the web app | One-page write-up; sheet; web app | Nothing |
| R19 | More hearings without the same human work | **Partly. Not reached this season, and the plan says so.** From 300 to 5,000 hearings coordinators rise 14.8 times for 16.7 times the hearings (estimate). The first piece software could take over, auto-filing, has a measured condition on the sheet; 72 of 79 is not enough | `node cli/economics.js`; design section 4 | Open. The lever is the tower, later and unproven on real mail |
| R20 | Different local processes without the same work | **Partly.** An office is one row of data and formulas read its rules; a changed route is blocked until approved, then printed everywhere from that row. Every Offices formula column is filled to row 40, and a new office shows its 17 questions as ASK at once | Offices; Hearings CC, BP, BE; Notices on file | A person still writes each notice and approves each change; no saving claimed |
| R21 | 10 counties in five states, expanding | The ten offices with time zones; room for 39 offices and 40 consultants. Above about 1,000 hearings, one workbook per county team, with steps for a new state (counsel on who may appear before any offer). Each consultant's states are on the Bench (X33) | Offices; Bench S; kit appendix, section 15 | **Pending the firm.** Counsel's answer by state. The procedure was not run |
| R22 | The prototype need not handle every situation | **Partly.** The readers were measured on two unseen sets and the sheet on generated worlds. The 24 example hearings were covered on purpose for the take-home, so the sheet shows more than a normal week; the kit's first page, "A normal day on one page", names the five columns that change daily, and Hearing Desk is the simpler view of the same sheet | Sections 1, 5; kit; web app | Both unseen sets are small and written for the test. The sheet has no switch that hides a family of lines |
| R23 | Up to two weeks | The files are dated 17 to 22 November 2026 (read from the folder) | Folder dates | Nothing |

### 11.3 The example threads, messages 1 to 36 (A1 to F4)

| Id | The problem | What the firm does this season | Where it lives | Firm-only, or still open |
|---|---|---|---|---|
| A1 | Maya is "usually free"; her name is written down anyway | Not a yes. NAME WITHOUT A YES; the offer goes out | Hearings H, J, BE | Nothing |
| A2 | The office asks three times, last with a 4 p.m. deadline | Counted (3); TOP OF LIST CONFIRM TODAY; BE says to phone today and answer in writing | Hearings BH, AW, X, BE rows 7, 8 | Whether 4 p.m., three days before, is Larkmere's standing rule (Offices O2) |
| A3 | Maya accepts only the 9:30 hearing; the record shows her on both | Her YES linked for 28 Willow Lane only; not free 9:00 to 9:30 for the other. The record check flags AX-101 | Hearings J8; Availability row 7; Record check | Nothing |
| A4 | 14 Willow Lane needs cover at 9 a.m. on June 10 | Offered first to Leo, already at that office, with a one-hour answer; FIRST CASE AT OPENING | Dockets G4, H4, O4; Hearings BE7 | Whom to reach before opening (Offices AO2) |
| A5 | The draft notice names Maya, who declined | VOID; never sent | Notices on file row 3 | Nothing |
| A6 | Larkmere needs a notice for 28 Willow Lane by 4 p.m.; none sent | SEND IT; "Tell the office" names Maya in Larkmere's form | Notices on file row 4; Dockets N4 | Nothing |
| A7 | Maya asks for files "for the one I can cover" | Version 2 for 28 Willow Lane only, with "Reply GOT IT 2"; late files asked to be accepted | Hearings BE8, M, AY, BW | Nothing |
| A8 | Maya answers by text | A text is linked like an email; the reply rule reads both | Hearings J8 | Her mobile number and consent (Bench O2, P2) |
| B1 | The firm asks to move both hearings to June 13 | The asked date moves nothing; the office's answer is linked | Hearings BI, BJ, EB rows 11, 12 | Nothing |
| B2 | Leo moves both hearings in the shared calendar; records follow | The date comes only from the office's notice. The record check flags both; the calendar is re-imported from the sheet | Hearings D, I; Record check; Calendar | Nothing |
| B3 | Leo has a conflict on June 11; June 13 "works for me" | A no for June 11; June 13 is not a county date | Availability row 8 | Nothing |
| B4 | The office keeps June 11 and "can record Leo" | An offer, not a record; the check stays open | Hearings K rows 11, 12 | Nothing |
| B5 | Records show June 13 and Leo; both wrong | Flagged on date and consultant | Record check rows 6, 7 | Can the case system import a CSV (question 32) |
| B6 | Leo asks which date he covers | The change notice is on the sheet; BE prints TELL until his OK | Hearings BN, BO, BE | Nothing |
| B7 | Both June 11 hearings need a new consultant | One offer for both, first to Owen, already at Velloran that day; Leo left out | Dockets G5, H5 | Nothing |
| B8 | The shared calendar still shows June 13 | The calendar is rebuilt from the sheet and imported again | Calendar; Calendar file | How the previous import is deleted is not written down |
| C1 | Nora covers the morning only; June 18 "if the county can move them" | The morning yes is a yes; the afternoon is a "not free" row; June 18 is a condition, not a yes | Availability rows 5, 9 | Nothing |
| C2 | The office records Nora for one hearing and is reviewing the move | G3 per case and per date: the record is for June 12 only; our request stays open | Hearings K, BI, BJ, DQ25, DY25 | The office's written word for June 18 |
| C3 | The office moves one hearing and refuses the other | Row 25 moves (old date in DR25); its record no longer counts and G3 reopens; the office is asked in writing | Hearings D, E, I, DR, DQ, DY, BE row 25 | The office's written word that Nora stands for June 18 |
| C4 | Nora puts both on June 18; only one moved | 9 Orchard Road on June 18 is hers; 24 Orchard Road stays open, TOP OF LIST | Hearings J25, X15 | Nothing |
| C5 | The record shows June 12; the draft notice names Nora | The record check flags AX-105; the notice is VOID | Record check; Notices on file | Nothing |
| C6 | 24 Orchard Road needs a consultant; Owen is elsewhere until noon | Ask next: Leo, Maya, Owen (travel gap met); Nora left out | Dockets O6 | Office travel gaps (Offices AI, AJ) |
| C7 | Nora asks for files and believes both are on June 18 | One change notice; files only for 9 Orchard Road; TELL until her OK | Hearings BN15, BO15, BE15 | Nothing |
| D1 | The firm leaves a voicemail naming the representative | Confirms nothing; the notice goes in writing | Hearings K; kit | Nothing |
| D2 | A clerk says by phone the office now wants its form, then a call | The change is typed with its date; no notice goes to Tesswick until a person approves it (NOTICE BLOCKED, Measures B98: 2). The detector proposes the change, never the approval | Offices M5, N5, AQ5 to AT5; Dockets N7; Hearings BE, X | Tesswick's written confirmation (Offices L5). A spreadsheet cannot stop a person who sends anyway |
| D3 | A second clerk cannot find the form | Shown as sent and not found (CP, CQ); resent by the approved route after the approval | Hearings CP, CQ, BE, X rows 16, 17 | The approval (D2) first |
| D4 | The next step is a call "tomorrow morning" | A call task with the office's hours; DX holds the day the message arrived and AA a real date (the example reads it as Monday 10 June). A call never closes a check | Hearings Y, Z, AA, DX, BE | The packet gives no arrival day; a person types the date in AA |
| D5 | The clerk confirms the representative by phone | A call never closes a check; an email follows | Hearings Y, K | Nothing |
| D6 | Owen accepted both; nobody sent the packets | BE prints SEND CASE FILES VERSION 2 with the deadlines | Hearings BE, BM rows 16, 17 | Nothing |
| E1 | The office wants a name per hearing; Priya accepts both | One notice per case; the check closes per case | Dockets N8; Offices AB6 | Nothing |
| E2 | A settlement needs the attending consultant's signature | The homeowner's written yes first; then the signer named on the sheet | Hearings BG18, BP18, BE18 | Which signature form Brindlefen accepts (Offices AD6) |
| E3 | Owen signed the withdrawal; the office has Priya on record and rejects it | The sheet names the signer: Priya, the name on the office's record. The homeowner's yes comes first, and the hearing stays staffed. BE also asks counsel whether Priya may sign in Cindervale (X33) | Hearings BP19, BG19, BE19; Offices AC6, AG6; Bench S | Counsel's answer (Bench S) |
| E4 | Priya's photo is unreadable; the firm already asked once | DA holds the request; BE says not to ask again; the fallback falls due at noon next working day (FALLBACK DUE), homeowner's yes first | Hearings N19, DA19, DM19, BE19, X19; Settings B14 | The date of the first request; whether Brindlefen accepts a fill-and-sign PDF (Offices AD6) |
| E5 | The firm's file says "recorded"; one notice has no County line | The firm's file is not proof; the check stays open. The notices check: 42 Birch Lane LACKS the county | Hearings K18, BE18; Notices on file row 8 | Nothing |
| E6 | Priya prefers the phone and asked for files | Phone first, then a text link; BE prints the send-by. The contact check flags no number | Bench C6, Q6; Hearings BE | **Pending the firm.** Priya's number (Bench O6) |
| F1 | Eli "will review the case files this week" | A yes for the hearing, not a GOT IT | Hearings J, M rows 20, 21 | Nothing |
| F2 | Version 2 went to the clerk; Eli's links open version 1 | BE says to send version 2 to the consultant (and to both on row 21) | Hearings AX, AY, AZ, L, BE | Nothing |
| F3 | Eli asks what changed | One files message with links, version and changes; TELL until his GOT IT 2 or OK | Hearings M, BW, BN, BO, BE | Nothing |
| F4 | The records point to version 1 | The record check flags both | Record check rows 14, 15 | Nothing |

### 11.4 The example threads, messages 37 to 72 (G1 to K4)

| Id | The problem | What the firm does this season | Where it lives | Firm-only, or still open |
|---|---|---|---|---|
| G1 | A normal case; "arrive 15 minutes before the first case" | **Partly, by design.** The receipt is linked but names no version. The day-before text gives one clock time. A person accepts each link at 9:00 a.m. because auto-filing is off (section 5): 4 actions a hearing, 2 if it were on | Hearings L, AX, AZ, CI; Dockets I | Whether 15 minutes is Fenwick Vale's standing rule (question 34); the auto-filing decision (question 35) |
| G2 | Maya texts the evening before that she is ill | One "not free" row; both hearings open; the evening text goes to everyone in Ask next | Availability row 6; Dockets O; Settings B9 | Who reads evening texts (Settings B9); the alternate and the before-opening contact |
| G3 | Owen volunteers and asks for confirmation and files | One approval, then the confirmation with offer, place, time and files; his own GOT IT 2 counts for him only | Availability; Hearings J, M, BW, DZ | Fenwick Vale's address (Offices BA8) |
| G4 | The office still has Maya on both notices | BD keeps the office's name until it answers the replacement notice; the old notices are VOID. Maya's file access is removed (X34) | Hearings BD, BK, EC rows 4, 5 | Nothing |
| G5 | The examples end with nobody confirmed; the time has passed | NOBODY NAMED: POSSIBLY MISSED; the office is called that day; a miss stays listed until the good-cause letter and answer are linked | Hearings X, W rows 4, 5 | Each office's rule after a miss (Offices P) |
| H1 | The schedule arrives on paper | Scanned and linked; the arrival day in DW; Harthmere is marked as sending paper | Hearings I, DW; Offices BB9 | The arrival day (the packet gives none) |
| H2 | The video room changes from B to D after Leo accepted | Room and change notice typed; his message names room D, so his OK is linked | Hearings AV6, BN6, BO6 | What a video room means at Harthmere (Offices AL9) |
| H3 | A clerk says by phone one hearing moved | The date stands until the written notice; Leo is warned | Hearings Y | Nothing |
| H4 | The written notice moves 48 Linden Avenue to June 13 | Row 22 moves (old date in DR22), consultant cleared, offered; G3 stays open | Hearings D, E, I, H, J, DR, K row 22 | Harthmere's written word for June 13 |
| H5 | Leo cannot attend June 13 | "Not free" row; offered down Ask next; TELL until his OK | Availability row 10; Hearings BN22, BE22 | Nothing |
| H6 | The homeowner went to the county directly | BE orders the call with the new date and the corrected notice; REVIEW CALL THE HOMEOWNER until a link in DS22 | Hearings DR22, DS22, BE22, X22, BK, BL; EB | Riley Fern's number (question 41) |
| H7 | The office still lists Leo; the record is wrong; no result for 66 Linden | BE: name a consultant, send the replacement notice; the record check flags AX-115; row 6 reads RESULT DUE. Leo's file access is removed (X34) | Hearings BE22, BD22, W6, EC; Record check | Nothing |
| I1 | The homeowner asked the county to withdraw one appeal | Call the homeowner for the written yes; the hearing stays on | Hearings BG23, BE23 | Nothing |
| I2 | The firm marks the case "canceled internally" | Stays staffed; the record check flags "canceled" until the office's written proof | Record check; Hearings AF, G | Nothing |
| I3 | Nora asks whether to prepare for both | Yes, both, until AF has the office's confirmation; TELL until her OK | Hearings AF, BN, BO, BE rows 23, 24 | No formula knows a message is a question; the tools propose the cell |
| I4 | How does the firm know the withdrawal is finished? | Only the office's written confirmation: then NOT HELD. The release notice to Nora; TELL until her OK | Hearings AF, W, BN, BO, BE row 23 | Nothing |
| J1 | Owen phones in results: one continued, one heard | Logged with who reported it, when, and the link; "more time" is RESULT NOT CLEAR until clarified; no DONE without an arrival time | Hearings S, DT, DU, W, X, BE rows 2, 3 | Nothing; the sheet shows a report was typed, not that it is right |
| J2 | The record says "awaiting reschedule"; the office wants a statement | OWED; the record check flags it | Hearings W2, N2, BA2 | Nothing |
| J3 | June 8, 2030 is a Saturday | The send-by moves to Friday 4:00 p.m.; TOP OF LIST: OWED | Hearings BB2, X2, BE2 | The office's closure days |
| J4 | A homeowner statement must be collected and sent | Collected from the homeowner, sent attached; the office's receipt closes it | Hearings O2 | Nothing |
| K1 | Two threads go right | **Partly, by design.** Larkmere reads READY. Velloran reads OPEN: 3 missing, because the office names a room and no link and neither receipt names a version. A person accepts every link (10 and 7 actions a hearing) | Hearings rows 9, 10, 13, 14 | No saving claimed |
| K2 | The office sends "the same confirmation again" | A repeat changes nothing and is marked REPEAT; a later message replaces a link only when it adds something the cell needs (message 66 adds "current packets") | Hearings I, K, L, AZ; Reader suggestions; `node cli/sheet.js --repeats` | No formula knows a repeat |
| K3 | Useful facts inside routine replies | Typed as "free" rows; Ask next reads them | Availability rows 3, 4 | Nothing |
| K4 | Video room C confirmed after Owen accepted | No change notice; BE asks whether a link comes; DO NOT SEND YET | Hearings AV, BE; Dockets I5 | What a video room means at Velloran (Offices AL3) |

### 11.5 Problems in the same messages found later (X1 to X10)

| Id | The problem | What the firm does this season | Where it lives | Firm-only, or still open |
|---|---|---|---|---|
| X1 | Homeowner notices name the consultant; a change makes them wrong | NO HOMEOWNER NOTICE ON RECORD on coming hearings with a yes (14 rows); once typed, the sheet prints any difference | Hearings BK, BL, BE | **Pending the firm.** The name and date on each notice already sent (question 36) |
| X2 | 10 of 14 video hearings have no link | The check stays open; NO VIDEO LINK YET; DO NOT SEND YET on 5 dockets; Measures counts 13 | Hearings AV, BE; Dockets I; Measures B21 | When four offices send links (Offices AE) |
| X3 | 73 Clover Road awaits a written decision | ERROR DUE, then DECISION DUE; ask the office every Friday | Hearings W3, T3, BQ3, BE3 | Nothing |
| X4 | Tesswick's form asks for fields the firm's email lacked | "Tell the office" prints every field; the notices check names missing ones | Dockets N7; Offices AK5 | Nothing |
| X5 | No message shows the 42 Birch Lane homeowner asking to withdraw | Nothing is signed or sent without the homeowner's written yes | Hearings BG19, BE19 | Nothing |
| X6 | No files shown for 48 and 66 Linden; rule is 48 hours | Send-by per row; PAST THE 48-HOUR MARK once passed | Hearings BM, BE; Settings B15 | Closure days |
| X7 | County eligibility and daily caps | Who can take it leaves out anyone not allowed or full; an offer out counts toward the cap; the reply rule sends an over-cap YES to a person | Bench D, E; Hearings BY; `node cli/replies.js` | Tested on scratch copies and generated worlds only |
| X8 | The firm can sometimes plan dates with the office | Each office is asked to hear our cases on the consultants' promised weekdays | Offices Q; Bench I | Each office's answer |
| X9 | Offices in several time zones | Every text says whose clock; the calendar is an iCalendar file in UTC with clock changes computed. Apple Calendar imported the example's 17 events on the expected days (earlier build) | Offices V, W, AU; Hearings CV; Calendar file | Whether each office changes its clocks (question 37). Not tried: Google Calendar, Outlook |
| X10 | Owen accepts "at the quoted rate"; no rate was quoted | Offers say "at your usual rate"; a different rate goes to Alice | Dockets H; Bench H | Nothing |

### 11.6 Problems found by later reviews (X11 to X34)

| Id | The problem | What the firm does this season | Where it lives | Firm-only, or still open |
|---|---|---|---|---|
| X11 | Offices name a video "room" but send no link | A room letter is not a link; VIDEO ROOM ONLY, NO LINK (3 rows); two Garden Street hearings went from READY to OPEN | Hearings AV, BE; Offices AL | The six video offices say what a room means (Offices AL) |
| X12 | Receipts name no files or version | The current version on every row; a receipt counts only if it names it or says "current" (5 of 19 do); BE asks for GOT IT 2 | Hearings AX, AY, AZ, BE | How often live receipts name no version |
| X13 | Hearings start when the office opens | FIRST CASE AT OPENING; arranged a working day before; OPENING NOT ARRANGED until linked | Offices AO; Hearings DB, BE7, X7 | Whom to reach before opening (Offices AO) |
| X14 | Consultant contact data incomplete | No number is invented; every consultant without one is flagged (6 of 6); each step prints the email fallback | Bench O to R; Hearings BE; Measures B97 | Each consultant's number and consent |
| X15 | The firm already has three workflows | Kept: case records (with the Friday check), document collection (evidence at intake), notifications (today's tool, checked by the sheet) | Record check; Hearings BK, BL; design section 18 | Case system CSV import; the notice tool (questions 32, 33) |
| X16 | Consultants name later arrival times | One clock time; a later time prints REPLY TODAY (4 rows) | Settings B16; Hearings CH, BE | Fenwick Vale's 15 minutes (question 34) |
| X17 | Maya ill on June 6 still holds 28 Willow Lane on June 10 | ILLNESS REPORTED; top of list until her own yes after the report | Availability I6, J6; Hearings CT8, CU8, BE8 | The 7 days are our suggestion (Settings B18) |
| X18 | Offices record a consultant before their yes | A notice is written from yes replies only; BE flags a name with no yes | Dockets N; Hearings BD, BE22 | Nothing |
| X19 | Some shared calendars are incomplete | No calendar is read as availability | Bench G; Availability | Nothing |
| X20 | Only Orimere says how long a hearing lasts | An office's length is used when known; 30 minutes otherwise | Offices AP; Settings B11 | **Pending the firm.** Nine offices' answers (Offices AP) |
| X21 | The firm asks offices to move hearings for one consultant, before the bench and without the homeowner | Only after the bench was asked (CS), with the homeowner's yes (CR), before the office's last day (AY), never for an accepted hearing, with a named decider (DV). The office's answer is recorded; refused requests keep one record line | Hearings BI, BJ, CR, CS, DH, DI, DN, DV, BE; Offices AY | Each office's last day (question 38); who may decide (question 43) |
| X22 | A settlement with no acceptance, offer on file or word on the hearing | SETTLEMENT, STILL MISSING with six parts; the hearing stays staffed until the office says it is off | Hearings N18, DC18, DD18, BG18, O18, AF18, BA18, BE18 | The offer in writing and the office's answer (question 39) |
| X23 | An office asks for a statement the files already hold | BE says to check the current files before collecting it again | Hearings BE2, AX2 | The office says which version it holds |
| X24 | The arrival rule asked Maya to arrive when she said she could not | ARRIVAL NOT SETTLED; no time printed; she is asked the same day | Availability row 7; Hearings CH8, DL8, BE8; Dockets I4 | Her arrival time |
| X25 | Four tools the firm keeps beside its workflows | The kit says what happens to each: planning sheet archived, tracker corrected then retired, documents folder kept, saved office instructions replaced by the Offices tab | Kit, "The tools the firm already keeps" | Alice confirms who does each. Designed, not run |
| X26 | 12 homeowners, no contact detail for any | Name and customer number on every row; the contact is ASK; a call line names the homeowner and says when one call covers two hearings | Hearings DE, DF, DG, BE, X | **Pending the firm.** Every homeowner's number and email (question 41) |
| X27 | Offices given by email only; much work is by phone | Each office's number and clerk has a cell; every call line prints it or NUMBER NOT ON RECORD (5 rows) | Offices AZ; Hearings BE | **Pending the firm.** Each office's number (question 40) |
| X28 | Only one office's saved instructions carry a date | CONFIRM THE ROUTE IN WRITING until dated, and again after six months | Offices L, N; Settings B20 | Each office's written confirmation (question 26) |
| X29 | Nothing says where an in-person hearing is held | Address, room and where to report per office; ADDRESS NOT ON RECORD until answered, and BE orders the question from three working days before (6 rows) | Offices BA; Hearings DZ, BE; Calendar | **Pending the firm.** Four offices' addresses (question 42) |
| X30 | An office's record of our name was for the date before a move | K counts only while DQ holds the hearing's date; G3 reopens and BE asks the office in writing the same day | Hearings DQ, DR, DY, K, BE | Orimere's and Harthmere's written word for the new dates |
| X31 | Messages say "tomorrow" or "this week"; a paper notice has no arrival date | Arrival day in DX or DW, a real date in AA; words in AA print a line. A text naming no case is matched by a person, or the sender is asked | Hearings DX, DW, AA, BE; Offices BB | The arrival days, which only the mailbox and post can say |
| X32 | Every county lets consultants request a date change, so a consultant may ask the office without the firm | **Not yet audited.** Each move records who asked (EB: the firm, the homeowner, or the consultant and name). If a consultant asked, BE orders the coordinator to ask them why that day and tell them the rule: date requests go through the firm, which asks the homeowner and the bench first; the move is then handled as any office move. A move with nobody in EB prints a line. The season letter states the rule. In the example EB names the firm (messages 8 and 15) or the homeowner (message 47) on the 5 rows with a move or a request; no message shows a consultant asking an office | Hearings EB, BE; kit, season letter | Nothing firm-only. Tested by the sheet's author only |
| X33 | Eligibility follows state lines, and Owen signed for Brindlefen (message 28) | **Not yet audited.** Bench S holds the states where each consultant may appear and sign, from counsel and the consultant's own licence. Once answered, Who can take it never offers a hearing in another state, and a consultant on such a hearing is offered down Ask next. While S is a question (all six in the example), names carry (STATES: ASK), Ask next ends with a warning, and a row with something to sign prints the question to counsel (4 rows, 42 Birch Lane among them) | Bench S, T; Who can take it BE; Hearings BE; Offices R; Day 1 count row 33 | Counsel's answer by state and each consultant's licence (question 44). A misspelt state is not found |
| X34 | Case files stay open to a consultant after they leave a hearing | **Not yet audited.** When files went to someone no longer on the hearing, BE orders their access to the folder links removed (or a written request to delete the files) and the date typed in EC; a consultant who declined or was taken off gets the same line, or "files were never sent". No message shows access removed, so EC is empty and the line prints on 7 rows (Maya, Leo, Nora). The season letter states the rule | Hearings EC, BW, BC, BE; kit, season letter | Nothing firm-only. Tested by the sheet's author only |

### 11.7 Every question that only the firm, an office, counsel or a consultant can answer

Amber ASK cells hold each question where the answer goes; 220 cells in the example start with "ASK". Each question once, with its cell:

| # | The question | Who answers | Where the answer goes |
|---|---|---|---|
| 1 | Working days before a hearing the name must be with you | Each office | Offices O, then the number in AF |
| 2 | If our representative does not attend, is the appeal dismissed or decided on paper, and how do we ask for a new hearing? | Each office | Offices P |
| 3 | Will you hear our cases on one day? Which? | Each office | Offices Q |
| 4 | Who may appear for a homeowner in each state, and which of our consultants may appear and sign there? | Counsel | Offices R; Bench S; Day 1 count row 17 |
| 5 | May our attorney or agent be the alternate? | Each office | Offices T |
| 6 | First and last month of the season | Each office | Offices U |
| 7 | Signed names needed in the peak | Alice | Offices AA |
| 8 | Who signs a settlement or withdrawal? | Nine offices | Offices AC, AG |
| 9 | Do you accept a fill-and-sign PDF or a scan? | Each office | Offices AD |
| 10 | When and how do you send the video link? | Four offices | Offices AE |
| 11 | Does a named video room come with a link, or is it in person? | Six video offices | Offices AL |
| 12 | Whom can we reach before you open on a hearing morning? | Each office | Offices AO |
| 13 | How long does a hearing run? | Nine offices | Offices AP |
| 14 | Your closure days | Each office | Holidays tab |
| 15 | Mobile number for texts | Each consultant | Bench O |
| 16 | Do you agree to be texted? | Each consultant | Bench P |
| 17 | Which channel holds, text or email? | Nora Pell | Bench C4 |
| 18 | Who reads texts after 4:00 p.m. and at weekends? | Alice | Settings B9; Day 1 count row 16 |
| 19 | Hearings held and coordinator hours paid in the busiest 8 weeks | Payroll, case system | Day 1 count B2; Hours |
| 20 | Appeals lost because nobody appeared, and the cost | Mailbox, case system, accounts | Day 1 count B3 |
| 21 | Fee received per hearing, net of the refused offer | Accounts | Day 1 count B4 |
| 22 | Weeks from hearing to fee | Accounts | Day 1 count B5 |
| 23 | Next season's forecast | Alice | Day 1 count B6; Hours |
| 24 | The other day-1 counts | As named | Day 1 count B7 to B15, B19 |
| 25 | Alice's and counsel's yes before the readers read real mail | Alice, counsel | Day 1 count row 18 |
| 26 | Confirm in writing how we tell you who attends and name a replacement | Each office | Offices L (date), M (a change) |
| 27 | Primary and second consultant per office; signed season letters | The firm | Offices X, Y, Z; Bench I, M |
| 28 | Do you need more than 60 minutes around an in-person hearing, or 15 between video sessions? | Each office | Offices AI, AJ; Day 1 count row 27 |
| 29 | Timed minutes a hearing left with software | The firm | Hours B6 |
| 30 | Which mail service holds the hearing mailbox, and who can give read-only access? | Technical contact | Day 1 count B20 |
| 31 | Which service runs the text line, and can it export or forward texts? | Technical contact | Day 1 count B21 |
| 32 | Can the case system import a CSV? | Case system owner | Day 1 count B22 |
| 33 | Which tool sends homeowner notices, and can it send from a list? | Alice or coordinator | Day 1 count B23 |
| 34 | Is "arrive 15 minutes before" Fenwick Vale's standing rule? | Fenwick Vale | Day 1 count B25; Hearings CI |
| 35 | Switch auto-filing on for one kind of proof? Only if the Friday sample found no wrong link of that kind for four weeks running (Reader suggestions row 168), after a two-week log | Alice | Day 1 count B24; Measures log |
| 36 | The consultant and date on each homeowner notice already sent | Alice or coordinator | Hearings BK, BL; Day 1 count B28 |
| 37 | Does your office change its clocks? | Each office | Offices AU; Day 1 count B26 |
| 38 | Last day to request a date change, and the route | Each office | Offices AY; Day 1 count B29 |
| 39 | For each settlement: is the hearing taken off once signed, by when; and the offer in writing with its deadline | The office and whoever made the offer | Hearings AF, BA, DC, DD |
| 40 | Your daytime number and clerk | Each office | Offices AZ; Day 1 count B30 |
| 41 | Each homeowner's phone and email | Alice or coordinator | Hearings DG; Day 1 count B31 |
| 42 | Street address, room and where to report (in-person offices) | Four offices | Offices BA; Day 1 count B32 |
| 43 | Who at the firm may decide to ask an office to move a hearing? | Alice | Hearings DV |
| 44 | In which states may each consultant appear and sign for a homeowner (counsel's answer and the consultant's own licence or registration)? | Counsel and each consultant | Bench S; Day 1 count row 33 |
