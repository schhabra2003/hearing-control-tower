# Kit appendix: reasons, arithmetic and reference

The kit (`week-one-kit.md`) is what the firm runs in the first four weeks. This file is the
reference behind it: why each step is there, the arithmetic, the sheet, the consultant terms,
the software decision, how the operation scales, and the kit's full rules, scripts and example
situations (section 16). Nothing here has to be read before Monday.

**Labels.** **measured** = counted by running the sheet or the prototype on the example packet,
which is fictional. **sourced** = a public document says so (links in `research/04` to
`research/07`). **estimate** = my assumption, from `node cli/economics.js` (run in the
`prototype` folder, like every command here). **simulated** = from the prototype's simulated
seasons. **to set** = a number only the firm can choose. The rules quoted are from real US
hearing offices, mostly Texas, because the firm's own five states and ten counties are fictional
in the case. Each one is a question for the firm's own offices and counsel before anyone relies
on it; the sheet holds those questions as amber ASK cells, and the kit (section 8) gives the
words.

**Tests.** What was tested, and what was not, is in section 14.2. The newest rules (Part L: X32
to X34) were checked by their author; the independent test of them has not run.

## Contents

1. [Why the checks, if they cost more than the misses they prevent](#1-why-the-checks-if-they-cost-more-than-the-misses-they-prevent)
2. [The five gates and the proof grades](#2-the-five-gates-and-the-proof-grades)
3. [The sheet: the tabs a coordinator uses](#3-the-sheet-the-tabs-a-coordinator-uses)
4. [The docket: build it, then offer it whole](#4-the-docket-build-it-then-offer-it-whole)
5. [The day in detail](#5-the-day-in-detail)
6. [More scripts, and why the day-before text is worded as it is](#6-more-scripts-and-why-the-day-before-text-is-worded-as-it-is)
7. [The AI readers and the reply rule](#7-the-ai-readers-and-the-reply-rule-the-audit-of-last-season-then-beside-the-sheet)
8. [Who is in the room](#8-who-is-in-the-room)
9. [Consultants: the terms, the firm's own representatives, and the bench](#9-consultants-the-terms-the-firms-own-representatives-and-the-bench)
10. [Homeowner intake](#10-homeowner-intake)
11. [Software: the readers now, the control tower decided in September](#11-software-the-readers-now-the-control-tower-decided-in-september)
12. [How it scales](#12-how-it-scales)
13. [The calendar after the first four weeks](#13-the-calendar-after-the-first-four-weeks)
14. [Checking it yourself, and what the sheet leaves to a person](#14-checking-it-yourself-and-what-the-sheet-leaves-to-a-person)
15. [Growing past one workbook](#15-growing-past-one-workbook)
16. [Kit reference: rules by event, scripts, every example situation](#16-kit-reference-rules-by-event-scripts-every-example-situation)

## 1. Why the checks, if they cost more than the misses they prevent

Kept by hand they do cost more: the four checks alone, the comparison case, cost $7,300
against $3,200 at 5,000 hearings, if 2% of hearings are missed today and a quarter of those are
prevented (both are my assumptions). I do not sell the control as a return. I recommend it for
three reasons.

1. **It is the firm's duty.** A law firm that told a homeowner "we represent you at the hearing"
   cannot treat "nobody appeared" as a cost to optimise. The target is zero.
2. **It is insurance, and cheap.** $1.47 a hearing against a consultant fee of $90. A miss costs
   about $260 by my estimate ($73 of this year's fee, $145 of later years' fees if half of those
   clients leave, an hour of rework), before any refund, complaint or claim. The control breaks
   even at $383 a miss.
3. **It is what makes whole dockets safe.** One consultant with four hearings is four misses if
   that consultant does not turn up. The day-before YES and the arrival text are the price of
   fuller days.

There is a fourth argument that I cannot prove: in the example week 11 of 24 case records were
contradicted by newer messages (an old file, a moved date, a name the county did not have), and
a consultant with the right file and date should win more often. The four checks would pay for
themselves if they raised the win rate by 0.8 points, the full sheet at 1.5. But a difference that
small needs about 60,000 hearings in each group to measure, so no count at this firm will show it, and I do not rely on it.

**What it takes.** Kept by hand, the four checks add about 2 minutes a hearing and the full sheet
about 4. Before the newest checks the plan's estimate was fewer minutes than today (17.8
productive minutes against 19.6); with them it is 18.7 to 19.6 against 19.6 (estimate, the upper
side; sections 5 and 12). So season one claims no saving in minutes: its case rests on missed
hearings prevented. The four checks cost about $1.47 a
hearing: $7,300 a year at 5,000 hearings and about $1,500 at 1,000, where the watch for arrival texts is a phone on a desk. A dispatcher for the peak at
5,000 hearings adds about $10,600, which makes about $18,000 a year, or $3.60 a hearing. With
the dispatcher a hearing costs about $108, above my $106 target, and the control pays on misses
alone only at about $800 a miss, not $383 (estimates). That is why the dispatcher has an entry
rule and the checks do not. Last season's payroll gives the baseline, and the stopwatch in
live week 1 gives the split by task.

Three break-even figures appear in this package, and they answer three questions: $383 a miss for
the four checks alone ($677 for the full five checks by hand), about $800 for the four checks
with a dispatcher, and about $1,700 for the dispatcher by itself ($10,600 a season over the roughly 6 misses a year it might prevent at 5,000
hearings; at 1,000 hearings the same sum is over $8,000 a miss, which is why the watch there is a
phone on a desk). They are rough rules on guessed inputs, not thresholds to the dollar.

**No check is dropped in the peak.** If live week 4 shows more paid minutes a hearing than live
week 1, the 25 timed hearings show which step costs the minutes, and that step is fixed first
(kit, section 4).

**"None unrecovered" is the target, not "none".** The model assumes the checks prevent a quarter
of misses, so at 2% missed today about 15 hearings in 1,000 would still see nobody appear. What
the firm can promise is that each of those is caught the same morning, that the evidence is on
file, and that the good-cause letter goes out that day.

## 2. The five gates and the proof grades

**The five gates are the full sheet, which runs in all ten counties from live week 2.** The short
form (without gates 3 and 5) is kept only for a test copy.

| Gate | The fact | Who owns it | Checked | Columns on the Hearings tab |
|---|---|---|---|---|
| 1 Schedule | Date, time and place. For a video or telephone hearing, also the link or the number. A room letter ("room C") is not a link, unless the office has said that the room letter is all it sends (Offices AL) | The county office, in writing | Once per docket | I, and AV for the link; CJ is the link check |
| 2 Consultant | The consultant's own yes for this slot. It stops counting the moment the Availability tab says they are not free then | The consultant | Per hearing | J. BR reads Availability; BV is 1 while the yes counts |
| 3 On the record | The county has that consultant as the representative for this case. BD names whom it has, and must equal H | The county office | Per case | K and BD |
| 4 Evidence | The current case-file version (AX) is with the clerk, every file named, and with the consultant. A receipt closes its half only for the version it names, or when it says "current" | Each of them | Per hearing | L with AZ (the clerk's version), M with AY (the consultant's) and BW (whose GOT IT it is) |
| 5 Nothing owed | Signatures, withdrawals and statements are processed. For a settlement or a withdrawal, the homeowner's written yes comes first | The county for filings, the homeowner for consent | Only where something is owed | O, BG; BU shows what is still open |

**A proof belongs to the consultant who gave it.** The GOT IT in M counts only when BW names the
consultant in H, and the day-before YES in Q only when BX does. A replacement inherits neither,
and BE names the cells to clear: H and J, M with AY and BW, Q with BX, and the arrival time in
CH.

**Per docket means once for all of an office's hearings on a day.** One reply or one dated portal
screenshot that shows the day's list closes gate 1 for every one of those rows. Gate 3 is per
case, because an office may record one case of a docket and not the other (Orimere, message 16).

**Proof comes in two grades, written in the Grade column (P).** Gates 1, 3 and 4 need an office to
answer, and many offices will not answer every email in peak season. I found no office that
states it takes representatives' submissions by email, and the largest Texas district works
through a portal (sourced, `research/07`). So a dated screenshot of the office's own portal
counts as well as its letter.

| Grade | What it is | Counts as closed? |
|---|---|---|
| A | The office's own written reply or its hearing notice. A consultant's or homeowner's own message | Yes |
| B | A dated screenshot of the office's portal or docket that shows the fact | Yes |
| A phone call | Our written submission and a call, with the name, the time and what was said | **No.** It goes in Next action (Y). The check stays open, and the office is asked to put it in writing (the email after a phone call, section 6) |

Earlier drafts had a third grade, C, for a call after two working days of silence. The sheet no
longer accepts it: the Grade list offers only A and B, and Measures row 14 counts any C typed over
the list (it must read 0). An office that will not answer stays on the daily list (TOP OF LIST
inside three working days). It gets the second request (section 16.2), logged in Y, and then a
call at 9:00 a.m. office time. That is the cost of a list that tells the truth.

## 3. The sheet: the tabs a coordinator uses

This section covers the tabs a coordinator works in every day: Hearings, Dockets, Measures,
Reader suggestions, Offices, Bench and Day 1 count. The sheet's own "How to use" tab describes
every column of every tab and is the full manual; the kit's Monday page follows it. Hearing Desk
(`app/dist/index.html`, described in the README) is a simpler view of the same sheet for the
coordinator.

### 3.1 Program, size and what was tested

`gate-sheet.xlsx` needs Excel 2019 or later, Microsoft 365 or Google Sheets, because it uses
MINIFS and ISFORMULA (How to use A14). It uses no LET, LAMBDA, FILTER, XLOOKUP or dynamic array.
The installed sheet has 18 tabs and 159,013 formulas (measured); its formulas run to row 1,200
(1,199 hearings). It was built and checked in LibreOffice 24.2. Excel for Mac (20 Nov 2026) and
Google Sheets (an 80-row copy, 21 Nov 2026) opened earlier versions with every formula kept and
no error value (measured); neither was run on the sheet as it is now. What was tested, in which
program and by whom, is in section 14.

The live copy is one shared online workbook for all ten counties, with one shared mailbox.
Above about 1,000 hearings a year it is split by county team (section 15). Settings B6 sets the
form: **full** (the five gates) is the default and the form the plan runs; **short** (without
gates 3 and 5) is only for a test copy.

The sheet holds the 24 hearings of the example week as sample rows, as they stand on Friday,
June 7 at 2:00 p.m. (Settings B2 and B15). On the full form (measured on the installed sheet):

| READY | OPEN | RESULT DUE | OWED | ERROR DUE | Proofs missing, all 24 rows |
|---|---|---|---|---|---|
| 2 | 17 | 3 | 1 | 1 | 80 |

No hearing is CONFIRMED, because the packet holds no day-before YES. The two READY rows are 102
and 118 Willow Lane (Larkmere). 120 and 138 Garden Street (Velloran) read OPEN: the office names
video room C and sends no link, and neither receipt names a version (messages 70 and 71).

### 3.2 A normal day: the columns a coordinator types

The Hearings tab has 73 typed columns. On the 24 example rows (measured on the installed sheet):

| How often | Columns |
|---|---|
| Typed once, when a hearing is added (the notice and the case record) | A to G, I, AX, DE, DF, DG (12 columns, filled on all 24 rows) |
| Typed as the day's mail comes in | H (consultant), J (their yes), K (the office's record), BD (the name the office has), P (grade): 5 columns, each filled on 13 to 24 rows |
| Typed on some days | L and M (receipts), BN (what to tell a consultant), BW (whose GOT IT), BC (declined by): 7 to 11 rows each |
| The example's own note | AB (on all 24 rows; a live sheet leaves it empty) |
| Rarely or never in the example | the other 50 typed columns |

51 of the 73 typed columns hold something on at least one example row; 18 hold something on 12
rows or more (measured). The rest of the sheet is formulas. Everything else is printed in
column BE when it is needed, with the cell to fill and the step to take; the coordinator reads
the line and the section of the kit it names.

### 3.3 Hearings: one row per hearing

**134 columns in use (A to ED): 73 typed and 61 formulas.** Column EE holds one heading ("Keep
this column empty: Dockets A1 reads it to notice cells pushed out of their columns") and nothing
below it.

- **A proof cell (blue) takes a link or nothing.** A call, a portal page or a text has no link of
  its own: it goes on one dated PDF per docket in the shared folder, and that PDF is linked.
- **The five checks** are I (G1; for a video or telephone hearing AV must hold a link or a number
  of seven or more digits), J (G2, counting only while the consultant is free then), K (G3, with
  BD equal to the consultant in H), L and M (G4, for the case-file version in AX) and O (G5). The
  table in section 2 gives the columns behind each.
- **Status (W) is a formula.** Before the hearing: OPEN with the number missing, READY when every
  check is closed, CONFIRMED when the day-before YES of the consultant named in BX is in, then
  ARRIVED or IN once R holds a time. After it: RESULT DUE, MISSED, RESULT NOT CLEAR, OWED, NEW
  DATE DUE, ERROR DUE, DECISION DUE, RESULT IN: ARRIVAL NOT RECORDED, "DONE: n proofs missing" and
  DONE. Also NOT HELD, CANCEL PROOF DUE and NO DATE. No held hearing can read DONE without a time
  in R.
- **The daily list (X) is a formula**, in working days, with each county's own holidays. Its
  main values: TOP OF LIST (a proof missing within 3 working days, an office that has asked twice
  or more, something owed within a working day), REVIEW (within 14 days), CONFIRM TODAY (hearing
  on the next working day, no day-before YES), and the values for work after the hearing (RESULT
  DUE, LETTER DUE, PROOFS DUE, TELL DUE and others). Words such as NOTICE BLOCKED, ILLNESS
  REPORTED, ARRIVAL NOT SETTLED or CALL THE HOMEOWNER are added to a row's entry when they apply.
  How to use lists every value.
- **Deadlines and changes (BE, in red)** prints each due or changed item with what to do and the
  cells to fill: the office's deadline, a name without a yes, case files to send, a missing video
  link, the office's record, a date-change request, a changed office route, an illness report, a
  settlement, the homeowner to call and the rest. Columns CZ, DP, EA and ED hold the lines added
  by Parts I to L of the rule book (section 3.6).
- **A hearing marked as not on stays on** until the office's written confirmation is linked in AF.
  The homeowner's written yes (BG) comes before G is touched.
- **A hearing by written statement** has nobody in the room: no offer, no day-before text, no
  arrival. It is READY when the office's notice, the name on its record and the clerk's receipt
  are linked (How to use A13). The example has none.
- **The case record stays the system of record.** Every Friday the Record check tab flags each
  record that differs from the sheet; 11 of 24 example records disagree, the same 11 a hand audit
  of the packet found wrong (measured).

### 3.4 Dockets, Measures and Reader suggestions

**Dockets: the texts write themselves from the rows.** One line for each office, day and format
from today on (9 dockets from June 7 in the example, measured). G says to whom to offer the
docket; H is the offer, with the open hearings only, "at your usual rate" and the time to answer;
I is the day-before text for each consultant, which reads DO NOT SEND YET while a video hearing
has no link; N is the notice to the office, from yes replies only, in the office's own form; O,
"Ask next", ranks whom to offer an open docket to and leaves out anyone who declined, is not
free, is full or cannot travel in time. In the example the tab holds 4 offers and 3 day-before
texts, and 5 dockets read DO NOT SEND YET (measured). The tab needs the Hearings rows sorted by
date, office and time; cell A1 reads "Rows are sorted: yes" or says in red what to put right.

**Measures counts itself** (the example on June 7, measured): B3, hearings inside 3 working days
with no yes that counts, 4; B4, case records that disagree, 11 of 24; B6, hearings held with a
proof missing, 5; B7, ready on time, 2 of 11; B15, hearings per consultant-day, 1.7; B16, Status
cells typed over, 0 (it must read 0, because a spreadsheet cannot lock a formula); B21, video
hearings with no link, 13; B97, consultants with no mobile number, 6; B98, hearings whose notice
to the office is blocked, 2. Row 18 (minutes a hearing) fills from the weekly log from the first
Friday; its target text gives 92 hearings a coordinator today and 91 to 96 with the plan
(estimates) and says that no saving in minutes is claimed for season one.

**Reader suggestions** holds what the AI readers propose for each proof cell (section 7). In the
example they made 103 proposals and handed 8 of the 72 messages to a person (measured). Every
proposal waits for the 9:00 a.m. pass; nothing fills a cell on its own in season one (row 168).
For new mail a person pastes the rows that `node cli/sheet.js --paste` writes.

### 3.5 Offices, Bench and the other tabs

- **Offices** (one row per county, 54 columns): routes, rules, time zone, hours, who signs, the
  notice fields, the naming deadline, and the approval of a changed route (AQ, AR, AS). While a
  change waits for a person's approval, no route is printed and no notice goes (Tesswick in the
  example). Amber ASK cells hold the exact question for the office or counsel; the kit's section
  8 lists them. R holds counsel's question on who may appear and sign in each state, and it now
  carries that answer into Bench S.
- **Bench** (one row per consultant, 20 columns): contact, preferred channel, counties allowed,
  daily cap, rate, weekdays promised, mobile number and the agreement to be texted, the reach
  code, and S, the states where the consultant may appear and sign (ASK for all six in the
  example). T is a helper that holds S once it is answered.
- **Availability**: anything a consultant says about being free or not free, with the window,
  the office and the link (9 rows in the example). An illness report there puts every hearing
  the consultant holds in the next 7 calendar days on the daily list.
- **Who can take it**: each docket against each bench name, by code (1 already at this office
  that day, down to 6 elsewhere with the travel gap met). Blank means not allowed in that county,
  or not allowed in that state once Bench S is answered.
- **Day 1 count**: the numbers and questions asked of Alice, counsel and the consultants on day
  1, each with its cell. Row 33 asks in which states each consultant may appear and sign.
- **Record check, Notices on file, Calendar, Calendar file, Holidays, Friday sample, Hours,
  Settings**: described in How to use. The Calendar file tab is an iCalendar file in UTC; it
  imported into Apple Calendar with no error (a version of 21 Nov 2026 before the last rules were added; measured).

### 3.6 The rules added on 21 November 2026 (Parts J, K and L of the rule book)

No typed column moved for any of them; the keep-empty heading moved from EB1 to EE1 with Part L. All were run in LibreOffice 24.2 only.

| Part | Typed cells | What the coordinator sees |
|---|---|---|
| J | Hearings DA to DI; Offices AY, AZ | The wait for a clearer copy and its fallback; a first case at opening; the office's answer to a date-change request (moved or refused); the settlement offer and its acceptance date; an arrival time the consultant cannot make; the homeowner named on every row, with one call covering two hearings; the office's daytime number |
| K | Hearings DQ to DX; Offices BA, BB | Whether the office's record counts after a move; a call to the homeowner with the new date; a result with no source; who decided a date-change request; the office's street address in the day-before text; the day a paper notice or a "today" message arrived |
| L | Hearings EB, EC; Bench S | Who asked for a date change (X32); who may appear and sign in each state (X33); removing a departed consultant's access to the case files (X34). Details below |

**Part L in the example** (measured on the sheet before its last formatting change, md5 dea85ef5ebff6ae2160acf7de2b3d849; the shipped sheet, md5 2e74089c917b1bcc1ac36f5f7de3e7ce, has the same formulas and values).
Column ED prints the Part L lines in BE on 11 of the 24 rows:

- **Who asked for a move (EB).** EB holds "the firm" on 4 rows (messages 8 and 15) and "the
  homeowner" on 48 Linden Avenue (message 47). No consultant asked an office directly, so the
  line [name] HAS ASKED FOR THE DATE CHANGE WITHOUT THE FIRM prints on no example row. A move with
  nothing in EB prints WHO ASKED FOR THIS MOVE IS NOT ON RECORD.
- **Who may appear and sign (Bench S).** S is ASK for all six consultants, so the offer is not
  blocked: every name in "Ask next" carries (STATES: ASK), and the cell ends with WHO MAY APPEAR
  AND SIGN IN [state] IS NOT ANSWERED YET ... THE OFFER MAY GO, AND THE ANSWER IS CHASED. On the
  4 rows with something to sign, BE asks the question before anything more is signed, among them
  Owen's withdrawal statement at Brindlefen (message 28). Once S holds an answer, a consultant is
  no longer offered a hearing in a state it does not name, and a consultant already named there
  gets the line MAY NOT APPEAR OR SIGN FOR A HOMEOWNER IN [state] with the step to replace them.
- **Files access (EC).** EC is empty on all 24 rows, because no message says that access was
  removed. So the line prints on 7 rows where a consultant is named in BC (declined or taken off):
  Maya on the two Brook Road rows and 14 Willow Lane, Leo on 63 and 81 Garden Street and 48
  Linden Avenue, Nora on 24 Orchard Road. It asks to remove their access to the folder links
  sent, or to type "files were never sent".
- The status counts and the proofs missing are unchanged by Part L. Settings K2 to K11 hold the
  fixed words of these lines; How to use rows after 78 describe them.

### 3.7 What the sheet cannot do

It cannot stop a wrong link, cannot remind anyone, cannot send anything and can be overwritten.
That is why the Friday sample exists, and it is what a bought tracker would take over. Known
limits, all written in How to use:

- A formula cell that is cut and pasted is seen only in a few watched columns, and an empty typed
  cell moved to another tab is not seen while both places are empty (row 27).
- Something typed two or more columns to the right of the last column is not seen by Dockets A1
  (measured on earlier versions; the column is now EF).
- A move typed only over D, with nothing in DR, DI or DQ, is not seen as a move (A73).
- A date typed as text in DQ, DR, DW or DX reads as no date; Dockets A1 names it.
- No formula works out a deadline from the day a message or paper notice arrived: a person types
  the date in AA or AW.
- The approval cells and DV show that a name was typed, not that the person may decide.
- The arrival time in CH has no name cell: a time left there after a replacement is printed under
  the new name.
- A cleared cell of Settings J or K prints part of a line as nothing.

Section 14 lists the places where the kit asks a person to do what the sheet does not.

## 4. The docket: build it, then offer it whole

Today a hearing is offered to a consultant one at a time. The example week shows what that does.

| Day | Hearings on the calendar | As offered today | Offered as whole dockets |
|---|---|---|---|
| 10 June | Larkmere, in person: 9:00, 9:30, 11:00, 11:30 | Two consultants hold three of them. One has nobody | One consultant, four hearings |
| 11 June | Velloran, video: 1:00, 1:30, 3:00, 3:30 | One consultant holds two. Two have nobody | One consultant, four hearings |
| 12 June | Tesswick, in person: 11:00, 11:30. Orimere, video, 2:00 | One consultant holds two. One has nobody | One consultant, all three |
| 13 June | Brindlefen, video: 10:00, 10:30. Harthmere, video, 10:00. Caldmere, video: 2:00, 2:30 | Two consultants hold four. One has nobody | Two consultants, five hearings |
| 14 June | Iverfen, video: 1:00, 1:30 | One consultant, two hearings | The same |
| **The week** | **18 hearings** | **7 consultant-days cover 13. 5 hearings have nobody** | **6 consultant-days cover all 18** |

Three rates, on the same calendar, like for like:

| | Hearings | Consultant-days | Hearings a consultant-day |
|---|---|---|---|
| As staffed today | 13 | 7 | 1.9 |
| If the five open hearings went to the consultants already booked that day | 18 | 7 | 2.6 |
| As whole dockets | 18 | 6 | 3.0 |

My first count of this calendar left out 37 Meadow Avenue (June 12, 11:00, Owen), whose date the
readers now place, and found 17 hearings: 12 staffed on 7 days (1.7), 17 on 7 (2.4) and 17 on 6
(2.8). The cost model and the kit's targets were set from that count, and I keep them, because
they are the more cautious figures: 2.4 is the season target from staffing alone, and the model
keeps 1.6 for today (estimate). The sheet's Measures tab shows 1.7 (B15), because it counts every
date on it: 17 hearings with a yes that counts, on 10 consultant-days, with June 4, June 6 and
June 18 (measured). **The 3.0 is the most this calendar allows, not what the bench has agreed to.** The 18
hearings sit in 8 office-day dockets; 6 consultant-days need one person to take two dockets on
the same day twice: an in-person and a video docket on 12 June, and two video dockets on 13 June.
In the example messages the five open hearings are ones a consultant declined or left
unanswered. Whether one named person will take all four at Larkmere is exactly what the offer
asks, and the answer may be no. The packet's consultants say they accept 4 to 8 hearings a day.
The count is mine, from the packet's calendar, and not a result.

**What a fuller day is worth.** At the same $90 a hearing a fuller day adds capacity, not margin:
the firm pays $90 either way. It is worth money only in two ways. It lets a bench of six carry
more hearings (section 9). And a consultant who has had ten full days is someone the firm
can offer a guaranteed day to (section 9).

**How.**

1. **Every Monday, open the Dockets tab.** Each office-day is one docket. Hearings a consultant
   has already accepted stay with that consultant, and the open numbers at that office go first
   to the person already going there (G, code 1); "Ask next" (O) ranks everyone else by the
   codes on the "Who can take it" tab. When an offer goes, the consultant's name is typed in
   Hearings BY on each hearing offered and cleared at their no: an offer that is out counts in
   that consultant's day, so two dockets offered on one Monday cannot pass their daily cap (Bench
   E) or the travel gap. Video hearings on the same day in different counties can be one
   docket if the times do not overlap (the packet asks for 15 minutes between separate video
   sessions and 60 minutes between in-person hearings in different counties).
2. **Offer the docket whole to one consultant**, with the numbered text. A consultant with four
   stacked video hearings earns $360 in an afternoon instead of $180 for two.
3. **A partial yes is a yes for those numbers.** The open numbers go to the next consultant the
   same day.
4. **Ask each office in writing to set the firm's hearings on the weekdays our consultants
   promised (Bench I), and on one day where it can.** In Texas a board must schedule up to 20 of
   an agent's hearings consecutively on one day when the protest notice asks for it (sourced).
   The question is the fourth of the season questions (kit, section 2), and the answer goes in
   Offices Q.
5. **Cap: 8 hearings a consultant-day**, the most any packet consultant accepts, until the firm's
   own results by consultant show that fuller days do not cost reductions. Each consultant's own
   cap is in Bench E, and the sheet holds to it: "Ask next" leaves out anyone who is full, held
   and offered hearings together, BE prints OVER THE DAILY CAP if a consultant still holds too
   many, and Measures row 24 counts such days (0 in the example).

The measure is **hearings per consultant-day**, which the sheet counts by itself. Targets: 2.4 from staffing alone (the week of 10 to 14 June runs at 1.9 as staffed on the sheet,
13 hearings on 7 days), and, counted apart, 4 where an office agrees to one day and 6 on
day-rate video days. 3.0 is the most the example calendar allows and is not a target.

## 5. The day in detail

**Each new step replaces an old one.** The old steps are what the example messages show
coordinators doing today. The minutes are my estimates until the replay times them.

| New step | Minutes a hearing | What it replaces |
|---|---|---|
| One numbered offer per docket, written by the sheet. Paste the reply into the rows it covers | 0.5 | An offer per hearing, and the follow-up to find out which hearing a "works for me" meant |
| Paste the clerk's receipt and the consultant's "got it" | 0.75 | Re-sending the file when a consultant or clerk turns out to have the old one |
| One day-before text per docket at 8:00 a.m., scheduled, before consultants go into the day's hearings. A phone call at noon to anyone silent. Paste the YES | 0.35 | Reminder calls and messages one consultant at a time |
| The 2:00 p.m. list: flagged rows only | 0.25 | Reading every case record to find the ones at risk (the status field is still kept, and checked against the sheet every Friday) |
| ARRIVED or IN, typed as a time | 0.15 | Nothing. This one is new |
| One result text per docket; paste the result and the error per hearing | counted in today's work | Chasing results hearing by hearing |
| The county's notice, linked once per docket | inside the 0.5 above | Nothing. This one is new |
| **These steps together** | **2.0 added, before anything is taken off; the full sheet adds about 2 more (below)** | **At the live-week-4 review: no more paid minutes a hearing than in live week 1** |

Scheduled sending is a standard function of Gmail and Outlook. Most shared text lines have it too
(check with the vendor). The scheduled texts go only to the firm's own consultants, never to
homeowners or offices.

**Not in these minutes: the watch and the backup.** Dockets start through the day (in the example
week at 9:00, 10:00, 11:00, 1:00 and 2:00), so from about 20 dockets a day the watch is a desk of
its own. At 5,000 hearings a year it is the dispatcher's job in the peak: one seasonal person for
eight weeks, about $10,600 (estimate), who also owns the consultant calendar. At 1,000 hearings a
year, about seven dockets a day in the peak, it is a phone on a coordinator's desk. Each time the
backup steps in is about an hour of an attorney or agent; at 5,000 hearings and 2% missed that is
up to 100 times a year. Both are counted from the first week.

The full sheet adds one request and one pasted link per docket for gates 1 and 3, gate 5 where
something is owed, and the grades: about 2 more minutes a hearing (estimate). Kept by hand, that
is 23.6 productive minutes a hearing against 19.6 today; the plan's estimate brought it to 17.8
before the newest checks, and to 18.7 to 19.6 with them (estimates, the upper side; section 12).

| When | What | Who |
|---|---|---|
| Friday | Someone who does **not** keep the sheet pastes the case-record export into Record check, opens every proof link of 10 sampled hearings, copies the week's measures into the weekly log, and asks each office about every DECISION DUE row | The deputy |
| Same day as a missed hearing | The good-cause letter goes out today (in Texas the window is 4 days, sourced) | Coordinator |

The review is at 2:00 p.m. and not first thing, because the morning belongs to the arrival watch.
The last steps are early on purpose: an office that closes at 4:30 cannot be reached at 5:00.

**The morning of the hearing, by format.**

| | In person | Video or telephone |
|---|---|---|
| The day before | YES by reply | YES by reply, **naming the link or the number the board will call**, and tested |
| Watch starts | 45 minutes before the first hearing at each office: one named coordinator is on the phone | 15 minutes before the first hearing of the docket |
| The signal | ARRIVED by the clock time in the day-before text: the first case less 30 minutes (Settings B16), or less the office's own number (Hearings CI) when that asks for more | IN, 10 minutes before |
| No signal | At that clock time: call the consultant | 5 minutes before: the alternate on the office's record joins with the file open. Where the office has none yet (Offices T), call the office and ask for our cases to go to the end of the docket |
| Still nothing | 15 minutes before: call the office and ask for our cases to go to the end of the docket. The evidence is on file, so the office can decide on paper | The backup presents from the file. One large Texas board waits at most five minutes for a telephone party (sourced) |

**One arrival rule, and why.** The packet shows three different lead times: Fenwick Vale asks for
15 minutes (message 40), and Owen and Leo each named their own arrival 15 minutes before their
first case (messages 20 and 65), while the plan's watch expected ARRIVED 30 minutes before. Two
lead times in one text invite the later one. So the text names one clock time, the earlier of
the firm's and the office's, and a consultant who names a later time is answered the same day
(Hearings CH; BE prints the two times; the reply is in section 16.2). The 30 minutes are
the plan's own choice and are set in Settings B16.

**A first case at opening, and why it moves to the day before.** All ten example offices open
at 9:00 a.m. (Offices AM), and 2 of the 19 coming hearings start then. The call that asks for
our cases to go to the end of the docket is made 15 minutes before the first case, when such an
office is still closed. The sheet therefore marks a hearing that starts less than 30 minutes
after opening (Settings B17) and prints FIRST CASE AT OPENING from two working days before, so
that the end-of-docket request, the alternate and the question whom to reach before opening are
dealt with while the office is open. The line prints for each such hearing, with or without a
consultant on it, and not on the hearing day itself. Whether any office gives a contact for the
early morning is unknown until it answers (Offices AO, an ASK for all ten).

**The ladder when a consultant drops out**, with the reasons behind the kit's steps (Monday page,
"When a consultant drops out or goes silent"; How to use A32, "Day before").

| When the firm knows | Action | Why |
|---|---|---|
| At any hour | One "not free" row on the Availability tab. The hearing turns open and red at once (BR, BV, BE), and "Ask next" leaves that consultant out. The row counts when any part of it overlaps the hearing, not only the start time. BE then names the cells of that consultant to clear: H and J, M with AY and BW, Q with BX, and the arrival time in CH | A dropout typed anywhere else (a note, a calendar) changes nothing on the sheet, and the hearing would still read as covered |
| Inside three working days, before 4 p.m. | Offer the open hearings down "Ask next" by text and phone; the Dockets H text asks for an answer within one hour when the hearing is on the next working day, and within two hours otherwise | There is still time for a consultant to read the file |
| Noon the day before | Phone anyone without a day-before YES | Most silences are a missed text, not a dropout |
| 2 p.m. the day before, no YES or a NO | Type one row on the Availability tab for that consultant, that date, marked not free, with the note "no day-before YES by 2 p.m." (a silent consultant is treated as out). The hearing turns open and red, the Dockets offer lists it and asks for an answer within one hour, and "Ask next" leaves the silent consultant out. Offer it to the first name in "Ask next", then the next name. If the silent consultant answers YES before anyone else has, delete that row and paste their YES | One hour leaves two hours of office time for the next steps. Without the row the sheet would still count the hearing as the silent consultant's, and the offer would leave it out |
| 4 p.m. the day before | The office's alternate on record (Offices T) takes the docket and the files. Where there is none yet: phone down "Ask next" until one says yes, confirm that the evidence and the sworn statement are on file, and ask for our cases to be heard last | The alternate can cover one video docket at a time. In Texas an agent has no free postponement and must show good cause, which the statute describes as an error that was not intentional or the result of conscious indifference (Tax Code 41.45(e) and (e-2), sourced). **Whether a dropout qualifies is the board's decision, so a new date is never the plan** |
| After 4 p.m., overnight or at a weekend | The evening reader (Settings B9) texts everyone in "Ask next" at once; the first YES wins, and the rule hands later ones to a person. The evening reader emails the office and its alternate, and phones the office when it opens | The office is closed until then |
| The morning | The day-of table above, then the good-cause letter the same day if nobody appeared | In Texas a new hearing follows as of right if the statement is filed within 4 days (sourced) |

**The evening reader.** Settings B9 names who reads consultants' texts after 4:00 p.m. and at
weekends. It reads ASK ALICE until Alice answers on day 1 (Day 1 count row 16). Until then the
default in Settings C9 applies: the named coordinator keeps the text line on until 9:00 p.m. on
working days and checks it at 7:00 a.m., and at 9:00 a.m. and 6:00 p.m. on Saturday and Sunday.
Maya's text the day before two hearings at 9:00 and 9:30 a.m. (message 41) is the case it exists
for. The packet gives no hour for it; the prototype's replay places it at 6:12 p.m., after the
office closes at 4:00 p.m., and then only a text that night can still fill them.

**The backup, named each day.** One person at the firm who may appear and is already on the
county's record as the alternate: an attorney of the firm, or its registered agent where the
state has such a register. **Not Alice by default.** If Alice is the only person at the firm who
may appear, say so on day 1: it limits the firm to one rescued video docket at a time, and it is
the first argument for a seasonal representative of the firm's own (section 9). The backup covers
one video or telephone docket at a time. In-person dockets, and a second video docket at the same
hour, rely on the evidence on file, the end-of-docket request and the good-cause letter. A
telephone appearance cannot be asked for on the morning: Texas boards need a written request at
least 10 days ahead (sourced).

**Who owns the sheet.** The associate keeps it personally in its first live week, live week 2, in
all ten counties, then hands it over in live week 3 to one named coordinator with a named deputy.
A sheet with no owner is the status field again.

**Once a season, to each office**, in desk week 2: the season questions in the kit (section 2),
seventeen numbered questions in one email, so that each answer lands in its own cell: the
naming deadline (Offices O, and as a number of working days in AF), whether our attorney or
registered agent may be the alternate on record (T), what happens if nobody attends (P), whether
the office will set our hearings on the weekdays our consultants promised and on one day (Q), who
signs a settlement or withdrawal (AC, AG), which signatures it accepts (AD), how it sends video
links (AE), what a video room means (AL), whom to reach before opening on a hearing morning (AO),
how long one hearing runs (AP), its closure days (the Holidays tab), its hearing season (U),
whether it changes its clocks in March and November (AU), the last day it accepts a request to
change a hearing date, as a number of working days before the hearing (AY, with the route in K
in the office's words), its daytime telephone number and the clerk to ask for (AZ), for an office that
hears in person its street address, hearing room and where to report (BA), and its
written confirmation of the route by which it wants to be told who attends (the date of the
confirmation in L; Offices N reads CONFIRM THE ROUTE IN WRITING until then, and ASK AGAIN: OVER
SIX MONTHS once the date is more than 180 days old).
The kit's section 8 lists every open question with its cell, also those for consultants, Alice
and counsel, and the questions that the sheet prints on the Day 1 count tab, rows 20 to 32. An
office that changes how it works mid-season goes in Offices M the same day, with the date in AT.
From that moment "Tell the office" and BE print NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON
APPROVES THE CHANGE TODAY and no route, until a person types their name and the date in Offices
AQ and AR; then the new route is the route (kit, "Telling the office who attends").

## 6. More scripts, and why the day-before text is worded as it is

**The season-one texts are together in the kit, section 2**, worded as the sheet prints them: the
docket offer, the week-ahead and day-before texts, the reply to a consultant who names a later
arrival time, the arrival and result texts, the case files, the request for GOT IT with the
version, a change from the office, the warning after a phone report, the answers to a consultant
whose calendar is wrong (Leo, message 12; Nora, message 18), the release notice, the confirmation
to a volunteer (Owen, message 42), the evening text and the two lines for the season letter; to
offices, the notice naming our representative, the request for a video link or call-in number,
the question about a video room, the arrangement for a first case at opening, the files email to
a clerk whose receipt names no files, the second request, the request to accept late case files,
the season questions, the withdrawal chaser (Iverfen, messages 51 to 53), the cover email for a
statement (Juniper Reach, messages 59 and 60), the signing request, the email after a phone call
and the good-cause letter; to homeowners, the call when a withdrawal or settlement is wanted, the
corrected notice and the call to a homeowner who went to the county. The two short letters below
are repeated here with their reasons; the sworn statement and the settlement call are only here.

**After any phone call with an office**, the same day.
"Thank you for your time on the phone today. To confirm what we discussed: [one sentence]. Please reply to this email to confirm, so that we have it in writing."
The call is noted in Y with the name, the time and what was said; the reply is the link.

**Good-cause letter (template, ready before the season).**
"Our representative did not appear at the hearing on [date] for [case number] because [reason, one sentence]. This was not intentional. We ask for a new hearing under [the office's rule]. The evidence is on file as of [date]."
The office's rule is in Offices P once the office has answered the season question; until then
the letter asks for a new hearing and the coordinator asks the office by phone how to apply.

Why the day-before text is worded as it is: in two hospital trials with about 20,000 patients, a
reminder that said the person was expected, named the cost of not attending and gave a number to
cancel cut missed appointments from 11.1% to 8.4% against a plain reminder, and a redesigned
summons with text reminders cut missed court dates by 13% to 21% in New York City (sourced). Those
were patients and defendants, not paid consultants, so the size of the effect here is unknown
until it is counted. That evidence is why the business case counts a quarter of misses as
prevented, not half.

**The sworn statement with the evidence (Texas).** It goes on file before every hearing, and it
says that our representative **will appear**. A statement that does not say so may be heard at a
separate statement-only hearing (Tax Code 41.45(n), sourced), which would decide the case before
the consultant arrives. If nobody does appear, the board decides on the statement. Whether the
firm's own states have such a statement is a question for counsel (Offices R).

**Signatures.** No signing tool is bought. The signer (BP, from the office's choice in Offices AC,
or AG for a withdrawal statement; where the choice is "the homeowner", a person calls the
homeowner and the consultant signs nothing) gets the PDF in the
shared folder and signs it in any free fill-and-sign app, or prints, signs and scans the page.
Whether an office takes either is an amber ASK in Offices AD until it answers. A photo the office
cannot read (Brindlefen, message 30) gets one request for a clearer copy; if none has come by noon
on the next working day (Settings B14), the fill-and-sign link follows, then a call. Nothing is
signed until the homeowner's written yes is in BG. Since 21 Nov 2026 the sheet keeps this wait:
the date of the request is typed in Hearings DA, BE prints DO NOT ASK AGAIN and the moment the
fallback falls due, the daily list reads FALLBACK DUE from that moment, and while BG is empty
the due step is the call to the homeowner and not the signing link (section 3; kit,
"Withdrawals, cancellations and settlements", step 3).

**The settlement call, 14 days before the date, in a trial county only (section 8).** It is made
by someone who may negotiate a value there, never by a coordinator.
"We represent the owner of [address], case [number], set for [date]. Our evidence supports a value of $[amount]. Is the appraiser able to agree a value before the hearing? If so, please send the agreement to [mailbox] and we will return it signed."

## 7. The AI readers and the reply rule: the audit of last season, then beside the sheet

The control is run by hand, but it does not have to be read by hand. The prototype's two AI
readers already do the slowest part of keeping the sheet: they read every incoming message,
decide which hearing and which fact it is about, check whether the sender is the party that owns
that fact, and propose the link for the proof cell with the words they rely on. They send
nothing and change nothing. A person accepts or rejects each proposal on the "Reader
suggestions" tab in one pass at 9:00 a.m. Run it yourself: `node cli/sheet.js`. Beside the
readers stand three pieces of fixed code with no model: the reply rule, the office-reply rule
and the mailbox connector. This section gives each one's measured limits. Nothing here files
itself in season one.

**The provider.** The measured readers run on the OpenAI API, one model checked by a second (the
recorded models are named on Reader suggestions row 116). No real client message goes to them, or
to any provider, until Alice and counsel have said yes in writing (Day 1 count row 18). The
prototype can also call open-weight models on servers the firm rents; none has been measured.

| | Number | Label |
|---|---|---|
| The example week: 72 messages, 24 hearings | 103 proposals, 63 of them to close a cell (the tab shows 53 as "close" and 10 as "names no version: a person asks for it"); the proof cells hold 60 reader links. 208 of 215 statements found (97%), 208 of 216 applied right. 8 of 72 messages handed to a person (11%: messages 14, 15, 18, 24, 34, 42, 47, 48). A person added 16 proof links the answer key holds and the readers did not propose for their cell, 10 of them in cells that were empty | Measured, on recorded answers of the two models. The 72 examples were used while the readers' instructions were written |
| Accuracy on 30 messages the readers had never seen | 51 of 57 statements found, 51 of 53 applied right, 6 missed. 1 wrong closing in 32. 8 messages to a person | Measured, a small sample, on recorded answers. The answer key has one labeller, the author of the readers' instructions |
| Readings that both readers agree on and the checking code passes ("agreed and verified"), the 72 examples | The answer key holds 134 closing readings. Both readers agreed on 128 readings and the checking code passed 125 of those; 124 of the 125 were right (99.2%, 95% interval 95.6 to 99.9). The wrong one: message 17 (hearing confirmed, AX-106). 124 of the key's 134 would file themselves. As proof links: 63 proposed, 63 of 63 right (interval 94.3 to 100); the key has 65 links | Measured, `node eval/autofile.js`, recorded answers only |
| The same on the 30 unseen messages | The key holds 37 closing readings; 36 were agreed and 30 of those passed. Of the 26 that the key can judge, 25 were right (96.2%, interval 81.1 to 99.3). On the strict count, which includes the 4 the key cannot judge (a postponed hearing), 25 of 30 (83.3%, interval 66.4 to 92.7). The wrong one: H059 (schedule changed, AX-119) | Measured, a small sample, one labeller |
| The same on a second unseen set, 100 messages in an everyday mix (20 Nov 2026) | 44 messages from offices, 39 from consultants, 9 from firm staff, 8 from homeowners. The readers found 152 statements, missed 44 and added 27, and handed 59 of the 100 messages to a person. The key holds 114 closing readings; 87 were agreed and 79 of those passed. Of the 79, 72 were right (91.1%, interval 82.8 to 95.6) and 7 wrong: office 38 of 42, consultant 31 of 32, other 3 of 5. The wrong ones: U005 twice (a reminder whose date conflicts with the record), U018, U073 twice (a staff note read as a submission), U081 and U083 ("schedule changed" where the key says "hearing scheduled" with the same date). On the 19 messages with nothing to file, 0 filings would have filed themselves. Pooled with the first unseen set: 97 of 105 (92.4%, interval 85.7 to 96.1) | Measured, `node eval/autofile.js --set data/unseen2.json --reads data/recorded_reads_unseen2.json`, recorded answers only (200 requests, $0.53 from usage). An AI author who did not see the readers' instructions wrote the messages; they are not a sample of a real mailbox. Two AI labellers working blind agreed on 183 of 200 statements (Cohen's kappa 0.94) and an adjudicator settled 17 (13 kept, 4 dropped). No human labelled this set |
| Cost | About a third of a cent a message for both readers: about $50 a year at 5,000 hearings and the example week's 3 messages a hearing, about $80 at the 4.6 of my simulated seasons | Measured price, estimated volume |
| Minutes it saves the sheet's keeper | **Unknown.** Counted in the 25 hearings timed by task in live week 4: the daily pass against pasting the same links by hand | To measure |

`node cli/check.js` runs 216 problems and passes 216 (measured). They cover the reply rule,
the office rule, the readers' checking code, the auto-file analysis, the mailbox connector and
the tools' agreement with the installed sheet. Two behaviours
are worth knowing. A reader's quote that skips words is accepted only when the skipped words
hold no negation or cancellation word. And a clerk's repeat receipt keeps the first one: the
readers propose message 64 for the clerk's receipt at Larkmere and message 72 changes nothing
at Velloran. On the example sheet a person then pasted the later message 66 over message 64,
because 66 says "current" and 64 names no version. Since 21 Nov 2026 that is a written test and
the tools apply it: a later message replaces the first link only when it states something the
cell needs that the first did not. `node cli/sheet.js --repeats` finds 18 repeats from 9 of the
72 example messages and marks the 4 lines of message 66 (Hearings L and AZ on two hearings) as
not repeats, because it names the version. The repeat test on the readers' side covers Hearings
I, K, L and M; a consultant's second yes (Hearings J) is never treated as a repeat, because a
yes after a schedule change is a new yes. A consultant's question is now a proposal for
Hearings BN, so that the sheet prints TELL until the answer is acknowledged: `node cli/sheet.js
--questions` lists 8 such proposals from messages 12, 35, 48 and 54. The code does not write
the answer.

**New mail onto the Reader suggestions tab** (`node cli/sheet.js --paste <messages.json>`,
built on 21 Nov 2026). It replays the 72 example messages, then reads each new message of a JSON
file in the packet's message format and writes one row per proposal as a tab-separated file in
the seven columns of the tab, to be pasted under its last row. With no key it calls no model:
it replays recorded answers for a message whose id and text it knows and gives every other
message one row marked NOT READ, for a person. On its example file (messages 66 and 72, three
messages of the unseen sets and one invented message with no recorded answer) it wrote 26 rows
for 6 messages: 2 proof links to accept or refuse, 3 cells to leave open, 8 repeats, 4 lines
where a later link replaces the first, 1 office change with HOLD, 6 other cells by fixed code 1 message for a person and 1 not read
(measured, rerun on a scratch copy on 21 Nov 2026). A cell that starts with =, +, - or @ gets a
leading space, so pasted mail text is never read as a formula. With a key it sends each new
message to the two readers. That path was run once with a real key on 21 Nov 2026 (record:
`outside-tests/live-reader-run.md`): 4 new messages, 8 requests, $0.09 (measured). That shows
the path works; it does not measure accuracy. Behind a proxy, start Node with NODE_USE_ENV_PROXY=1 (Node 22.21 or
newer); `--paste-help` says so. Its limits: it knows the 24 hearings of the packet and no
others; and it reads a file a person saves, not a mailbox. It is the named way for a proposal
about new mail to reach the tab, and it is a hand step. Where a reader's quoted words for a
consultant's yes did not hold the acceptance itself, the tab now shows the acceptance ("Accepted."
or "I accept both."); that changed the words shown on 6 proposals and no score.

**Trying the readers on a new message.** `node cli/reading.js --try "<text>" --from "<sender>"`
reads one typed message with the user's own key from the environment variable OPENAI_API_KEY.
With no key it prints that no key is set and shows the recorded reading of an example. No
command reads a key from a file. This command was not run with a real key; the same two readers
ran live once through `--paste` (above).

**What the readers can be worth, at most.** Beside the sheet they can remove the pasting and
matching the checks add, which is at most the 4 minutes a hearing the full sheet adds by hand.
They are worth more only if they also take reading out of today's work. So the rule at the
live-week-4 review is: **keep them for the season only if, in the timed hearings, the daily pass
took clearly less time than pasting by hand, with no wrong closing accepted.**

**Their first job pays at any volume: the audit of last season in week 1, if Alice and counsel
agree to it.** Reading a season of mail for old files, moved dates, no-shows, settlements and late
removals is 600 to 900 messages for every 200 hearings. By hand that is most of a week, so the
associate reads 100 hearings and the readers read the whole season. Comparing the two on the same
100 hearings also gives the one number the table above lacks: how often the readers are right on
the firm's own mail. Nothing is sent, and no record is changed.

**Why auto-filing stays off, and how a kind of message earns more.** The prototype can mark an
agreed and verified reading as "files itself" (`--autofile`). The option is OFF by decision for
this season. The measured numbers are in the table: 124 of 125 right on the 72 examples, 63 of 63
proposed proof links right, 25 of 26 on the first unseen set (25 of 30 on the strict count), and
72 of 79 on the second, larger unseen set (91.1%, interval 82.8 to 95.6), which is 97 of 105
pooled. The first unseen set looked better; the two sets were written differently, and the
larger one is the everyday mix. About 1 wrong in 11 agreed and verified filings on unseen
everyday mail is too many for a cell that decides whether a hearing is
covered. So a person accepts
each link, and the Friday sample checks the person. In season one **nothing fills a cell on its
own**.

What auto-filing would save was counted on three threads by `node eval/autofile.js`, which
applies the sheet's rules for a replacement, a video room, a file version and an arrival time (an
estimate of person actions, not a timing): Larkmere needs 10 actions a hearing with auto-file off
and 5 with it on, because L, AZ, BW, AY and CH are typed by a person whatever the readers do;
Velloran needs 7 and 1, and the two hearings are still not READY (OPEN: 3 missing): the docket
needs 3 messages (a files email to the clerk that names every file, a request to Owen Tarris for
GOT IT 2, a question to the office about video room C) before AV, AY and AZ can be typed; Brook
Road needs 4 and 2. Counted on the five proof cells only, as before, it was 5 and 0, 6 and 0, 3
and 1. So even with auto-file on, the Velloran thread needs a person.

The way up is by kind of message:

- **Replies that code can check are filed by the reply rule, not by a model**: a reply to a
  numbered offer (YES ALL, YES 1 3 or NO), the Wednesday YES ALL, the day-before YES, ARRIVED or
  IN, GOT IT for case files (a version number must be the current one), and OK to a change
  notice, each from the number or address of the consultant on that row. **It reads texts and
  email replies alike**: for an email it reads the first line the consultant wrote above the
  quoted message, and files it only when every other line of their own is a sign-off ("Thanks",
  "Sent from my iPhone") or their name; anything else ("but not before 10") goes to a person.
  Code matches the sender, the word and the number. In the example 14 of the readers' 63
  proposals to close a cell are a consultant's own yes, the kind this covers once offers are
  numbered. One in ten is opened in the Friday sample. With a GOT IT or a day-before YES the
  sender's name goes beside the link (Hearings BW, BX), because the proof counts only for that
  consultant.
- **The rule is built and tested**: `node cli/replies.js` runs 39 example replies, texts and
  emails, files 17 and hands 22 to a person with the reason (a YES without numbers, a condition, a
  number that was not offered, the wrong sender, an old version, a Wednesday reply that hands a
  docket back, an email with words of its own, a hearing that already has another consultant's
  yes: the first YES wins, so no hearing is booked twice; and a YES that would put the consultant
  over their daily cap), and it agrees with a decision by hand on all 39 (measured). Of the 19
  replies to an offer, 7 come with the day's numbers (the cap, the hearings held, the hearings on
  offer), and the cap sends 4 of those 7 to a person. The replies are fictional and were written
  by the author of the rule, and seven are marked hypothetical, so this shows the rule is narrow,
  not how consultants will answer. `node cli/replies.js --try "<reply>" --kind offer` tries any
  reply. Its live connection to the text line and the shared mailbox is part of the three days
  of technical help and is not built.
- **Everything a model has to interpret stays a proposal** that a person accepts: county notices,
  moved dates, cancellations, withdrawals, receipts. The condition for more is the one the firm
  reads on the sheet (Reader suggestions A168): at the live-week-4 review Alice may decide that
  proposals both readers agree on, of one kind, fill their cell without the pass, but only if the
  Friday sample found no wrong link of that kind in four weeks running. The measurement that
  feeds her decision is the firm's own two-week tally at the 9:00 a.m. pass, by kind: agreed by
  both readers, accepted, refused or later found wrong (Day 1 count row 24; kit, section 8,
  question 35). It is not a second condition. Our
  suggestion, not a measured threshold: at least 200 agreed proposals of that kind with no more
  than 1 wrong, and Alice signs it. At the measured 7 wrong in 79 on the newest unseen set, no
  interpreted kind is close.
- **One wrong closing found later puts that kind back to the 9:00 a.m. pass**, and the count
  starts again.
- A reader never sends a message and never files anything with an office. That stays with a
  person at every volume in this plan.

At 5,000 hearings a year the commonest kinds reach 200 sampled proposals within a season. At
1,000 only county notices and consultants' replies might.

**The office-reply rule** (`src/office_rule.js`, `node cli/office.js`; fixed code, no model). It
sorts an office's message by kind and returns what a person should type into which cell; it
suggests only. `node cli/office.js` plays a submission to each of the ten offices by that
office's own saved process and lets the user type the office's answer (`--try "text" --county
Tesswick`). Measured with `node cli/office.js --measure`, every label written by the author of
the rule:

| Set | Kind right | Handed to a person | Notes |
|---|---|---|---|
| The packet's 31 office messages | 31 of 31 after one fix; 28 of 31 on the first run (wrong: 59, 66, 72) | 12 | The rule was written from these messages, so this is not a measure on new mail |
| The firm's 3 call notes about an office (21, 22, 46) | 3 of 3 | 1 | HOLD on message 22 |
| 30 unseen office messages | 13 of 30 | 24 | 15 handed to a person although the label has a kind; 2 sorted as another kind; on 2 it proposes a cell the label does not have (H047: Hearings L; H059: Hearings AW and BH), which a person should refuse |

The simulator's 90 prepared answers are all sorted as prepared, which shows handling and not
accuracy, because the author wrote those answers. `node cli/check_office.js` passes 91 of 91
checks (measured). On a written move the rule
also proposes clearing Hearings K (the old link kept in a note in Y) and the old date for DR, and
says that the homeowner is called that day; on message 47 it proposes 8 cells, 1 of them a repeat
of message 45 (measured). The rule also proposes Offices AS and AT beside a process change, and
Hearings CP, CQ, Y and AA for an office that cannot find our notice, so through the connector it
proposes 24 lines on the 30 unseen messages; the kinds it sorts are unchanged. `--measure` also lists the three unseen messages sorted wrong and not handed to a person
as a whole message (H038, H047, H059); no wrong proposal of the office rule files itself, with
auto-file off or on. On unseen mail the rule is right on fewer than half of the messages, so it is a
simulator for practice and a detector, not a filer. As a detector of a change in how an office
works it did better: HOLD fires on message 22 and on the two unseen process changes (H036,
H057), the three that are labelled, and on none of the other 99 messages. The same detector run
through `node cli/sheet.js --process-changes` checked 34 of the 72 examples (office messages and
the firm's call notes) and all 30 unseen messages: 1 and 2 flagged, 0 false alarms of 33 and of
28, none missed. Message 22 was a development example, and three process changes in 102
messages is a small sample: zero false alarms here does not show a rate.

**What HOLD means.** HOLD is the block: NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES
THE CHANGE TODAY. While Offices M holds a change and no person has typed their name and the date
in Offices AQ and AR, every line the sheet writes for that office (BE, Dockets N, Offices N)
prints the block and no route, and its hearings are at the TOP OF LIST as NOTICE BLOCKED. After
the approval the new route is the route, and the old route is a second route only while the
office still accepts it (Offices AS: yes or not known). The proposal at the foot of the Reader
suggestions tab (C171), How to use A22 and `node cli/office.js` print the same sentence, and a
thread check compares the tool's sentence with C171 word for word. What "block" can mean on a
spreadsheet is stated in section 14: the sheet withholds the route and puts the row at the top
of the list; it cannot stop a person from sending a message.

**The mailbox connector** (`node cli/inbox.js`). It works on exported files (.eml files and
text-line JSON) and runs the reply rule, the office rule and the recorded readers over a folder,
writing one list of proposed filings: tab, row, column, value, link, who proposed it, and "files
itself" or "for a person". On its fixture `data/inbox-example/` (15 files: 13 emails and 2
texts, a recorded answer for 15 of 15) it lists 33 proposed filings, 0 that file themselves and
33 for a person, with 4 of the 15 messages handed to a person and no HOLD; with `--autofile`, 17
file themselves and 16 are for a person. Since 21 Nov 2026 it lists 8 repeats apart ("REPEAT of
message n: no cell changes") and does not propose them; that is why the count fell from 35 (four
lines of message 66 became repeats, and two lines for Hearings AZ are new). Four of the 33 are the Availability lines for the
illness report of message 41, which also hands the message to a person. Two replies were matched to a numbered message and none
was filed by the reply rule; 6 office messages were checked by the office rule. Its reply-rule
proposals name the sheet's cells as built (J, H, BC, Q, BX, R, M, AY, BW, BO). It writes to no
sheet and reads no live mailbox. The live hookup needs the firm's accounts, and its help text
names the two questions (kit, section 8, questions 30 and 31). For Fenwick Vale's "arrive 15
minutes before the first case" it proposes the number 15 for Hearings CI on both Brook Road rows,
where the sheet wants it.

What it needs:

1. **Alice's written yes, and counsel's, before client messages go to a model provider** (Day 1
   count row 18), under a written agreement with no training on the data and no retention, or a
   decision to run an open model on servers the firm rents (built into the prototype, **not
   measured**). The engagement letter gets one sentence: "We may use software services under
   confidentiality agreements to read and file correspondence about your case." Counsel checks
   that sentence against the state bar's rules before it is used. Nothing is connected before
   that yes, which is why it is asked for on day 1.
2. **About three working days of the firm's technical help**, for three connections: the text
   line to the reply rule; the shared mailbox to the reply rule and to the readers, writing their
   proposals into the sheet's tab; and an export of the case system in the six columns of the
   Record check tab (case, date, time, consultant, case files, status) for the Friday check. None
   is built: the connector that exists reads exported files and writes a list, not the sheet. I have not seen the firm's mailbox or case system, so the three days are a guess
   (estimate). The case says to assume the firm can provide technical resources; this is the one
   thing I ask them for.
3. Nothing else. No write access to the case system, no sending rights.

**Between the sheet and custom software there is a middle step, and it comes first.** A bought
tracker with automatic reminders and a shared text line takes over what the sheet cannot do
(remind, lock a cell, keep a history) without any build. It does not read mail, which is why the
readers beside it are still worth testing.

## 8. Who is in the room

The consultant is $90 of the $104 a hearing costs, about $450,000 of $522,000 a year at 5,000
hearings and $90,000 of $104,000 at 1,000 (estimates from the packet's fees).

**Every hearing gets a person in the room**: in person, by video or by telephone. The firm acts
for the homeowner, and the arithmetic shows why sending nobody cannot be the firm's choice alone:

| | At a 25% fee share | At a 50% fee share |
|---|---|---|
| Sending a $90 consultant pays **the firm** if it raises the chance of a reduction by more than | 47 points | 23 points |
| It pays **the client and the firm together** if it raises it by more than | 12 points | 12 points |

Between 12 and 47 points the firm would save money by staying away and the client would lose
more than the firm saves. A written-only route is therefore a later product that a client opts
into, with counsel's sign-off, and not an experiment run on clients who were promised a
representative. (Savings per won case from a public company claim of $774 a year, sourced as a
claim.)

**What could lower the cost of the person in the room, and what I know about each.**

1. **Fuller days** (section 4). Certain to add capacity. At the same $90 a hearing they do not
   lower the cost of a hearing.
2. **Settling before a consultant is booked.** Unknown, and I do not count it. In one large Texas
   district about 84% of residential protests closed by agreement and about 10% reached a formal
   hearing (sourced). But a scheduled hearing is one of the 10% that did not settle, so that
   figure says little about how many more would. The case also says consultants may need to sign
   settlement agreements, so a settled case is not always free of a consultant. The arithmetic:
   each point of scheduled hearings settled before booking saves $0.90 a scheduled hearing, and a
   5-minute call on every hearing costs about $3.70, so the calls pay only above 4 points. At 10
   points the net is about $5,300 a year at 1,000 hearings and $26,700 at 5,000 (estimate). Week
   1 counts how many of last season's scheduled hearings settled in their last 14 days, and who
   settled them. Above 1 in 10, the firm runs a trial of 50 hearings in one county, called by
   someone who may negotiate there, before those dockets are offered.
   If the call is made by an agent at $100 an hour (to set), it costs about $8.30 and pays only
   above 9 points.
3. **A day rate on full video days**, for recruits first and then as a choice for the whole
   bench, and at about 5,000 hearings a year the firm's own seasonal representatives (section 9).
   It pays above 4.4 hearings a day. This is the one lever tested in season one.

**If the fee received per hearing is below the cost of a hearing.** I do not assume it: public
figures give $97 to $387 a hearing, and the low end rests on a competitor's average saving per
customer, which may already include cases that lost. If day 1 shows it, the question is which
cases are booked for a hearing, and it is Alice's and counsel's, not a coordinator's. At a 25%
share a hearing pays in its first year only above about $417 of expected saving over the offer
refused ($104 ÷ 0.25). Below that line the engagement letter decides what the firm may do: take
the appraiser's offer, file a sworn written statement where the state has one (Texas does,
sourced), or ask the client. Two cautions. The fee is earned per client over several years, so a
hearing that loses money this year can still be right. And a firm that is known not to attend
gets worse offers. Once a hearing is booked it is staffed.

**What a missed hearing costs depends on the office** (sourced, `research/04`). The firm's own
offices answer it in Offices P (the third season question); until then P is an amber ASK.

| Office | If nobody attends | The way back |
|---|---|---|
| Texas boards | Dismissed, unless a sworn statement with the evidence is on file. Then the case is decided on that evidence | A new hearing as of right, if a written good-cause statement is filed within 4 days of the hearing |
| Florida boards | Relief denied without a hearing | A good-cause request before the decision is issued |
| California boards | Denied for lack of appearance | A written request with good cause, within a period the county sets (60 days at most) |
| Cook County, Illinois | Oral argument is waived and the appeal is decided on the file | Not needed |

So in Texas and Cook County most of a miss is recoverable if the firm has done two things, and in
Florida and California it is not:

1. **Evidence on file before every hearing**, in the form the office accepts. This is gate 4.
2. **The good-cause letter ready as a template**, sent the same day a hearing is missed.

In offices with no way back, split any day of 12 or more hearings between two consultants, so
that each can cover the other's.

## 9. Consultants: the terms, the firm's own representatives, and the bench

**The bench has an owner: the associate.** The associate keeps the bench list, rings the
consultants and reports the numbers each Friday. Alice signs any change of terms.

**Nobody's rate per hearing is cut; full video days go first to those who choose a day rate.**
The consultants also work for competitors, and 5 of the 18 hearings of 10 to 14 June have nobody,
so the plan does not ask anyone for a lower price per hearing. It works the deal from the
consultant's side instead. At 2.4 hearings a day a consultant earns about $216 from the firm. A
full video day of six to eight hearings at $400, paid in full whatever the county removes, is
nearly twice that, and costs the firm $67 a hearing at six and $50 at eight against $90. The firm
controls who is offered full days, so they go first to consultants who choose the day rate, the
six included; every other day stays at the rate per hearing. If the three week-1 calls say no,
the fallback is $90 for each of the first two hearings of a day and $70 from the third ($75 a
hearing at eight). **What it is worth, without the best case:** the eight or so test days of season
one save $1,100 to $2,500. On half of the peak's video hearings, at six hearings a day ($67 a
hearing), a $400 day is worth about $1,200 a year at 300 hearings, $4,000 at 1,000 and $20,000 at
5,000, about $4 off the average hearing. It reaches $35,000 at 5,000 only if every such day holds eight, which no office or consultant has
agreed to (estimates; nothing is agreed, and it is in no total). The test is bought for two
answers: how many hearings a pooled video day really holds, and whether results hold on full days.

| Term | This season | Label |
|---|---|---|
| Price | Each consultant's rate as today ($75 to $110 a hearing in the packet, $90 on average). No offer names a price | |
| Whole dockets | Offered whole and first, for the offices and days the consultant names in the season letter | Process |
| Confirmation | A hearing is covered only by a YES for that hearing. Re-confirm the day before. Text ARRIVED or IN | Process |
| Date changes | A consultant does not ask an office to move a hearing. Date requests go through the firm, which asks the homeowner and the bench first (Hearings EB records who asked) | Process (X32) |
| Where they may appear | The states where the consultant may appear and sign, from counsel's answer and their own licence or registration (Bench S) | Process (X33). Counsel answers on day 1 |
| Case files | Access to a hearing's case files is removed the day the consultant leaves that hearing, or they delete the files and say so in writing (Hearings EC) | Process (X34) |
| Results | One reply per docket, the same day | Process. It also gives the reduction won per consultant, which is the check on days that are too full |
| A weekly pay run | Paid every Friday for every hearing with its replies and its result received by Thursday. The others on today's terms | It is the one incentive the firm controls, so it is tied to the three replies and the arrival text. The model's cash figures already assume consultants are paid in the week of the hearing, so it adds nothing to them. Against monthly terms it brings forward at most three weeks of fees: about $6,000 in a peak at 300 hearings, $20,000 at 1,000 and $100,000 at 5,000 (estimates; I do not know today's terms). Alice decides on day 1 |
| A missed hearing without a call | A phone conversation before the next docket. After a second in a season, no first offer for the rest of it. A 30-day freeze would take one of six consultants out of half an 8-week peak | Process |
| Full video days of six or more | $400 a day for up to eight hearings, paid in full whatever the county removes, for any consultant who chooses it. Tested on every such day in the first live month, about eight days | To set. In no total |
| A guaranteed day | After a consultant has had ten full days: a day of four or more that is paid in full even if the firm removes a hearing inside 24 hours. What the firm asks in return is Alice's to propose | To set. California courts pay contract interpreters for late cancellations on a similar pattern (sourced). The week-1 count gives the firm's late removals; at 5,000 hearings and 5% removed late, paying half the fee for those would cost about $11,000 a year (estimate) |

**No paid standby at an office, but an alternate on record at every office.** That is a
condition for going live there (kit, section 3). Each office has either a named alternate who
may appear in that state and is on the office's record, or, where there is none, the written
fallback: the evidence and the sworn statement on file two working days ahead and the good-cause
letter ready. If the only person at the firm who may appear in a state is Alice, one bench
consultant is paid to be on call there in its peak weeks, $100 a day and $90 for each hearing
taken, about $4,000 a state (to set). A standby who waits at an office is a different thing and
does not pay. A guaranteed half block ($270) would need 63 hearings at one office on one
day to pay for itself on fees. A floater employed for the 40 peak days would cost about $16,000
(40 days at $400) and would have to rescue about 73 hearings at $218 each; at 5,000 hearings a
year I expect about 35 video no-signals in the peak (2% missed, 58% by video, 60% in the peak), so
a floater pays on fees only above roughly 10,000 hearings a year. Until then the cover is the
evidence on file, the end-of-docket request, the good-cause letter and the day's named backup.

**The cost lever at volume: the firm's own seasonal representatives on video dockets.** 14 of the
packet's 24 hearings are by video. A person employed for the peak, who may represent homeowners
and sits through one video docket after another, can cost less a hearing than a contractor.

| Illustration (nothing here is counted or agreed) | |
|---|---|
| Cost | $50 an hour all in, an 8-hour day: $400 a day |
| At 8 hearings a day, the most a packet consultant accepts | $50 a hearing against $90. On half of the peak's video hearings (875 a year at 5,000) that needs 2.7 people. **With three whole people hired for the 40 peak days ($48,000) the saving is about $31,000 a year** |
| At 12 a day, stacked 30 minutes apart | $33 a hearing: about $47,000 a year with two whole people. Nobody has shown that a full day at that pace keeps its results |
| Below 4.4 hearings a day | They cost more than a contractor ($400 ÷ $90). The cost model's today is 1.6, so a $400 day is offered only for days that are already full |
| At 1,000 hearings a year | No employee: 175 hearings is less than one person's peak. The same $400 day is tested with one recruit on about eight full video days (64 hearings, worth about $2,500), to learn hearings a day and results on full days |
| What I do not know | The wage, and the cost of hiring, training and registering someone for eight weeks. Whether such people can be hired for a season. Each state's rule on who may appear: Texas registers property tax consultants, and in Cook County only an attorney may represent a taxpayer (both sourced) |

Employing representatives is a question for the season after next, at about 5,000 hearings a
year. Day 1 counts the video share and asks each office who may represent a homeowner, and season
one tests the day rate with a contractor.

**The bench is the plan's hardest constraint from about 1,000 hearings a year.** The packet lists
six consultants, and in the example week they supply seven consultant-days between them. So the
table counts names at two days a week each, not full-time people (peak-week hearings ÷ hearings a
day ÷ 2, rounded up). Two days is my assumption: seven days from six people is 1.2 each, and at
1.2 every figure is two thirds higher, so the table shows both. At the example week's own values
(1.6 hearings a day, 1.2 days a week) a 75-hearing peak week needs about 40 names. So full days
and more days from the six come before recruiting. **The bench is a table by office, and the
head count follows from it**: a primary and a second (Offices X, Y) and an alternate on record
(T) for every office and format, video dockets pooled within a state. For the 300 hearings
a year the plan is written for, a 23-hearing peak week at 2.4 needs 5 names at two days a week
and 8 at 1.2, or 6 to 10 with a fifth spare. **I ask the six for two days a week in the peak and
recruit four anchors by mid-March**: consultants who get first offer of full days in return for
naming two days a week, about $430 a week from the firm in the peak against about $210 for one
name in ten sharing the hearings evenly. Four signatures at one in about 14 calls is 56 calls,
ten a week. **Above 300 the rule is two to three signed names for every extra 100 hearings a
year in Alice's forecast**: 20 to 33 names at 1,000 hearings (260 or more calls, a day a week of
the associate) and 95 to 157 at 5,000. If nobody has signed by week 5, the $200 referral fee
below opens a second channel.

| Hearings per consultant-day | Names a peak week needs at 1,000 and at 5,000 hearings a year | What gets there |
|---|---|---|
| 1.6 (the example week on the sheet) | 24, 118 (40, 196 at 1.2 days a week) | Today's way of offering. At 5,000 this cannot be staffed |
| **2.4 (the example week with its open hearings staffed): the season target** | **16, 79 (27, 131 at 1.2 days). With a fifth spare: 20 to 33 at 1,000 and 95 to 157 at 5,000** | A confirmed name on every hearing, and dockets offered whole |
| 2.8 (the ceiling of my first count of the example calendar; the sheet's 18 hearings allow 3.0) | 14, 67 (23, 112 at 1.2 days) | One person taking two dockets on the same day, twice in the week. A ceiling, not a target |
| 4 (only where an office puts the firm's hearings on one day) | 10, 47 | Offices that agree to it. All ten are still to ask |
| 6 (inside what packet consultants say they accept: 4 to 8) | 7, 32 | The same, on most days |

**Recruiting starts in December.**

| When | Action | Owner | Done when |
|---|---|---|---|
| Week 1 | A bench list per office: every consultant who has worked for the firm, with the offices each will travel to and the days each will give | Associate | The names each office needs beside the names it has |
| From December | 20 calls a week from the state's register of property tax consultants where one exists (Texas registers them, sourced; check that the list is public) and from consultants' referrals. The offer: whole video days at a rate by the day (above) and pay every Friday. A referral fee for a consultant who brings another who completes ten hearings ($200 is my suggestion, to set) | Associate | Names signed per office, reported every Friday |
| With the first notices | A recruit's first two dockets of the season are the trial. Keep those whose results match the bench | Associate | A result per name |
| By mid-February | State registration checked for every name | Associate | A registration number, or the reason none is needed |
| By mid-March | Two confirmed consultants per office (Offices X, Y), in writing, for the season's first four weeks. Video dockets pooled across counties where the state allows the same person to appear | Associate. Alice signs the terms | Written yes from each |
| Desk week 2, with the season questions | Every office asked in writing to set our hearings on the weekdays our consultants promised (Bench I), and on one day where it can | Coordinator | Its answer in Offices Q |

## 10. Homeowner intake

Three things move to sign-up, so that nothing is owed in the week of the hearing:

1. **The signed appointment of the firm as agent**, in the form the county requires (in Texas the
   comptroller's appointment-of-agent form, sourced). A consultant without it on file is not on
   the record. Which form each of the firm's states needs, and who signs it, is counsel's answer
   (Day 1 count row 17, then Offices R).
2. **The evidence the homeowner holds**: photos, repair quotes, the closing statement.
3. **Consent to text**, with the number.

Said at sign-up, printed on the engagement letter, and repeated on every hearing notice:

1. "We represent you at the hearing, in person, by video or by telephone. You do not need to come, and you do not need to contact the county."
2. "If the county contacts you, or you want to change or withdraw anything, tell us first. A withdrawal cannot be undone once the county processes it."
3. "We may text you about your case at this number. Reply STOP at any time."

Texting rules in short: business texts need the person's consent and must honour STOP, and the
number must be registered with the carriers (sourced from a carrier-rules guide, 2022; confirm
current terms with the text provider). Calls with an AI-generated voice need prior express consent
under a 2024 FCC ruling (sourced), so this kit makes no such calls.

**A withdrawal or settlement is never sent on anyone's word but the homeowner's, in writing.**
When the county says a homeowner wants to withdraw (Iverfen, message 51), or a settlement needs a
signature (Brindlefen, message 27), a person at the firm phones the homeowner the same working
day and follows with an email, so that the yes is in writing (kit, section 2). Its link goes in
BG. Until then nothing is signed or sent, the chaser to the office does not go, and the hearing
stays on and staffed. For 42 Birch Lane no message shows the homeowner asking at all, so the call
comes first.

**What the homeowner was told is kept, and corrected the same day.** The notices go by the tool
the firm uses today, sent by a person (kit, "The workflows the firm already has"). BK and BL hold
the name and date on the notice the firm sent the homeowner. While both are empty, a coming
hearing with a consultant's yes prints NO HOMEOWNER NOTICE ON RECORD: 14 rows in the example,
because the packet says what a notice named for Brook Road only (message 39) and gives no notice
dates. A hearing with no yes that counts has no such line; 48 Linden Avenue is one. When a new consultant says yes, or the county's
written notice moves the date, BE prints the difference and the corrected notice goes the same
day by the route the first one went, sent by a person. A homeowner who went to the county
directly (Harthmere, message 47) gets a call that day: we still represent them, and next time
they tell us first.

**A statement only the homeowner can give** (Juniper Reach, messages 59 and 60) is collected by the
coordinator from the homeowner and sent with the cover email before the last working moment in
BB. If the due day falls on a weekend or a closure day, BB moves it back to the office's last
working day.


## 11. Software: the readers now, the control tower decided in September

**The control tower is not for next season at any volume the packet supports. The readers are part of the plan.** The two AI readers run from week 1,
once Alice and counsel agree in writing (Day 1 count row 18), at almost no cost (section 7). The tower, which is the prototype in `control-tower.html`, is what
removes coordinator work at scale. My recommendation is not to build it for next season, and to
decide in September for the 5,000-hearing season on the firm's own hours. The default is
not to build. In cash, at 5,000 hearings, the tower nets minus $16,000 to minus $46,000 a year on
my desk estimate of 20 minutes a hearing, and plus $8,000 to minus $22,000 on my simulation's
37.5. The firm's timed minutes have to overturn the default, and the test is in cash: a
forecast V that Alice signs, and at least 120,000 ÷ V paid minutes removed per hearing. That is
24 at 5,000 hearings for a $40,000 build and 42 for a $70,000 one, against about 26 paid minutes
a hearing in total on my desk estimate. Valued as freed time only, the bar would be 14.5, which
my own central case passes; I do not use it, because time that is freed and not removed from
payroll pays nobody.

A lean build costs $40,000 to $70,000 **every year**. My build-up of the $40,000: about a fifth
of the associate's year ($24,000), hosting, model fees and monitoring ($6,000), and a security
review before client mail goes through it ($10,000). The $70,000 adds about a quarter-year of
shadowing and season support. All four are estimates.

| What the tower saves, at 5,000 hearings a year | A year | Lean build, net a year | Pays from, hearings a year |
|---|---|---|---|
| **In cash**: seasonal coordinators the firm would not hire for the peak | $24,100 | minus $15,900 to minus $45,900 | 8,300 to 14,500 |
| In coordinator time, if coordination takes 19.6 minutes today (my desk estimate) and the tower removes 60% | $40,200 | plus $200 to minus $29,800 | 5,000 to 8,700 |
| The same if today takes 37.5 minutes (my simulated seasons) | $79,600 | plus $39,600 to plus $9,600 | 2,500 to 4,400 |
| The same at 19.6 minutes if the tower removes 30%, not 60% | $16,400 | minus $23,600 to minus $53,600 | 12,200 to 21,300 |

The range is 2,500 to 21,000 hearings a year, and it turns on two numbers nobody has:
minutes per hearing today, and the share software removes. The cash row is the cautious one,
because time saved for permanent staff is only money if it is used for something else. The case
also says to assume the firm can provide the technical resources. If the build uses people the
firm already pays, the time row is the one to decide on, and at 5,000 hearings the tower is worth
building. At
1,000 hearings a year the tower saves about $4,800 in cash. At 20,000 it pays on every row but
the last (30% removed and the dearer build), and I would call it required anyway: eighteen
coordinators cannot keep one spreadsheet in step.

**The decision rule, in minutes.** At 5,000 hearings a year a lean build pays if it removes 11 to
19 coordinator minutes from every hearing. With the 60% my simulation removes, that means timed
minutes today above about 20 (the $40,000 build) to 33 (the $70,000 build). My desk estimate is
20 and my simulation 37.5, so the stopwatch in live week 1 and last season's payroll decide it,
on the Hours tab. In cash alone it needs about 8,300 to 14,500 hearings a year. A dedicated
engineer needs more than 18,700 to 24,900 hearings a year on coordinator time, and about 31,000
to 41,000 in cash.

**Between the sheet and the tower there is a middle step.** A bought tracker with automatic
reminders and a shared text line takes over what the sheet cannot do (remind, lock a cell, keep a
history) without any build. List prices I read on 18 Nov 2026: a shared text line at $15 to $23 a
user a month plus carrier registration (one vendor's own page), a tracker at about $12 to $24 a
user a month (a third-party page that was not consistent). Get quotes. A tracker replaces the workbook when
one workbook no longer holds every county: above about 1,000 hearings a year.

Nothing new goes live in the middle of a peak. If the tower is built, it starts in one county
before that county's first notices, beside the sheet, and reads for a month before it drafts
anything.

## 12. How it scales

Estimates from `node cli/economics.js`, with 60% of a year's hearings in the 8 busiest weeks and
30 productive hours in a coordinator's 40-hour week. The 300 column is what the example week
alone would imply.

| Hearings a year | About 300 | 1,000 | 5,000 | 20,000 |
|---|---|---|---|---|
| Hearings in a peak week | 23 | 75 | 375 | 1,500 |
| Coordinators a peak week needs: today, with the plan, with the tower | 0.2, 0.2, 0.1 | 0.8, 0.7, 0.4 | 4.1, 3.3, 1.8 | 16.3, not modelled, 7.2 |
| Names on the bench at two days a week, at 1.6, 2.4 (the target) and 2.8 hearings a day | 8, 5, 5 | 24, 16, 14 | 118, 79, 67 | 469, 313, 268 |
| The same at the 1.2 days a week the example week shows | 12, 8, 7 | 40, 27, 23 | 196, 131, 112 | 782, 521, 447 |
| For comparison, the four checks by hand cost, a year | $440 | $1,470 | $7,300 | $29,300 |
| Missed hearings they prevent, a year | $190 | $640 | $3,200 | $12,800 |
| The tower saves a year: in coordinator time, and of that in cash | $2,400, $1,400 | $8,000, $4,800 | $40,200, $24,100 | $160,700, $96,400 |
| Cash a peak ties up, at 12 weeks from hearing to fee | $20,000 | $66,000 | $330,000 | $1.3 million |
| What runs the operation | Part of one coordinator. The six, giving two days a week in the peak, and four anchors | One coordinator, with help in the peak. One workbook, one mailbox, the readers. **The bench starts to bind** | A team per group of counties, a bought tracker, the readers, one seasonal coordinator per 114 peak-week hearings, a dispatcher. **The bench is the limit** | The tower. A bench manager. Financing for the peak |

**Coordinators per 1,000 hearings in a peak week, with the plan: 9.9 at 300 hearings, 9.3 at
1,000, 8.8 at 5,000.** For comparison, at every volume: 10.9 today, 12.0 with the four checks by
hand, 13.1 with the full sheet by hand, 4.8 with the tower. That is the answer to "more hearings without the same amount
of human work", in three parts. Consultant-days: a confirmed name on every hearing and whole
dockets take a hearing from 0.63 of a consultant-day to 0.42 (1.6 to 2.4 a day; 0.36 at the
ceiling of 2.8 in my first count of the calendar). Coordinator minutes without software: the full sheet by hand takes
19.6 productive minutes a hearing to 23.6; docket messages, the reply rule and the readers
brought it to 17.8, 16.7 and 15.8 at the three volumes (23.7, 22.3 and 21.0 paid, against about 26
today), so one coordinator would carry 101, 108 and 114 hearings in a peak week, against 92 today,
before the newest checks (below). The
plan pays for its checks, but coordination still grows almost in a straight line: from 300 to
5,000 hearings (16.7 times) coordinators rise 14.8 times and the minutes a hearing fall only 11%,
because 13.6 of the minutes are per hearing and only the per-docket part (4.2 to 2.2) falls. The
per-docket part starts from the example week: 19 hearings ahead of Friday, June 7 in 9 dockets,
2.1 hearings a docket at 300 hearings, rising to 2.8 at 1,000 and 4.1 at 5,000 (estimates). **These minutes were estimated
before the newest checks were added and do not count them.** On the 19 hearings ahead in the
example week the sheet now asks for 9 more outgoing messages (2 requests for GOT IT 2, 2 files
emails to a clerk, 2 questions about a video room, 2 replies about a later arrival time, 1
arrangement for a first case at opening). At 2 minutes a message that is 18 minutes, or 0.94
minutes a hearing; with one answer each that a person files it is 36 minutes, or 1.89. On the
example week the plan's 17.8 productive minutes would then be 18.7 to 19.6, against 19.6 today;
in paid minutes 24.9 to 26.2 against 26, and 96 down to 91 hearings a coordinator in a peak week
against 92 today (estimates by the same method; they are not in `cli/economics.js`). A live week
also adds typed names: 29 cells on the example week, 1.5 a hearing, for which the method has no
rate. This is the upper side, because the packet's messages were written before the plan: under
the plan's own files email a receipt should name its version, and the video-room question is
asked once per office. What is unknown is exactly what would settle it: the share of live
receipts that name no version, the share of video hearings with a room letter and no link, how
often a consultant names a later time, and the seconds a typed name takes. So this plan claims no
saving of coordinator minutes in season one, measured or estimated: with the newest checks the
estimate is 18.7 to 19.6 productive minutes against 19.6 today, and the case for season one rests
on missed hearings prevented, not on minutes. The two timings of 25 hearings replace the
estimate. Coordinator
minutes with software: about 12 paid minutes with the tower, which in cash does not pay at 5,000
hearings a year on my desk estimate (section 11).

**Triggers.**

- **A seasonal coordinator**: one per 92 hearings in the forecast peak week, today's rate, hired
  by 1 March, until the live weeks' timings show the plan's rate. The plan's estimate of 101, 108
  and 114 at 300, 1,000 and 5,000 hearings was made before the newest checks, which bring it to
  91 to 96 at 300 (estimate, upper side). At
  1,000 hearings a year the peak needs 0.7 of a coordinator, so it is overtime or a part-timer.
- **A dispatcher**: from about 20 dockets a day in the peak.
- **A second workbook, then a bought tracker**: when one workbook no longer holds every county, above about 1,000 hearings a year. Section 15 gives the trigger numbers and the procedure.
- **The tower**: section 11.
- **A county**: when its one page of rules is written and its bench has the names it needs.

**Cash is a limit of its own.** Consultants and coordinators are paid in the peak, and the fee
arrives after the tax saving is certain. What is tied up is everything paid out before the first
peak fee arrives. At 12 weeks from hearing to fee (my assumption) that is the eight peak weeks
plus four ordinary ones: about $330,000 at 5,000 hearings ($39,000 a week in the peak, $4,700 a
week outside it) and about $1.3 million at 20,000. I read Alice's firm as a stand-in for a firm at
seed stage, and the public figure for the hiring firm is a $1.5 million seed round (sourced). So
at 20,000 hearings one peak would tie up most of the round. That is why weeks from hearing to fee
is one of the four numbers asked for on day 1, and why consultant payment terms are the cheapest
financing the firm has.

**What a hearing earns is the weakest figure here.** Public figures put the fee between $97 and
$387 a hearing: $97 if the public saving of $774 is per won case, half of hearings are won and
the share is 25% ($77 if only 40% are won); $194 if the $774 already averages over lost cases;
$387 at a 50% share. Against $104 of cost the low reading loses about $8 a hearing and the others
earn $89 to $283. Section 8 says what changes if day 1 confirms the low reading. I make no claim
about the margin of a hearing until the fee received per hearing is counted.

What limits growth, in this order:

1. **Consultants.** Fuller days first, then recruiting the gap, then day-rate video days and the
   firm's own video representatives. Growth inside a county fills days; a new county adds thin
   dockets, so density is worth more than reach. The firm scales as fast as it can put prepared people in rooms.
2. **Cash in the peak.**
3. **Counties.** Each new office needs one page of rules before its first hearing: routes,
   deadlines, what happens on a no-show, who may represent a homeowner there. In the prototype a
   county is a data file, and adding one needs no code.
4. **Peak.** Add counties whose season falls outside the firm's busiest eight weeks first, so the
   same coordinators and consultants cover them.

## 13. The calendar after the first four weeks

**If no county has hearings now.** Then weeks 2 and 3 are a replay on last season's hearings,
and the first live day is the first hearing notice of the season. The calendar below uses the Texas dates as the example: most
appraisal notices go out by mid-April, protests are due by 15 May, boards give at least 15 days'
notice, and the large boards hear most cases from May to August (sourced, `research/05`). Other
states peak at other times (Cook County files from August to December by township, Florida from
mid-September, Ohio's largest county hears January to March, sourced). **A county that hears from
January to March is the place to run the four live weeks first**, with the full sheet from live
week 2, because its result is known before the large boards start.

| When | What | Done when |
|---|---|---|
| December | The four weeks at the desk. Bench calls start. The text line is ordered | The Day 1 count and Hours tabs are filled |
| January | Forecast of hearings per office per week from last season. The bench list per office | One table; offices short of names are flagged |
| January to March | The four live weeks in a county that hears then, if the firm has one | Its live-week-4 review |
| By 1 March | Seasonal help advertised (one coordinator per 92 hearings in the forecast peak week, today's rate, until the live weeks' timings show the plan's rate), to start 1 April with two weeks of training on the Monday page | Offers accepted |
| By mid-March | Two confirmed consultants per office for the season's first four weeks, in writing (Offices X, Y), and an alternate on each office's record (Offices T) or the written fallback. Every office's written answer on our weekdays and one day in Offices Q | Written yes from each |
| From the first hearing notice | The messages in every county. The four live weeks, if no county heard earlier, with the full sheet in all ten counties from live week 2 | First docket closed on the sheet |
| May to August | **Nothing new goes live.** Weekly measures | |
| September | The season's numbers, and the software decision for the following season | A dated decision |

## 14. Checking it yourself, and what the sheet leaves to a person

### 14.1 Commands

Every measured number in the kit can be rerun in the `prototype` folder. `prototype/README.md`
and `CHECKS.md` give every command with its full output; this is the short list.

| Command | What it prints (measured on the example packet) |
|---|---|
| `node cli/check.js` | "216 of 216 problems pass" |
| `node cli/replies.js` | "39 replies: 17 filed by rule, 22 handed to a person." and "39 of 39 agree." |
| `node cli/check_office.js` | "91 of 91 office checks pass." |
| `python3 eval/sheet_threads.py` | 180 "pass" lines, no "FAIL" line, exit 0 (needs openpyxl) |
| `node cli/sheet.js` | 63 proof links to accept and 40 cells to leave open; 8 of 72 messages handed to a person |
| `node cli/sheet.js --paste data/paste-example/new-messages.json --out <file>` | New mail as rows for the Reader suggestions tab: 26 rows for 6 messages; with no key it replays recorded answers and marks the one unknown message NOT READ |
| `node cli/sheet.js --repeats` / `--questions` / `--new-cells` / `--dockets` | The 18 repeats in the example messages; the 8 proposals for Hearings BN; the 37 proposals for newer cells, all for a person; the list of 9 dockets |
| `node cli/office.js --measure` | The office rule on the packet's office messages and 30 unseen messages (section 7) |
| `node cli/office.js --try "<text>" --county <county>` | How the office rule sorts one message, and which cells a person types |
| `node cli/inbox.js` | 33 proposed filings, all for a person, and 8 repeats |
| `node eval/autofile.js --no-write` | The auto-file analysis on the 72 examples and the first unseen set (section 7) |
| `node cli/calendar.js --out <file>` | The calendar file for the 19 hearings ahead: 19 events, 249 lines, none over 75 octets |
| `node cli/reading.js --try "<text>" --from "<sender>"` | Reads one message with the AI readers using your own key; with no key it says so. Not run with a real key |
| `node cli/economics.js` | Every estimate: cost per hearing, coordinators, bench, cash (section 12) |

Every command was run on Node 22 (v22.23.4), not on Node 20, with nothing to install. Python with
openpyxl is needed only for the thread checks, and LibreOffice only to recalculate the sheet for
tests; the firm needs neither. `--paste` with a real key was run once on 21 Nov 2026: 4 messages,
8 requests, $0.09 (measured). That shows the path works; it does not measure accuracy. Behind a
proxy, start Node with NODE_USE_ENV_PROXY=1.

### 14.2 How the sheet was tested

| Test | Result | Source |
|---|---|---|
| Thread checks on the installed sheet (md5 2e74089c917b1bcc1ac36f5f7de3e7ce) | 180 pass, 0 FAIL | Measured after install, 22 Nov 2026 |
| `check.js`, `check_office.js`, `replies.js` after install | 216 of 216, 91 of 91, 39 of 39 | Measured |
| Part L: the author's scratch cases (each rule with cases where it must not fire) | Run on the installed version. In the older suites the lines that now differ are values Part L changed on purpose (a NOT HELD row prints the files-access line; Ask next marks (STATES: ASK)) | The author's notes |
| Part L: an 80-row copy | 41,413 formulas, recalculated in LibreOffice with no error value | Measured |
| Part L: time to recalculate 1,000 rows | 28.78 against 28.75 seconds for the sheet before Part L, 8 runs each in one session (+0.1% on the mean, +2.3% on the paired median), on a version before its last small fix | Measured by the author, LibreOffice 24.2, shared machine |
| **Independent test of Part L** | **Not run.** No outside model of the X32 to X34 rules has compared them with the sheet | |
| Independent model against the sheet before Part L (Part K) | Nine worlds, 9,597 Hearings rows, 893,010 cells: 0 differences not explained, 0 error values. Three faults found in the first build, all fixed; open faults 0 | An independent tester's report |
| Negative control before Part L | Every touched rule had two planted breaks caught in the re-test | An independent tester's report |
| Row actions (cut, paste, insert, delete, sort of 1,000 shuffled rows) before Part L | Sort: 0 differences. Dockets A1: 158 of 159 cases; the one missed is text typed two columns right of the last column | An independent tester's report |
| Time before Part L | 28.03 against 27.39 seconds for the version before it (+2.35%, 95% interval -0.22 to +5.20) | An independent tester's report |
| Calendar file | A parser written from RFC 5545: 15 of 15 checks. Imported into Apple Calendar (21 Nov 2026, before the last rules): 17 events on the expected days | Measured |
| Excel for Mac (20 Nov 2026) and Google Sheets (80-row copy, 21 Nov 2026) on earlier versions | Every formula kept, 0 error values; differences only in the random draw (and empty holiday cells in Google Sheets) | Measured |

**Not tested by anyone:** the independent test of Part L; the sheet as it is now in Excel or
Google Sheets; the full 1,200 rows in Google Sheets; Excel for Windows or in a browser; row
actions in Excel or Google Sheets; the calendar file in Google Calendar or Outlook; the readers on
a new message with a real key through `reading.js`; the office rule, the reply rule and the
readers on the firm's real mail. Several rules (the route block, date-change lines, an office's
standing deadline, travel gaps) are tested on scratch copies and generated worlds only, because
the example holds no such case. The kit therefore starts with a trial of the sheet in the firm's
own program.

**Open item: the time.** Recalculating 1,000 rows takes about 28 seconds in LibreOffice (measured).
The time in Excel or Google Sheets was not measured. No fault in what the sheet computes is open.

### 14.3 Where the sheet does not do what the kit needs, a person does it

Each of these is written into the kit's steps.

1. **A silent consultant.** At 2:00 p.m. on the working day before, with no day-before YES, a
   person types one "not free" row on Availability ("no day-before YES by 2 p.m."). The sheet
   then reopens the hearing and offers it.
2. **What counts as the office's confirmation.** The proof cells accept any link; the person who
   pastes it and the Friday sample check it.
3. **The wording of a notice.** Notices on file checks the name and the office's fields, not the
   wording; the coordinator reads each notice against Offices AB before it goes.
4. **Time zones in the calendar.** The Calendar file tab is in UTC; the CSV route needs one
   calendar per zone.
5. **The arrival time on a replacement.** CH has no name cell; a person clears it.
6. **A block.** The sheet prints no route for an office whose change is not approved, but it sends
   nothing, so it cannot hold a message back.
7. **Every notice and correction is written and sent by a person** with the firm's own tools.
8. **Whether the case files already hold what an office asks for.** A formula cannot read a file.
9. **A loan of a consultant between two workbooks** (section 15).
10. **New mail.** A person saves the messages, runs `--paste` and pastes the rows. Nothing reads a
    mailbox.
11. **A repeat or a question from a consultant.** The tools propose; a person reads each message.
12. **A homeowner who is not reached.** The hearing stays staffed; Alice decides on more time.
13. **A limit a consultant states that is not typed.** A person types the Availability row.
14. **The tools the firm keeps beside the sheet** (planning sheet, file-link tracker, documents
    folder). What happens to each is a written step; no formula checks it.
15. **Removing a departed consultant's file access.** BE says whose access to remove; a person
    removes it in the file system and types the date in EC.
16. **Who may appear and sign in each state.** Only counsel and the consultant can answer; the
    sheet carries the answer once it is typed in Bench S.

### 14.4 What only the firm, an office, counsel or a consultant can answer

The kit's section 8 is the full list, with every cell. The short form:

| Question | Asked by, when | Recorded in |
|---|---|---|
| The fee received per hearing | The associate, of Alice, day 1 | Day 1 count row 4 |
| Who reads consultants' texts after 4:00 p.m. and at weekends? | The associate, of Alice, day 1 | Day 1 count row 16, then Settings B9 |
| Who may appear for a homeowner at each board, and who signs the appointment? | The associate, of counsel, day 1 | Day 1 count row 17, then Offices R |
| In which states may each consultant appear and sign? | The associate, of counsel and each consultant, day 1 and the season letter | Day 1 count row 33, then Bench S |
| May client messages go to the readers' provider under a no-training, no-retention agreement? | The associate, of Alice and counsel, day 1 | Day 1 count row 18 |
| How many signed names does each office need in the peak? | The associate, of Alice, by desk week 2 | Offices AA |
| The season questions to each office (naming deadline, alternate, no-show rule, who signs, video links, hearing length, closures, clock change, last day for a date change, telephone and clerk, route, street address) | The coordinator, of each office, desk week 2 | The Offices tab and the Holidays tab |
| Who at the firm may decide a request to move a hearing date? | The associate, of Alice, day 1 | Hearings DV |
| Each homeowner's telephone number and email | The associate, day 1 | Hearings DG; Day 1 count row 31 |
| A mobile number for texts and the agreement to be texted | The associate, of each consultant, season letter | Bench O and P |
| The mail service, the text-line service, CSV import into the case system, the tool for homeowner notices | The associate, of the firm, day 1 | Day 1 count B20 to B23 |
| The weekdays each consultant will give | The associate, in the season-letter calls | Bench I |

## 15. Growing past one workbook

**This whole section is designed and has not been run by anyone.** No split, no roll-up, no new
state and no move to a bought tracker was tried, and the sheet holds no aid for a roll-up. One
part was tested on 21 Nov 2026, in LibreOffice: a copy of the sheet with an
eleventh office typed on row 12 and a seventh consultant, on which every formula column of the
Offices tab, the Holidays, Bench, "Who can take it" and Availability helpers behaved for the new
row as for the first ten. Every
threshold marked "our suggestion" is a choice the firm can change. The first split is done on a
trial copy before it is done on the live workbook.

**The limits of one workbook (measured on the installed sheet).** The formulas read 39 offices
(Offices rows 2 to 40), 40 consultants (Bench rows 2 to 41) and 1,199 hearings (Hearings rows 2
to 1200). The Availability tab reads 299 rows. Measures B25 counts the names typed below those
rows, and must read 0. A full recalculation of 1,000 hearing rows takes about 28 seconds in
LibreOffice 24.2 (measured, section 14.2); the time in
Excel or Google Sheets at that size was not measured by anyone.

**The triggers.** Split when the first of these is reached (the margins are our suggestion):

1. 35 offices on the Offices tab, which leaves 4 rows.
2. 36 consultants on the Bench tab, which leaves 4 rows.
3. 1,000 hearing rows in use, or a forecast above about 1,000 hearings a year that Alice signs.
4. A full recalculation in the firm's own program that takes longer than 30 seconds, timed by
   the associate with a stopwatch on the Friday of live week 4 and again before each peak.
5. Measures B25 above 0 on any day. That one is not a margin: a name is already unread.

**Who owns it.** Alice decides that the workbook is split and signs the list of teams. The
associate does the split and keeps the roll-up. Each new workbook has one named coordinator who
keeps it and one Friday checker who does not keep it. Nothing is split inside the eight busiest
weeks: a trigger reached in the peak is noted, and the split is done on the first Friday after
it. The one exception is trigger 5, which is put right the same day by moving the unread name
into a free row.

**The split, step by step.**

1. The associate lists the counties of each team. A consultant's allowed counties (Bench D)
   should fall inside one team wherever the map allows. The associate lists every consultant
   whose counties fall in two teams and gives each one a home team: the team that holds most of
   their hearings on the sheet. Alice signs both lists.
2. The split is done on a Friday after the Friday check, when Dockets A1 reads "Rows are
   sorted: yes" and Measures B16 and B25 read 0. Nobody types in the workbook from then until
   step 8 is done.
3. The associate saves the whole workbook under a name with the date. That copy is the archive
   and is not edited again.
4. The associate makes one copy for each team and names it for the team.
5. In each copy the associate takes off the hearings of the other teams' counties as whole rows
   (select the row numbers, right-click, Delete rows), the only way How to use row 27 allows,
   then sorts the Hearings tab by date, office and time.
6. On the Bench tab of each copy the associate keeps the full row only for the consultants whose
   home team this is. For every other consultant the associate empties "Counties allowed"
   (column D), so that "Ask next" does not offer them here. The other teams' rows of the Offices
   tab and columns of the Holidays tab are left as they are: no hearing reads them. The
   Availability rows of consultants of other teams are deleted as whole rows.
7. In each copy the associate checks four things: no cell shows an error value, Dockets A1 reads
   "Rows are sorted: yes", Measures B16 and B25 read 0, and the count of hearing rows is the
   count for that team. The counts of all copies must add up to the count in the archive.
8. The associate writes the day, the teams and the row counts on one page, Alice signs it, and
   each coordinator opens only their own workbook from the next working day.

Whether emptying Bench D on a row and deleting Availability rows leave every formula right was
not tested. That is why the first split is a trial: steps 4 to 7 on copies, with the checks of
step 7, before any coordinator works from a copy.

**A consultant belongs to one workbook.** No formula reads another workbook, so the daily cap,
the travel gaps and the clash check see only the hearings of their own workbook. The rule that
follows: each consultant has a full Bench row in the workbook of their home team and in no
other, and only the home coordinator offers them work.

**A loan between teams, so that nobody is booked twice.**

1. The borrowing coordinator asks the home coordinator in writing, with the office, the date
   and the times.
2. The home coordinator checks the home workbook. If the consultant is free, the home
   coordinator types one row on the home Availability tab for that consultant and that date,
   with From and To empty so that it covers the whole day, marked "not free", with the words
   "on loan to the [team] team" in column F, the link to the request in G and "other" in column
   I. The home workbook now offers the consultant nothing that day.
3. Only then does the home coordinator answer yes in writing.
4. The borrowing coordinator adds the consultant to the borrowing Bench tab for the loan:
   contact, channel, the one county in "Counties allowed", the cap agreed for that day, and in
   column F the words "ON LOAN from the [team] team for [date] only". The hearing is then
   offered and proved in the borrowing workbook like any other.
5. On the working day after the loan the borrowing coordinator empties "Counties allowed" on
   that row again, and the home row on the Availability tab stays as the record.

A loan blocks the whole day at home, not only the hours of the hearing, because the home
workbook cannot see where the consultant is and so cannot check travel. While the loan row
stands in the borrowing workbook, "Ask next" there can name the consultant for other days in
that county; the borrowing coordinator does not offer on that name and asks the home
coordinator each time. A tracker with one bench for all teams removes this step, and that is
one of the reasons for the move below.

**The weekly roll-up of the Measures tabs.** The sheet has no roll-up aid. The associate keeps
a small workbook of their own with one row for each team and week, typed as values.

- When: every Friday, after each Friday checker has filled the weekly log on the Measures tab
  of their workbook (the row for that week, from row 37 down). The roll-up is sent to Alice the
  same day.
- Who: each Friday checker reads the cells aloud or sends them in writing; the associate types
  them and adds them up.
- Counts that are added across workbooks: from the weekly log, B (hearings held), C
  (coordinator hours on hearings), I (messages), K (consultant pay) and L (tools and other
  costs); from the top of the tab, B3 (no yes that counts inside 3 working days), B5 (appeals
  lost because nobody appeared), B6 (held with a proof missing), B8, B9, B10, B16, B17, B19,
  B20, B21, B24, B25, and B95 to B98.
- Shares and rates are never averaged across workbooks. Each checker reports the count and the
  total behind the share, and the associate divides the sums: for B4, the records that disagree
  and the records on the Record check tab; for B7, the hearings that are ready and the hearings
  within 3 working days; for B15, the hearings with a yes and the consultant-days; for the
  errors per 1,000, the errors and the hearings held.
- The figures per hearing are computed again from the sums: minutes per hearing is 60 times the
  sum of C over the sum of B; messages per hearing is the sum of I over the sum of B; cost per
  hearing is the sum of K, plus the sum of C at the rate in Hours B8, plus the sum of L, over
  the sum of B.
- The results by format and by consultant (Measures rows 29 to 32 and from row 52) are added
  cell by cell. A consultant on loan shows in the borrowing workbook for that hearing, so the
  associate adds the rows of the same name.

**A new state.** Before the first notice from an office in a state the firm has not worked in:

1. The associate asks counsel who may appear for a homeowner at that state's boards and who
   signs the appointment (the question of Day 1 count row 17). The answer goes in Offices R for
   every office of that state. No hearing in that state is offered to a consultant before the
   answer is on file.
2. The coordinator adds one row on the Offices tab from the office's first notice: the name
   exactly as the notice writes it, the route the notice names (F), the form or the fields it
   asks for (AB, AK), its hours (D) and its hours from UTC in standard time (W).
3. The coordinator sends the seventeen season questions in one email (section 5) and types each
   answer in its cell. On the ten example rows a cell keeps its amber ASK until the answer
   arrives; on rows 12 to 40 the 17 question cells show their ASK text by formula as soon as the
   office's name is typed in column A, so nothing is copied; the answer is typed over the
   formula. Either way the
   sheet treats an unanswered rule as not known. The formulas of the row need no copying: since
   21 Nov 2026 every formula column of the Offices tab is filled on rows 2 to 40, so column N
   reads CONFIRM THE ROUTE IN WRITING on the new row until the date of the office's written
   confirmation is in L.
4. The clock-change answer goes in Offices AU (yes or no). Some states do not change their
   clocks, so this is asked and not assumed.
5. The coordinator adds the office's closure days as one column on the Holidays tab, from the
   office's own calendar, because the naming deadline counts that office's working days.
6. The associate adds the state's counties to "Counties allowed" (Bench D) only for consultants
   who agreed to them in writing, and recruits before the first notice if there are none.
7. If the new state brings the Offices tab to 35 rows, the split above comes first.

**Choosing a bought tracker.** The requirements are what the sheet does today, and what it
cannot do. No product was compared and none is named here; the list prices in section 11 are
the only sourced figures. A candidate must do all of the following.

1. Hold one record per hearing with the same checks, each closed only by a linked written proof
   and never by a call, and compute the status from the proofs so that nobody types it.
2. Hold each office's rules as data: routes, the naming deadline in that office's working days
   with its own closure days, who signs, and its hours from UTC with the clock change.
3. Hold back the route of an office that changed how it works until a named person approves it,
   and record who approved and when. The sheet cannot protect those cells; a tracker must.
4. Group hearings into dockets by office and day, and write the offer and the day-before
   message once for each consultant.
5. Keep one bench for all teams, with the daily cap, the travel gaps, the clash check and the
   "not free" periods, and show how each consultant can be reached.
6. Remind by itself at the hours the kit sets, lock a field, and keep a history of every
   change. These are the three things section 11 names as beyond a sheet.
7. Give each calendar its events in UTC, as the Calendar file tab does.
8. Compare its records with the case system's export every week, as the Record check tab does.
9. Count the measures of the Measures tab without typing.
10. Import the workbook's rows from a CSV, and export every record and every history line in an
    open format at any time.
11. Store client data on terms that counsel has read and Alice has signed.

**The migration, and its owner.** Alice chooses the tracker on the associate's written
comparison against the eleven points, with quotes. The associate owns the migration. It starts
outside the eight busiest weeks, with one county team. That team's coordinator keeps the
workbook and the tracker side by side for two weeks (our suggestion), and on both Fridays the
Friday checker compares the status of every coming hearing in the two. The team moves when two
Friday checks in a row show no difference; its workbook is then saved under a dated name and
not edited again. The other teams follow one at a time. If a difference cannot be explained,
the team stays on the workbook and the associate reports it to Alice.

## 16. Kit reference: rules by event, scripts, every example situation

This section holds the kit's full reference text, so that the kit itself can stay short. In this
section a number such as "section 8" or "kit, section 2" refers to the kit (`week-one-kit.md`);
"appendix, section n" refers to this file.

### 16.1 The rules, by what happens

**A reply the rule does not file.**
- A maybe, "usually free" or a volunteer is not a yes. H stays empty until the consultant's own
  YES: a name in H without one prints NAME WITHOUT A YES in BE and counts as nobody on Measures B3.
- A condition or another date ("June 13 works for me") is a NO for the official slot: add the
  name to BC, and the other date to Availability as "free".
- A conditional yes becomes a yes only when the county's written notice meets the condition and
  the consultant's own later message confirms it (Nora: messages 14, 17 and 18). Link that later
  message in J.
- Availability said in passing ("I have left the morning free") goes on the Availability tab the
  same day, with the window, the office and the link. "Ask next" reads it.
- **A text that names no case** (Nora's message 18, "I have cleared June 12 and put both
  hearings on June 18"; Maya's message 41, "I am ill and cannot attend tomorrow"). The
  coordinator matches it the same day to the sender's open offers (Hearings BY) and the
  hearings they hold (H), on the dates the text can mean. Where exactly one docket fits, the
  link goes on its rows as the step for that kind of message says. Where it could mean more than
  one hearing or docket, nothing is filed: the coordinator asks the sender the same day which
  hearing they mean ("Which hearing do you mean: [address] on [date], or [address] on [date]?
  Please reply with the address."), notes the question in Y, and files their answer. In the example
  the packet's own record ties each text to its hearings (message 41 to the Brook Road docket,
  message 18 to the Orchard Road hearings), so both are filed; with real mail that tie is the
  coordinator's match. The readers and the reply rule hand such a
  text to a person; no formula can see what a text means.
- Each consultant is reached first by the preferred channel on the Bench tab (C). A call is
  followed by the same text, so that the answer has a link.
- A rate named in a reply ("at the quoted rate") changes nothing. No offer names a price: it says
  "at your usual rate" (Settings B7), which is the consultant's own rate (Bench H) under the
  season letter. A consultant who asks for a different rate is referred to Alice before the YES
  is counted.
- **A repeat changes nothing, and this is the test.** A later message replaces the first link in
  a cell only when it states something the cell needs that the first did not. Otherwise the cell
  keeps its first link, nothing is typed, and a repeat does not add to BH. A changed date, time,
  room or name is a change, never a repeat. Two examples. Velloran's message 72 ("Sending the
  same confirmation again") states nothing that message 70 did not: rows 13 and 14 keep message
  70 and nothing is typed. Larkmere's message 66 repeats the schedule and the name, so I and K
  on rows 9 and 10 keep message 61. It also says "we have the current packets", and the first
  receipt (message 64) named no version: the files check needs the version, so in L the link of
  message 66 replaces message 64 and 2 goes in AZ. The tools apply the same test. On the Reader
  suggestions tab a repeat reads REPEAT: THE CELL KEEPS ITS FIRST LINK (18 lines from the
  example messages, on rows 198 to 213, 218 and 219; rows 214 to 217 are the four lines of
  message 66 that are not repeats), and the mailbox connector and the office rule print "REPEAT
  of message n: no cell changes" and do not list a repeat as a proposal (measured).

**Telling the office who attends (G3).**
- "Tell the office" (Dockets N) writes the notice from YES replies only: only the cases the office
  does not have yet, every field of the office's own form (Offices AB), our contact (Settings
  B10), our alternate once the office has accepted one (Offices T), the replacement route and the
  office's deadline. It goes the day the YES arrives. A notice drafted earlier goes only if
  Notices on file says SEND IT.
- G3 closes only on the office's written reply naming our consultant for that case, and for the
  hearing date it now has: with each link in K, type in DQ the hearing date the office's message
  was about. After a move the old record does not count ("Dates, rooms and calendars"). Type the
  name it gives in BD. If it differs from H, the row prints THE OFFICE HAS X, NOT Y: SEND THE NOTICE
  NAMING Y BY THE OFFICE'S REPLACEMENT ROUTE.
- Not a record: an office that "can record" someone (an offer: reply naming who said YES); a
  voicemail; our own file marked "recorded"; a form sent, or one the office cannot find; a
  confirmation by phone (Y note, then the email after a phone call, section 2).
- An office's deadline goes in AW (OFFICE DEADLINE in BE). Where the office has a standing rule,
  its number of working days is in Offices AF and the sheet works the deadline out for every
  hearing there. Before the deadline, send the notice for every row with a YES. For a row with
  nobody, offer it at once and tell the office in writing when the name will follow. A deadline
  with an hour reads OFFICE DEADLINE PASSED once that hour has gone by on the clock in Settings
  B15; a deadline typed as a date with no time is past only from the next day.
- **The chaser names the office's own route.** While the office has not confirmed the name in
  writing, BE prints THE OFFICE HAS NOT CONFIRMED [name] IN WRITING: SEND OR CHASE THE NOTICE BY
  THE OFFICE'S OWN ROUTE, with the route from Offices F, so nobody emails an office that asked
  for a call. For a replacement it prints the office's replacement route (Offices G). Where the
  office has said it changed how it works, the same line prints the block, and after a person's
  approval the new route, as the next bullet says.
- **The office asks again**: add 1 to BH. From 2 the row is TOP OF LIST and BE prints THE OFFICE
  HAS ASKED n TIMES: PHONE IT TODAY AND ANSWER IN WRITING. The coordinator phones that day.
- **The office has not answered us**: no written answer by the 2:00 p.m. review on the next
  working day, send the second request (section 2); none by 9:00 a.m. on the working day after
  that, phone. Inside three working days, phone at once. Log each in Y, Z and AA.
- **Calling an office.** Offices AZ holds each office's daytime telephone number and the clerk to
  ask for. Wherever BE orders a call to the office (a send-by time that is past, an office that
  has asked twice or more, or any line that says to call or phone the office, such as CALL THE
  [COUNTY] OFFICE IN ITS HOURS), it adds TO CALL THE [COUNTY] OFFICE: [number and clerk]
  (Offices AZ[row]), or TO CALL THE [COUNTY] OFFICE: NUMBER NOT ON RECORD: Offices AZ[row]. The
  packet gives each office an email address and contact hours and no telephone number, so AZ is
  an amber ASK for all ten, and the example prints NUMBER NOT ON RECORD on 5 rows (57 Clover
  Road, 14 and 28 Willow Lane, 37 and 52 Meadow Avenue; measured). Each office is asked in the
  season questions (section 2, question 15 of that email; section 8, question 40). Until it
  answers, the coordinator takes the number from the office's own notice or letterhead and types
  it in AZ with where it came from.
- **Every office confirms its route in writing, and is asked again after six months.** The
  packet's saved instructions carry a date for Tesswick only (15 May 2030, in Offices L5), and
  those were already out of date three weeks later (message 22). So the season questions ask
  every office, not only Tesswick, to confirm in writing how it wants to be told who attends and
  how a replacement is named (section 2, question 16 of that email). When the written
  confirmation arrives, the coordinator compares it with Offices F and G, corrects them where
  they differ, and types the date of the confirmation in Offices L. Offices N ("Ask again?")
  shows how old each row is: with no change waiting in M and no date in L it reads CONFIRM THE
  ROUTE IN WRITING (nine of the ten example offices; measured), and when the date in L is more
  than 180 days before today it reads ASK AGAIN: OVER SIX MONTHS. The deputy filters Offices N at
  the first Friday check of each month and sends the question again to every office that reads
  either line. Tesswick's row reads the block instead, because its change waits for approval.
- **An office changes how it works, by phone or in writing: its notices are blocked until a
  person approves the change, and then the new route is the route.**
  1. The same day, whoever hears it writes what the office said in Offices M, with who said it
     and the link, types the date it was said in AT, and asks the office to put it in writing.
  2. From that moment the sheet blocks every notice to that office. Offices N reads APPROVE OR
     REJECT THE CHANGE TODAY. BE of each of its hearings that still needs a notice, and "Tell the
     office" (Dockets N), read NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE
     TODAY and print no route at all, neither the old one nor the new one. Those hearings go to
     the TOP OF LIST with the words NOTICE BLOCKED, and Measures B98 counts them (target: none at
     the end of the day).
  3. The same day one person at the firm reads the change and decides: the named coordinator,
     or the associate in the first live week. To approve, that person types their own name in
     AQ, the date in AR, and in AS whether the office still accepts the old route (yes, no or not
     known). The approval counts only when AT holds the date of the change and the date in AR is
     on or after it, so an approval left from an earlier change never lets a new one through;
     Offices N says so when that happens. To reject, clear M, AS and AT and write the reason in
     K. The sheet has no "rejected" state.
  4. After the approval the new route in M is printed as the route. Where AS says "no", the old
     route is printed nowhere, and the line ends THE OFFICE NO LONGER ACCEPTS THE OLD ROUTE
     (Offices AS): DO NOT USE IT. Where AS says "yes" or "not known", the old route (Offices F)
     is printed as a second route after the new one.
  5. A call that the new route needs (the word "call" in M) is a task on the row: BE prints CALL
     THE [COUNTY] OFFICE IN ITS HOURS, with the hours from Offices D, and the call is typed in Y
     (what), Z (who) and AA (by when). A call never closes a check: ask for it in writing.
  6. When the office confirms the change in writing, type the date in L, move M into F and G,
     and clear M, AQ, AR, AS and AT. If that is forgotten nothing goes wrong: a date in L on or
     after the date in AT has the same effect as the approval.

  In the example the Tesswick clerk said by phone that the office now wants its staffing form
  and then a call (message 22). M5 holds the change, AT5 the date (4 June 2030, the date on the
  form in the packet), and AS5 "no", because message 22 says that emailing names is no longer
  enough. AQ5 and AR5 are empty, because no message in the packet shows a person at the firm
  approving the change. So the example shows the block: 37 and 52 Meadow Avenue read TOP OF
  LIST NOTICE BLOCKED OFFICE CANNOT FIND OUR NOTICE, Dockets N7 starts with the block sentence,
  and Measures B98 reads 2 (measured). The states after an approval were run on test copies of
  the sheet, not in the example (appendix, section 14). Two limits: the approval cells are not
  protected, and the sheet cannot tell who typed the name.
- **The office says it cannot find our notice or form.** Paste the link to its message, or to
  the dated call note, in CP of the hearing, and in CQ the date our notice went or the link to
  the sent message. While the office has not confirmed the name in writing, BE reads THE NOTICE
  WAS SENT ... BUT THE OFFICE CANNOT FIND IT and the daily list reads TOP OF LIST with the words
  OFFICE CANNOT FIND OUR NOTICE, so nobody reads the row as "nothing sent". BE then gives the
  step. With no change on record: RESEND THE COMPLETED FORM OR NOTICE TODAY BY THE OFFICE'S OWN
  ROUTE (Offices F). After an approved change: BY THE APPROVED ROUTE (Offices M). While a change
  waits for approval: IT IS RESENT ONLY AFTER A PERSON APPROVES THE OFFICE'S CHANGE, which is one
  more reason to approve or reject the same day. The call in the office's hours follows as a
  task in Y, Z and AA. In the example CP holds the clerk's message 24 and CQ the firm's own
  message 23 (the packet gives it no date), on both Meadow Avenue rows; Y holds the call the
  clerk asked for, Z "the coordinator", DX the day message 24 arrived and AA the day of the call.
  No message carries a date, so the example reads message 24 as arriving on its own today,
  Friday, June 7 (DX16 and DX17), which puts the call on Monday, June 10 (AA16 and AA17); a note
  on each of the four cells says this is the example's reading (measured). **A date, not words,
  in AA.** When a message says today, tomorrow or this week, type the day it arrived in DX and
  the real date in AA (tomorrow is the day after the message arrived, in the office's working
  days); words in AA print COLUMN AA HOLDS WORDS, NOT A DATE in BE. No formula works out the date
  from DX: a person does.
- **HOLD on the Reader suggestions tab.** The foot of that tab lists a change in how an office
  works as a proposal for Offices M, marked HOLD (in the example: Tesswick, message 22, row 171).
  HOLD is the block, in the sheet's own words: "HOLD: NO NOTICE GOES TO THIS OFFICE UNTIL A
  PERSON APPROVES THE CHANGE TODAY." The sheet (Reader suggestions C171, How to use A22),
  `node cli/office.js` and this kit use the same sentence. The fixed rule that raises the flag
  proposes Offices M, AS and AT for a person and never the approval cells AQ and AR. It found the
  three process changes among 102 messages and
  flagged no other message (measured; three is a small sample).
- What an office's messages add goes on its Offices row (K) that day. An arrival instruction
  ("arrive 15 minutes before the first case") goes in CI as minutes, on every hearing of the
  docket; the day-before text then names one clock time ("The day of the hearing").

**Video and telephone hearings.** G1 counts only when AV holds a link or a number of seven or more
digits. A room letter is not a link: "room C" or "room D" leaves G1 open, BE prints VIDEO ROOM
ONLY, NO LINK, and the Calendar event carries the note that the room is not a link. Ask the office
the day the row is created (section 2): for the link or number, how it sends them (Offices AE),
and, where it names a room, what the room means. Its answer is chosen from the list in Offices AL:
"a link or number is sent as well" (keep asking for it), "the room letter is all the office
sends: join by the office's standing link" (the room letter then counts), or "a room at the
office: the consultant attends in person" (the row then counts as in person for the travel check
and the arrival text). No answer: the second request, as above; inside three working days, phone.
The day-before text waits (DO NOT SEND YET) and is never sent with "[link]". Measures B21 counts
the video and telephone hearings to come with no link or number: 13 on June 7 (measured), which
is 10 with AV empty and 3 with a room letter only (48 Linden Avenue, 120 and 138 Garden Street).
The packet does not say what a room means at Velloran or Harthmere, so AL is an amber ASK for all
six offices that hear by video.

**Dates, rooms and calendars.**
- Only the office's written notice moves a date. A phone report is held: the old date stays, the
  notice is asked for, and the consultant gets the warning text that day.
- When the notice arrives, change D and E on the moved rows only, type the date the hearing had
  before in DR, replace the I link, and clear J and H: a yes belongs to a time slot. Offer the
  new slot. **Clear K as well, and keep the old link in a note in Y**: the office recorded our
  representative for the old date, and a record for one date does not count for another. The
  sheet guards this (since the evening of 21 Nov 2026). On a moved hearing (DR holds another date
  than D, or DI reads "moved") the link in K counts only while DQ holds the date in D (Hearings
  DY), so G3 stays open and BE prints THE LINK IN K DOES NOT COUNT FOR [new date] ... ASK THE
  [COUNTY] OFFICE IN WRITING TODAY: IS [name] STILL ON YOUR RECORD FOR [new date], or, once K is
  cleared and the office's old name stays in BD, THE OFFICE RECORDED [name] BEFORE THIS HEARING
  WAS MOVED FROM [old date]. The question goes in writing the same day (section 2, "The question
  to an office after it moves a hearing"). When the office answers, link its answer in K and
  type the new date in DQ. Two limits: a move typed only over D, with nothing in DR, DI or DQ, is
  not seen, so typing DR is part of the step; and a date typed as text in DQ or DR reads as no
  date (Dockets A1 names it). In the example, 9 Orchard Road (row 25): Orimere recorded Nora Pell
  while the hearing was on June 12 (message 16; DQ25 is June 12) and then moved it to June 18
  (message 17; DR25 is June 12). K25 still holds message 16, so the example shows the fault the
  rule is about: G3 is open (OPEN: 4 missing) and BE25 prints the question for Tue 18 Jun
  (measured). 48 Linden Avenue (row 22) was moved by Harthmere from June 6 to June 13 (message
  47, which ends "Please update your representative"; DR22 is June 6); K22 is empty there. 66
  Linden Avenue (row 6) was not moved: DQ6 holds June 6, the date in D, and its K counts.
- **The homeowner gets the new date the same day, whoever asked for the move.** While DR holds
  the old date of a hearing still to come and DS holds no link, BE prints THE HEARING WAS MOVED
  FROM [old date] TO [new date]: A PERSON CALLS THE HOMEOWNER TODAY WITH THE NEW DATE AND SENDS
  THE CORRECTED HOMEOWNER NOTICE (WHAT IT SAYS GOES IN BK AND BL), THEN LINKS THE DATED CALL
  NOTE, THE HOMEOWNER'S OWN MESSAGE OR THE NOTICE SENT IN DS, then THE HOMEOWNER TO CALL, and the
  daily list adds CALL THE HOMEOWNER. A hearing moved at our own request (DI reads "moved") keeps
  the lines of the rule below instead, where the homeowner's written yes goes in CR. In the
  example 48 Linden Avenue reads REVIEW CALL THE HOMEOWNER and BE22 names Riley Fern (H008)
  (measured): this is the call of section 2, "The call to a homeowner who went to the county
  directly".
- **When the firm may ask an office to move a hearing.** Only when all of these hold, and the
  named coordinator decides and types their name and the date in DV (Y held it before the
  evening of 21 Nov):
  1. The bench was offered the hearing on its own date first. "Ask next" for that docket is
     used up, or everyone asked has said no, and the dated note of who was asked and what each
     said is linked in CS.
  2. The homeowner has agreed to the new date in writing, and that yes is linked in CR. A person
     calls the homeowner first (section 2).
  3. The request reaches the office before its own deadline for changes, where it has one. No
     office in the packet states one, so it is a season question (section 8, question 38). The
     answer, a number of working days before the hearing, goes in Offices AY, and Hearings DN
     then holds that last day for each hearing at that office.
  4. The hearing is not one that a consultant has already accepted. A yes is never traded away
     to suit another hearing: in the packet, the request of message 15 moved 9 Orchard Road,
     which Nora had accepted for June 12 (message 14), to June 18.

  The date we asked goes in BI and the office's written answer in BJ. Until BJ has a link, BE
  prints OUR DATE-CHANGE REQUEST ... IS STILL OPEN and the hearing stays on its date. While the
  request is out and CR has no link, BE also prints OUR DATE-CHANGE REQUEST IS OUT WITHOUT THE
  HOMEOWNER'S YES TO THE NEW DATE: A PERSON CALLS THE HOMEOWNER TODAY AND LINKS THEIR WRITTEN
  YES IN CR, OR THE REQUEST IS WITHDRAWN IN WRITING. While CS has no link it prints NO RECORD
  THAT THE BENCH WAS ASKED BEFORE THE OFFICE WAS ASKED TO MOVE THE HEARING. Neither line changes
  the status. While a request is out or was made (BI typed, BJ linked or DI chosen) and DV is
  empty, BE also prints NO NAMED PERSON DECIDED THIS DATE-CHANGE REQUEST: TYPE WHO DECIDED IT AND
  WHEN IN DV. The sheet reads only that a name is typed there, not whose name it is.

  **When the office answers**, link its answer in BJ and choose "moved" or "refused" in DI (a
  list of those two words; a new date goes in column D, never in DI). Until one of the two words
  is chosen, BE prints THE OFFICE HAS ANSWERED OUR DATE-CHANGE REQUEST (BJ): CHOOSE ITS ANSWER IN
  DI (moved OR refused). The two lines no longer disappear with the answer. On a hearing that
  was moved at our request, BE keeps printing THE HEARING WAS MOVED AT OUR REQUEST AND THE
  HOMEOWNER'S YES TO THE NEW DATE IS NOT ON RECORD: A PERSON CALLS THE HOMEOWNER TODAY AND LINKS
  THEIR WRITTEN YES IN CR, and NO RECORD THAT THE BENCH WAS ASKED BEFORE THE OFFICE WAS ASKED TO
  MOVE THE HEARING: LINK THE NOTE OF WHO WAS ASKED AND SAID NO IN CS, until each link is in. The
  first of them puts CALL THE HOMEOWNER on the daily list of a hearing still to come.

  **A request for a hearing a consultant had already accepted** is flagged. Type that
  consultant's name and the link to their yes in DH; the sheet also sees it by itself while a
  request is out for a hearing whose yes counts. BE prints THIS DATE-CHANGE REQUEST WAS MADE FOR
  A HEARING THAT [name] HAD ALREADY ACCEPTED. THE RULE: NO SUCH REQUEST IS MADE, A YES IS NEVER
  TRADED AWAY, and then the step. While the request is out: WITHDRAW THE REQUEST IN WRITING TODAY
  AND KEEP THE CONSULTANT ON THE HEARING. After the office has moved the hearing: TELL THE
  CONSULTANT WHICH DATE NOW STANDS AND GET THEIR OWN YES FOR IT (J).

  **The office's last day for a change request.** With a number in Offices AY, BE prints on a
  hearing still to come that has a request out or no consultant's yes that counts, from three
  working days (Settings B4) before that day: THE [COUNTY] OFFICE'S LAST DAY FOR A CHANGE
  REQUEST ... IS [date]: A REQUEST TO MOVE THIS HEARING GOES BY THEN OR NOT AT ALL. After that
  day it prints IT IS PAST. NO NEW REQUEST GOES, AND THE HEARING STAYS ON [date]. AY is an amber
  ASK for all ten offices, so the example prints neither.

  In the example the four requests of the packet (messages 8 and 15) were made without either
  proof. Three were refused (63 and 81 Garden Street and 24 Orchard Road: DI reads "refused").
  Each keeps one line as a record, which puts nothing on the daily list: ON RECORD: THE REQUEST
  THE OFFICE REFUSED WAS MADE WITHOUT THE BENCH BEING ASKED FIRST (CS) AND WITHOUT THE
  HOMEOWNER'S YES (CR). All four rows print NO NAMED PERSON DECIDED THIS DATE-CHANGE REQUEST,
  because messages 8 and 15 name no person (measured). 9 Orchard Road (row 25) was moved to June 18 (DI reads "moved") with CR
  and CS empty, and DH holds Nora Pell with her yes of message 14. BE25 prints the homeowner
  line, the bench line, the already-accepted line, THE HOMEOWNER TO CALL: Robin Wren (H003), the
  question to the office about its record for June 18 and the DV line, and the daily list reads
  REVIEW CALL THE HOMEOWNER (measured). The step for that homeowner: a
  person calls today, says that the firm asked for the move, asks for a written yes to June 18
  and links it in CR (section 2). If the homeowner does not agree, the coordinator tells Alice
  the same day, because only the office can set the date. The lines for a request still out, for
  the last day and for the choice in DI were run on test copies only.
- **A consultant with a wrong belief** (a calendar entry, a date, a hearing that is not theirs):
  type who, what and which message in BN, send the change notice the same day (section 2), and
  link their OK in BO. Nothing goes if their own message shows they have it: link that in BO.
- **A consultant's question** (which date they cover, what has changed, whether to prepare) is
  handled the same way, also when what they believe is right. Type who asked, the answer and the
  message in BN of each hearing it concerns, send the answer the same day (section 2 holds the
  answers to Leo's message 12, Nora's messages 18 and 54 and Eli's message 35), and link in BO
  their OK or their own later message that shows they have the answer. BE prints TELL with those
  words until BO holds a link, so a question cannot stay unanswered unseen. What closes it is
  the consultant's message, not the firm's sent answer; the sheet accepts any link in BO, so
  this is the coordinator's check. In the example BE prints TELL on 8 rows: 63 and 81 Garden
  Street (Leo, message 12), 24 Orchard Road (Nora, message 18), 48 Linden Avenue (Leo, message
  48), 75 and 96 Elm Street (Eli, message 35) and 18 and 34 Maple Lane (Nora, message 54); the
  packet holds no OK to any of them (measured). These rows are on the daily list for other
  reasons, so the list gains no word; TELL DUE stands alone only on a row that would otherwise
  drop off the list. The heading of BN on the sheet still names only "a change from the office
  or a wrong belief"; How to use A70 gives the rule for a question.
- A room, link or time changed after a YES: AV that day, BN, and the change notice. While BN is
  typed and no OK is linked in BO, BE prints TELL and the daily list reads TELL DUE.
- **The calendar is built from the sheet, as a file.** Every day after the 2:00 p.m. review, and
  the same day a date, time, room or consultant changes:
  1. Open the "Calendar file" tab. Cell B2 says how many events and lines the file has (17
     events, 345 lines in the example), and B3 must read "Line length: no line of column A is
     longer than 75 characters." If B3 is amber it names the row and the cells that hold the
     long text; a longer line is not an error, and most calendars read it.
  2. Select column A from cell A1 down to the line END:VCALENDAR, copy it, paste it into a
     plain text file and save the file as `hearings.ics`. A line that starts with a space
     continues the line before it: copy those spaces too.
  3. Empty the hearing calendar (or delete it and make it again), then import the file. The
     hearing calendar holds nothing but imported hearings, so emptying it loses nothing.

  The times in the file are in UTC, so one calendar shows every hearing at the right hour
  whatever time zone a consultant's calendar is set to. A hearing with no time is an all-day
  event. An office with no hours from UTC in Offices W keeps its local time, and the event's
  description says so.
  **The second way is the CSV download of the Calendar tab** (File, Download, CSV). Its times
  are the office's local time and carry no zone. So keep one calendar for each office time zone,
  set that calendar's own time zone to the office's zone before the import, filter the Calendar
  tab on column J (the office's hours from UTC) and download one file for each zone.
  **What was tried** (measured): the 17 events of the example were imported into Apple Calendar
  on a Mac set to US Eastern time, into a new and separate calendar, with no error. All 17 are
  on the expected days. 14 of the 17 were read at exactly the expected hour (UTC minus 4 hours
  in June); the other 3 were outside the visible part of the window, so their hour was not read.
  The title, the location and the description of the first event are complete. That
  import was of the file of a version of 21 Nov 2026, as it stood before the last rules were added; since then the place of
  each event in person carries ADDRESS NOT ON RECORD and the cell, which changes 29 of the 345
  lines (none longer than 44 bytes), and the changed file was not imported. Before that the
  file was checked with a parser written from the iCalendar standard (RFC 5545): 15 of 15 checks
  on the example, the longest line 44 bytes. **Not tried:** Google Calendar and Outlook, a
  second import of a changed file (which is why step 3 empties the calendar first), all-day
  events and clock-change dates in a real calendar, and the CSV route in any real calendar. So
  in desk week 2 the associate imports the example file into the firm's own calendar program
  and writes down its steps.
  Both ways hold each hearing with a yes that counts; rows below the last event are empty; an
  event ends after the office's own hearing length (Offices AP) or else 30 minutes (Settings
  B11); and a video or telephone event is placed at "[county] board, by video", not at the
  office. An event in person is placed at "[County] hearing office: " and the address from
  Offices BA, or ADDRESS NOT ON RECORD: Offices BA[row] while the office has not answered (7 of
  the 17 events in the example; measured). Each event's description names the zone and also gives the start in UTC. An edit in
  the calendar moves nothing.

**Withdrawals, cancellations and settlements (G5).**
1. The office or the homeowner says a withdrawal or settlement is wanted: the coordinator phones
   the homeowner the same working day (section 2) and asks for the yes in writing. Its link goes
   in BG. **Until BG has a link, nothing is signed or sent to the office** (BE prints HOMEOWNER'S
   WRITTEN YES MISSING).
2. What is owed goes in N and the office's due date in BA. BP says who signs, from the office's
   rule. Offices AC holds one of three answers chosen from a list (the consultant who attends,
   the representative on the office's record, the homeowner) or the question still to ask;
   Offices AG holds the answer for a withdrawal statement where that differs. Where the answer
   is "the homeowner", a person calls the homeowner and the consultant signs nothing. BP adds the
   form of signature the office accepts once Offices AD is answered. For a Brindlefen withdrawal the signer is the representative on the
   office's record, even when another consultant attends: for 42 Birch Lane BP reads "Priya
   Marden, the name on the office's record: the office's rule" (message 28). Other offices keep
   the amber ASK until they answer.
3. **The signature**: a free fill-and-sign PDF or a scanned signed page, never a paid e-signature
   tool. Whether the office accepts it is Offices AD, an amber ASK until it answers. A photo the
   office cannot read is replaced by a clearer copy first: one request, then wait until noon on
   the next working day (Settings B14). Only then does the link to the fill-and-sign PDF go, and a
   phone call follows if it is not signed by the end of that day.
   **The sheet keeps that wait** (since 21 Nov 2026). The day the clearer copy is asked for,
   type the date of the request in DA of the hearing, or paste the link to the request when its
   date is not known, and ask nothing more. While the office has not receipted the document (no
   link in O), BE prints A CLEARER COPY WAS ASKED FOR ON [date]: DO NOT ASK AGAIN. THE FALLBACK
   (THE SIGNING LINK, THEN THE CALL) FALLS DUE ON [date] AT 12:00 PM (Settings B14). The day is
   counted in the office's working days, by its own holidays (Hearings DM). From that moment the
   daily list carries the words FALLBACK DUE, and BE prints NO READABLE COPY HAS COME SINCE THE
   REQUEST OF [date] ... DO NOT ASK AGAIN, and then the step: SEND THE SIGNING LINK NOW TO THE
   PERSON WHO SIGNS (BP), THEN CALL THEM IF IT IS NOT SIGNED BY THE END OF THE DAY.
   **The homeowner's yes comes first.** For a settlement or a withdrawal nothing is signed
   until BG has its link (step 1). So while BG is empty the due fallback is a call and not a
   link: BE prints THE FALLBACK IS DUE, BUT NOTHING IS SIGNED UNTIL THE HOMEOWNER'S WRITTEN YES IS
   LINKED IN BG: A PERSON CALLS THE HOMEOWNER TODAY, AND THE SIGNING LINK GOES AS SOON AS BG IS
   LINKED, with THE HOMEOWNER TO CALL, and the daily list adds CALL THE HOMEOWNER. The same call
   is ordered where the office's rule makes the homeowner the signer. Where the office has not
   said which signature it accepts (Offices AD), BE adds THE OFFICE HAS NOT SAID WHICH SIGNATURE
   IT ACCEPTS (Offices AD): ASK IT TODAY. Clear DA when a readable copy has come. In the example
   DA19 (42 Birch Lane) holds the link to the firm's request, message 30, and no date, because
   the packet's messages carry no date. So BE19 prints A CLEARER COPY WAS ASKED FOR: DO NOT ASK
   AGAIN. TYPE THE DATE OF THAT REQUEST IN DA, and the example never shows FALLBACK DUE; the
   dated lines were run on test copies only.
4. A withdrawal: set G ("Hearing still on?") to no only once BG has its link. The hearing stays
   staffed, on its docket, with every check, until the office's written confirmation is linked
   in AF; until then Status reads CANCEL PROOF DUE. The consultant prepares for both. Chase the
   office (section 2) once BG is in. The case record stays "scheduled" until AF has the link: a
   record that says "canceled" before then is flagged on the Record check tab, whatever G says.
5. Only the office's written confirmation goes in AF. The sheet accepts any link there, so this
   is the coordinator's check. The row then reads NOT HELD: send the release notice to the
   consultant (section 2), type it in BN, link their OK in BO, and refill the hearing calendar.
   Until the OK is linked, BE prints TELL on the NOT HELD row and the daily list reads TELL DUE,
   so the release is chased by the sheet and not by memory.
6. The office's written receipt, linked in O, closes G5.

**A settlement.** The sheet treats a row as a settlement when N holds the word (it looks for the
letters "settle"), or, since 21 Nov 2026, when DC holds a link to the offer or DD a date. One
limit stays: only the word in N makes the row count as owed and orders the call to the
homeowner. With DC or DD filled and no such word, BE prints COLUMN N DOES NOT SAY settlement:
TYPE IT THERE, BECAUSE ONLY COLUMN N MAKES THE ROW COUNT AS OWED. Steps 1 to 3 apply, and BE
lists what is still missing until each part is in: SETTLEMENT, STILL MISSING: the settlement
offer itself (DC); the date by which the offer must be accepted (DD); the homeowner's
written acceptance (BG); the office's receipt of the signed settlement (O); the office's written
word that the hearing is off its schedule (AF, the same cell as for a cancellation or a
withdrawal); the date by which the settlement must reach the office (BA). The day a settlement is
wanted the coordinator does three things. First, the call to the homeowner for the written yes
(BG). Second, one email to the office that asks whether the signed settlement takes the hearing
off its schedule and by when it must arrive (section 2; section 8, question 39). Third, where the
offer itself is not in the case folder, the request for the offer in writing and its acceptance
deadline (section 2, "The request for a settlement offer in writing"). It goes to whoever made
the offer. Where no message names them, as with 16 Birch Lane, the coordinator first asks the
person at the firm who wrote the note, and then writes to the hearing office, which is where
the signed settlement must go. The link to the offer goes in DC and its acceptance date in DD.
BE then prints THE OFFER MUST BE ACCEPTED BY [date], and once that day has passed: THAT DAY HAS
PASSED, ASK WHOEVER MADE THE OFFER TODAY WHETHER IT STILL STANDS. **Until AF is linked the hearing stays
staffed and on its docket**, G stays "yes" and the consultant prepares. When AF is linked, BE
prints THE OFFICE HAS CONFIRMED IN WRITING THAT THE SETTLED HEARING IS OFF ITS SCHEDULE (AF): SET
G TO no. In the example 16 Birch Lane (row 18) prints all six parts as missing: message 27 shows
neither the homeowner's acceptance nor the office's word on the hearing, the row has no due date,
and the offer is not among the packet's documents, so DC18 and DD18 are empty. BE18 also names
the homeowner to call, Taylor Finch (H005), and says that one call covers this hearing and
AX-110, the 42 Birch Lane withdrawal (measured).

**Anything owed after a hearing.** A statement, signature or document the office wants goes in N,
its due date in BA. BB pulls a weekend or closed day back to the office's last working moment,
using that county's own column on the Holidays tab, and BE prints OWED: SEND BY. Within a working
day the row is TOP OF LIST: OWED; once the hour has gone by on the clock (Settings B15), BE says
CALL THE OFFICE TODAY. Enter the Result as
"held open for a statement", never "postponed", when the office wants a statement and sets no
further hearing. **Before anything is collected again, check the case files.** On every row
with something owed that is not a settlement, a withdrawal or a missed hearing, BE prints BEFORE
IT IS COLLECTED AGAIN: CHECK WHETHER CASE FILES VERSION n ALREADY HOLD WHAT THE OFFICE ASKS FOR.
IF THEY DO, ANSWER WITH THAT VERSION AND THE CLERK'S RECEIPT (L), AND ASK WHETHER THE OFFICE
WANTS IT SEPARATELY. A formula cannot read a file, so this is a check for a person, printed on
every such row: the coordinator opens the current version (AX). If the document is in it, the
answer to the office names the version and the clerk's receipt, asks which version the office
holds and whether it wants the document separately (section 2), and what the office lacks goes
before the BB time. In the example 57 Clover Road (row 2) carries the line: version 2 of its case
files already holds the homeowner statement that Juniper Reach asks for (message 36 says version
2 "adds the homeowner statement"), and neither the office's receipt (message 55) nor Owen's
(message 56) names a version. Only if the document is not in the files does the coordinator
collect from the homeowner what the homeowner must give. It goes with the cover email (section
2) before the BB time, and the office's written receipt is linked in O.

**Case files (G4).**
- AX is the current version, typed on every row when the files are made or change. AY is the
  version the consultant's GOT IT names, AZ the version the clerk's receipt names. When one of
  them names an older version, or no receipt has come, BE prints SEND CASE FILES VERSION n TO THE
  CONSULTANT, TO THE CLERK, or to both.
- **A receipt closes its half of the check only for the version it names, or when it says
  "current".** "Both current packets received and reviewed" (Leo, message 65) and "we have the
  current packets" (Larkmere, message 66) close it. "Both packets received." (Velloran, message
  70) and "Files reviewed." (Owen, message 71) do not: paste the link, leave AZ or AY empty, and
  BE prints the question to send. To the consultant: THE CONSULTANT'S RECEIPT NAMES NO VERSION:
  ASK THEM TO REPLY GOT IT 2. To the clerk: THE CLERK'S RECEIPT NAMES NO FILES: SEND THE FILES
  EMAIL THAT NAMES EVERY FILE (VERSION 2) AND ASK FOR A REPLY TO IT. Both scripts are in section
  2. When the answer names the version, type it in AY or AZ. In the example each question is on 4
  coming rows (18 and 34 Maple Lane, 120 and 138 Garden Street), and of the 19 receipts linked on
  the example rows 5 count for a version and 14 name none (measured).
- The GOT IT counts only for the consultant named beside it: type the sender's name in BW with
  the link in M. With a link and no name, BE prints TYPE WHOSE GOT IT THIS IS IN BW.
- One judgement call is kept in the example: the clerk's version for 75 Elm Street stays 2,
  because the clerk's message 34 names the one file that opened, and the files email it answers
  (message 33) names that file as version 2.
- Files go to both by BM, 48 hours ahead in the county's working days; BE prints the send-by from
  three working days before. Once that hour has gone by on the clock (Settings B15), on the same
  day and not only on a later date, BE prints PAST THE 48-HOUR MARK: SEND NOW AND ASK THE CLERK TO
  ACCEPT LATE FILES: send them with the request to the clerk (section 2), and link the clerk's
  written acceptance, naming each file, in L. In the example 4 rows are past the mark at 2:00
  p.m. on Friday, June 7 (14 and 28 Willow Lane, 63 and 81 Garden Street; measured).
- Files go only for the hearings the consultant holds, except that an evening replacement gets
  them with the confirmation. One message: the current links, the version, what changed, "Reply
  GOT IT 2" (the number is the version). "I will review the files" is not a GOT IT.
- The clerk's receipt counts when it answers our files email, which named every file and the
  version, and says all of them arrived. A file it leaves out, or says will not open, is resent
  that day.

**Results and the record.**
- Results are logged per hearing the same day, by text or by phone. Who reported it and when
  goes in DT, and the link to the note or the message in DU; while S holds a result and either is
  empty, BE prints THE RESULT IN S HAS NO SOURCE ON THE ROW with the half that is missing. S takes
  the board's words: reduction, no change, settled before the hearing, postponed, nobody
  appeared, heard: decision awaited, or held open for a statement. T takes the error ("none" if
  none).
- **A result that fits none of those words** ("They are giving us more time", Owen, message 57)
  is chosen as "reported: not clear", never guessed. The status and the daily list then read
  RESULT NOT CLEAR, and BE prints THE RESULT AS REPORTED FITS NO VALUE OF THE RESULT LIST: ASK
  [the consultant] AND THE [COUNTY] OFFICE IN WRITING TODAY WHAT WAS DECIDED, WHAT THE OFFICE
  ASKED US TO SEND AND BY WHEN, THEN CHOOSE THE RESULT IN S. Both questions go that day (section
  2). In the example S2 would have read "reported: not clear" on the day of message 57; after the
  office's message 59 it reads "held open for a statement", DT2 names both reports and DU2 links
  message 59. Row 3 links Owen's message 57, whose words fit "heard: decision awaited". No message
  carries a date or an hour, and DT2 and DT3 say so (measured). "heard: decision awaited" reads DECISION DUE until the board's written decision is
  linked in BQ; ask the office every Friday.
- "nobody appeared" turns the row to MISSED: the good-cause letter goes that day, and the row
  stays on the daily list until the letter is linked in N and the office's answer in O ("The day
  of the hearing").
- **Friday, the deputy, by 4:00 p.m.**: paste the case system's export into Record check (A to F)
  and correct every flagged record in the case system that day. A record that says "canceled" is
  flagged until the office's written confirmation is linked in Hearings AF; until then
  "scheduled" is the right record and is not flagged. A record whose hearing is on no row of
  the sheet reads THE RECORD HAS A HEARING THAT IS NOT ON THE SHEET: ADD IT AS A ROW OF THE
  HEARINGS TAB FROM THE COUNTY'S NOTICE, OR CORRECT THE CASE RECORD IF THERE IS NO HEARING; do
  one or the other that day. It counts as a disagreement, so Measures B4 includes it (the
  example has none). Then open every proof link of the 10
  hearings on the Friday sample tab; copy the week's measures into the weekly log on the Measures
  tab; ask each office about every DECISION DUE row.
- A change seen in the case record or the calendar on any other day (a calendar activity
  message, for example) is corrected that day, not left for Friday.

**Homeowners.** Software never writes to a homeowner. The coordinator does, the same day, by the
notification tool the firm uses today ("The workflows the firm already has"):
- **The first notice.** A coming hearing with a consultant's yes and nothing in BK and BL prints
  NO HOMEOWNER NOTICE ON RECORD: send it, then type the name and the date on it in BK and BL. In
  the example that line is on 14 rows, because the packet says what a notice named for Brook Road
  only (message 39) and gives no notice dates. A hearing with no consultant's yes has no line:
  its notice waits for the name.
- **A corrected notice** when the consultant changes or the county moves the date. BE prints THE
  HOMEOWNER'S NOTICE NAMES X when BK differs from H, and THE HOMEOWNER'S NOTICE SAYS [date] when
  BL differs from D. A new name goes once that consultant has said yes; a new date once the
  county's written notice is in. Send the corrected notice (section 2) by the route the first one
  went, then type the new name and date in BK and BL.
- **A homeowner who went to the county directly**: phone the homeowner that day (section 2), put
  the name, the time and what was said in Y, and link the dated call note (or their own message,
  or the corrected notice sent) in DS. Until DS holds a link the move line stays in BE and the
  daily list reads CALL THE HOMEOWNER ("Dates, rooms and calendars").
- A homeowner is never invited to a hearing: we represent them, and they need not come.
- **Who the homeowner is, and one call for two hearings.** DE holds the homeowner's name and DF
  the customer number, from the case record, on every row; the 24 example rows are filled from
  the packet, which has 12 homeowners with two hearings each. DG holds their telephone number
  and email address. The packet gives none, so DG is an amber ASK on all 24 rows, and the firm
  is asked for the contact details of every client with a hearing on the sheet (section 8,
  question 41; Day 1 count row 31). Where a line orders a call to the homeowner (the written yes
  for a settlement or a withdrawal is missing, our date-change request is out or was granted
  without their yes, an office moved the hearing and DS holds no link, or a due fallback waits
  for them), BE adds THE HOMEOWNER TO CALL: [name]
  ([number]), then CONTACT (DG): [the contact] or CONTACT NOT ON RECORD: ASK THE FIRM FOR IT AND
  TYPE IT IN DG, and, where another hearing with the same customer number also needs a call, ONE
  CALL COVERS THIS HEARING AND [case]. A hearing still to come with such a line carries CALL THE
  HOMEOWNER on the daily list. In the example 5 rows carry it: 16 and 42 Birch Lane (Taylor
  Finch, H005; each names the other, so one call covers the settlement and the withdrawal), 48
  Linden Avenue (Riley Fern, H008), 18 Maple Lane (Cameron Hale, H009) and 9 Orchard Road (Robin
  Wren, H003) (measured). Before any
  call to a homeowner the coordinator filters DF by that number and reads every row of theirs.
- **A homeowner who is not reached by a deadline.** The default never changes: the hearing
  stays staffed and on its docket, and nothing is withdrawn, settled, signed or moved without
  the homeowner's written yes. The coordinator calls twice on the first day, in the morning and
  in the late afternoon, sends the email of section 2 the same day, and notes each attempt in Y
  with its time. If a deadline falls before the homeowner answers (the offer's acceptance date
  in DD, the office's date in BA, or the office's last day for a change request), the named
  coordinator tells Alice the same day, and Alice decides whether to ask whoever set the
  deadline for more time. Nobody at the firm accepts, withdraws or agrees in the homeowner's
  place. The sheet prints no line of its own for "not reached": the call line stays in BE and on
  the daily list until the yes is linked.

**Holidays and time zones.** The Holidays tab holds the closures every office keeps and, in one
column per county, that county's own; every working-day count uses the hearing's county. Offices
V holds each office's time zone and W its hours from UTC. Every time to a consultant is the
office's local time, and every offer and day-before text the sheet writes says so once, for
example "Times are Larkmere office time (UTC-05:00)." The example holds 7 such texts in 6 cells
of the Dockets tab (4 offers and 3 day-before texts). Since 21 Nov 2026 the line TELL in BE and
the notice "Tell the office" (Dockets N) carry the same sentence, and every script in section 2
that gives a consultant or an office a clock time says whose clock it is. **Nobody types a clock
change.** Offices W
is the office's hours from UTC in standard time, and Offices AU says whether the office changes
its clocks. With "yes" the sheet adds one hour for a hearing dated from the second Sunday of
March up to the day before the first Sunday of November (the United States rule, by whole days;
the 2:00 a.m. switch itself is not modelled). Hearings CV holds the result for each hearing, and
every text, the Calendar tab and the calendar file use it. In the example AU is an amber ASK for
all ten offices: the packet gives every office as UTC-05:00 and does not say which of them
change their clocks, so until an office answers W is used as typed all year (section 8, question
37; the question is also printed on Day 1 count row 26).


### 16.2 Scripts

Every text names the date, never "tomorrow", because the day-before text for a Monday hearing
goes out on Friday. Every time is the office's local time, and every script that gives a clock
time says so once, in the sentence the sheet uses: "Times are [County] office time (UTC-05:00)."
The hours from UTC are the ones the sheet prints for that hearing (Hearings CV). No offer names a price: it says "at your
usual rate" (Settings B7), and the rate is in the season letter. Replies in capitals are filed by
the rule. Square brackets are filled from the row; the example words come from the packet.

**To consultants**

**The docket offer** (Dockets H, open hearings only; this one sent on Monday, June 3). "Four hearings, Larkmere office, Monday, June 10, in person, at your usual rate: 1) 9:00 a.m. 14 Willow Lane 2) 9:30 a.m. 28 Willow Lane 3) 11:00 a.m. 102 Willow Lane 4) 11:30 a.m. 118 Willow Lane. Times are Larkmere office time (UTC-05:00). Reply YES ALL, the numbers you can take (for example YES 1 3), or NO. Please answer by noon on Tuesday, June 4. After that we offer the open ones to the next person." For a hearing on the next working day it says "Please answer within one hour", and otherwise inside three working days "Please answer within two hours"; a phone call follows either one, and the words are sent as the sheet writes them. For an in-person hearing each item also carries the room from Hearings AV, for example "(room 3)". When the offer goes, the consultant's name is typed in BY on each hearing offered.

**Wednesday, the week ahead.** "Next week you have: Monday, June 10, Larkmere office, four hearings from 9:00 a.m.; Thursday, June 13, Caldmere, by video, two hearings from 2:00 p.m. Times are each office's own time: Larkmere office time (UTC-05:00), Caldmere office time (UTC-05:00). Reply YES ALL, or call 555-0100 today about any you cannot keep."

**The day before** (Dockets I), one per consultant, at 8:00 a.m. on the working day before. In person, as the sheet prints it for Owen at Tesswick: "We are expecting you on Wednesday, June 12, from 11:00 a.m. at the Tesswick office (ADDRESS NOT ON RECORD: Offices BA5) for two hearings. Times are Tesswick office time (UTC-05:00). If nobody attends, these homeowners' appeals can be dismissed. Reply YES to confirm, or call 555-0100 now if anything has changed. Please be at the office by 10:30 a.m. and text ARRIVED when you are there." The clock time is the consultant's first case less 30 minutes (Settings B16), or less the office's own number in CI when that asks for more; it is printed once. The brackets after the office's name hold the street address, hearing room and place to report from Offices BA once the office has answered (question 42); while they read ADDRESS NOT ON RECORD, BE has ordered the question to the office from three working days before, and the coordinator gets the answer and types it in BA before the text goes, so that the text names the place. If no answer has come by 8:00 a.m., the coordinator phones the office and, in the same message, tells the consultant where to report as soon as the office says it. Video or telephone, in the sheet's pattern: "We are expecting you on Friday, June 14, from 1:00 p.m. on the Iverfen board's video link [the link from AV] for two hearings. Times are Iverfen office time (UTC-05:00). If nobody attends, these homeowners' appeals can be dismissed. Reply YES to confirm, and call 555-0100 today if the link does not open or anything has changed. Please text IN ten minutes before the first hearing." While a link is missing, or AV holds only a room letter, the cell reads DO NOT SEND YET, and nothing goes. The consultant's YES is linked in Q with their name in BX.

**The reply to a consultant who names a later arrival time** (Leo, message 65; Owen, message 20), the same day, by their channel, after typing their time in CH. "Thank you, Leo. You wrote that you will arrive at 10:45 a.m. for the 11:00 a.m. hearing at the Larkmere office on Monday, June 10. We need you at the office by 10:30 a.m., 30 minutes before your first case, so that there is time to find the room and for us to act if anything is wrong. Can you be there by 10:30 a.m.? Times are Larkmere office time (UTC-05:00). Please reply with the time you can be there, or call 555-0100 today." Their answer is typed over CH. If they cannot, the coordinator decides that day and notes it in Y.

**The question to a consultant who said they are not free at the arrival time** (Maya, message 5), the same day BE prints ARRIVAL NOT SETTLED, by their channel, or by email where no number is on file. "Maya, you hold 28 Willow Lane at the Larkmere office on Monday, June 10 at 9:30 a.m. We ask every consultant to be at the office 30 minutes before their first case, which would be 9:00 a.m., and you told us you cannot get there for 9 a.m. What time can you be at the office that morning? Please reply with the time. Times are Larkmere office time (UTC-05:00)." Her answer is typed in CH8; the day-before text then gives that time. If the time she gives is later than 9:30 a.m., the office is asked the same day: "For case [number], 28 Willow Lane, set for Monday, June 10 at 9:30 a.m.: our representative cannot be at your office before [time]. Could this case be heard later that morning, after [time]? If it cannot, please tell us by reply, and we will send another representative. Times are Larkmere office time (UTC-05:00)." The office's written answer changes E. If it says no, the hearing is offered down "Ask next" like any open hearing.

**The arrival**, watched in every county. No ARRIVED by the clock time in the day-before text of an in-person docket, or no IN five minutes before a video one: phone the consultant, then the office.

**The question to a consultant who reported ill**, the same day, for every hearing they hold in the next 7 calendar days (BE prints REPORTED ILL on each), by their channel, or by email where no number is on file. "Maya, we are sorry you are unwell. You hold 28 Willow Lane at the Larkmere office on Monday, June 10 at 9:30 a.m. Will you be able to attend? Please reply YES or NO today. If you are not sure yet, say so: we will ask someone to stand by, because the office needs the name by Friday, June 7 at 4:00 p.m. Times are Larkmere office time (UTC-05:00)." Her YES is linked in CT with its date in CU, and the line goes. A NO, or no answer by the 2:00 p.m. review, is one "not free" row for that date, and the hearing is offered. The same day the first name in "Ask next" is asked to stand by: "Could you take 28 Willow Lane at the Larkmere office on Monday, June 10 at 9:30 a.m. if the consultant who holds it cannot attend? Times are Larkmere office time (UTC-05:00). Reply STANDBY YES or NO. We confirm by [the office's naming deadline]." A standby is not a yes: nothing is typed in H or J until the offer goes and is accepted.

**The day-before message by email, for a consultant with no mobile number on file** (BE prints HAS NO MOBILE NUMBER ON FILE with the address). The words of Dockets I, then: "Please answer this email with YES to confirm. On the day, please email ARRIVED when you are at the office [video or telephone: email IN ten minutes before the first hearing]. We have no mobile number for you: what is your mobile number for texts, and do you agree to be texted about hearings?" The number goes in Bench O and the link to the yes in P; from then on the texts and the calls reach them.

**The result**, one text per docket, the same day. "Thank you for today. Please reply per hearing: 1) REDUCED to $___ / NO CHANGE / POSTPONED to ___ / NOT HEARD / DECISION TO FOLLOW, anything the office asked us to send and by when, and any problem with the file, the name, the date or the time. 2) ..."

**The case files**, to the consultant, only for the hearings they hold. "Case files for Thursday, June 13, Caldmere, version 2: 1) 75 Elm Street [link] 2) 96 Elm Street [link]. Version 2 adds the homeowner statement to both. Reply GOT IT 2 when every file opens." To the clerk: "Case files for Thursday, June 13, version 2: [each file by name]. Please reply to this email naming each file you received and can open, and its version." The consultant's reply is linked in M, with 2 in AY and their name in BW; the clerk's in L, with 2 in AZ. This message is also the answer to a consultant who asks what changed (Eli, message 35: "My links open version 1. Has anything changed?"). The words of the answer are in BN20 and BN21, BE on both rows prints TELL Eli Corven (answers his message 35), and his GOT IT 2 is linked in BO as well as in M; the line stays until then.

**The request for GOT IT with the version**, when BE prints THE CONSULTANT'S RECEIPT NAMES NO VERSION (Owen for Velloran, Nora for Iverfen). "Thank you for confirming the files for Tuesday, June 11, Velloran. So that we know you have the current ones, version 2 (sent on [date]): please open the links in that message and reply GOT IT 2." Then 2 goes in AY.

**The files email to a clerk whose receipt names no files**, when BE prints THE CLERK'S RECEIPT NAMES NO FILES (Velloran, Iverfen). "For cases [numbers], 120 and 138 Garden Street, set for Tuesday, June 11: thank you for confirming that the packets arrived. To be sure you hold the current ones, these are the files, all version 2: [each file by name]. Please reply to this email naming each file you have and can open." Then the clerk's reply replaces the link in L and 2 goes in AZ.

**A change from the office**, to the consultant the same day (typed in BN first). "Change from the Harthmere office for Thursday, June 6: video room D instead of B. Times unchanged. Reply OK." A new date is a new offer: "The Harthmere office has moved 48 Linden Avenue to Thursday, June 13 at 10:00 a.m., video room D. 66 Linden Avenue stays on Thursday, June 6. Times are Harthmere office time (UTC-05:00). Reply YES to take June 13, or NO." The same day the written question about the office's record goes to the office (below, "The question to an office after it moves a hearing"), and the homeowner is called with the new date (below, "The call to a homeowner who went to the county directly"). The answer to Leo's question in message 48 ("Please let me know what has changed") is this message; its words are in BN22, and BE22 prints TELL until his OK is linked in BO22.

**The warning after a phone report**, the same day. "The Harthmere office told us by phone that 48 Linden Avenue may move to Thursday, June 13. Nothing changes until its written notice arrives, so please keep Thursday, June 6 at 10:00 a.m. Times are Harthmere office time (UTC-05:00). Reply OK."

**The answer to a consultant who asks which date he is covering** (Leo, message 12; the words are in Hearings BN11), the same day, by his channel. "Leo, 63 and 81 Garden Street stay on Tuesday, June 11, at 1:00 and 1:30 p.m., by video. Times are Velloran office time (UTC-05:00). We asked the Velloran office to move them to June 13 and it refused: its June 13 schedule is full (its email, message 11). Only the county can move a hearing, so the June 13 entries in your calendar are wrong. You told us you cannot attend on June 11, so we are offering both hearings to other consultants and you are not covering either one. Our hearing calendar is rebuilt from our sheet today, and the June 13 entries go from it. Nothing else is needed from you. Reply OK." His OK is linked in BO. The same day the hearing calendar is refilled from the "Calendar file" tab.

**The answer to a consultant whose calendar holds the wrong date** (Nora, message 18; the words are in BN15). "Nora, 9 Orchard Road is yours on Tuesday, June 18 at 9:00 a.m., by video: the Orimere office moved it. Times are Orimere office time (UTC-05:00). 24 Orchard Road could not be moved and stays on Wednesday, June 12 at 2:00 p.m.; it is not yours, so please take its June 18 entry out of your calendar. The files for 9 Orchard Road follow; reply GOT IT when they open, and OK to this message."

**The answer to a consultant who asks whether to prepare for both hearings** (Nora, message 54; the words are in BN23 and BN24), the same day, by her channel. "Nora, yes, please prepare both. 18 Maple Lane and 34 Maple Lane are both still on the Iverfen office's list for Friday, June 14, at 1:00 and 1:30 p.m. by video: its reminder still lists both for that day. The homeowner asked the office to withdraw 18 Maple Lane, but the office has not confirmed the withdrawal in writing. So 18 Maple Lane stays yours until we send you the release notice. 34 Maple Lane is not affected. Times are Iverfen office time (UTC-05:00). Reply OK." Before it goes, the answer is typed in BN on both rows, and BE on rows 23 and 24 then ends with TELL Nora Pell (answers her message 54). Her OK is linked in BO23 and BO24; until then the line stays, so her question cannot stay unanswered unseen. The times and the format are those of the office's notice (message 49; Hearings D, E and F); the reminder (message 53) says only that both hearings remain listed for June 14, and since the evening of 21 Nov the text in BN23 and BN24 says so: "message 53 says both remain listed for June 14; the times are in message 49".

**The release notice**, only after the office's written confirmation is linked in AF. "Nora, the Iverfen office has confirmed in writing that 18 Maple Lane (Friday, June 14, 1:00 p.m.) is withdrawn. You are released from that hearing and need not prepare it. 34 Maple Lane stays on Friday, June 14 at 1:30 p.m., by video, and the day-before text will come as usual. Times are Iverfen office time (UTC-05:00). Reply OK."

**The confirmation to a consultant who volunteers** (Owen, message 42), after one approval by the evening reader or the coordinator: "Ask next" lists him for that docket (allowed in the county, not full, no travel clash). The offer and the files go in one message. "Thank you, Owen. Two hearings, Fenwick Vale office, [street address, hearing room and where to report, from Offices BA8], Thursday, June 6, in person, at your usual rate: 1) 9:00 a.m. 11 Brook Road 2) 9:30 a.m. 29 Brook Road. Please be at the office by 8:30 a.m. (the office asks for 15 minutes before the first case; we ask for 30). The case files, version 2: 1) [link] 2) [link]. Times are Fenwick Vale office time (UTC-05:00). Reply YES ALL to take both, and GOT IT 2 when every file opens. Please text ARRIVED when you are there." The 8:30 follows from the arrival rule (9:00 a.m. less 30 minutes); the sheet prints no text for these two rows, because nobody is named on them. Owen has "not seen these cases", so the place matters: Fenwick Vale's address is not on record (Offices BA8 is an ASK, and Hearings DZ4 and DZ5 read ADDRESS NOT ON RECORD: Offices BA8). At night the confirmation goes with "[the address follows by 9:00 a.m.]" in the brackets, the evening reader asks the office by email, and the coordinator phones it when it opens and texts Owen the place. Once BA holds the answer, BE prints WHERE WHOEVER TAKES THIS HEARING OVER GOES with it on a hearing that is taken over. "At your usual rate" is his own rate (Bench H) under his season letter; no rate was quoted in message 42, and "the quoted rate" changes nothing. His YES ALL fills G2, and his GOT IT fills M with his name in BW: Maya's "have reviewed the current packets" (message 38) does not count for him. Then "Tell the office", the void notices and the corrected homeowner notices.

**The evening text**, after 4:00 p.m., to everyone in "Ask next" at once: the docket offer from Dockets H, starting "Urgent:" and ending "The first YES gets them, and the files follow at once."

**To offices**

**The notice to the office** ("Tell the office", Dockets N), by the office's own route, with every field of its form (Offices AB). "For case [number], [address], [county], [date] at [time], [County] office time (UTC-05:00): our representative is [name, from the YES]. Our contact: [Settings B10]. Please confirm by reply that [name] is on your record for this case." A replacement adds "This replaces [previous name]". Once the office has accepted an alternate (Offices T), it adds "Our alternate on your record is [name]."

**The request for a video link or call-in number**, the day the row is created. "For case [number], [address], set by video on [weekday, date] at [time]: please send the video link for the hearing (for a telephone hearing, the number you will call or the number we call). The time is [County] office time (UTC-05:00). Our representative is [name]. Please also tell us how and when you send links, so that we ask the right way next time. Our contact: [Settings B10]." The link goes in AV; the answer on how it sends links goes in Offices AE.

**The question about a video room**, when BE prints VIDEO ROOM ONLY, NO LINK (Velloran, message 70; Harthmere, messages 43, 45 and 47). "For cases [numbers], 120 and 138 Garden Street, set by video on Tuesday, June 11 at 3:00 and 3:30 p.m. (Velloran office time, UTC-05:00): your confirmation names video room C. When you name a video room, do you also send a link or a call-in number, and when? Or is the room at your office, so that our representative attends in person? If a link comes, please send it by reply." The link goes in AV. The office's answer is chosen from the list in Offices AL, and what it said goes in AE.

**The arrangement for a first case at opening**, on a working day before, when BE prints FIRST CASE AT OPENING (Larkmere, Monday, June 10, 9:00 a.m.): a phone call, then this email. "For case [number], 14 Willow Lane, set for Monday, June 10 at 9:00 a.m., the first case after your office opens: we cannot reach your office before the hearing starts. Our representative will be there by 8:30 a.m. If for any reason our representative is not in the room at 9:00 a.m., please hear our cases at the end of the docket. Times are Larkmere office time (UTC-05:00). Our alternate on your record is [name, once Offices T has one]. On a hearing morning, whom can we reach before your office opens, and how (a name and a direct number)?" The answer goes in Offices AO. The 8:30 follows from the arrival rule; no consultant is named on this row yet. When the office has agreed, the link to its reply, or to the dated note of the call, goes in DB of the hearing, and the words OPENING NOT ARRANGED leave the daily list.

**The question to an office about a settlement**, the day BE prints SETTLEMENT, STILL MISSING (Brindlefen, message 27). "For case [number], 16 Birch Lane, set for Thursday, June 13 at 10:00 a.m. (Brindlefen office time, UTC-05:00): you wrote that the settlement needs our representative's signature. Two questions, please. Once you hold the signed settlement, is the hearing taken off your schedule, and will you confirm that in writing? And by when must the signed settlement reach you? Until you confirm that the hearing is off, our representative will attend." The office's written word that the hearing is off goes in AF, the date in BA, and its receipt of the signed settlement in O.

**The request for a settlement offer in writing**, the same day, when BE lists "the settlement offer itself (DC)" as missing. It goes to whoever made the offer. For 16 Birch Lane no message names them (message 27 is the firm's own note), so the coordinator asks the writer of that note, and this email goes to the Brindlefen hearing office, where the signed settlement must go. "For case [number], 16 Birch Lane, set for Thursday, June 13 at 10:00 a.m. (Brindlefen office time, UTC-05:00): our file says that a settlement offer is ready for signature, but we do not hold the offer itself. Please send us the offer in writing: its terms, who made it, and the date by which it must be accepted. If the offer did not come from your office, please tell us who made it, so that we can ask them. We sign nothing until the homeowner has accepted the offer in writing." The link to the offer goes in DC and its acceptance date in DD. No answer by the 2:00 p.m. review on the next working day: the second request, below.

**The answer to an office that asks for a document the case files already hold**, when BE prints BEFORE IT IS COLLECTED AGAIN and the check finds the document in the current version (Juniper Reach, messages 59 and 60). "For case [number], 57 Clover Road, heard on Tuesday, June 4: you asked for the homeowner statement by June 8 at 4 p.m. (Juniper Reach office time, UTC-05:00). The case files we sent you, version 2 (sent on [date]; your receipt of [date]), contain a homeowner statement, in the file [name]. Which version of the files does your office hold? If it is version 1, version 2 is attached again. If you want the statement as a separate document, it is attached as well. Please confirm by reply what you have received." The office's reply is the link in O. Nothing is collected from the homeowner again unless the office says the statement on file is not the one it wants.

**The question to an office after it moves a hearing**, the same day BE prints THE LINK IN K DOES NOT COUNT FOR or THE OFFICE RECORDED ... BEFORE THIS HEARING WAS MOVED (Orimere for 9 Orchard Road, messages 16 and 17). "For case [number], 9 Orchard Road, which you moved from Wednesday, June 12 to Tuesday, June 18 at 9:00 a.m. (Orimere office time, UTC-05:00): your message recorded Nora Pell as our representative while the hearing was on June 12. Is Nora Pell still on your record for June 18? Please confirm by reply. If you need a new notice from us for the new date, please say so and we will send it today." The old link stays in a note in Y and K is cleared. The office's written answer is linked in K and June 18 is typed in DQ; until then G3 stays open. For 48 Linden Avenue, where Harthmere asked us to "update your representative" (message 47), the notice naming the consultant who says YES to June 13 goes instead ("Tell the office"), and the office's reply is linked in K with June 13 in DQ.

**The questions after a result that fits no value of the list** (Owen, message 57: "They are giving us more time"), the same day, to the consultant who reported it and in writing to the office. To the consultant, by their channel: "Thank you for your report on 57 Clover Road, heard on Tuesday, June 4. So that we record it right: what did the board decide? Is a new hearing set, or did the office ask us to send something, and by when? Times are Juniper Reach office time (UTC-05:00)." To the office: "For case [number], 57 Clover Road, heard on Tuesday, June 4 (Juniper Reach office time, UTC-05:00): our representative reported that more time was given. Please tell us in writing what was decided: is a new hearing set, or do you want a document from us, and by when?" S holds "reported: not clear" until one of them answers; then the result is chosen in S, who answered and when goes in DT and the link in DU. In the example the office's message 59 is that answer: "held open for a statement", due June 8 at 4 p.m.

**The request to an office to move a hearing**, only when the rule under "Dates, rooms and calendars" holds (the bench was asked and the note is linked in CS, the homeowner's yes is linked in CR, the hearing has no consultant's yes, and it is before the office's deadline for changes). "For case [number], [address], set for [date] at [time], [County] office time (UTC-05:00): we have asked every representative who may appear at your office, and none can attend on that date. The homeowner has agreed in writing to a later date. Could the hearing be moved to [date]? If it cannot, please tell us by reply, and the hearing stays on [the first date]." The date asked goes in BI and the office's answer in BJ, with "moved" or "refused" chosen in DI. Where Offices AY holds the office's last day for a change request, the request goes by that day or not at all.

**The second request to an office that has not answered.** "We wrote to you on [date] about case [number], [address], set for [date]: [the question, in one sentence, as first asked]. We have no reply yet. Could you reply to this email by [time on the next working day, or the office's deadline if earlier]? If it is easier, we will call your office at 9:00 a.m. on [date]. Times are [County] office time (UTC-05:00)." Logged in Y ("second request sent [date, time]"), Z and AA.

**The request to a clerk to accept late case files**, when BE prints PAST THE 48-HOUR MARK. "For case [number], [address], set for [weekday, date] at [time], [County] office time (UTC-05:00): we are sending the case files, version [AX], later than the 48 hours your office asks for. Attached by name: [file], [file]. Please confirm by reply that you accept them for the hearing and that each file opens." The clerk's reply is the G4 link in L, and its version goes in AZ.

**The season questions to an office**, in desk week 2. "Before this season's hearings, could you answer these by reply? 1) How many working days before a hearing must our representative's name be with you, and by which route? 2) May our attorney or registered agent be recorded as the alternate for every hearing? 3) If our representative does not attend, is the appeal dismissed or decided on the written evidence, and how and by when can we ask for a new hearing? 4) Our consultants have promised us [weekdays from Bench I]. Could you set our hearings on those days, and on one day where you can? 5) Who must sign a settlement or a withdrawal statement for a homeowner: the consultant who attends, the representative on your record, or the homeowner? 6) Will you accept a PDF signed with a free fill-and-sign tool, or a scan of a signed page? 7) When and how do you send the video link or call-in number for each hearing? 8) When you name a video room, do you also send a link or a call-in number, and when? Or is the room at your office, so that the consultant attends in person? 9) On a hearing morning, whom can we reach before your office opens, and how (a name and a direct number)? 10) How long does one of our hearings usually run? 11) Which days is your office closed this season? 12) When does your hearing season start and end? 13) Does your office change its clocks in March and November (daylight saving time)? 14) How many working days before a hearing is the last day you accept a request to change its date, and by which route must the request come? 15) What is your daytime telephone number, and which clerk should we ask for? 16) Please confirm in writing how you want us to tell you who attends each hearing, and how we name a replacement. Our record says: [Offices F and G for this office]. 17) For hearings in person at your office: what is your street address, in which room are our hearings held, and where does our representative report on arrival?" Questions 7 and 8 go only to the six offices that hear by video, and 17 only to the four that hear in person. Each answer goes in its amber cell on the office's row: 1 in O, and its number in AF; 2 in T; 3 in P; 4 in Q; 5 in AC (and AG if a withdrawal has a different signer, with the message in AH); 6 in AD; 7 in AE; 8 in AL; 9 in AO; 10 in AP; 11 on the Holidays tab; 12 in U; 13 in AU, as yes or no; 14 as a number in AY, with the route in K in the office's words; 15 in AZ; for 16, the date of the office's written confirmation in L, after F and G are corrected where the office's answer differs from them; 17 in BA (the question is also printed on Day 1 count row 32; in this kit's list it is number 42). Offices N reads CONFIRM THE ROUTE IN WRITING until L holds a date, and ASK AGAIN: OVER SIX MONTHS once that date is more than 180 days old. Two offices get one more line. Larkmere: "Your message asked for the name by 4 p.m., three days before. Is that your rule for every hearing?" (O2, then AF2). Fenwick Vale: "Is 'arrive 15 minutes before the first case' your standing rule, or was it for the June 6 docket only?" (write the answer in Day 1 count B25, and keep typing the number in CI on each hearing; Offices K8 keeps the office's own words). The packet gives every county the same travel rule, 60 minutes between in-person hearings in different counties and 15 minutes between video sessions (Settings B12 and B13); an office that states its own gap has it typed in Offices AI or AJ.

**The two lines for the season letter to a consultant** (and for the week-one calls). "So that we can reach you on a hearing morning: what is your mobile number for texts? And do you agree to be texted about hearings at that number? Please reply YES to this message if you do." The number goes in Bench O and the link to the yes in P. To Nora Pell, by phone: "Our list has text as your preferred channel, and you have also told us 'Confirm by email'. Which one should we use for offers and the day-before message?" Her answer goes in Bench C4. To Priya Marden, whose channel is the phone: the number for calls and texts goes in O6.

**The chaser for a withdrawal the office has not processed** (Iverfen, messages 51 to 53), sent only once the homeowner's written yes is linked in BG. "For case [number], 18 Maple Lane, Iverfen, listed for Friday, June 14 at 1:00 p.m. (Iverfen office time, UTC-05:00): you asked us to confirm the homeowner's request to withdraw this appeal. We confirm it: the homeowner has confirmed it to us in writing. Your reminder of [date] still lists the hearing. Please process the withdrawal and confirm in writing that the hearing is removed. Until you confirm, our representative, Nora Pell, will attend. The hearing for 34 Maple Lane on June 14 at 1:30 p.m. is not affected." If the office needs a signed statement, it is attached, signed by the name in BP.

**The cover email for a statement due to an office** (Juniper Reach, messages 59 and 60), sent only with the statement attached, before the BB time. "For case [number], 57 Clover Road, Juniper Reach, heard on Tuesday, June 4: attached is the homeowner statement you asked for at the hearing, due June 8 at 4 p.m. (Juniper Reach office time, UTC-05:00). Your office is closed on Saturday, so we are sending it by Friday, June 7. Please confirm by reply that you have received it and that it opens." The office's reply is the G5 link in O, which clears OWED.

**The signing request**, only after the homeowner's written yes is in BG, to the name in BP. "Please sign the withdrawal statement for 42 Birch Lane, case [number]. Open it here: [link to the PDF in the shared folder], fill it in and sign it with any free fill-and-sign app, and send it back; or print it, sign it and send a scan of the page. The office has you on its record, so it must be your signature." After an unreadable photo the clearer copy is asked for once, and the date of that request is typed in DA, so that BE prints when the fallback falls due; only if none has come by noon on the next working day (Settings B14), when the daily list reads FALLBACK DUE: "We could not read the case number and date on the photo, and no clearer copy has come, so please sign here instead: [link]."

**The email after any phone call with an office**, the same day. "Thank you for your time on the phone today. To confirm what we discussed: [one sentence]. Please reply to this email to confirm, so that we have it in writing." The call is noted in Y with the name, the time and what was said; the reply is the link.

**The good-cause letter**, the same day a hearing is missed, by the office's own way back (Offices P; while P is an ASK, phone the office first and ask how and by when a new hearing can be asked for). "Our representative did not appear at the hearing on [date] for [case number] because [reason, one sentence]. This was not intentional. We ask for a new hearing under [the office's rule]. The evidence is on file as of [date]." Its link goes in N after the words "good-cause letter", the office's time limit in BA, and the office's answer in O.

The sworn statement and the settlement call are in the appendix (section 6); neither is needed in the first four weeks.

**To homeowners** (a person, never software)

**The call when a withdrawal or settlement is wanted**, the same working day, then an email so that the yes is in writing. "Following our call today: [the county tells us / you told us] you want to [withdraw your appeal / accept the settlement] for [address], case [number], set for [date]. A withdrawal cannot be undone once the county processes it. If that is what you want, please reply 'Yes' to this email, and we will send it to the county. Until then your hearing stays on and we will attend." The reply is the link in BG.

**The call before the firm asks an office to move a hearing**, then an email so that the yes is in writing. "Following our call today: none of our representatives can attend your hearing for [address], case [number], on [date]. We would like to ask the county to move it to [new date]. That delays your hearing by [n] days. If you agree, please reply 'Yes' to this email. If you do not, your hearing stays on [date] and we will keep looking for a representative." The reply is the link in CR. Without it no request goes to the office.

**The call to a homeowner whose hearing was moved at our request without their yes** (9 Orchard Road, messages 15 and 17), the day BE prints THE HEARING WAS MOVED AT OUR REQUEST AND THE HOMEOWNER'S YES TO THE NEW DATE IS NOT ON RECORD, then an email so that the answer is in writing. "Following our call today: we asked the Orimere office to move your hearing for 9 Orchard Road, case [number], and it moved the hearing from Wednesday, June 12 to Tuesday, June 18 at 9:00 a.m. (Orimere office time, UTC-05:00). We should have asked you first, and we did not. If the new date suits you, please reply 'Yes' to this email. If it does not, please tell us, and we will ask the office what can be done; only the office can set the date. We still represent you, and you do not need to come." The reply is the link in CR25, and the line and the words CALL THE HOMEOWNER go. A "no" is taken to Alice the same day.

**When a homeowner is not reached.** Two calls on the first day, in the morning and in the late afternoon, each noted in Y with its time, and this email the same day: "We tried to reach you by telephone today about your appeal for [address], case [number]. We need your answer to one question: [the question, in one sentence]. Please reply to this email or call [Settings B8]. Until we hear from you nothing changes: your hearing stays on [date], we will attend, and we will not withdraw, settle or move anything for you." If a deadline falls before the answer, the coordinator tells Alice the same day ("Homeowners").

**The corrected notice**, the same day a new consultant has said yes or the county's written notice moves the date, by the route the first notice went. "About your appeal for [address], case [number]. Our notice of [date] said [the old name / the old date]. That has changed: [our representative at your hearing is now (name) / the county has moved your hearing to (date) at (time)]. You do not need to come, and you do not need to contact the county. If the county contacts you, please tell us first." Then the new name and date go in BK and BL.

**The call to a homeowner who went to the county directly** (Harthmere, message 47), the same day. "The Harthmere office told us you asked it to move your hearing for 48 Linden Avenue, and it is now on Thursday, June 13 at 10:00 a.m. (Harthmere office time, UTC-05:00). We still represent you, and you do not need to come. Next time, please tell us first, and we will ask the county for you." The name, the time and what was said go in Y, and the dated note of the call in DS22 (or the homeowner's own reply, or the corrected notice sent). The corrected notice goes the same day, and what it says goes in BK and BL. Until DS22 holds a link, BE22 prints THE HEARING WAS MOVED FROM Thu 6 Jun TO Thu 13 Jun ... and the daily list reads CALL THE HOMEOWNER (measured). The same call follows any move by an office, whoever asked for it.


### 16.3 Trying the software yourself

The commands, with what each prints, are in section 14.1.


### 16.4 Every situation in the examples, and what the firm does (A1 to X34)

One row per problem in the 72 example messages (ids as in `PROBLEM_COVERAGE.md`, section 10; X1
to X34 are problems in the same messages and the packet's records found later). Each answer says what the firm does this
season with the kit, the sheet and the reply rule; where the answer needs something only the firm
or an office knows, the row says so and section 8 has the question and the cell. Cells are as the sheet stands on Friday,
June 7 (Settings B2). Hearings rows: 2 and 3 Clover Road, 4 and 5 Brook Road, 6 and 22 Linden
Avenue, 7 to 10 Willow Lane, 11 to 14 Garden Street, 15 and 25 Orchard Road, 16 and 17 Meadow
Avenue, 18 and 19 Birch Lane, 20 and 21 Elm Street, 23 and 24 Maple Lane.

| Id | The situation | What the firm does |
|---|---|---|
| A1 | Maya is "usually free"; her name is written down anyway | Not a yes: H stays empty until her own YES, or BE prints NAME WITHOUT A YES and Measures B3 counts it as nobody. Send the offer |
| A2 | The office asks three times who attends, by 4 p.m. | BH counts the requests (3 on rows 7 and 8): TOP OF LIST and THE OFFICE HAS ASKED 3 TIMES: PHONE IT TODAY. The deadline is in AW (OFFICE DEADLINE Fri 7 Jun at 4:00 PM, which reads PASSED once that hour has gone by on the clock in Settings B15). BE8 names the office's own route for the notice. G3 open until its written reply. Whether "4 p.m., three days before" is Larkmere's standing rule is a season question (Offices O2, then the number in AF2) |
| A3 | Maya takes only the 9:30 | YES 2 links 28 Willow Lane in J. 14 Willow Lane stays open, Maya in BC and on Availability (row 7: not free, From 9:00 and To 9:30, the start and the end of the hearing she declined, so her 9:30 is not touched), and it is offered. Her 9:30 case would put her at the office at 9:00 a.m., the time she said she cannot make: row X24 |
| A4 | 14 Willow Lane needs someone | Dockets G4 and O4: Leo first, already at Larkmere that day with the morning free (Availability row 3); Maya left out |
| A5 | A draft notice names Maya, who declined | Notices on file row 3: VOID, marked void in the folder, never sent |
| A6 | Notice for 28 Willow Lane due 4 p.m. June 7 | Notices on file row 4: SEND IT. Dockets N4 names AX-102 only (the office already has Leo for 102 and 118), in Larkmere's form (Offices AB), before the deadline in AW |
| A7 | Maya wants files for her hearing only | Files for 28 Willow Lane only, "Reply GOT IT 2". Her reply goes in M with 2 in AY and her name in BW |
| A8 | Maya answers by text | Her text is her proof, linked in J |
| B1 | The firm asks to move both hearings | BI holds the date we asked; nothing moves without the office's written notice; its answer (message 11) is in BJ. Whether the firm should have asked at all is row X21 |
| B2 | Leo edits the calendar; records follow | The edit moves nothing. The calendar activity message is read at 9:00 a.m.: the case records are corrected that day and the hearing calendar refilled from the "Calendar file" tab |
| B3 | Leo: June 13 "works for me" | A NO for June 11: Availability row 8 (not free), BC. June 13 is not a slot the county set |
| B4 | The office "can record Leo" | An offer, not a record: G3 open; reply naming whoever says YES |
| B5 | Records show June 13 and Leo | Record check rows 6 and 7 flag date and consultant; corrected that day |
| B6 | Leo asks which date he covers | The same day, the script in section 2 (the words are in BE11 and BN11): June 11 stands, the move was refused, he said he cannot attend so the hearings go to others, the June 13 entries are wrong and the calendar is rebuilt. His OK in BO |
| B7 | Both Garden Street hearings need someone | One offer (Dockets H5) to Owen first, already at Velloran that day with the afternoon free (Availability row 4); Leo left out |
| B8 | The shared calendar still shows June 13 | The hearing calendar is refilled that day from the "Calendar file" tab: column A saved as `hearings.ics` and imported into a calendar that holds nothing else, after the previous import is emptied; consultants view, never edit. The times are in UTC. The example's file was imported into Apple Calendar without an error (measured on a version of 21 Nov 2026 before the last rules were added). The CSV download is the second way. The firm's own calendar program is tried in desk week 2 |
| C1 | Nora: morning yes, afternoon no, June 18 "if moved" | The morning yes is a yes for 9 Orchard Road on June 12; the afternoon is not free (Availability row 9, BC); June 18 is a condition (row 5), not a yes |
| C2 | The office records Nora for one hearing; still reviewing the move | G3 per case: 9 Orchard Road only, and for June 12 only: DQ25 holds June 12, the date the office's message 16 was about. BI holds our request; while BJ is empty BE prints OUR DATE-CHANGE REQUEST ... IS STILL OPEN, and both stay June 12 |
| C3 | One hearing moves to June 18, one stays | Row 25 moves (D, E, the I link to message 17, and June 12 in DR25) and its G2 is cleared; row 15 stays June 12. The office's record of June 12 no longer counts for June 18: G3 reopens on row 25 and the office is asked in writing (row X30) |
| C4 | Nora clears June 12 and puts both on June 18 | 9 Orchard Road: her message 18 meets her own condition and asks for files, so it is her yes for June 18 (J25, the 9:00 a.m. pass). 24 Orchard Road stays open, TOP OF LIST, offered; BE15 says to tell Nora |
| C5 | Record still June 12; draft names Nora | Record check row 8 flags the date. Notices on file row 6: VOID |
| C6 | 24 Orchard Road at 2 p.m.; Owen busy until noon | Dockets O6: Leo (prefers afternoons), Maya (bench), Owen (elsewhere, travel gap met); Nora left out |
| C7 | Nora thinks both moved to June 18 | One message (BN15; script in section 2): June 18 is hers, 24 Orchard Road stays June 12 and is not hers. Files for 9 Orchard Road only. Her OK in BO |
| D1 | A voicemail to the office | Confirms nothing; the notice goes in writing |
| D2 | A clerk says by phone: form, then call | Offices M5 that day, with the date in AT5; asked in writing. From that moment no notice goes to Tesswick until a person approves the change: Offices N5 reads APPROVE OR REJECT THE CHANGE TODAY, BE16, BE17 and Dockets N7 read NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY and print no route, and both rows are at the TOP OF LIST as NOTICE BLOCKED (Measures B98: 2). A person approves the same day with their own name in AQ5 and the date in AR5. Then the route in M5 (the form, then a call) is the route, and because AS5 says "no" the old email route is printed nowhere. The example leaves AQ5 and AR5 empty, because no message shows a person at the firm approving, so it shows the block. The foot of the Reader suggestions tab lists the change as a proposal for M5, marked HOLD |
| D3 | Form sent; a clerk cannot find it | Not processed: G3 open. The clerk's message 24 is linked in CP16 and CP17 and the firm's own message 23 in CQ. BE reads THE NOTICE WAS SENT ... BUT THE OFFICE CANNOT FIND IT and the daily list reads OFFICE CANNOT FIND OUR NOTICE, so the rows are not read as "nothing sent". The completed form is resent by the approved route once a person has approved the change (BE: IT IS RESENT ONLY AFTER A PERSON APPROVES THE OFFICE'S CHANGE), then the call in office hours. The old email route is printed nowhere, so no email goes without the form |
| D4 | "Please call tomorrow morning" | The call is a task on both rows: Y holds what to ask, as clerk Sol asked in message 24, Z "the coordinator", DX the day message 24 arrived and AA a date. The packet gives no date, so the example reads message 24 as arriving on its own today, Friday, June 7 (DX16, DX17), and the call falls on Monday, June 10 (AA16, AA17); a note on each cell says this is the example's reading (row X31). BE prints CALL THE TESSWICK OFFICE IN ITS HOURS (Offices D: 09:00 to 16:00 local, Monday-Friday) and A CALL NEVER CLOSES A CHECK: ASK FOR IT IN WRITING. One person's approval (AQ5, AR5) makes the new route the route. When the office confirms in writing, the date goes in L5, M5 moves into F5 and G5, and M5, AQ5, AR5, AS5 and AT5 are cleared; if that is forgotten, a date in L5 on or after AT5 has the same effect |
| D5 | A clerk confirms by phone | A call never closes a check: a Y note with the name and time, the email after a phone call, and G3 closes on the written reply |
| D6 | No files sent to Owen or the office | BE16 and BE17: SEND CASE FILES VERSION 2 TO THE CONSULTANT AND THE CLERK, with the send-by time, Mon 10 Jun at 11:00 AM on row 16 and at 11:30 AM on row 17 |
| E1 | The office wants a name per hearing | One notice per case (Offices AB); G3 closes per case |
| E2 | Settlement needs Priya's signature | BG first: BE18 prints HOMEOWNER'S WRITTEN YES MISSING. Then BP (Priya, who attends: the office's rule) gets the fill-and-sign PDF. What else a settlement needs is row X22 |
| E3 | Owen signed; the office has Priya | The withdrawal signer is the name on the office's record: BP19 reads "Priya Marden, the name on the office's record: the office's rule" (message 28). BG first. The hearing stays staffed |
| E4 | Unreadable photo; already asked once | N19 notes it unreadable, and DA19 holds the link to the firm's own request (message 30). BE19 prints A CLEARER COPY WAS ASKED FOR: DO NOT ASK AGAIN, and asks for the date of that request in DA, because the packet's messages carry no date. With the date typed, BE prints when the fallback falls due: noon on the next working day (Settings B14; the moment is in Hearings DM), and from then the daily list reads FALLBACK DUE. The fallback is the fill-and-sign link to the name in BP, then a call if it is not signed by the end of the day. The homeowner's yes comes first: while BG has no link the due fallback is a call to the homeowner (BE says so and names Taylor Finch), and the signing link goes as soon as BG is linked. Whether Brindlefen accepts a fill-and-sign PDF is still an ASK (Offices AD6), and the due line says to ask it that day. The dated lines were run on test copies only |
| E5 | Our file says "recorded"; the office never did; a notice lacks its County line | Not proof: G3 open for 16 Birch Lane and Dockets N8 asks Brindlefen. Every notice that goes carries every field in Offices AB (property, case, county, representative), so an incomplete one is redone before it goes. Notices on file row 8 names the gap: 42 Birch Lane's notice reads OK but LACKS the county, so the copy in the case folder is corrected before it is sent again |
| E6 | Priya prefers the phone and asked for the files | Bench C6: phone first, then the same text for a link. BE18 and BE19: SEND CASE FILES VERSION 2 TO THE CONSULTANT AND THE CLERK, with the send-by time, Tue 11 Jun at 10:00 AM on row 18 and at 10:30 AM on row 19 |
| F1 | Eli "will review the files this week" | Not a GOT IT: M stays open |
| F2 | Clerk has version 2, Eli version 1; one file unreadable | L20 links message 34 for 75 Elm Street (AZ 2). BE21: send version 2 to the consultant and the clerk; 96 Elm Street resent that day. BE20: version 2 to Eli |
| F3 | Eli asks what changed | One files message: links, the version, what changed, "Reply GOT IT 2" (section 2). It is the answer to his message 35: the words are in BN20 and BN21, and BE on both rows prints TELL Eli Corven (answers his message 35) until his GOT IT 2 or his OK is linked in BO |
| F4 | Records point to version 1 | Record check rows 14 and 15 flag the version; corrected that day |
| G1 | A clean case; "arrive 15 minutes before" | The office's instruction is typed as 15 in CI on both rows. The firm asks for 30 minutes, so the day-before text names one time, the earlier one. The clerk's receipt (message 40) is linked in L by a person at 9:00 a.m., but it names no version, so AZ stays empty and the files check stays open (AX is 2, from the case record). The links are reader proposals, accepted in the 9:00 a.m. pass. Nothing fills a cell on its own: auto-filing is OFF this season, on the measured numbers under "How replies arrive" (72 of 79 right on the newest unseen set). What a person does on these two hearings is counted there: 4 actions a hearing, 2 if auto-filing were on (measured counts, not timings) |
| G2 | Maya texts the day before that she is ill; the office is closed (the packet gives no hour; the prototype's replay places her text at 6:12 p.m., and the office closes at 4:00 p.m.) | The evening reader adds Availability row 6 (Maya, June 6, not free): both hearings turn open at once. The evening text to all of "Ask next" (by email to every name marked EMAIL ONLY); email the office and its alternate; the evening reader phones the office when it opens. The row carries the reason illness and the day she said it, so every other hearing she holds in the next 7 days is checked the same day (row X17) |
| G3 | Owen volunteers | One approval ("Ask next" lists him), then the confirmation with the offer, the place, the arrival time and the files (section 2). Fenwick Vale's address is not on record (Offices BA8 is an ASK), so the place follows as soon as the office gives it (row X29). His YES ALL fills J. His own GOT IT 2 fills M, with his name in BW: nothing Maya confirmed counts for him |
| G4 | The office still has Maya | "Tell the office": an updated staffing notice per case naming Owen, replacing Maya. BD keeps Maya until the office answers (BE: THE OFFICE HAS Maya Venn, NOT Owen Tarris). Notices on file rows 9 and 10: VOID. Corrected homeowner notices (BK) |
| G5 | Hearing passed, nobody confirmed | The daily list (column X) on rows 4 and 5: NOBODY NAMED: POSSIBLY MISSED. The coordinator calls the office that day. If nobody appeared, the result is typed, the row reads MISSED and stays on the list (TOP OF LIST: MISSED, LETTER DUE, then MISSED: ANSWER DUE) until the good-cause letter is linked in N and the office's answer in O. Fenwick Vale's own way back is still an ASK (Offices P8), so BE says to phone the office and ask |
| H1 | A paper notice by mail | Scanned and linked in I, and the day it reached the firm typed in DW, because a deadline that counts from the arrival counts from that day. Harthmere is marked as sending paper notices (Offices BB9, from message 43), so BE22 asks for DW (row X31) |
| H2 | Room B becomes D after Leo's YES | AV and BN6 that day, the change notice; his own message 48 names room D, so it is linked in BO6. Room D is a room letter and not a link: G1 stays open on both Linden Avenue rows, and the office is asked what the room means (Offices AL9) |
| H3 | Phone: 48 Linden moves; writing to follow | June 6 stands; notice asked for; the warning text to Leo that day |
| H4 | The written notice moves 48 Linden | Row 22: D, E and the I link changed, the old date June 6 typed in DR22, J and H cleared; offered. K22 holds no link, so G3 stays open until the office's written word for June 13 (row X30). 66 Linden untouched: DQ6 holds June 6, its own date |
| H5 | Leo cannot do June 13 | Availability row 10, BC; offered down "Ask next"; BN22 tells Leo what changed |
| H6 | The homeowner went to the county | The sheet now orders the call: with June 6 in DR22 and no link in DS22, BE22 prints THE HEARING WAS MOVED FROM Thu 6 Jun TO Thu 13 Jun: A PERSON CALLS THE HOMEOWNER TODAY WITH THE NEW DATE AND SENDS THE CORRECTED HOMEOWNER NOTICE ..., THE HOMEOWNER TO CALL: Riley Fern (H008) and CONTACT NOT ON RECORD, and the daily list reads REVIEW CALL THE HOMEOWNER (measured). The coordinator phones that day (section 2), sends the corrected notice (what it says goes in BK and BL), and links the dated call note, the homeowner's own message or the notice sent in DS22; the line stays until then. The contact itself is a question to the firm (section 8, question 41) |
| H7 | Office lists Leo; record wrong; 66 Linden unreported | BE22: THE OFFICE HAS Leo Arlen, WHO IS NOT ON THIS HEARING: name a consultant, then the replacement notice. Record check row 18. Row 6 RESULT DUE: the result text to Leo |
| I1 | The homeowner asked the county to withdraw | The coordinator phones the homeowner and asks for the yes in writing (BG). The hearing stays on |
| I2 | "Canceled" here; the county lists both | Staffed until the office confirms in writing. Record check row 20 flags the record: RECORD SAYS CANCELED, BUT THE OFFICE HAS NOT CONFIRMED IT IN WRITING: THE HEARING IS STILL ON ITS LIST. It is flagged whatever G says, until AF holds the office's proof; "scheduled" is the right record until then. The chaser (section 2) goes only once BG has its link |
| I3 | Nora asks whether to prepare both | Yes, both, until AF has the office's written confirmation. The answer goes to Nora the same day by the script in section 2 ("The answer to a consultant who asks whether to prepare for both hearings"). Its words are typed in BN23 and BN24, so BE on both rows ends with TELL Nora Pell (answers her message 54): yes, prepare both, and her OK is linked in BO23 and BO24. Until then the sheet shows her question as unanswered. The packet holds no OK from her, so BO is empty and the example shows the line on both rows (measured). Both rows are on the daily list as REVIEW already, so the list gains no word |
| I4 | What closes a withdrawal | Only the office's written confirmation, in AF: NOT HELD. Then the release notice to Nora for 18 Maple Lane, typed in BN: BE prints TELL and the daily list reads TELL DUE on the NOT HELD row until her OK is linked in BO. 34 Maple Lane untouched |
| J1 | Owen phones in the results | Logged per hearing, with who reported it and when in DT and the link in DU; a result with no source prints a line in BE. Owen's "They are giving us more time" for 57 Clover Road fits no value of the list, so that day S2 is "reported: not clear": the row reads RESULT NOT CLEAR and BE orders the question to Owen and to the office the same day (section 2). After the office's message 59, S2 reads "held open for a statement" with message 59 in DU2; 73 Clover Road reads "heard: decision awaited" with Owen's message 57 in DU3 (measured). No message gives an arrival time for either hearing, so R2 and R3 are empty: BE asks Owen when he arrived, and neither row can read DONE without that time (Measures B95: 2) |
| J2 | The open item is a statement due June 8 | N2 and BA2 filled, S2 "held open for a statement": OWED. Record check row 22 flags "awaiting reschedule" |
| J3 | June 8 is a Saturday; the office asks again | BB2: Friday, June 7, 4 p.m. BH2 = 2: TOP OF LIST: OWED, PHONE IT TODAY |
| J4 | The statement must come from the homeowner | First the check that BE2 prints (row X23): the current case files may already hold it. If it must still come from the homeowner, the coordinator collects it; the cover email (section 2) goes only with it attached; the office's receipt in O2 closes it |
| K1 | Two threads go right | Larkmere (rows 9 and 10) reads READY once the 9:00 a.m. pass accepts the proposals and types Leo's name in BW and version 2 in AY and AZ: his message 65 and the office's message 66 both say "current". Velloran (rows 13 and 14) reads OPEN: 3 missing, although its messages look clean: the office names room C and no link, and messages 70 and 71 name no version. The coordinator sends three messages for that docket (the room question, the request for GOT IT 2, the files email to the clerk; section 2) and types AV, AY and AZ from the answers. Free-text replies ("I accept both") go to a person by design, and the tab now shows those words as the proof of the yes. What a person still does on these two threads, and why it is kept, is stated once under "How replies arrive": 10 actions a hearing at Larkmere and 7 at Velloran with auto-filing off (measured counts, not timings) |
| K2 | The same confirmation twice | A repeat changes nothing and makes no typing, and the test is written ("A reply the rule does not file"): a later message replaces the first link only when it states something the cell needs that the first did not. Message 72 states nothing that message 70 did not: rows 13 and 14 keep their links, nothing is typed and BH does not go up. Message 66 repeats the schedule and the name, so I and K on rows 9 and 10 keep message 61; it also says "we have the current packets", which the first receipt (message 64) did not, so in L9 and L10 the link of message 66 replaces message 64 and 2 goes in AZ. That is the test applied, not an exception to it. The tools mark repeats: the Reader suggestions tab lists the 18 found in the example messages as REPEAT: THE CELL KEEPS ITS FIRST LINK, and the mailbox connector and the office rule print "REPEAT of message n: no cell changes" in place of a proposal (measured). A person still reads the message once; nothing is typed for it |
| K3 | Availability inside routine replies | Availability rows 3 and 4, with the window and the office; "Ask next" reads them |
| K4 | Room C confirmed after Owen's YES | His own message 71 names room C: linked in BO13 and BO14, no change notice. Room C is not a link: BE prints VIDEO ROOM ONLY, NO LINK, the Velloran day-before text reads DO NOT SEND YET, and the office is asked what the room means (Offices AL3) |
| X1 | Homeowner notices name a consultant or date that changed | BK and BL hold what each notice said; BE prints the difference; the corrected notice (section 2) goes the same day, sent by a person. A coming hearing with a yes and nothing in BK and BL prints NO HOMEOWNER NOTICE ON RECORD (14 rows in the example, because the packet names what a notice said for Brook Road only). What each notice already sent says is a question for the firm (section 8, question 36) |
| X2 | Video hearings have no link | G1 stays open until AV has a link or a number; BE: NO VIDEO LINK YET (10 coming rows); the day-before text reads DO NOT SEND YET; the request (section 2) the day the row is made; Measures B21 counts them, with the 3 rows that hold only a room letter (13) |
| X3 | 73 Clover Road awaits a written decision | Row 3 reads ERROR DUE until T is filled, then DECISION DUE until BQ links the decision; BE3: ask the office every Friday |
| X4 | Tesswick's form wants case IDs and a contact email | Dockets N7 prints every field in Offices AB5 and our contact (Settings B10); the resend carries them |
| X5 | No message shows the 42 Birch Lane homeowner asking to withdraw | Nothing is signed or sent until BG has the homeowner's written yes: the coordinator phones the homeowner first |
| X6 | No files shown for 48 and 66 Linden; files due 48 hours before | BM gives each send-by; BE prints SEND CASE FILES, and once the hour has gone by on the clock (Settings B15), also on the send-by day itself, PAST THE 48-HOUR MARK: SEND NOW AND ASK THE CLERK TO ACCEPT LATE FILES, with the request in section 2 (4 rows in the example). Still to come from the offices: their closure days, which move the send-by (Holidays B2 to K2) |
| X7 | Counties allowed and daily caps | Bench D and E: "Who can take it" leaves Priya and Eli out at Larkmere, Velloran, Orimere and Tesswick, and anyone full that day. An offer that is out is typed in BY and counts in the consultant's day, so two offers on one Monday cannot pass the cap; BE prints OVER THE DAILY CAP if a consultant still holds too many, and Measures row 24 counts it (0). The reply rule hands a YES that would pass the cap to a person. The example has no offer out, so this rule shows only in the tests |
| X8 | The firm can plan dates with the office | The season questions ask each office to set our hearings on the weekdays promised (Bench I); the answer goes in Offices Q |
| X9 | Offices in several time zones | Offices V and W; every time to a consultant is the office's local time, and each of the 7 texts in the example says so once ("Times are Larkmere office time (UTC-05:00)."). The hearing calendar is filled from the "Calendar file" tab, whose times are in UTC, so one calendar shows the right hour in every zone: the example's 17 events were imported into Apple Calendar without an error, and 14 were read at exactly the expected hour (the other 3 were not read; measured on a version of 21 Nov 2026 before the last rules were added; the 29 lines changed since then were not imported). The CSV is the second way and needs each calendar set to the office's zone before the import. No clock change is typed by hand: Offices AU says whether an office changes its clocks, and the sheet adds the daylight-time hour (Hearings CV). AU is an ASK for all ten offices (section 8, question 37). Since 21 Nov 2026 the line TELL in BE (8 rows in the example) and the notice to the office (Dockets N) carry the same sentence, and every script in section 2 that gives a consultant or an office a clock time says whose clock it is |
| X10 | Owen accepts "at the quoted rate" | No rate was quoted: the offer says "at your usual rate", his own rate on Bench H; a different rate goes to Alice |
| X11 | Two offices name a video "room" and send no link (Velloran, room C; Harthmere, room B then D) | A room letter is not a link. G1 stays open, BE prints VIDEO ROOM ONLY, NO LINK on the 3 coming rows (48 Linden Avenue, 120 and 138 Garden Street), the day-before text waits, and the coordinator sends the question about a video room (section 2) that day. The office's answer is chosen in Offices AL: a link comes as well, the room letter is all it sends, or the room is at the office and the consultant attends in person (the sheet then applies the in-person travel gap). Only the office knows: AL is an ASK for all six video offices |
| X12 | Offices and consultants confirm files without naming the files or the version | AX holds the current version on all 24 rows (2). A receipt closes its half of the files check only when it names the version or says "current": 5 of the 19 receipts linked in the example do. For the others BE prints the question: the consultant is asked to reply GOT IT 2, and the clerk gets the files email that names every file and is asked to answer it (section 2). From now on the firm's own files email names the version and asks for GOT IT with the number, so the question should become rare |
| X13 | Hearings start at 9:00 a.m., when the office opens | The call to the office 15 minutes before cannot be made. From two working days before, BE prints FIRST CASE AT OPENING, and on a working day before, while the office is open, the coordinator arranges the end-of-docket request and the alternate and asks whom to reach before opening ("The day of the hearing"; script in section 2). 2 coming hearings in the example start at opening; BE prints the line on 14 Willow Lane. On those days the daily list also reads OPENING NOT ARRANGED, even when every proof is linked, until the link to the arrangement is pasted in DB; DB7 is empty, so 14 Willow Lane reads TOP OF LIST CONFIRM TODAY OPENING NOT ARRANGED (measured). Whom to reach before opening is a season question to all ten offices (Offices AO) |
| X14 | The packet gives each consultant only an email address; Nora's and Priya's channels need a number | Nobody's number is invented. The season letter and the week-one calls ask each consultant for a mobile number and their agreement to be texted (Bench O and P; words in section 2). Bench Q flags every consultant with no number or no agreement, whatever their preferred channel, and names the steps that cannot reach them: all six in the example (Bench R is 0 for each; Measures B97: 6, target 0). Every step that texts or phones a consultant says at that step what to do with no number: the Monday offer, the Wednesday text, the 8:00 a.m. day-before message, the noon call, each step of the ladder, and the arrival watch. The sheet prints the same: "Ask next" writes (EMAIL ONLY) after each name, and BE prints HAS NO MOBILE NUMBER ON FILE with the email address. The associate settles Nora's channel with her and types it in C4 |
| X15 | The firm already has workflows for case records, document collection and notifications | All three are kept ("The workflows the firm already has"). The Record check tab is the weekly list of what to correct in the case system; three things move to intake; the homeowner notices go by the tool the firm uses today. Two questions for the firm: whether the case system can import a CSV, and which tool sends the notices and whether it can send from a list (section 8, questions 32 and 33) |
| X16 | Consultants state their own arrival time, 15 minutes before the first case (Owen, message 20; Leo, message 65); Fenwick Vale asks for 15 minutes (message 40) | One rule: the firm needs the consultant there 30 minutes before their first case, and the day-before text gives it as one clock time. The time a consultant gave is typed in CH; BE prints "SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY" on 4 rows, and the reply in section 2 goes that day. Fenwick Vale's 15 is typed in CI and changes nothing, because it asks for less. Whether it is Fenwick Vale's standing rule is a question to that office (section 8, question 34) |
| X17 | Maya was ill on June 6 and still holds 28 Willow Lane on Monday, June 10 | Her "not free" row carries the reason illness (Availability I6) and the day she said it (J6: June 5, message 41). Every hearing she holds from that day to 7 calendar days after it (Settings B18, our suggestion) is checked the same day: row 8 reads TOP OF LIST CONFIRM TODAY ILLNESS REPORTED, and BE8 prints MAYA VENN REPORTED ILL ON Wed 5 Jun: ASK TODAY WHETHER THEY WILL ATTEND, AND LINE UP A BACKUP BEFORE THE OFFICE'S NAMING DEADLINE (Fri 7 Jun at 4:00 PM). The coordinator asks her that day and asks the first name in "Ask next" to stand by (section 2). Her yes is linked in CT8 with its date in CU8; the line stays until then. The day-before ladder still runs as for anyone |
| X18 | Offices record a consultant before that consultant has said yes | The plan reverses the order: "Tell the office" names only consultants whose own YES is linked. A name the office has that the sheet does not is typed in BD, and BE prints it: on 48 Linden Avenue, THE OFFICE HAS Leo Arlen, WHO IS NOT ON THIS HEARING: NAME A CONSULTANT, THEN SEND THE OFFICE THE REPLACEMENT NOTICE |
| X19 | Shared calendars are incomplete (Owen's leaves out personal commitments; Leo shares free and busy only) | A free slot on a calendar is never availability and never a yes. Only the consultant's own YES fills G2, and only what a consultant says goes on the Availability tab. The firm's hearing calendar is built from the sheet, for viewing |
| X20 | Only Orimere says how long a hearing lasts (30 minutes, message 13) | Offices AP holds each office's own hearing length; Orimere's is 30. The other nine hold the season question "How long does one of our hearings usually run?", and until they answer the sheet uses the 30 minutes in Settings B11 as an assumption. The office's value, once typed, is used by the "not free" check, the travel check and the Calendar end time |
| X21 | The firm itself asks offices to move hearings to suit one consultant, before the bench is asked and without the homeowner (messages 8 and 15) | A written rule ("Dates, rooms and calendars"): the firm asks only after the bench was offered the hearing on its own date (the note of who was asked and said no is linked in CS), only with the homeowner's written yes to the new date (CR), before the office's last day for a change request (a number of working days in Offices AY; section 8, question 38), and never for a hearing a consultant has already accepted. The named coordinator decides and types their name and the date in DV; while a request is out or was made and DV is empty, BE prints NO NAMED PERSON DECIDED THIS DATE-CHANGE REQUEST. While a request is out without CR or CS, BE says so. Since 21 Nov 2026 the lines do not disappear when the office answers: its answer is chosen in DI (moved or refused), and a hearing that was moved keeps the two lines until CR and CS are linked. A request for a hearing a consultant had accepted (DH, or a request out on a hearing with a yes) prints THIS DATE-CHANGE REQUEST WAS MADE FOR A HEARING THAT [name] HAD ALREADY ACCEPTED. With a number in AY, BE prints the office's last day when it is near or past. In the example three requests were refused, and each keeps one line as a record that puts nothing on the daily list: ON RECORD: THE REQUEST THE OFFICE REFUSED WAS MADE WITHOUT THE BENCH BEING ASKED FIRST (CS) AND WITHOUT THE HOMEOWNER'S YES (CR); all four rows print the DV line, because messages 8 and 15 name no person. 9 Orchard Road (row 25) was moved, so BE25 prints the homeowner line, the bench line, the already-accepted line with Nora Pell (message 14) and THE HOMEOWNER TO CALL: Robin Wren (H003), and the daily list reads REVIEW CALL THE HOMEOWNER. A person calls that homeowner today (section 2). The sheet checks that a name is typed in DV, not whose name it is; who may decide is a question to Alice (section 8, question 43) |
| X22 | The 16 Birch Lane settlement: no acceptance from the homeowner, no offer on file, and nobody asks what it does to the hearing | BE18 prints SETTLEMENT, STILL MISSING with six parts: the settlement offer itself (DC), the date by which the offer must be accepted (DD), the homeowner's written acceptance (BG), the office's receipt of the signed settlement (O), the office's written word that the hearing is off its schedule (AF) and the date by which it must reach the office (BA). Until AF is linked the hearing stays staffed and on its docket. The coordinator calls the homeowner (BE18 names Taylor Finch, H005, and says one call covers this hearing and AX-110), asks the office in writing whether the signed settlement takes the hearing off and by when it must arrive, and sends the request for the offer in writing and its acceptance deadline to whoever made it (section 2, with its addressee; section 8, question 39). With a date in DD, BE prints THE OFFER MUST BE ACCEPTED BY that date. The sheet sees a settlement by the word in N, or by a link in DC or a date in DD; only the word in N makes the row count as owed, and BE says so |
| X23 | Juniper Reach asks for a homeowner statement that the current case files already hold | BE2 prints BEFORE IT IS COLLECTED AGAIN: CHECK WHETHER CASE FILES VERSION 2 ALREADY HOLD WHAT THE OFFICE ASKS FOR. A formula cannot read a file, so a person checks: version 2 of the 57 Clover Road files holds the statement (message 36), and the receipts (messages 55 and 56) name no version. The coordinator answers the office with version 2 and the clerk's receipt (L2), asks which version it holds and whether it wants the statement separately (section 2), and sends what it lacks before the BB time |
| X24 | Maya "cannot get there for 9 a.m." on June 10, and the arrival rule would ask her to be at the office at 9:00 a.m. for her 9:30 case (message 5) | The sheet reads her "not free" row (Availability row 7: 9:00 to 9:30) against the arrival time and does not print the time she refused. BE8 prints ARRIVAL NOT SETTLED: MAYA VENN SAID THEY ARE NOT FREE FROM 9:00 AM UNTIL 9:30 AM ... ASK THE TIME THEY CAN ARRIVE AND TYPE IT IN CH, OR ASK THE OFFICE TO HEAR THE CASE LATER; the daily list of row 8 ends ARRIVAL NOT SETTLED; and her day-before text (Dockets I4) says "Your arrival time is being settled: we will confirm it with you today" and gives no time. The coordinator asks her the same day (section 2) and types her time in CH8; the text then gives that time. A time later than her first case settles nothing, and the sheet says so. The packet holds no time from her, so CH8 is empty and the example shows the line (measured). The sheet sees only a limit that is typed on the Availability tab |
| X25 | The messages name four tools the firm keeps beside its three workflows: a planning sheet (message 3), a tracker with consultants' file links that still pointed to version 1 (message 33), a documents folder (message 36) and saved instructions for offices (message 22) | "The tools the firm already keeps" says for each what happens from the first Monday the sheet runs in every county: the planning sheet is replaced by the Hearings tab and archived read-only by the associate; the tracker's version 1 links are corrected once by the coordinator in desk week 3 and the tracker is then retired in favour of the files message; the documents folder stays the store and the sheet links into it; the saved office instructions are replaced by the Offices tab. Who does each is our proposal, for Alice to confirm on day 1. Nothing of this was run: the packet holds none of the four tools |
| X26 | Each pair of hearings belongs to one homeowner (12 homeowners), and the packet gives no contact detail for any of them | DE and DF hold the homeowner's name and customer number on all 24 rows, from the case records; DG holds the contact and is an amber ASK on every row. Where a line orders a call to the homeowner, BE adds THE HOMEOWNER TO CALL with the name and number, CONTACT NOT ON RECORD: ASK THE FIRM FOR IT AND TYPE IT IN DG, and ONE CALL COVERS THIS HEARING AND [case] where the same homeowner's other hearing also needs a call; the daily list adds CALL THE HOMEOWNER. 5 rows carry it: 16 and 42 Birch Lane (Taylor Finch; each names the other), 48 Linden Avenue (Riley Fern), 18 Maple Lane (Cameron Hale) and 9 Orchard Road (Robin Wren) (measured). The firm is asked for the contact details of every current client (section 8, question 41). A homeowner not reached by a deadline: the hearing stays staffed, nothing is withdrawn, settled or moved without the written yes, and Alice decides whether to ask for more time ("Homeowners"). The sheet prints no line for "not reached". Since the evening of 21 Nov the call to Riley Fern after the move of 48 Linden Avenue (row H6) is on the list, because the move line orders it |
| X27 | The packet gives each office only an email address, and much of the work with offices is by phone | Offices AZ holds each office's daytime telephone number and the clerk to ask for. It is an amber ASK for all ten offices; the question goes with the season questions (question 15 of that email; section 8, question 40; Day 1 count row 30). Wherever BE orders a call to an office it adds TO CALL THE [COUNTY] OFFICE with the number and clerk, or NUMBER NOT ON RECORD and the cell: 5 rows in the example, all NUMBER NOT ON RECORD (57 Clover Road, 14 and 28 Willow Lane, 37 and 52 Meadow Avenue; measured). The scripts and the day's page say "phone the office" in more places than BE does; there the coordinator reads the number in Offices AZ |
| X28 | Only Tesswick's saved instructions carry a date; the firm cannot tell how old the other nine are | Offices L holds the date each office last confirmed its route in writing: Tesswick 15 May 2030, the other nine empty. Offices N reads CONFIRM THE ROUTE IN WRITING on those nine rows (measured) and ASK AGAIN: OVER SIX MONTHS once a date in L is more than 180 days old. All ten offices are asked in the season questions to confirm the route in writing (question 16 of that email; section 8, question 26); the coordinator corrects F and G from the answer and types its date in L, and the deputy sends the question again each month to every office that N flags ("Telling the office who attends"). Since 21 Nov 2026 N holds its formula on rows 2 to 40, so a new office is flagged too |
| X29 | Nothing says where an in-person hearing is held: the ten county records give only an email address, ten of the 24 hearings are in person (Larkmere, Tesswick, Fenwick Vale, Juniper Reach), and Owen is asked to cover Fenwick Vale the next morning for cases he "has not seen" (message 42) | Offices BA holds each office's street address, hearing room and where to report; it is an amber ASK for the four offices that hear in person, and the question goes with the season questions (question 17 of that email; section 8, question 42; Day 1 count row 32). Hearings DZ copies it to every hearing in person, and the day-before text, the calendar entry and the line for whoever takes a hearing over (WHERE WHOEVER TAKES THIS HEARING OVER GOES) print it. Until the office answers they read ADDRESS NOT ON RECORD: Offices BA and the row (DZ on 10 rows; Dockets I, for example "at the Tesswick office (ADDRESS NOT ON RECORD: Offices BA5)"; 7 of the 17 calendar events), and from three working days before the hearing BE orders the question to the office that day (6 coming rows: 14, 28, 102 and 118 Willow Lane, 37 and 52 Meadow Avenue; measured). Owen's confirmation (section 2) carries the place, or says it follows by 9:00 a.m. and the office is asked when it opens. The sheet cannot know an address nobody has typed |
| X30 | Orimere recorded Nora for 9 Orchard Road while the hearing was on June 12 (message 16), then moved it to June 18 (message 17); no message says she is on its record for June 18. Harthmere, after its own move, wrote "Please update your representative" (message 47) | The rule: when an office moves a hearing, K is cleared with J and H, the old link is kept in a note in Y, the old date goes in DR, and the office is asked in writing the same day whether the name stands for the new date ("Dates, rooms and calendars"; script in section 2). The sheet guards it: on a moved hearing the link in K counts only while DQ holds the date in D (Hearings DY), so G3 reopens and BE prints THE LINK IN K DOES NOT COUNT FOR Tue 18 Jun: THE OFFICE'S RECORD IS FOR Wed 12 Jun. ASK THE ORIMERE OFFICE IN WRITING TODAY: IS Nora Pell STILL ON YOUR RECORD FOR Tue 18 Jun (row 25, now OPEN: 4 missing; measured). The answer is linked in K and June 18 typed in DQ. For 48 Linden Avenue (row 22) K is empty and DR22 holds June 6, so G3 stays open until the notice for the new consultant is confirmed. The limit: a move typed only over D, with nothing in DR, DI or DQ, is not seen |
| X31 | No message carries a date, a time or a recipient, yet several depend on one ("tomorrow", "today", "this week"); texts 41 and 18 name no case; the paper notice "dated May 30" (message 43) has no arrival date | Every dated duty gets a date on the sheet. A message that says today, tomorrow or this week: the day it arrived goes in Hearings DX and the real date in AA; words left in AA print COLUMN AA HOLDS WORDS, NOT A DATE in BE. The example reads message 24 as arriving on its own today, June 7, so AA16 and AA17 hold Monday, June 10, with a note that this is the example's reading. A paper notice: the day it arrived goes in DW, and at an office marked in Offices BB (Harthmere) BE asks for it (row 22; measured). A text that names no case is matched the same day to the sender's open offers and hearings; if it could mean more than one, the sender is asked the same day and nothing is filed ("A reply the rule does not file"). Two limits: no formula works out a deadline from DX or DW (a person does and types it in AA or AW), and the day a past message arrived cannot be read from the packet |
| X32 | Every county record says consultants may ask for a change of hearing date, so a consultant could ask an office to move a hearing without the firm. Leo already moved the calendar events himself (messages 9 and 10) | Date requests go through the firm, which asks the homeowner and the bench first. Hearings EB records who asked for a move: the firm, the homeowner, or the consultant by name, with the message number. When a consultant asked on their own, BE prints [name] HAS ASKED FOR THE DATE CHANGE WITHOUT THE FIRM: the coordinator asks them the same day why and tells them the rule, and the move is handled as any office move (old date in DR, the office's record for the new date in K and DQ, the homeowner's new date in DS). A move with nothing in EB prints WHO ASKED FOR THIS MOVE IS NOT ON RECORD. In the example EB holds "the firm" on 4 rows (messages 8 and 15) and "the homeowner" on 48 Linden Avenue (message 47); no consultant asked an office directly, so the consultant line prints on no row (measured) |
| X33 | Priya and Eli are left out of both Asterland and both Belloria counties, which points to a rule by state, not a county preference. Owen signed a Brindlefen withdrawal statement (message 28). Nothing says who may appear or sign in each state | Bench S holds the states where each consultant may appear and sign, from counsel's answer (Offices R) and the consultant's own licence or registration; it is ASK for all six (Day 1 count row 33). Once S holds an answer, "Who can take it" and "Ask next" stop offering the consultant hearings in other states, and a consultant already named there gets MAY NOT APPEAR OR SIGN FOR A HOMEOWNER IN [state], with the step: offer the hearing down "Ask next" today, clear H and J, send the office the replacement notice. While S is ASK, the offer is not blocked: "Ask next" marks each name (STATES: ASK) and ends with a warning, and on a row with something to sign BE asks the question before anything more is signed. In the example that question prints on 4 rows, among them Owen's statement at Brindlefen (measured) |
| X34 | Case files stay open to a consultant after they leave a hearing. File links are kept per consultant (message 33); Maya reviewed the Fenwick Vale packets (message 38) and was then replaced (messages 41 and 42); Leo and Nora are taken off hearings. The files hold the homeowner's statement | Hearings EC holds the date the earlier consultant's access was removed, or "files were never sent". When BW shows files went to someone no longer on the row, BE prints CASE FILES WENT TO [name] (BW), WHO IS NO LONGER ON THIS HEARING: REMOVE THEIR ACCESS TO THE FOLDER LINKS SENT FOR IT TODAY (OR ASK THEM IN WRITING TO DELETE THE FILES), THEN TYPE THE DATE IN EC. A name in BC (declined or taken off) prints the same step, or asks for "files were never sent". No message says access was removed, so EC is empty and the line prints on 7 rows: Maya on the two Brook Road rows and 14 Willow Lane, Leo on 63 and 81 Garden Street and 48 Linden Avenue, Nora on 24 Orchard Road (measured). The season letter tells consultants that links are removed when they leave a hearing |

**Audit status.** The audit of 125 items (A1 to X31 and the rest) checked them against the sheet
and the documents: 109 Yes, 8 pending an answer from the firm, 8 Partly, 0 No. X32 to
X34 were found after that audit; they are handled in the sheet (Part L) and have not been
audited, and the independent test of Part L has not run.
