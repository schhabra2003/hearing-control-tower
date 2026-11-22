# The first-priority kit: a named, confirmed consultant on every hearing

## A normal day on one page

*For the coordinator. Every time is the office's local time (Offices V).*

**What you type on a normal day.** The Hearings tab has 135 columns. 73 are typed and the rest are
formulas that print what to do. On the 24 example hearings, 51 typed columns hold something on at
least one row and 18 on 12 rows or more (measured on the installed sheet). Most of those 18 are
typed once, when a hearing is added. Only a handful change from day to day.

| When | What you type | Where |
|---|---|---|
| A notice arrives | Case, property, county, date, time, format, "yes", the notice link, the case-file version, the homeowner's name, number and contact | Hearings A to G, I, AX, DE, DF, DG |
| An offer goes out | The consultant's name | BY (clear it at their NO; a NO also goes in BC) |
| A consultant says YES | Their name, and the link to their own YES | H and J |
| The office records our name | The link to its written reply, and the name it gives | K and BD (with the hearing date it was about in DQ) |
| Files are received | The link to each receipt, the version it names, who sent the GOT IT | L (clerk) with AZ; M (consultant) with AY and BW |
| The day before | The link to the consultant's YES, and their name | Q and BX |
| On the day | Arrival or join time; result; error ("none" if none) | R; S and T |
| Anything left open | What, who, by when (a date) | Y, Z, AA |

**The day.**

| Time | Do |
|---|---|
| 8:00 a.m. | Send the day-before text (Dockets I) for each docket on the next working day. `DO NOT SEND YET` means a link is missing: phone the office |
| 9:00 a.m. | **The morning pass.** Accept or reject each proposal on Reader suggestions (column G). Approve or reject any office change waiting in Offices N. Make the calls that are due |
| Noon | Phone every consultant with no day-before YES (Q) for the next working day |
| 2:00 p.m. | **The daily list.** Filter Hearings X for anything not empty, nearest hearing first. Read BE on each row and do what it says. Every flagged row gets Y, Z and AA by 2:30 p.m. Then refill the hearing calendar |
| 4:00 p.m. | Nobody yet for tomorrow: the office's alternate (Offices T). Today's results: S and T per hearing |
| Friday | The deputy: Record check, the Friday sample, the weekly log |

**Everything else is printed on the sheet when it is needed.** Column BE names the step and the
cell. You do not need to learn the rest of this document before the first day. When BE prints a
line you have not seen, read the rule under "The rules, by what happens".

**Three rules that never bend.**
1. A name goes in H only with that consultant's own YES linked in J. A maybe is not a yes.
2. A phone call never closes a check. Note it in Y and ask for it in writing.
3. Only the office's written notice moves a date. A calendar edit moves nothing.

**The simpler view.** Hearing Desk, the web app (`app/dist/index.html`, one file, no install, no
network), shows the same plan as a coordinator would use it: Today holds the 9:00 a.m. pass and the
2:00 p.m. review in order, and each hearing shows its five checks and its next step. An optional
live mode reads pasted messages with the two AI readers on the firm's own OpenAI key, kept in a
local server (`app/README.md`); the readers only suggest, and a person accepts each row. The sheet has
no switch to turn off a family of lines. The example covers every situation in the packet on
purpose, because this is a take-home; a firm that never meets a situation never sees its line.

---

## What this kit is

The first priority as something the firm can run: a sheet (`gate-sheet.xlsx`), the mailbox, a text
line, a phone, and two small programs that send nothing (the reply rule and the AI readers). The
Monday page is for the coordinator; "For Alice" holds the plan, scripts, decisions, measures, costs
and open questions. Reasons, arithmetic, the full scripts and the walk-through of every example
message are in `kit-appendix.md`; nobody needs it to run the kit.

Labels: **measured** = counted by running the sheet or the prototype on the example packet, which
is fictional. **sourced** = a public document says so. **estimate** = my assumption, from
`node cli/economics.js` in the `prototype` folder. **simulated** = from the prototype's simulated
seasons. **to set** = a number only the firm can choose.

**What was tested.** The sheet was built and checked in LibreOffice 24.2. With the newest rules
installed, the sheet check prints 180 pass lines and no FAIL; the prototype checks pass 216 of 216,
the office rule 91 of 91 and the reply rule 39 of 39 (measured). The independent test of the newest
rules (Part L: X32 to X34) did not run. Excel for Mac and Google Sheets were run on an earlier
build; Excel for Windows and row actions in either program were not tested. Details in `CHECKS.md`
and in "Before the season's first notice", step 5.

## The plan on one screen

The firm sells one thing: a prepared person in the room. **A hearing costs about $104, and $90 of
it is that person** (estimate). In the example week, as the sheet stands on Friday, June 7, **4 of
the 11 hearings inside three working days have no consultant's yes that counts** (14 Willow Lane,
63 and 81 Garden Street, 24 Orchard Road; measured, Measures B3), yet all 18 hearings of 10 to 14
June fit on the seven consultant-days the six consultants already give. So the first gap is how
hearings are offered and confirmed. The second is days: the peak week of a 300-hearing year has 23
hearings and needs about ten consultant-days (estimate).

**The one number that reverses it.** I plan on about 300 hearings a year and a hearing that pays.
At the public average saving and a 25% share, a hearing brings in about $194 if it ends in a
reduction and about $97 if half do (estimates). Day 1 tests this in under an hour (Day 1 count, row
4). **If the fee is under $104, recruiting stops, the bench stays at six, and the booking rule
(section 4) becomes the first priority.**

- **First: a named, confirmed consultant on every hearing, three working days ahead.** Every docket
  (one office, one day) offered whole, with numbered replies; three replies, an arrival text and the
  five checks on every hearing in all ten counties; season letters with the six, four anchor
  consultants, and an alternate on every office's record; every office asked to set our hearings on
  the weekdays our consultants promised. Target: hearings inside three working days with no yes, 4
  of 11 to none (measured today).
- **Next: cheaper days.** Full video days of six or more go first to consultants who choose a $400
  day rate: $90 a hearing to $67 on those days (estimate).
- **Later: coordination that does not grow with hearings.** A live connection of the text line and
  mailbox (about three days of technical help; not built), and a control tower only if it pays in
  cash (section 4).

**Why this order.** An empty room loses the client's appeal and the firm's fee. The person is 86%
of the cost, so days come before software, and the case for season one rests on missed hearings
prevented, not on coordinator minutes.

**What it is worth** (estimates; in brackets, at a $97 fee).

| Hearings a year | 300 (the plan) | 1,000 | 5,000 |
|---|---|---|---|
| Fee income at $194 | $58,000 ($29,000) | $194,000 ($97,000) | $968,000 ($484,000) |
| Season one cost, with set-up | $31,000 + $12,000 | $102,000 + $23,000 | $552,000 |
| Season one left | Plus $15,000 (minus $14,000) | Plus $68,000 (minus $28,000) | Plus $416,000 (minus $68,000) |
| A normal year after: cost per hearing | $103 | $95 | $98 |
| Bench, staffing alone, with a fifth spare | 6 to 10 | 20 to 33 | 95 to 157 |

At $97 the firm loses money in season one at every volume, which is why the fee test comes first.
**The bench grows by a rule: two to three signed names for every extra 100 hearings in Alice's
forecast, signed before that season.** I do not claim a return for the confirmations: on my model
they cost a little more than the no-shows they prevent (83 cents a hearing; estimate). I recommend
them as a duty to clients who were promised a representative, and as the condition for whole
dockets.

**Before anything else, three phone calls.** In week 1 the associate rings three of the six: which
days would you give us, would you take a whole docket, what would make you answer a day-before
text, would you take a full video day for $400, and who else should we call.

---

# The Monday page

*For the coordinator. Each step says who does it and by when, and names the tab and column. The
main texts are in section 2; every other script it names is in the appendix, section 16. Every time is the office's local time (Offices V; all ten example offices
are UTC-05:00), and every text the sheet writes says so once.*

## The rule: when a hearing is complete

| Check | What | Cells |
|---|---|---|
| G1 | The county's schedule in writing, with the link or call-in number for a video or telephone hearing (a room letter such as "room C" is not a link) | I, AV |
| G2 | A named consultant's own YES for that slot | H, J |
| G3 | The county's written record of that name for that case, for the date the hearing now has | K, BD, DQ |
| G4 | The case files received by the clerk (every file named) and by the consultant, each for the current version | L, M; AX current, AZ clerk's version, AY consultant's version, BW who sent the GOT IT |
| G5 | Anything owed processed, with the homeowner's written yes first for a settlement or withdrawal | O, BG |
| After | The day-before YES; ARRIVED or IN by the start; the result, the error entry and, where the board decides later, its written decision | Q with BX; R; S, T, BQ |

Each is a link to the owner's own message, or a time. Nobody types "confirmed". A GOT IT and a
day-before YES count only for the consultant named beside them, so a replacement inherits neither.

**DONE means done.** A past hearing with a result and no arrival time reads `RESULT IN: ARRIVAL NOT
RECORDED` and stays on the daily list as `ARRIVAL DUE`. The day-before YES cannot be had after the
hearing, so DONE does not wait for it; Measures row 96 counts hearings held without one.

## What Status says (Hearings W) and the daily list (X)

**Status, before the hearing:** `OPEN: n missing`, `READY` (every proof in), `CONFIRMED` (READY and
the day-before YES of the consultant on the row), then `ARRIVED` or `IN`. **After it:** `RESULT DUE`,
`MISSED`, `RESULT NOT CLEAR`, `OWED`, `NEW DATE DUE`, `ERROR DUE`, `DECISION DUE`, `RESULT IN:
ARRIVAL NOT RECORDED`, `DONE: n proofs missing`, `DONE`. Also `NOT HELD` (cancelled, the office's
written proof in AF), `CANCEL PROOF DUE` and `NO DATE`. A hearing is complete only at `DONE`.

**The daily list** adds `TOP OF LIST` (a proof missing within three working days, an office that has
asked twice, something owed within a working day, or a naming deadline three working days away),
`REVIEW` (a proof missing within 14 days), `CONFIRM TODAY`, and words that name what is due (`TELL
DUE`, `PROOFS DUE`, `ARRIVAL DUE` and others); BE says what each one means on the row.

Three words put a row at the top: `NOTICE BLOCKED` (an office changed how it works and no person
has approved it), `OFFICE CANNOT FIND OUR NOTICE` and `ILLNESS REPORTED`. Four more name a step for
the same day on a hearing still to come: `ARRIVAL NOT SETTLED`, `FALLBACK DUE`, `OPENING NOT
ARRANGED` and `CALL THE HOMEOWNER`. Each is explained under its rule below. The lines of Hearings ED
(who asked for a date change, who may appear and sign by state, file access after a consultant
leaves) print in BE and put nothing on the daily list.

**The example on Friday, June 7** (measured): 17 OPEN, 2 READY (102 and 118 Willow Lane), 3 RESULT
DUE, 1 OWED, 1 ERROR DUE; none CONFIRMED. No row of the daily list is empty. Measures rows 95 to 98
read 2 hearings with a result and no arrival time, 2 held with no day-before YES, 6 consultants with
no mobile number, and 2 coming hearings whose notice is blocked.

**A consultant with no mobile number.** All six example consultants are email only, because the
packet gives email addresses only (Bench R; measured). "Ask next" writes `(EMAIL ONLY)` or `(CALL OR
EMAIL, NO TEXT)` after a name; then every text goes by email and a call is replaced by an email.

**Who does what.** The named coordinator keeps the sheet and makes every call and send unless a
step names someone else. The deputy does the Friday checks. The evening reader is named in Settings
B9; until Alice names one, B9 reads ASK ALICE and the coordinator keeps the text line on until 9:00
p.m. on working days, checks it at 7:00 a.m., and at 9:00 a.m. and 6:00 p.m. at weekends. Alice
decides price, terms and anything about a client's case. Counsel answers who may appear and sign.
Software never writes to a homeowner or an office.

## Before the season's first notice (desk weeks 2 and 3, the associate and the coordinator)

1. **Settings.** B2 `=TODAY()`; B15 `=MOD(NOW(),1)`, the clock. B9 the evening reader, B10 the
   firm's contact email. B16 and B17, both 30 minutes: how early the consultant must be at the
   office, and how soon after opening a hearing counts as "at opening".
2. **Bench**, one row per consultant: contact (B), channel (C), counties allowed (D), most hearings a
   day (E), weekdays promised (I), preferences (K, L), signed letter (M), mobile number (O), the link
   to their agreement to be texted (P), and **the states where they may appear and sign (S)**, from
   counsel's answer and their own licence or registration. O, P and S are amber ASK cells for all
   six. Q flags anyone who cannot be texted or called. No number is invented. "Ask next" never offers
   anyone a county outside D, more than E in a day or, once S is answered, a state not in S.
3. **Offices.** The primary and second (X, Y). Then one email to each office with every amber ASK on
   its row (section 2, "The season questions"); each answer replaces its cell the day it arrives. No
   answer in five working days: the second request. Counsel answers R; Alice answers AA. Offices N
   reads `CONFIRM THE ROUTE IN WRITING` until L holds the date of the office's written confirmation,
   and `ASK AGAIN: OVER SIX MONTHS` after 180 days. A new office typed on row 12 or below gets every
   formula and its question cells by itself.
4. **Calendar.** One shared hearing calendar that holds only imported hearings; consultants are
   viewers. Fill it from the "Calendar file" tab ("Dates, rooms and calendars").
5. **The program, and a trial before the first notice.** The sheet needs Excel 2019 or later,
   Microsoft 365, or Google Sheets. As installed it has 18 tabs and 159,013 formulas; the Hearings
   tab has 135 columns (A to EE): 73 typed, 61 formulas, and EE kept empty (measured). It was checked
   in LibreOffice 24.2. Excel for Mac (20 Nov 2026) and Google Sheets (21 Nov 2026) each opened an
   earlier build with every formula kept and no error value (measured); the columns added since
   (Hearings DA to EE, Offices AY to BB, Bench S and T) were run in LibreOffice only. Not tested:
   the full sheet in Google Sheets, Excel for Windows, and cut, paste, insert, delete and sort in
   Excel or Google Sheets. **So in desk week 2 the associate opens the sheet in the firm's own
   program** and checks: no error value; the 24 example rows read 17 OPEN, 2 READY, 3 RESULT DUE, 1
   OWED, 1 ERROR DUE; a new hearing typed in the first free row appears on the Dockets tab. If any
   check fails, the sheet is kept as one file opened in LibreOffice 24.2, by one person at a time.

## When a hearing notice arrives (the coordinator, the same day)

1. **Copy a blank row whole**, so its formulas come with it, and keep the tab sorted by date, office,
   time. Fill A to F from the notice, the time typed as a time in the office's local time, and G
   "yes". Leave H empty until a consultant's own YES. Type the homeowner's name in DE, the customer
   number in DF and their telephone and email in DG. **Never cut, paste or drag a row or a cell,
   never insert a row, never use Insert or Delete cells**: copy, paste, then empty the old cell with
   the Delete key. Dockets A1 names a row that was cut, dragged or shifted, or lost a formula of W,
   AR or EA. Type nothing in ED or EE. Dates in D, DQ, DR, DW and DX are typed as dates; a date typed
   as text reads as no date, and A1 names it.
2. **Link the notice in I** (G1). A paper notice is scanned and linked, and the day it reached the
   firm goes in DW; at an office marked "yes" in Offices BB, BE asks for DW until it is typed. A
   person works out any deadline that counts from the arrival and types it in AW.
3. **The room, video link or call-in number in AV. A room letter is not a link.** For a video or
   telephone hearing G1 closes only with a link or a number of seven or more digits. BE prints `NO
   VIDEO LINK YET` or `VIDEO ROOM ONLY, NO LINK`, and the day-before text reads `DO NOT SEND YET`. Ask
   the office the same day (section 2); its answer is chosen in Offices AL. **In person**, Offices BA
   holds the street address, room and where to report, and Hearings DZ copies it. While BA is empty
   they read `ADDRESS NOT ON RECORD`, and from three working days before, BE orders the question. The
   packet gives no address, so this prints on 10 rows (measured).
4. **An arrival instruction** from the office ("arrive 15 minutes before") goes in CI as minutes, on
   every hearing of the docket.
5. **The case-file version** in AX (1 for a new file). BM then gives the send-by time, 48 hours ahead
   in the county's working days.
6. **The homeowner notice.** Once it has gone, type the name and date it gives in BK and BL. Until
   then a hearing with a yes prints `NO HOMEOWNER NOTICE ON RECORD`.
7. **A deadline** in the office's message goes in AW. A standing rule (so many working days before
   every hearing) goes once in Offices AF, and the sheet works out each deadline. Every further
   reminder from the office adds 1 to BH.
8. **A staffing notice already in the case folder:** only `SEND IT` on Notices on file goes.
9. **A hearing at opening** (start less than 30 minutes after the office opens, Offices AM): from two
   working days before, BE prints `FIRST CASE AT OPENING` and the day's steps move a working day
   earlier ("The day of the hearing").
10. **A hearing by written statement** (F) has nobody in the room: no offer, no day-before text, no
    arrival, not on the calendar. It is READY when the notice, the office's record of the name and
    the clerk's receipt are linked; the statement deadline goes in AW.

## Monday (the coordinator, by noon)

Open the Dockets tab: one row per office per day. Column G says whom to offer the open numbers to
first; column O, "Ask next", ranks everyone else by the codes on "Who can take it": 1 already at
this office that day, 2 said they are free then, 3 primary or second here or promised this weekday,
4 preference fits, 5 bench, 6 working elsewhere with the travel gap met. It leaves out anyone who
declined (BC), is not free (Availability), is full that day (Bench E), may not work in the county
(Bench D), may not appear in the office's state (Bench S, once answered) or cannot travel in time.
**While Bench S is a question,** "Ask next" marks each name `(STATES: ASK)` and ends with a warning:
the offer may go, and counsel's answer is chased. In the example every name carries it, for example
Dockets O4: "Leo Arlen (EMAIL ONLY) (STATES: ASK) ... THE OFFER MAY GO, AND THE ANSWER IS CHASED"
(measured).

Send column H to the first name by their channel (Bench C); a call is followed by the same words in
writing. `(EMAIL ONLY)`: email only. `(CALL OR EMAIL, NO TEXT)`: phone, then email. The first YES
wins. A partial yes is a yes for those numbers; the rest go to the next name the same day. **When
the offer goes, type the name in BY on each hearing offered, and clear it at their NO.** An offer
that is out counts in that consultant's day, so two offers cannot put one person over their cap or
into two hearings too close in time. If it happens anyway, BE prints `OVER THE DAILY CAP`; Measures
row 24 counts such days and must read 0.

## Wednesday (the coordinator, by 4:00 p.m.)

The week-ahead text to each consultant (filter Hearings H). No YES ALL by Thursday noon: phone, or
for email only, a second email marked "answer needed today". A docket handed back on Thursday is
offered down "Ask next" the same day. The Wednesday text waits for a docket whose consultant the
office does not have yet: send the office the notice first.

## Every day, on the office's clock

| Time | Who | Do |
|---|---|---|
| 8:00 a.m. | Coordinator | The day-before text (Dockets I) for each docket on the next working day. No number on file: the same words by email, adding "Please answer this email with YES", "What is your mobile number for texts?" and "Please email ARRIVED when you are at the office" (IN for video). `DO NOT SEND YET`: phone the office for the link now. Then the arrival watch for today |
| 9:00 a.m. | Coordinator | Accept or reject each AI reader proposal (Reader suggestions G). With a GOT IT or day-before YES, type the sender's name in BW or BX. "Names no version: a person asks for it" is not a clean close: paste the link, leave AY or AZ empty, send the question BE prints. **Approve or reject every waiting office change** (Offices N reads `APPROVE OR REJECT THE CHANGE TODAY`). Make the calls that are due. **A consultant's question** is answered the same day: who asked and the answer in BN, send it, link their OK in BO. A message marked REPEAT needs no typing |
| Noon | Coordinator | Phone every consultant with no day-before YES (Q) for the next working day. No number: a second email ("We need your YES by 2:00 p.m. today") |
| 2:00 p.m. | Coordinator | The daily list (Hearings X), nearest first; read BE on each row. Every flagged row gets Y, Z and AA by 2:30 p.m. Step 2 of the ladder. Refill the hearing calendar from the "Calendar file" tab |
| 4:00 p.m. | Coordinator | Step 3 of the ladder. Today's results: the result text to each consultant; S and T per hearing |
| After 4:00 p.m., nights, weekends | Evening reader (Settings B9) | Reads the text line and the shared mailbox at the times in B9. A dropout: one Availability row, then step 4 |
| Any hour | Whoever reads it, then the coordinator | **A consultant reports ill.** The Availability row with "illness" in column I and the day it was said in J. Every hearing they hold in the next 7 days (Settings B18) reads `ILLNESS REPORTED`: ask them today whether they will attend (section 2), ask the first name in "Ask next" to stand by, and link their yes in CT with its date in CU |
| Friday | The deputy | The Friday checks ("Results and the record") |

## When a consultant drops out or goes silent

The ladder on the How to use tab (A32), step by step.

| When | Who | Do |
|---|---|---|
| As soon as it is read | Whoever reads it | **One row on Availability**: date, name, From and To (empty for the whole day; the declined hearing's start and end for a partial decline), the words, the link, "not free". The hearing turns open and red. Clear the leaving consultant's H, J, M with AY and BW, Q with BX, and CH. Add the name to BC. **If files went to them, remove their access to the folder links that day, or ask them in writing to delete the files, and type the date in EC** ("Case files (G4)") |
| Inside three working days, before 4:00 p.m. | Coordinator | Offer the open hearings to the first name in "Ask next". Dockets H asks for an answer within one hour for the next working day, two hours otherwise. The first YES wins |
| Step 1: noon, the working day before | Coordinator | No day-before YES: phone (no number: a second email) |
| Step 2: 2:00 p.m. | Coordinator | Still no YES, or a NO: one Availability row, "no day-before YES by 2 p.m."; a silent consultant is treated as out. Offer it down "Ask next". If the silent consultant answers YES before anyone else, delete that row and paste back what was cleared |
| Step 3: 4:00 p.m. | Coordinator | Still nobody: the office's alternate on record (Offices T) takes the docket and gets the files tonight. No alternate yet: phone down "Ask next" until one says yes |
| Step 4: after 4:00 p.m., overnight, weekend | Evening reader | Text everyone in "Ask next" at once (email for names without a number). The first YES wins. Email the office and its alternate tonight; phone the office when it opens |
| A volunteer | Evening reader or coordinator | One approval: "Ask next" lists the volunteer for that docket. Then the confirmation with the offer and the files (section 2) |
| A new name says YES | Coordinator (evening reader at night) | Name in H, link in J. Files that day, then their own GOT IT in M with AY and BW. A replacement inherits nothing: until the old cells are cleared BE says whose proof it is. Tell the office the same day by its replacement route; BD keeps the old name until it answers. The old notice marked VOID. A corrected homeowner notice |

## The day of the hearing (the coordinator)

**One rule for arrival.** The firm needs the consultant at the office 30 minutes before their first
case (Settings B16). The day-before text gives that once, as a clock time. Where the office asks for
more minutes (CI), the earlier time is printed; where it asks for fewer, the 30 minutes stand. A
consultant who names a later time gets a reply the same day: type their time in CH, and BE prints
`... SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY` (4 rows in the example: Leo,
message 65; Owen, message 20; measured). If they cannot come earlier, the coordinator decides that
day and writes it in Y.

**Not free at the arrival time.** When a "not free" row overlaps the time between the arrival time
and the first case, BE prints `ARRIVAL NOT SETTLED`, the day-before text prints no time, and the
coordinator asks the consultant the same day for the time they can arrive (CH), or asks the office
to hear the case later. In the example: 28 Willow Lane, Maya, message 5 (measured). The sheet reads
only the Availability tab.

**In person.** From 45 minutes before the first hearing, on the phone. No ARRIVED by the clock time:
call the consultant. 15 minutes before the first case: call the office and ask for our cases at the
end of the docket. No number on file: call the office at once. Type the arrival time in R.

**A first case at opening.** The office is closed before the start, so that call cannot be made. On
a working day before, while the office is open: phone and email the request to hear our cases at the
end of the docket if our representative is not in the room (section 2); confirm the alternate
(Offices T) or that the evidence is on file; ask whom to reach before opening and type it in Offices
AO; tell the consultant the clock time again. Link the arrangement in DB, and `OPENING NOT ARRANGED`
leaves the list. In the example: 14 Willow Lane, Monday, June 10, 9:00 a.m. (measured).

**Video or telephone.** The consultant texts IN ten minutes before. No IN five minutes before: the
alternate joins; with no alternate, call the office.

**A hearing missed** ("nobody appeared") reads `MISSED`. A person phones the homeowner first. The
good-cause letter goes that day by the office's own way back (Offices P); link it in N, the office's
time limit in BA, and its answer in O.

**Held with a proof missing** reads `DONE: n proofs missing`; BE lists each. **Held with no arrival
time** reads `RESULT IN: ARRIVAL NOT RECORDED`: ask the consultant and type the time in R (the two
Clover Road rows in the example; measured).

## How replies arrive

Consultants answer by text or by email to the shared mailbox; either way the yes has a link.

**The reply rule** (`node cli/replies.js`; fixed code, no model) files YES ALL, YES 1 3 or NO to an
offer, the Wednesday YES ALL, the day-before YES, ARRIVED, IN, GOT IT with the current version, and
OK to a change notice. Anything else goes to a person with the reason, as does a YES that would
break the daily cap. On 39 example replies it decides 39 of 39 as a coordinator would, filing 17
(measured); the rule's author wrote those replies, so this shows what it does, not how consultants
will answer.

**The two AI readers** (OpenAI models) read office mail and propose links for the proof cells,
quoting the words they rely on. A person accepts each at 9:00 a.m. Real messages go to them only
after Alice's and counsel's written yes (Day 1 count row 18). On 100 unseen everyday messages,
written and labelled by AI for the test, 72 of 79 agreed and checked readings were right (91.1%;
measured on recorded answers). About 1 wrong in 11 is too many for a cell that decides whether a
hearing is covered, **so nothing files itself this season**. Alice may switch one kind on at the
live-week-4 review only after four clean Friday samples of that kind (Reader suggestions A168).

**New mail onto the sheet** is a hand step: save the day's messages as one JSON file, run `node
cli/sheet.js --paste <file>`, and paste the output under the last row of Reader suggestions. Without
the firm's key in OPENAI_API_KEY the command says NO MODEL WAS CALLED and hands each unread message
to a person. The path with a real key ran once, on 21 Nov 2026, on 4 messages for $0.09
(measured): a smoke test, not an accuracy measure. On 22 Nov 2026 a live run on every labelled set made 550 requests, 0 failed, for $1.16 (measured). It reads a file, not a mailbox.

**Who keeps the sheet.** One named coordinator and one deputy; the associate keeps it for the first
live week. The case record stays, checked every Friday.

---

## The rules, by what happens

Each rule says what the coordinator does and what the sheet prints. The walk-through of each rule
against the example messages, row by row, is in `kit-appendix.md`, section 16 ("Kit reference").

### A reply the rule does not file

- A maybe, "usually free" or a volunteer is not a yes. A name in H without a YES prints `NAME WITHOUT
  A YES` and counts as nobody on Measures B3.
- A condition or another date ("June 13 works for me") is a NO for the official slot: the name in
  BC, the other date on Availability as "free". A conditional yes becomes a yes only when the
  county's notice meets the condition and the consultant's own later message confirms it; link that
  message in J.
- Availability said in passing goes on the Availability tab the same day. "Ask next" reads it.
- **A text that names no case** is matched the same day to the sender's open offers (BY) and
  hearings (H). Exactly one fit: file it. More than one: file nothing, ask the sender which hearing,
  note it in Y.
- A rate named in a reply changes nothing. Offers say "at your usual rate" (Settings B7, Bench H). A
  different rate goes to Alice before the YES counts.
- **A repeat changes nothing.** A later message replaces a link only when it states something the
  cell needs that the first did not. A changed date, time, room or name is never a repeat. The tools
  mark repeats "REPEAT of message n: no cell changes" (18 in the example; measured).

### Telling the office who attends (G3)

- "Tell the office" (Dockets N) writes the notice from YES replies only, with every field of the
  office's form (Offices AB), our contact (Settings B10), the alternate once accepted (Offices T),
  the replacement route and the deadline. It goes the day the YES arrives. An older draft goes only
  if Notices on file says `SEND IT`.
- G3 closes only on the office's written reply naming our consultant for that case, for the date the
  hearing now has: type that date in DQ and the name it gives in BD. If BD differs from H, BE prints
  `THE OFFICE HAS X, NOT Y` and the replacement notice goes.
- Not a record: an office that "can record" someone, a voicemail, our own file marked "recorded", a
  form sent or lost, a confirmation by phone.
- **Deadlines.** The office's deadline goes in AW; a standing rule in Offices AF. Before it, send the
  notice for every row with a YES; for a row with nobody, offer it and tell the office when the name
  will follow. A deadline with an hour reads `OFFICE DEADLINE PASSED` once the hour has gone.
- **The chaser names the office's own route** (Offices F; for a replacement, G), so nobody emails an
  office that asked for a call.
- **The office asks again:** add 1 to BH. From 2, `TOP OF LIST` and `THE OFFICE HAS ASKED n TIMES:
  PHONE IT TODAY`.
- **The office has not answered us:** the second request at the next working day's 2:00 p.m. review,
  a phone call the morning after; inside three working days, phone at once. Log it in Y, Z, AA.
- **Calling an office.** Offices AZ holds its daytime number and the clerk. Wherever BE orders a call
  it adds the number, or `NUMBER NOT ON RECORD` and the cell (5 rows in the example; measured).
- **An office changes how it works: its notices are blocked until a person approves.**
  1. Whoever hears it writes it in Offices M (who said it, the link) and the date in AT, and asks
     the office to put it in writing.
  2. From that moment Offices N reads `APPROVE OR REJECT THE CHANGE TODAY`, every notice to that
     office prints `NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY` and no
     route, and its hearings read `NOTICE BLOCKED` (Measures B98).
  3. The same day the named coordinator decides. To approve: their name in AQ, the date in AR (on or
     after AT), and in AS whether the office still accepts the old route. To reject: clear M, AS and
     AT and write the reason in K.
  4. After approval the new route is printed; where AS says "no", the old route is printed nowhere.
  5. A call the new route needs is a task in Y, Z, AA. A call never closes a check.
  6. When the office confirms in writing: the date in L, M moved into F and G, the approval cells
     cleared.

  In the example Tesswick's change (message 22) is not approved, so 37 and 52 Meadow Avenue read
  `NOTICE BLOCKED` (measured). The approval cells are not protected.
- **The office cannot find our notice.** Link its message in CP and our sent notice (or its date) in
  CQ. BE says the notice was sent but not found, and the row reads `OFFICE CANNOT FIND OUR NOTICE`.
  Resend by the office's route, or by the approved new route; while a change waits, only after
  approval. The call follows as a task.
- **A date, not words, in AA.** When a message says today or tomorrow, type the day it arrived in DX
  and the real date in AA. Words in AA print `COLUMN AA HOLDS WORDS, NOT A DATE`.

### Video and telephone hearings

G1 counts only with a link or a number of seven or more digits in AV. A room letter leaves G1 open
and prints `VIDEO ROOM ONLY, NO LINK`. Ask the office, the day the row is created, for the link, how
it sends links (Offices AE) and what a room means (Offices AL: a link is sent as well; the room
letter is all it sends, so join by its standing link; or a room at the office, so attend in person).
The day-before text waits. Measures B21 counts coming video hearings with no link: 13 on June 7
(measured).

### Dates, rooms and calendars

- **Only the office's written notice moves a date.** A phone report is held: the old date stays, the
  notice is asked for, and the consultant gets the warning text that day.
- **When the notice arrives**, change D and E, type the old date in DR, replace the I link, clear J
  and H (a yes belongs to a slot) and offer the new slot. **Clear K too, and keep the old link in Y**:
  a record for one date does not count for another. On a moved hearing the link in K counts only
  while DQ holds the date in D; otherwise BE asks the office in writing whether our consultant is
  still on its record for the new date. Typing DR is part of the step.
- **Who asked for the move goes in EB**: "the firm", "the homeowner", or "the consultant" and their
  name, with the message number. While DR holds an earlier date of a coming hearing, the move was not
  made at our request (DI) and EB is empty, BE prints `WHO ASKED FOR THIS MOVE IS NOT ON RECORD`.
- **A consultant who asked the office without the firm.** Every county record lets consultants
  request a date change. When EB names a consultant, BE prints `[name] HAS ASKED FOR THE DATE CHANGE
  WITHOUT THE FIRM (EB): ASK THEM TODAY WHY, AND TELL THEM THE RULE: DATE REQUESTS GO THROUGH THE
  FIRM, WHICH ASKS THE HOMEOWNER AND THE BENCH FIRST.` A move the office makes is handled as any
  office move: the old date in DR, the office's record for the new date in K and DQ, the homeowner
  told (DS); the firm's own rules for requests below still apply. The season letter says the same.
  In the example EB is filled from the messages on 5 rows (the firm, messages 8 and 15; the
  homeowner, message 47); no consultant asked, so this line prints nowhere (measured).
- **The homeowner gets the new date the same day, whoever asked.** While DR holds the old date and DS
  holds no link, BE orders a call to the homeowner and the corrected notice, and the list reads `CALL
  THE HOMEOWNER` (48 Linden Avenue in the example; measured).
- **When the firm may ask an office to move a hearing.** Only when all four hold, and the named
  coordinator types their name and the date in DV:
  1. The bench was offered the hearing on its own date first, and the dated note of who was asked is
     linked in CS.
  2. The homeowner has agreed to the new date in writing, linked in CR.
  3. It is before the office's last day for a change request (Offices AY; Hearings DN holds the day).
  4. No consultant has already accepted the hearing. A yes is never traded away.

  The date asked goes in BI, the office's answer in BJ, and "moved" or "refused" in DI. BE prints a
  line for each missing proof (CS, CR, DV) and for a request on a hearing someone had accepted (DH),
  until each is linked. In the example the four requests of messages 8 and 15 were made without
  either proof; three were refused, and 9 Orchard Road was moved although Nora had accepted it
  (measured). The homeowner of a hearing moved at our request without their yes is called the same
  day; a "no" goes to Alice.
- **A consultant with a wrong belief, or a question** (which date, what changed, whether to prepare):
  type who, what and the message in BN, answer the same day (section 2), and link their OK or later
  message in BO. Until then BE prints `TELL` (8 rows in the example; measured).
- **A room, link or time changed after a YES:** AV that day, BN, and the change notice.
- **The calendar is built from the sheet.** After the 2:00 p.m. review and on any change: copy
  column A of the "Calendar file" tab down to END:VCALENDAR into `hearings.ics` (keep leading
  spaces), empty the hearing calendar and import. Times are UTC. An edit in the calendar moves
  nothing. Apple Calendar imported the example file with no error on an earlier build (measured);
  Google Calendar and Outlook were not tried.

### Withdrawals, cancellations and settlements (G5)

1. A withdrawal or settlement is wanted: phone the homeowner the same working day and ask for the yes
   in writing, linked in BG. **Until BG has a link, nothing is signed or sent** (`HOMEOWNER'S WRITTEN
   YES MISSING`).
2. What is owed goes in N, the office's due date in BA. BP says who signs, from Offices AC (or AG for
   a withdrawal): the consultant who attends, the representative on the office's record, or the
   homeowner. Brindlefen's signer is the representative on its record (message 28). **Before
   anything more is signed, the signer must be allowed to sign in that state** (Bench S; "Who may
   appear and sign, by state").
3. **The signature**: a free fill-and-sign PDF or a scan, never a paid tool (Offices AD says what the
   office accepts). An unreadable photo: ask once for a clearer copy and type the date of the request
   in DA. BE prints `DO NOT ASK AGAIN` and when the fallback falls due (noon the next working day,
   Settings B14). Then `FALLBACK DUE`: send the signing link, and call if it is not signed by the end
   of the day. While BG is empty the fallback is a call to the homeowner, not a link.
4. A withdrawal: set G to "no" only once BG is in. The hearing stays staffed until the office's
   written confirmation is in AF (`CANCEL PROOF DUE` until then). The case record stays "scheduled".
5. Only the office's written confirmation goes in AF. The row reads `NOT HELD`: send the release
   notice, type it in BN, link the OK in BO, refill the calendar, and **remove the consultant's file
   access** (EC).
6. The office's written receipt, linked in O, closes G5.

**A settlement.** N holds the word "settlement" (only that makes the row owed). BE lists what is
missing: the offer (DC), its acceptance date (DD), the homeowner's acceptance (BG), the office's
receipt (O), its written word that the hearing is off its schedule (AF) and the due date (BA). The
same day: the call to the homeowner, one email asking the office what the signed settlement does to
the hearing, and the request for the offer in writing. Until AF is linked, the hearing stays staffed.

**Anything owed after a hearing.** N and BA; BB pulls a weekend or closed day back to the office's
last working moment. Within a working day: `TOP OF LIST: OWED`. The result is "held open for a
statement", never "postponed". **Before anything is collected again**, BE asks the coordinator to
check whether the current case files already hold it (57 Clover Road in the example; measured).

### Case files (G4)

- AX is the current version, typed on every row. AY is the version the consultant's GOT IT names, AZ
  the version the clerk's receipt names. An older version or no receipt: BE prints `SEND CASE FILES
  VERSION n TO THE CONSULTANT`, `TO THE CLERK`, or both.
- **A receipt closes its half only for the version it names, or when it says "current".** "Both
  packets received" or "Files reviewed" do not: paste the link, leave AY or AZ empty, and send the
  question BE prints. Of 19 receipts in the example, 5 count for a version (measured).
- The GOT IT counts only for the consultant named in BW.
- Files go by BM, 48 hours ahead in working days. Past the hour, BE prints `PAST THE 48-HOUR MARK:
  SEND NOW AND ASK THE CLERK TO ACCEPT LATE FILES` (4 rows on June 7; measured).
- Files go only for hearings the consultant holds. One message: the links, the version, what changed,
  "Reply GOT IT 2". "I will review the files" is not a GOT IT.
- **File access after a consultant leaves a hearing.** When the named consultant changes after files
  were sent, the person who left still holds the folder links. The same day, remove their access to
  the links sent for that hearing (or ask them in writing to delete the files) and type the date in
  EC; if nothing went to them, type "files were never sent". While EC is empty, BE prints a line when
  the GOT IT in M is from someone no longer on the row (`CASE FILES WENT TO [name] (BW), WHO IS NO
  LONGER ON THIS HEARING: REMOVE THEIR ACCESS ...`), when the hearing is off and its consultant had
  the files, or when BC names someone who declined or was taken off. In the example EC is empty on
  every row, because no message shows access removed, and the line prints on 7 rows: Maya Venn on 14
  Willow Lane and both Brook Road hearings, Leo Arlen on 63 and 81 Garden Street and 48 Linden
  Avenue, Nora Pell on 24 Orchard Road (measured).

### Who may appear and sign, by state

Who may appear for a homeowner differs by state, and so does who may sign. Bench S holds, for each
consultant, the states where they may appear and sign, from counsel's answer (Offices R) and their
own licence or registration. It is an amber ASK for all six (Day 1 count row 33).

- **Once S holds an answer**, "Who can take it" and "Ask next" leave the consultant out of every
  docket of an office in another state (Offices B). A hearing whose consultant may not appear there
  prints `[name] MAY NOT APPEAR OR SIGN FOR A HOMEOWNER IN [state]: OFFER THE HEARING DOWN ASK NEXT
  TODAY, CLEAR H AND J, AND SEND THE OFFICE THE REPLACEMENT NOTICE`. Where something is to be signed
  by a name not allowed there: `NOTHING MORE IS SIGNED BY THIS NAME FOR THIS HEARING: ASK COUNSEL
  TODAY WHO SIGNS INSTEAD`.
- **While S is a question**, offers are not blocked: names carry `(STATES: ASK)` and "Ask next" ends
  with a short warning. Where something owed is still to be signed, BE asks the question before
  anything more is signed, and asks the coordinator to check that the name on the document is the
  name the office has (BD).
- **The example** (measured): the question prints on the 4 rows with something to sign: 57 Clover
  Road (Owen Tarris, Everen), 16 and 42 Birch Lane (Priya Marden, Cindervale) and 18 Maple Lane (Nora
  Pell, Everen). At Brindlefen the office returned a withdrawal statement Owen had signed, because
  Priya is the representative on its record (message 28): BP19 names Priya, and the state question
  is asked before she signs. No status or count of the example changed.

### Results and the record

- Results are logged per hearing the same day. Who reported it and when goes in DT, the link in DU;
  without either, BE prints `THE RESULT IN S HAS NO SOURCE ON THE ROW`. S takes the board's words:
  reduction, no change, settled before the hearing, postponed, nobody appeared, heard: decision
  awaited, held open for a statement. T takes the error ("none" if none).
- **A result that fits none of those** ("They are giving us more time", message 57) is "reported: not
  clear", never guessed: the row reads `RESULT NOT CLEAR`, and the consultant and the office are
  asked in writing that day.
- "heard: decision awaited" reads `DECISION DUE` until the decision is linked in BQ; ask every Friday.
- **Friday, the deputy, by 4:00 p.m.:** paste the case system's export into Record check and correct
  every flagged record that day. A record that says "canceled" is flagged until the office's
  confirmation is in AF. A record with no row on the sheet: add the row or correct the record. Open
  every proof link of the 10 hearings on the Friday sample. Copy the week's measures into the weekly
  log.

### Homeowners

Software never writes to a homeowner; the coordinator does, the same day, by the firm's current
notification tool.
- **The first notice** and **a corrected notice** when the consultant or the date changes: BK and BL
  hold what each notice said, and BE prints the difference.
- **A homeowner who went to the county directly**: phone them that day, note it in Y, link the call
  note in DS. Next time they tell us first, and we ask the county.
- A homeowner is never invited to a hearing.
- **One call for two hearings.** DE, DF and DG hold the name, customer number and contact. Where a
  line orders a call, BE adds the homeowner, the contact (or `CONTACT NOT ON RECORD`), and `ONE CALL
  COVERS THIS HEARING AND [case]` where another hearing needs the same call.
- **Not reached by a deadline:** two calls and an email the first day; if a deadline falls first, the
  coordinator tells Alice that day. Nobody accepts, withdraws or agrees in the homeowner's place.

### Holidays and time zones

The Holidays tab holds each county's closures; every working-day count uses the hearing's county.
Offices V and W hold the time zone and the hours from UTC. Every time to a consultant is the office's
local time, and every text says so once ("Times are Larkmere office time (UTC-05:00)"). **Nobody
types a clock change**: with "yes" in Offices AU the sheet adds the daylight hour from the second
Sunday of March to the first Sunday of November (Hearings CV). AU is an amber ASK for all ten.

## The workflows the firm already has

- **Case records are kept.** The case system stays the system of record. The Record check tab is the
  Friday list of corrections (11 of 24 records disagree in the example; measured). Each correction
  is typed twice until the firm answers whether the case system can import a CSV (section 8,
  question 32).
- **Document collection is kept, and three things move to intake**: the signed appointment of the
  firm as agent, the homeowner's evidence, and the homeowner's consent to be texted, with the number.
  The case files get a version number each time they change (AX).
- **Notifications are kept.** Homeowner notices go by today's tool, sent by a person. Whether it can
  send from a list is question 33.

**The tools the firm already keeps.** From live week 2 the planning sheet (message 3) is archived
read-only, the tracker of file links (message 33) is retired after its old links are corrected, the
documents folder (message 36) stays the store, and the saved office instructions (message 22) give
way to the Offices tab.

---

# For Alice

## 1. Four weeks at the desk, then four live weeks

Nothing decided on a measurement can be measured while no county is hearing. In Texas most hearings
run from May to August (sourced).

| When | What | Owner |
|---|---|---|
| Day 1 | 45 minutes with Alice: the fee per hearing, the forecast, the evening reader, and her and counsel's written yes before the readers read real messages. Counsel is asked who may appear and sign in each state, and which of our consultants may (Offices R, Bench S). The text line ordered | Associate |
| Week 1 | Three consultant calls. The count of last season (100 hearings by hand) and the booking list | Associate, coordinator |
| Weeks 2 and 3 | Season letters. The trial of the sheet in the firm's program. Offices, Bench and Holidays tabs. The season questions to every office. About three days of technical help to connect the reply rule (estimate; not built) | Associate, coordinator |
| From week 2 | Bench calls, ten a week | Associate |
| Week 4 | Review with Alice: bench by office, the first live county, the budget | Alice |
| Live weeks 1 to 3 | The messages in every county; then the full sheet in all ten; then handed to the named coordinator and deputy. 25 hearings timed | Coordinators, associate |
| Live week 4 | Review with Alice on what four weeks can count (section 4) | Alice |

## 2. Scripts

Every text names the date, never "tomorrow", and says whose clock it is ("Times are [County]
office time (UTC-05:00)"). No offer names a price: "at your usual rate". Replies in capitals are
filed by the rule. The full set, with the answer to every example message, is in the appendix
(section 16).

**To consultants**

- **The docket offer** (Dockets H). "Four hearings, Larkmere office, Monday, June 10, in person, at
  your usual rate: 1) 9:00 a.m. 14 Willow Lane 2) ... Reply YES ALL, the numbers you can take (for
  example YES 1 3), or NO. Please answer by noon on Tuesday, June 4."
- **The day before** (Dockets I). "We are expecting you on Wednesday, June 12, from 11:00 a.m. at the
  Tesswick office ([Offices BA]) for two hearings. If nobody attends, these homeowners' appeals can
  be dismissed. Reply YES to confirm. Please be at the office by 10:30 a.m. and text ARRIVED when you
  are there." Video: "Please text IN ten minutes before the first hearing."
- **The case files.** "Case files for [date], version 2: 1) [link] 2) [link]. Version 2 adds [what
  changed]. Reply GOT IT 2 when every file opens."
- **The result.** "Please reply per hearing: REDUCED to $___ / NO CHANGE / POSTPONED to ___ / NOT
  HEARD / DECISION TO FOLLOW, and anything the office asked us to send, by when."
- **A consultant who leaves a hearing whose files they had.** "You are no longer on [hearing]. We
  have removed your access to the case files we sent for it. Please delete any copies you saved,
  and reply DELETED." The date goes in EC.
- **A consultant who asked an office to move a date.** "The [County] office tells us you asked it to
  move [hearing]. Can you tell us why? Date requests go through the firm: we ask the homeowner and
  the other consultants first, and only then the office." The answer goes in Y.

**To offices**

- **The notice** (Dockets N). "For case [number], [address], [date] at [time]: our representative is
  [name]. Please confirm by reply that [name] is on your record for this case."
- **The season questions** (desk week 2), in one email: 1) naming deadline and route (O, AF); 2)
  our alternate (T); 3) if nobody attends (P); 4) our hearing days (Q); 5) who signs (AC, AG); 6)
  fill-and-sign PDF or scan (AD); 7) video links (AE); 8) video rooms (AL); 9) whom to reach before
  opening (AO); 10) hearing length (AP); 11) closure days (Holidays); 12) season (U); 13) clock
  changes (AU); 14) last day for a date-change request (AY); 15) daytime number and clerk (AZ); 16)
  the route confirmed in writing (L); 17) address, room and where to report (BA).
- **The email after any phone call.** "To confirm what we discussed: [one sentence]. Please reply to
  this email to confirm, so that we have it in writing."

**To homeowners** (a person, never software)

- **A withdrawal or settlement.** "A withdrawal cannot be undone once the county processes it. If
  that is what you want, please reply 'Yes' to this email. Until then your hearing stays on and we
  will attend." The reply goes in BG.
- **Before we ask to move a hearing.** "None of our representatives can attend on [date]. We would
  like to ask the county to move it to [new date]. If you agree, please reply 'Yes'." It goes in CR.

**Trying the software** (in `prototype`, Node 22): `node cli/replies.js`, `node cli/office.js
--try "text" --county Tesswick`, `node cli/inbox.js`, `node cli/sheet.js --paste
data/paste-example/new-messages.json`, `node cli/calendar.js`. None sends anything. Measured outputs
are in `prototype/README.md`.

## 3. The bench, the terms and the backup

**The bench is a table by office, not a head count.** Each office has a primary (Offices X), a
second (Y) and an alternate on its record (T). The example week runs at 1.7 hearings a
consultant-day (Measures B15, measured); I plan on 2.4. At 2.4 the 23-hearing peak week needs 6 to 10
names with a fifth spare (estimate). **I ask the six for two days a week in the peak and recruit four
anchors by mid-March**, from the state's register of consultants where there is one (Texas
registers them, sourced): about 56 calls, ten a week (estimate).

**Who may appear and sign differs by state.** The five states in the packet are fictional, so every
Offices R and Bench S cell is a question for counsel. Real rules differ: in Cook County only an
attorney may represent a taxpayer (sourced). Until counsel answers, offers go and the sheet marks
each name; after, nobody is offered a hearing in a state where they may not appear.

**A season letter to each consultant, signed by mid-March.** Your mobile number and agreement to be
texted. Your rate as today ($75 to $110 a hearing in the packet). Whole dockets offered to you first
for the offices and weekdays you name. After ten full days, a guaranteed day. The states where you
may appear and sign. **Date requests go through the firm**: never ask an office to move a hearing
yourself. **Case files are for the hearings you hold**: when you leave one, we remove your access and
you delete any copies. Pay every Friday.

**The day rate, as a choice.** Full video days of six to eight hearings at $400 a day: $67 a hearing
at six, $50 at eight, against $90 (estimates; nothing agreed).

**An alternate at every office is a condition for going live there**: a named alternate on the
office's record, or the written fallback (evidence on file two working days ahead, the good-cause
letter ready).

**Ten counties, five states.** A new county is one Offices row, one Holidays column and the counties
on the Bench tab; no formula changes, up to 39 offices and 40 consultants. One sheet holds 1,199
hearings. Above about 1,000 hearings a year the plan is one workbook per county team (appendix,
section 15; designed, not run).

## 4. The decisions

| When | Decision | Decided on | If no |
|---|---|---|---|
| Day 1 | Staff every hearing, or book fewer? | Fee per hearing decided at a formal hearing, less the refused offer (Day 1 count row 4). $104 or more: this plan | **The booking rule first.** A case goes to a hearing when its expected first-year saving beats the informal offer by more than about $417. Below that, with the client's agreement and counsel's sign-off, the offer is taken or a written statement filed. Every booked hearing is still staffed; recruiting stops |
| Week 4 | Go live with the first notices | An alternate or the written fallback at each office; six letters; the text line live with the reply rule; the evening reader named | Email and phone, as today |
| Live week 4 | Is the full sheet carrying the work? | No hearing unstaffed inside three working days; a YES by the deadline on 8 dockets in 10 (to set); no more paid minutes per hearing than live week 1 | Fix the step that costs the minutes. No check is dropped in the peak |
| Live week 4 | May one kind of reader proposal skip the 9:00 a.m. pass? | Both readers agree, one kind, no wrong link in the Friday sample four weeks running; the firm's tally beside it | Nothing files itself |
| End of season | Keep the day rate | Those days averaged 6 or more hearings, and Alice has read their results | Pay per hearing |
| September | Build the control tower? | A forecast V that Alice signs, and timed paid minutes removed per hearing of at least 120,000 ÷ V (24 minutes at 5,000 hearings) | The sheet or a bought tracker |

Two cautions on the booking rule: the fee is earned over several years, and a firm known not to
attend gets worse offers.

## 5. What to count

| Goal | Measure (Measures row) | Today | Season one target |
|---|---|---|---|
| Fewer errors | Hearings inside three working days with no consultant's yes (3) | 4 of 11 (measured) | None |
| Fewer errors | Case records that disagree with the sheet (4) | 11 of 24 (measured) | Under 1 in 20 |
| More hearings | Hearings per consultant-day (15) | 1.7 (measured) | 2.4 from staffing; 4 where an office gives one day; 6 on day-rate video days |
| Less human work | Messages per hearing (22); hearings one coordinator carries in a peak week (18) | 3.0; 92 (estimates) | 1.8 messages by live week 4. No target in minutes |
| Cost | Cost per hearing, all in (23) | $104 (estimate) | $103 to run; $143 with set-up at 300 hearings (estimates) |
| Guardrail | Share of hearings with a reduction, by format and by consultant | Not in the packet | Must not fall |

**Less human work, stated as it is** (estimates). Kept by hand, the full sheet adds work: a
coordinator carries about 76 hearings in a peak week, not 92. Docket offers, the readers and the
reply rule take that back to 91 to 96 (upper side), because the newest checks add outgoing messages
and typed names that no timing has counted yet. So the kit claims no saving in minutes in season
one. Two timings of 25 hearings in the live weeks replace these figures.

**Which numbers can decide something.** At 300 hearings most rates cannot be measured in a month.
Missed hearings at 2 in 100 (estimate) are about 6 a season, so a quarter prevented cannot be told
from chance. The weekly Record check compares every record, so "under 1 in 20" is counted, not
sampled. The guardrail is a review by Alice after 100 hearings per consultant or format; until then
a second person reads every NO CHANGE from a day of six or more.

**Coordinators per 1,000 hearings in a peak week** is the scaling measure: 10.9 today, 13.1 with the
sheet kept by hand, 9.9 with the plan at 300 hearings, 8.8 at 5,000, 4.8 with a control tower
(estimates, made before the newest checks).

## 6. What it costs, and what I ask for

| Season one (estimates) | 300 hearings | 1,000 |
|---|---|---|
| Desk weeks, payroll | About $5,000 | About $10,000 |
| The bench, to mid-March | About $3,000 | About $6,000 |
| The associate in the live weeks | About $2,300 | About $4,600 |
| A text line, three users | About $1,000 | About $1,000 |
| Keeping the checks | Under $500 | Up to $1,500 |
| **Set-up and new spend** | **About $12,000** | **About $23,000** |
| Not in it | Alice's time; counsel, about five hours; technical help, about three days; an on-call alternate, about $4,000 per state that needs one | The same, and a seasonal coordinator |

The set-up is $40 a hearing at 300 hearings and $23 at 1,000. A normal year's cost per hearing is
about $103 at 300, $95 at 1,000 and $98 at 5,000 (estimates; appendix, section 12). Coordination
still grows nearly in a straight line: from 300 to 5,000 hearings, coordinators in a peak week rise
14.8 times (estimate). That is why the control tower is later. At 5,000 hearings it frees about
$40,000 of coordinator time a year against $40,000 to $70,000 a year to run (estimates), so the
default is not to build, and September's test is stated in cash.

**From Alice:** about two hours a week for eight weeks, the evening reader's name, the payroll export
and read access to last season's mailbox, one coordinator for three days. **Counsel,** about five
hours: the season letter, contractor status, who may appear and sign in each state and which of our
consultants may, and the booking rule if needed. **Technical help, about three days** (estimate; not
built): the text line and mailbox connected to the reply rule and readers, and a case-system export
for the Friday check, after the answers to questions 30 and 31.

## 7. Every situation in the examples

The 125 situations in the 72 example messages and the packet's records (A1 to K4, X1 to X31) each
have a row saying what the firm does, with the cells as the sheet stands on Friday, June 7, in
`PROBLEM_COVERAGE.md` (section 10) and the appendix (section 16). Each is handled by a rule above:
replies (A, C, F1), the office's record (A2, B4, D, E1, E5), moves and calendars (B, C2, C3, H),
withdrawals and settlements (E2 to E4, I), case files (A7, D6, F, K1), arrival and illness (G),
results (J), and the X rows under their own headings.

**The three newest rows**, handled in the sheet and not yet audited:

| Id | The situation | What the firm does |
|---|---|---|
| X32 | Every county record lets consultants ask the office to change a hearing date; nothing stops a consultant from doing it without the firm | Hearings EB records who asked for each move. When it names a consultant, BE orders the same-day question and the rule: date requests go through the firm, which asks the homeowner and the bench first. The move is handled as any office move (DR, K and DQ, DS). The season letter says it. In the example EB holds the firm on 4 rows and the homeowner on 1; no line prints (measured) |
| X33 | Who may appear and sign differs by state, and the bench has no rule by state; Brindlefen returned a withdrawal Owen signed, because Priya is on its record (message 28) | Bench S holds each consultant's states (ASK for all six; Day 1 count row 33). Once answered, nobody is offered an office in another state. While it is ASK, offers carry (STATES: ASK) and a warning, and BE asks the question before anything more is signed, on 4 rows (measured). No status changed |
| X34 | A consultant who declines, is replaced or is released keeps the folder links to the case files | Hearings EC takes the date access was removed, or "files were never sent". While it is empty BE orders the removal: 7 rows in the example (measured) |

## 8. Every question still open, who answers it, and the cell

Nothing below is in the packet. Each answer is typed in its cell the day it arrives, with the date;
until then the cell keeps its question (220 cells on the installed sheet start with ASK; measured).
Questions 1 to 14 and 26, 28, 37, 38, 40 and 42 go to each office in the season email.

**Each office:** 1 naming deadline (Offices O, AF); 2 if nobody attends (P); 3 our hearings on one
day (Q); 5 our alternate (T); 6 season (U); 8 who signs a settlement or withdrawal (AC, AG); 9
fill-and-sign PDF or scan (AD); 10 video links (AE); 11 video rooms (AL); 12 whom to reach before
opening (AO); 13 hearing length (AP); 14 closure days (Holidays); 26 the route confirmed in writing
(L); 28 travel gaps (AI, AJ); 34 Fenwick Vale's 15 minutes (Day 1 count row 25); 37 clock changes
(AU); 38 last day for a date-change request (AY); 39 per settlement, what it does to the hearing
(Hearings AF, BA); 40 daytime number and clerk (AZ); 42 address, room and where to report (BA).

**Counsel:** 4 who may appear for a homeowner in each state and who signs the appointment, **and
which of our consultants may appear and sign in each state** (Offices R; Bench S; Day 1 count rows
17 and 33); 25 the written yes, with Alice's, before the readers read real messages (row 18).

**Each consultant:** 15 mobile number (Bench O); 16 agreement to be texted (P); 17 Nora's channel
(C4) and Priya's number (O6); 27 weekdays and offices (Bench I; Offices X, Y); their states (Bench S).

**Alice:** 7 signed names per office (Offices AA); 18 the evening reader (Settings B9); 19 to 24 the
day-1 counts (Day 1 count B2 to B15, B19); 36 what each sent homeowner notice says (Hearings BK, BL);
41 homeowners' contact details (DG); 43 who may decide to ask an office to move a hearing (DV; our
proposal: the named coordinator).

**The firm's technical contact and staff:** 29 timed minutes left with the software (Hours B6); 30
the shared mailbox (Day 1 count B20); 31 the text line (B21); 32 can the case system import a CSV
(B22); 33 the homeowner-notice tool (B23); 35 the two-week tally of reader proposals (B24).

No formula reads the Day 1 count tab; an answer typed there also goes in the cell named.
