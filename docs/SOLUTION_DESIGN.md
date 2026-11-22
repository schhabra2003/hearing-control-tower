# Hearing coordination, and the later Hearing Control Tower: solution design

Dated 22 November 2026. **Section 0a is the plan the firm runs this season; where an older figure further down differs, 0a wins.** Section 4 (economics) is generated from the model. Section 17 records what the prototype measured. Section 19 says how the plan uses the workflows the firm already has. The day-by-day plan is `docs/week-one-kit.md`.

**Client.** Alice's Law Firm (fictional). I write as its associate. FairAppeal's public facts are used only as real-world grounding and are marked as such.

Labels: **[measured]** counted from the case packet or a run you can repeat; **[sourced]** from a cited document (`research/`); **[simulated]** counted in a generated world; **[estimate]** my assumption or arithmetic, with its range.

---

## 0. The answer in one screen

1. **First priority, this season:** a named consultant who has said yes on every hearing, three working days ahead. In the example week 4 of the 11 hearings due within three working days have no consultant's yes [measured]. No custom software is built this season.
2. **How:** a daily kit, a gate sheet with five checks on every hearing, and one small reply rule. Each check is closed only by the party who owns the fact (§6). Status climbs OPEN, READY, CONFIRMED, then DONE once the result is logged. That is how the firm knows the work is complete.
3. **Why the record fails today:** the firm keeps one status field per case that anyone can overwrite, while the truth lives with the offices and the consultants. 11 of the packet's 24 case records contradict newer messages [measured].
4. **Unit of work:** the docket (one office, one day, one format), not the single hearing. Human work then grows with dockets and exceptions, not with hearings or messages.
5. **Next:** fuller consultant-days. Whole dockets go to one consultant, and offices are asked to hear the firm's cases on one day.
6. **Later:** a hearing control tower (§7), prototyped here and not built for live use. It is built only if the firm's own timed minutes, counted by September, show that it pays in cash. The default is not to build.
7. **The number that reverses the order:** if the fee a hearing earns is below the $104 a hearing costs [estimate], the firm first decides which cases go to a hearing.
8. **Economics in one line:** a hearing costs about $104, of which $90 is the consultant [sourced from the packet]. What it earns is not known ($97 to $387 on public figures). Season one costs about $12,000 of set-up at 300 hearings a year and claims no saving of coordinator minutes; its case rests on missed hearings prevented [estimate, §4].
9. **The limit on growth is the bench, not software:** 16 names at 1,000 hearings a year and 79 at 5,000, at 2.4 hearings a consultant-day and two days a week each [estimate].

---

## 0a. This season's plan

This section is for a person at the firm. It needs none of the later sections.

**Three things.**

1. **The kit** (`docs/week-one-kit.md`): what the coordinator does when a notice arrives, on Monday, on Wednesday, every day by the office's clock, when a consultant drops out, and on the day of the hearing. Its first page is "A normal day on one page".
2. **The gate sheet** (`sheet/gate-sheet.xlsx`): one row per hearing. Column W is the status, column X the daily list, column BE the next step in words. Five checks, each closed only by a link to the message of the party who owns the fact.
3. **The reply rule** (`node cli/replies.js`): fixed code that files a consultant's reply in a fixed form (YES ALL, YES 1 3, NO, ARRIVED, GOT IT 2, OK) and hands every other reply to a person with the reason.

Two AI readers propose proof links beside the sheet, and a person accepts each one at 9:00 a.m. Nothing is sent by software. **Hearing Desk**, the web app (`app/dist/index.html`, one offline HTML file; see the README), shows the same plan as a coordinator and a consultant would use it. It holds no key and sends nothing. An optional live mode (`npm run live` in `app/`, with the firm's own OpenAI key kept in the local server process) reads pasted messages with the same two readers; the readers only suggest, and a person accepts each row.

**A normal day.** The Hearings tab has 73 typed columns, but on the example week a coordinator types in few of them [measured on rows 2 to 25]:

- Typed once, when a hearing is added from the county's notice and the case record: A to G, I, AX, DE, DF, DG (12 columns).
- Changed from day to day: H (the consultant), J (their own yes), K (the office has the name on record), BD (the name on the office's record) and P (grade of the weakest proof).
- Next most used (7 to 11 of 24 rows): L, BN, M, BW, BC.
- The 9:00 a.m. pass accepts or refuses the readers' proposed links. The 2:00 p.m. pass works the daily list in column X.

Everything else is printed on the sheet when it is needed, in column BE, with the section of the kit to read. The sheet has no switch that turns a family of lines off. The 24 example hearings were covered on purpose for this take-home, so the example shows far more lines than a normal week would.

**The rules on the sheet.** Each rule a coordinator meets is listed with its cell and the problem it solves in `PROBLEM_COVERAGE.md`, section 3, and in the sheet's "How to use" tab. The rule book has parts F to L. The newest part, Part L, answers three problems a later review found:

| Rule | Where |
|---|---|
| A move records who asked for it. When a consultant asked the office without the firm, the sheet orders the coordinator to ask them why that day and to tell them the rule: date requests go through the firm, which asks the homeowner and the bench first (X32) | Hearings EB, BE |
| Each consultant has a list of states where they may appear and sign, from counsel's answer and their own licence or registration. Once it holds an answer, the sheet never offers them a hearing in another state. While it is a question, the offer still goes with a warning, and anything to be signed prints the question to counsel (X33) | Bench S, T; "Who can take it"; Hearings BE |
| When a consultant leaves a hearing after files went to them, the sheet orders their access to the folder links removed (or a written request to delete the files) and the date recorded (X34) | Hearings EC, BE |

**What the example sheet shows** (read from the installed sheet; example day Friday 7 June 2030, 2:00 p.m.). Of 24 hearings, 17 read OPEN, 2 READY, 3 RESULT DUE, 1 OWED and 1 ERROR DUE. Of the 19 hearings to come, 14 have a consultant's yes that counts; of the 11 inside three working days, 4 have none. 13 video or telephone hearings to come have no link or number. The Record check finds 11 of 24 case records wrong. Of the packet's two clean threads, Larkmere reads READY and Velloran reads OPEN: 3 missing, because the office names a room and no link and neither receipt names a file version. That is deliberate. Part L added lines and changed no status: the files-access line prints on 7 rows, and the signing question prints on 4 rows, among them 42 Birch Lane, where Owen signed a withdrawal for an office that has Priya on record (message 28).

**Auto-filing stays off.** A reader proposal is a suggestion until a person accepts it. From recorded runs, with no model called [measured]:

| Set | Agreed and verified readings that were right |
|---|---|
| 72 packet examples | 124 of 125; 63 of 63 proposed proof links |
| 30 unseen office messages (one labeller) | 25 of 26 that the key can judge (95% interval 81.1 to 99.3); 25 of 30 strict |
| 100 unseen everyday messages (AI author, two AI labellers and an adjudicator, no human) | 72 of 79 (91.1%, interval 82.8 to 95.6) |

About 1 wrong proof in 11 on everyday mail is too many for a cell that decides whether a hearing is covered, so a person opens each proposed link at 9:00 a.m. The condition for switching it on for one kind of proof is written on the sheet (Reader suggestions tab, row 168): no wrong link of that kind in the Friday sample for four weeks running, decided by Alice at the live-week-4 review.

**When an office changes its process by phone.** Fixed code flags the call note and proposes the change for the office's row. Until a person at the firm approves it with a name and date (Offices AQ, AR), the sheet prints NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY, prints no route, and puts the office's hearings at the top of the list. A spreadsheet cannot lock anything: the block is the missing route, the capitals, the place on the list and a count (Measures row 98).

**What only the firm, an office, counsel or a consultant knows.** The sheet holds each such question in an amber ASK cell where the answer goes (220 cells in the example start with ASK). `PROBLEM_COVERAGE.md`, section 11.7, lists all 44 questions with their cells.

**What was tested, and what was not.**

- The installed sheet (md5 2e74089c917b1bcc1ac36f5f7de3e7ce; 159,013 formulas, no error value) against the 11 example threads and every rule: 180 pass lines, 0 FAIL (`python3 prototype/eval/sheet_threads.py`, 22 Nov 2026) [measured]. The prototype's 216 checks, the office rule's 91 and the reply rule's 39 all pass [measured].
- An independent tester's model of the sheet, written from the rules without the sheet's generator, agreed with the sheet in 893,010 cells on nine generated worlds of 1,000 to 1,199 hearings, with 0 differences [measured by the tester, on the sheet before Part L]. **The independent test of Part L did not run.** Part L was checked only by the sheet's author and by the thread check above.
- Recalculating 1,000 rows takes about 29 seconds in LibreOffice 24.2; Part L added 0.13% on the mean in one session [measured by the sheet's author].
- The sheet was built and checked in LibreOffice 24.2. Excel for Mac and Google Sheets (an 80-row copy) ran an earlier build with no error value; Excel for Windows, the full sheet in Google Sheets and row actions outside LibreOffice were not tested. Details are in `CHECKS.md`.
- The live reader path (`node cli/sheet.js --paste`) ran once with a real key on 21 Nov 2026: 4 messages, 8 requests, $0.09, the live rows equal to the recorded ones in 9 of 9. That is a test of the path, not an accuracy measure. On 22 Nov 2026 the two readers (gpt-6.1-sol reads, gpt-6-luna checks) were run live on every labelled set: 117 of 117 and 119 of 119 agreed and verified readings right on the 72 examples (two runs), 73 of 81 (90.1%, 81.7% to 94.9%) on unseen set 2 against 72 of 79 recorded, 275 fictional messages, 550 requests, 0 failed, $1.16 (measured; `docs/evaluation/live-readers-22nov.md`). The web app's live server (`npm run live -- --key-file <file>` in `app/`) runs the same readers on pasted messages; without a key it replays recorded answers.
- Not tested: Node 20; Google Calendar and Outlook; any open-weight model; the procedure for growing past one workbook (kit appendix, section 15), which is designed and was not run.

**The economics.** The model gives 17.8 productive coordinator minutes a hearing with the plan, against 19.6 today. That figure does not include the confirmation checks, which cost some messages and typed names, and is not a measurement. With them the estimate is 18.7 to 19.6 [estimate]. Some later checks were not costed in productive minutes. So this plan claims no saving of coordinator minutes in season one. Its case rests on missed hearings prevented. The firm's two timings of 25 hearings in the live weeks replace the estimate.

---

## 1. First principles

A hearing fails in one of two ways: the right person is not there, or that person does not have the right materials. The setting has three properties:

1. **The truth lives elsewhere.** The government owns the date, the room and the record of who will appear. Consultants own their availability. The firm can only hold evidence of these facts.
2. **Communication is asynchronous, multi-channel and lossy.** A sent item may not have been processed. A phone call is not a written notice.
3. **Every county works differently and the rules change every year.** No county offers an API.

Human work follows one equation:

> human work = blocks × touches per block + exceptions × minutes per exception + new counties × onboarding hours

| Term | Lever | How |
|---|---|---|
| Blocks | Fewer coordination units | Batch a consultant's day by office. Ask offices to group the firm's hearings |
| Touches per block | Absorb routine traffic | Software reads and files routine messages; one-tap accept for consultants |
| Exceptions | Prevent them | A named backup each day, per-case acceptance, official-only calendars, agent-of-record filings |
| Minutes per exception | Resolve faster | The system assembles the evidence and proposes a plan; a person approves |
| Onboarding hours | Counties as data | A new county is a playbook file, not new code or a new hire |

Texas law lets an agent request up to 20 properties heard back to back on one day (§41.66(j)) [sourced]. Every example thread in the packet is already a pair of adjacent hearings [measured]. Blocks are the natural unit.

## 2. The problem, in numbers

**The packet** [measured]: 72 messages (31 from offices, 24 from consultants, 17 internal); 62 email, 5 phone notes, 3 texts, 1 calendar change, 1 mail transcript. Of the 55 inbound messages, 20 (36%) are exceptions.

**Record audit of all 24 cases** [measured; `data/record_audit.csv`]:

| Category | Count | Cases |
|---|---|---|
| Record contradicts newer evidence | **11** | AX-101, 103, 104, 105, 111, 112, 113, 114, 115, 117, 119 |
| Record missing a fact | 2 | AX-106, 116 |
| Fact unverified (no office acknowledgment) | 3 | AX-102, 107, 108 |
| Open obligation not shown (signature) | 2 | AX-109, 110 |
| Clean | 6 | AX-118, 120 to 124 |

7 of 24 hearings have no confirmed attendee for the official slot. The packet was assembled to show problems, so these rates are illustrative, not the firm's real no-show rate.

## 3. Real-world constraints [sourced; `research/01` to `research/03`]

1. **Processes vary inside one state and change every year.** Bexar takes filings by CSV or portal; Tarrant by Excel upload, with agent forms taking 5 to 10 business days. Cobb takes reschedules by email 3 business days ahead; Fulton by phone 48 hours ahead. Cook County and the Harris ARB issue new rules every year. No public APIs were found in the six jurisdictions reviewed.
2. **Who may appear differs by jurisdiction.** The Cook County Board of Review allows only licensed attorneys or the owner. Texas requires paid consultants to register, and notices go to the agent only once the owner's designation is on file (34 TAC §9.3044).
3. **Volume is seasonal.** Harris CAD received 516,205 protests in 2024; Dallas held 146,815 ARB hearings in 2025.
4. **A missed hearing is costly.** In Texas an owner who fails to appear gets a new hearing only with a good-cause statement within 4 days (§41.45(e-1)).
5. **FairAppeal's own setup.** Contract advisors paid per case; "most hearings are virtual or by phone"; fee 25% of first-year savings; $1.5M seed (SEC Form D, 2026).
6. **Reminders help.** SMS reminders raised attendance from 67.8% to 78.6% (Cochrane, 8 RCTs); text reminders cut failure-to-appear by 13 to 21% (*Science*, NYC). These cover patients and defendants, not paid contractors.
7. **Legal.** AI-generated voices count as "artificial" under the TCPA (FCC-24-17). 13 states require all-party consent to record calls. E-signatures are valid under ESIGN and UETA, but some boards want wet ink or a notary.

## 4. Economics [estimate; model: `prototype/src/economics.js`, run `node cli/economics.js`]

Nothing in this section was measured at the firm. Every figure comes from one module, which the one-page write-up also uses. The 17.8 minutes, 23.7 paid minutes and 101 hearings a coordinator below do not include the confirmation checks (0.94 to 1.89 minutes a hearing in messages on the example week). With them the plan gives 18.7 to 19.6 productive minutes and 91 to 96 hearings a coordinator in a peak week, against 92 today. No saving of coordinator minutes is claimed for season one.

### Inputs

| Input | Used | Cautious to hopeful | Basis |
|---|---|---|---|
| Hearings a year | 5,000 | 1,000 to 20,000 | **unknown**; the firm knows |
| First-year tax saving when an appeal wins | $774 | $400 to $1,500 | **sourced**: one competitor's published average per customer |
| Chance of a reduction | 50% | 40% to 65% | **sourced**: official figures at two boards |
| The firm's share of the saving | 25% | 25% to 50% | **sourced**: two firms' terms |
| Consultant fee per hearing | $90 | $75 to $110 | **packet** |
| Coordinator cost per paid hour | $33 | $27 to $38 | **sourced** wages, with a lighter benefits load |
| Productive hours in a 40-hour week | 30 | 35 to 25 | **estimate** |
| Coordination minutes per hearing today | 19.6 | 19.6 to 37.5 | **estimate**: desk estimate to simulation; nobody has timed the firm |
| Share of minutes the tower removes | 60% | 30% to 84% | **simulated** |
| Hearings missed today | 2% | 1% to 5% | **unknown**; the first number to count |
| Share of misses the checks prevent | 25% | 13% to 50% | **estimate** from reminder trials |
| Share of this year's fee lost on a miss | 75% | 50% to 100% | **estimate**; the office's rules decide |
| Later yearly fees lost per miss | 1.5 years | 0 to 3 | **estimate** |
| Extra minutes a hearing, four checks by hand (comparison case) | 2 | 4 to 1 | **estimate**; the full five-check sheet is about 4 by hand |
| Consultant fee saved on block-paid hearings | 0% | 0% to 10% | **unknown**; not counted until agreed |
| Share of hearings in blocks of four or more | 60% | 30% to 80% | **estimate** |
| Share of the year in the 8 busiest weeks | 60% | 40% to 80% | **estimate** |
| Hearings a consultant attends in a day | 6 | 4 to 8 | **packet** |

### What one hearing costs

| | Today | Four checks by hand | The plan, 300 a year | With the tower |
|---|---|---|---|---|
| Consultant | $90.00 | $90.00 | $90.00 | $90.00 |
| Coordination | $14.37 (19.6 min) | $15.84 (21.6 min) | $13.03 (17.8 min) | $6.34 (8.6 min) |
| **Cost per hearing** | **$104.37** | **$105.84** | **$103.03** | **$96.34** |

The consultant is 86% of the cost. A coordination minute costs $0.73. No consultant discount is counted.

### What one hearing earns: the weakest figure

The public saving ($774) is one company's average per customer, with an undefined base. In one large Texas district about 10% of residential protests reached a formal hearing and about 84% closed by agreement [sourced, `research/06`]. At a 25% share, a hearing earns about $77 to $97 if the saving is per won case, $194 if it already averages over lost cases, and $387 needs a 50% share. The model uses $96.75. Against $104.37 of cost, an attended hearing may lose money on its own. **The plan makes no claim about the margin of a hearing until the fee received per hearing is counted on day 1.**

### What each step is worth

| Step | Cost a year | Worth per hearing | Pays from (hearings a year) |
|---|---|---|---|
| Four checks by hand (comparison) | $10,000 set-up | -$0.83 ($0.64 of misses prevented, -$1.47 to keep) | never on misses alone |
| Lean build of the tower | $40,000 to $70,000 | $8.04 (11.0 of 19.6 minutes) | 4,977 to 8,709 |
| A dedicated engineer | $150,000 to $200,000 | $8.04 | 18,663 to 24,884 |

- **The checks are not a saving on missed hearings.** On misses alone even four checks by hand cost $4,141 a year net at 5,000 hearings, breaking even only if a miss costs more than $383 all in (my estimate is about $260). A second return, a higher win rate from current files and right dates, cannot be measured at this volume. The checks are recommended as the firm's duty to clients it promised to represent, as insurance, and as what makes whole dockets safe.
- **At 5,000 hearings the tower does not pay in cash.** It saves $24,112 a year in seasonal coordinators not hired, so a lean build nets minus $15,888 to minus $45,888. Counting all coordinator time, it returns $40,187 at 19.6 minutes today and $79,567 at the simulation's 37.5. The line between paying and not is 20 to 33 minutes a hearing today. Nobody has timed it. **The recommendation is not to build this season.**
- **The firm's own figure** comes from payroll: coordinator hours paid in last season's eight busiest weeks, times the share spent on hearings, divided by hearings held. Build only if the low end clears the rule.
- The 60% reduction is my simulation's figure. At 30% the lean build needs 12,175 to 21,307 hearings a year.

### Who has to be in the room, and how they are paid

Sending a consultant pays the firm alone only where it raises the chance of a reduction by more than about 47 points at a 25% share. On the client's and the firm's money together it pays above about 12 points. **Every hearing gets a person in the room, in person, by video or by telephone.** A written-only route is a later product a client opts into, with counsel's sign-off.

**No rate question is asked in season one.** Each consultant keeps today's rate ($75 to $110 in the packet). What changes is the offer: whole dockets. In the example week the sheet staffs 1.7 hearings a consultant-day [measured]; staffing the open hearings with consultants already booked that day gives about 2.4 [estimate]; whole dockets allow at most 2.8 on the calendar. Fuller days add capacity, not margin, at the same rate. The cost lever, untested and in no figure here, is the firm's own seasonal staff on full video days: at $50 an hour and 8 to 12 hearings a day, $33 to $50 a hearing. A paid standby is not part of the plan.

### A missed hearing

One miss loses 75% of this year's fee ($73, $145 or $290 at the three fees) and, with later fees, $218, $435 or $871. Preventing misses is worth per hearing (per year at 5,000):

| Missed today | Prevented | Fee $97 | Fee $194 | Fee $387 |
|---|---|---|---|---|
| 2% | 25% | $0.64 ($3,192) | $1.73 ($8,634) | $3.90 ($19,519) |
| 2% | 50% | $1.28 ($6,384) | $3.45 ($17,269) | $7.81 ($39,038) |
| 5% | 50% | $3.19 ($15,961) | $8.63 ($43,172) | $19.52 ($97,594) |

What makes a miss serious is what the model prices only roughly: a client who got no hearing, refunds, complaints and lost renewals. The target is not a dollar figure: **no appeal lost because nobody appeared, and evidence on file for every hearing.**

### Peak season

With 60% of the year in the 8 busiest weeks:

| Hearings a year | Peak week | Coordinators today | Four checks by hand | With the tower | Consultants in a peak week | Paid out in the 8 peak weeks |
|---|---|---|---|---|---|---|
| 300 | 23 | 0.2 | 0.3 | 0.1 | 1 | $18,787 |
| 1,000 | 75 | 0.8 | 0.9 | 0.4 | 3 | $62,624 |
| 5,000 | 375 | 4.1 | 4.5 | 1.8 | 13 | $313,120 |
| 20,000 | 1,500 | 16.3 | 18.0 | 7.2 | 50 | $1,252,480 |

**The packet lists six consultants. At 5,000 hearings a peak week needs 13** at 6 hearings a day. No software adds consultants.

**Cash is a limit of its own.** At 12 weeks from hearing to fee [estimate], a peak ties up about $330,000 at 5,000 hearings and $1.3 million at 20,000, most of a $1.5 million seed round. Growth to 20,000 needs financing for the peak before it needs software.

### The plan at three volumes

The case gives no yearly volume. The example week implies 240 to 320 hearings a year, shown as 300. The plan is written for 300 and a fee of about $194; 1,000 and 5,000 test how it scales, and Alice's forecast replaces them.

| Hearings a year | 300 | 1,000 | 5,000 |
|---|---|---|---|
| Hearings in a peak week | 23 | 75 | 375 |
| Bench names at two days a week, at 1.6, 2.4 (target) and 2.8 hearings a day | 8, 5, 5 | 24, 16, 14 | 118, 79, 67 |
| The same at the 1.2 days a week the example shows | 12, 8, 7 | 40, 27, 23 | 196, 131, 112 |
| Coordinator minutes a hearing with the plan, productive and paid | 17.8, 23.7 | 16.7, 22.3 | 15.8, 21.0 |
| Coordinators per 1,000 peak-week hearings, the plan | 9.9 | 9.3 | 8.8 |
| Running cost a hearing, all in | $103.03 | $95.43 | $98.11 |
| Season one, set-up included, left at $193.50 and at $96.75 a hearing | $15,142, -$13,883 | $68,262, -$28,488 | $415,719, -$68,031 |
| The tower saves, coordinator time and cash | $2,411, $1,447 | $8,037, $4,822 | $40,187, $24,112 |
| Cash a peak ties up | $19,926 | $66,419 | $332,097 |

**Coordinators per 1,000 hearings in a peak week: 10.9 today, 13.1 with the full sheet by hand, 9.9 to 8.8 with the plan, 4.8 with the tower** [estimate]. Coordination with the plan still grows nearly in a straight line: from 300 to 5,000 hearings, coordinators rise 14.8 times for 16.7 times the hearings. So the plan alone does not deliver "more hearings without the same amount of human work". The tower does in my simulation, which is why it is the later priority, decided in September on timed minutes.

### What follows

1. **The first step buys numbers and reliability, not a saving.** About $10,000 of payroll for four weeks; about $12,000 of set-up in season one at 300 hearings and $23,000 at 1,000.
2. **The largest lever is the person in the room:** whole dockets, more hearings in a consultant's day, and who attends full video days. Nobody's rate is cut.
3. **The readers now, the tower decided in September.** The two AI readers run read-only from the desk weeks, if Alice and counsel agree, for under $80 a year. The tower is not for the 1,000-hearing season.
4. **No dedicated engineer** below 18,663 to 24,884 hearings a year.
5. **Four numbers from Alice decide the plan:** fee received per hearing, share of hearings where nobody appeared, next season's forecast, and weeks from hearing to fee.
6. **Consultants limit growth before coordinators do.**

A reader of an earlier version checked one sum: 12.4 minutes saved at $35 to $50 an hour is $7.23 to $10.33 a hearing, so an engineer at $150,000 to $200,000 needs 14,516 to 27,650 hearings a year. The module reproduces it (check M1).

## 5. Phase 0: count first, then control who is in the room

A seed-stage firm should not wait for custom software. The control works on a spreadsheet: `sheet/gate-sheet.xlsx`, with the example week's 24 hearings as sample rows. It needs Excel 2019 or later, Microsoft 365 or Google Sheets; it was built and checked in LibreOffice 24.2 (what was tested where is in `CHECKS.md`). The kit (`docs/week-one-kit.md`) holds the day-by-day owners, scripts, consultant terms and decisions. In short:

| Lever | What changes | Cost |
|---|---|---|
| **The count** (desk week 1) and **the timing** (live week 1) | Day 1: 45 minutes with Alice (volume and forecast, appeals lost to a no-show, fee per hearing, weeks to fee, who may appear), one payroll export, a text line ordered. Days 2 to 5: 100 of last season's hearings read by hand, and the readers pass over last season's mail only if Alice and counsel agree. 25 hearings are timed in the first live week | Part of four weeks of the associate; about three days of technical help |
| **The full sheet, five checks, all ten counties** | G1 the county's notice (and for video or phone, the link or number; a room letter alone is not a link); G2 the consultant's own yes for the slot; G3 the office's record of our representative; G4 the clerk's receipt and the consultant's GOT IT, both for the current file version; G5 anything owed, with the homeowner's written yes first. A proof cell takes a link or nothing. Status and the daily list are formulas, in working days with each county's holidays | About 4 added minutes a hearing by hand [estimate, not timed]. No check is dropped in the peak: the timed hearings show which step costs minutes, and that step is fixed first |
| **The tabs behind the rows** | Offices: one row per office, its route, deadlines, rules and amber questions. Bench: each consultant's contact, counties, states, cap and promised days. Availability: "free" and "not free" rows from messages. Who can take it: a ranked list per docket. Calendar and Calendar file: built from the sheet, never edited by consultants. Notices on file: SEND IT, OK or VOID. Record check: the case record against the sheet every Friday | In the example 11 of 24 records disagree, the same 11 the hand audit found [measured] |
| **The docket, offered whole** | Every Monday one numbered offer and one day-before text per office-day, written by formulas. "Tell the office" lists who attends, from yes replies only, in the office's own form. "Ask next" lists whom to offer an open docket to | None |
| **AI readers**, suggest-only | Two readers propose each proof link with the words they rely on: 103 proposals for the example week, 63 to close a proof cell; 8 of 72 messages to a person [measured, recorded answers]. A person accepts links at 9:00 a.m. | Under $80 a year in model fees at 5,000 hearings [measured price]; a mailbox export, about three days of technical help [estimate] |
| **Day before and morning of** | In person: YES the day before, with one clock time; ARRIVED by then. Video or phone: link confirmed the day before. A dropout is one "not free" row: the hearing turns open and red, and the offer goes down Ask next with a one-hour deadline. At 4 p.m. the office's alternate takes the docket; overnight the evening reader texts everyone in Ask next and the first YES wins | A text line at about $1,000 a year [one vendor's list price] |
| **Consultant terms** | A season letter, signed by mid-March. Today's rate kept. Whole dockets first; paid every Friday; a guaranteed day after ten full days. Date requests go through the firm. A consultant who leaves a hearing loses access to its files | No margin cost |
| **The bench** | Owned by the associate; Alice signs terms. Recruiting from December: the state register, 20 calls a week, two trial dockets each | 16 names at 1,000 hearings and 79 at 5,000 at 2.4 hearings a day; 6 to 10 at 300 [estimate] |
| **Homeowner intake** | Agent appointment, evidence and text consent move to sign-up | Copy change |
| **A bought tracker, before any build** | Reminders, locked cells and history | About $12 to $24 a user a month [unverified]; two quotes |

Phase 0 is not a saving and is not sold as one. It buys reliability and capacity for about $10,000 of payroll, and every working target in §10 is reset from its numbers at the live-week-4 review.

## 6. Readiness gates: how the firm knows the work is complete

The gates that apply to a hearing come from its county's playbook. A hearing is **READY** only when every gate is closed by its authoritative source.

| Gate | Authoritative source | Other inputs count as | Packet failures it catches |
|---|---|---|---|
| **G0 Authority to represent** (where required) | The office has the agent designation on file | Pending | Not in the packet; Texas Form 50-162 [sourced] |
| **G1 Official schedule** | The office, in writing | A phone call is provisional; a calendar edit is a change request | Garden (9 to 12), Orchard (17 to 18), Linden (45 to 48) |
| **G2 Consultant committed** | The consultant's acceptance of that case, plus capacity, travel and conflict checks | "Usually free" is tentative; "yes if moved" is conditional | Willow (2 to 5), Orchard (14) |
| **G3 Representative recorded** | The office's acknowledgment | "Sent", a voicemail, "can't find it" are pending | Tesswick (21 to 24), Orchard (16) |
| **G4 Current packet by the deadline** | Current version; clerk and consultant receipts; readable | Old link or unreadable file fails | Elm (33 to 36) |
| **G5 Obligations cleared** | The office's processing | Firm "sent" or internal "canceled" are pending | Birch (27 to 30), Maple (51 to 54), Clover (57 to 60) |

A commitment is tied to a slot: if the office moves the hearing, G2 reopens (Linden, messages 47 to 48). **CLOSED** needs the outcome report, any post-hearing filing acknowledged, and the written decision. **READY by the playbook deadline** is the north-star metric.

## 7. Architecture (the later control tower)

Seven stages, woken between messages by timers (14 days, 48 hours, 24 hours and 2 hours ahead, inside each office's hours):

1. INGEST email, SMS, phone, mail and calendar.
2. RESOLVE the case on two keys.
3. EXTRACT typed claims with the AI readers.
4. VERIFY quoted spans and schema.
5. RECONCILE against the authority table and the playbook.
6. PLAN the gates, next actions and staffing.
7. ACT through an outbox, by autonomy level. Exceptions, approvals and calls go to a person.

### How work is divided between AI, code and people

- **AI does the reading, writing, proposing and learning.**
- **Code holds authority, state and deadlines.**
- **People hold judgment and accountability.**

Autonomy is earned per action type from measured accuracy, so the system can do more as models and data improve, without a redesign.

| # | Job AI does | Example from the packet |
|---|---|---|
| 1 | Read every inbound message into typed claims | All 72 messages |
| 2 | Check documents: legible, right case, right signer, current version | The unreadable photo (29 to 30); the wrong signer (28) |
| 3 | Draft outbound messages inside the county's template | Larkmere notice; Tesswick form |
| 4 | Answer consultant questions from ledger facts | "Which date am I covering?" (12) |
| 5 | Propose a plan for each exception, with evidence | Brook Road illness (41) |
| 6 | Draft a new county's playbook; propose a change on drift | Tesswick's new rule (22) |
| 7 | Give staff a plain-language view of the ledger | "Which hearings next week are not ready, and why?" |
| 8 | Turn each human correction into a test case | A fixed misreading cannot silently return |

Letting a model edit the case record directly would be simpler to build, and it could not be audited, replayed or measured.

### Control loop

The system stores evidence, not a to-do list. After every event, and on a one-minute tick, it recomputes:

> work to do now = gates the playbook requires by their deadlines − gates already closed by evidence

Duplicates and out-of-order messages are harmless; a change invalidates old plans automatically; a crash loses nothing; better models can be replayed over history.

### Data model

| Table | Holds |
|---|---|
| `message` | Every item in and out, its channel, verified sender and hash |
| `claim` | What the reader extracted, with the quoted span, model and verifier result |
| `event` | The append-only ledger, each event linked to a claim |
| `case_state`, `gate` | Projections rebuilt from events |
| `action` | The outbox: kind, payload, autonomy level, idempotency key, approver |
| `playbook_version` | County rules, each field with a source link and date |
| `test_example` | Message plus expected claims, grown from corrections |

### Identity and trust

- **Authority attaches to a verified channel**, not to what a message says about itself. An unknown sender's claims are signals only.
- **Anyone can raise a flag; only the authority can clear it.**
- **Inbound text is untrusted.** The intake step has no tools and outputs claims only; those pass the verifier and the authority table. Sends are templated and approval-gated.

### Playbooks in layers

Over 3,000 US counties cannot be written one by one. Playbooks inherit in four layers: default, state, county, office. The county layer holds only its differences. An AI step drafts it and a person verifies it.

### Agents and their limits

Anthropic's guidance separates workflows (AI steps on fixed code paths) from agents (AI directs its own process) and recommends the simplest solution that works [sourced: anthropic.com/research/building-effective-agents]. This design uses workflow steps wherever a mistake could move a hearing, and an agent only where it proposes and a person decides.

| Role | Built as | May do | May never do |
|---|---|---|---|
| Intake | One AI call with a strict schema | Turn a message into claims with quoted spans | Write to the ledger |
| Verifier | Code | Reject a claim whose quote is not in the message | |
| Reconciler | Code | Apply the authority table; detect playbook drift | Accept a fact from the wrong source |
| Staffing | Code (exact solver) | Rank consultants per block; send offers | Assign without acceptance |
| Clerk liaison | AI drafting inside templates | Draft notices and chasers | Send withdrawals, settlements or date requests without approval |
| Exception resolver | AI agent, read-only tools | Propose a plan with evidence | Execute anything |
| Playbook | AI call plus human review | Draft a county playbook; propose a change | Publish unreviewed |
| Auditor | Scheduled code | Daily readiness sweep; weekly sample audit | |

| Job | Pattern | Why |
|---|---|---|
| Read a message | One AI call, fixed schema, then code checks | Cheapest to test and replay |
| A claim that closes a gate, sets a date or removes cover | Two independent reads that must agree | The failure that costs a hearing; 44 of 55 inbound messages [measured], about $0.02 each [estimate] |
| Decide what happens next | Code: the control loop and authority table | The same evidence must always give the same plan |
| Draft an outbound message | Template plus AI wording, then a code check that every date, name and case matches the ledger | The model cannot add a fact |
| Resolve an exception | One agent, read-only tools, a step limit | The only open-ended job; a person decides |
| Onboard a county | A research agent drafts with a source per field; a second checks each field; a person approves | The term that grows with expansion |
| Improve | Every correction becomes a test; a new prompt or model must beat the current one on history | No silent regression |

Three rules on top: autonomy follows measurement (automate only when the lower bound of measured precision clears a bar, for example 99% [estimate]); the system degrades safely (if the AI service is down, messages queue and nothing is sent automatically); and no agents debating each message, no free agent-to-agent calls, no AI voice calls to clerks.

### Autonomy ladder

Each (county, action) pair sits at **L0** draft only, **L1** one-click approve, or **L2** auto-send and log.

| Action | Highest level |
|---|---|
| Offers, reminders and schedule updates to consultants | L2 |
| Staffing notice, packet transmittal, receipt chaser to an office | L2 after promotion |
| Date-change request to an office | L1 |
| Withdrawal, settlement, anything signed | L0 |

A pair is promoted after 30 approvals in a row with no edits [estimate] and demoted on any edit or error.

### Staffing, the consultant's view, homeowner changes

- **Staffing.** Offers per block, acceptance per case (Willow, message 5). Constraints: eligibility by state and county, daily cap, travel gaps (60 minutes in person across counties, 15 for video), stated availability. A county-day is small enough for exact search in milliseconds. Under 24 hours, offers go to all feasible consultants at once and the first acceptance wins.
- **Consultant view (no login).** A link per assignment shows the official schedule read-only; accept or decline per case by tap or text; "request a change" files a request and never moves the hearing; the packet link always opens the current version; signature tasks check the signer against the office's record (that would have stopped message 28); access ends when the consultant leaves the hearing.
- **Homeowner changes.** An office message about a homeowner request opens a workflow: confirm with the homeowner, re-run G1, G2 and G5, tell the consultant.

### Tech stack

| Layer | Choice | Not chosen, or later |
|---|---|---|
| Language | TypeScript on Node.js, one codebase | Python only for an industrial solver |
| System of record | Managed Postgres: append-only events plus projections | Event streaming; Sheets or Airtable after Phase 0 |
| Jobs | Postgres-backed queue with a transactional outbox | Temporal or Inngest for long multi-step sends |
| AI model | One strong model behind one interface; about $0.02 a message [estimate] | A cheaper tier only where the test set shows equal accuracy |
| AI interface | Structured outputs, prompt caching, batch replays, vision, tool use | Agent frameworks; fine-tuning; a vector database |
| Staff interface | Readiness board and approval queue, plus an MCP server over the ledger | Retool if speed matters more |
| Email | The firm's own mailbox via Gmail or Microsoft Graph, push plus resync | A separate parse address |
| Text and voice | Twilio, business-registered; people make calls | AI voice calls, only after legal review |
| Paper mail, documents, signatures | A scanning API; hashed object storage with one current link per case; e-signature where the county accepts it | |

**Compute is not the constraint.** 50,000 hearings a year is about 22,500 messages in a peak week, one every 6 seconds in office hours [estimate]. What must scale is human review and county onboarding.

## 8. System failure modes and their detectors

| Failure | Detector | Response |
|---|---|---|
| A message is missed | Resync; expected-response timers | Chase by the playbook channel; a call if overdue |
| Wrong case matched | Two-key rule; conflicts; weekly sample audit | Person; corrections appended, never overwritten |
| Spoofed or unknown sender | Verified-channel check | Claims kept as signals only |
| Text that tries to instruct the AI | Intake has no tools; verifier and authority table | Rejected or held |
| AI misreads | Span and plausibility checks; second read on high-impact claims | A person corrects; the correction becomes a test |
| AI service down | Health check | Queue; no automatic sends |
| Duplicate or wrong send | Idempotent outbox; approval at L0 and L1 | Retraction; demote autonomy |
| Stale playbook | Drift detection; yearly re-check | New version with an evidence link |
| Consultant goes silent | Re-confirm 24 hours ahead; no reply by 20 hours goes to the backup | Cascade offers |
| Platform outage | Daily readiness export | Manual fallback on the same gates |

## 9. Where people are needed

| Task | Why it stays human | How it shrinks |
|---|---|---|
| Exceptions | Judgment; cost of errors | Prevention; proposed plans |
| Calls to clerks | Phone and recording law; relationships | Script plus structured note; steer offices to writing |
| Approving office-facing sends | High stakes | Autonomy ladder |
| Withdrawals, settlements, signatures | Homeowner consent; law | Pre-filled, signer-checked packets |
| New-county playbook | Research and verification | AI-drafted, person-verified; 4 to 12 hours a county [estimate] |
| Recruiting and consultant quality | Trust | Reliability scores |

This season a person also accepts every proof link, sends every offer and notice, and decides every reply the rule does not file.

## 10. KPIs

Each goal has one measure. Every target is a working target until the live-week-4 review replaces my estimates with the firm's own count.

| Goal | KPI | Now and working target |
|---|---|---|
| **Fewer errors** | Hearings inside 3 working days with no consultant's yes that counts | 4 of 11 in the example week [measured]; target none |
| | Case records that disagree with the sheet | 11 of 24 [measured]; under 1 in 20 on the Friday check |
| | READY three working days ahead | 2 of 11 in the example week [measured]; 90% by live week 6 |
| | Appeals lost because nobody appeared | Counted on day 1; target none, evidence on file for every hearing |
| **Less human work** | Coordinator minutes per hearing | From payroll, split by task in live week 1. 19.6 productive today; 18.7 to 19.6 with the plan [estimate]; about 12 with the tower [simulated]. No saving claimed for season one |
| | Coordinators per 1,000 peak-week hearings (the scaling measure) | 10.9 today; 9.9 to 8.8 with the plan; 4.8 with the tower [estimate] |
| **More hearings** | Hearings per consultant-day | 1.7 on the example sheet [measured]; 2.4 by season end |
| **Cost** | Cost per hearing held | $104 today, $103 with the plan at 300 [estimate]; not above $106 in season one |
| Guardrail | Results by format and consultant | Must not fall as days get fuller |
| Quality | Record accuracy | Friday sample of 10 hearings' proof links, by someone who does not keep the sheet |
| Consultants | Cover | Yes by the offer deadline; at least two names per office a month before the first notices |
| Cash | Days from hearing to fee | Counted on day 1 |
| Tower | Touches per hearing; time to cover a cancellation; new-county time to live | Counted automatically |

## 11. Scaling model

**Baseline today** [estimate on measured counts]: the packet's 55 inbound messages (35 routine, 20 exceptions) and 17 firm actions cost about **19.6 minutes a hearing**, range 10.5 to 31.8.

> human minutes = exceptions × (1 − prevention) × resolution minutes + office actions × review share × review minutes + onboarding hours × 60 ÷ hearings per county a year

| Scenario | Prevention | Resolution min | Review | Minutes a hearing |
|---|---|---|---|---|
| Pessimistic | 0% | 15 | 100% at 2 min | 14.5 |
| Launch | 0% | 7.5 | 100% at 1 min | 7.2 |
| Mature | 40% | 7.5 | 20% at 1 min | 4.0 |

More hearings: routine messages drop out of the per-hearing cost. More counties: each adds one-time hours (8 hours at 200 hearings a year is 2.4 minutes a hearing in year one). The result depends most on the exception rate, then resolution minutes, then prevention. These must be measured.

## 12. Priorities and timeline

Staffing: the associate, with AI coding tools, and a contractor for a security review. No dedicated engineer below about 19,000 hearings a year. Dates follow the Texas calendar as the example; day 1 fixes the real dates per county.

| Phase | When | What | Exit test |
|---|---|---|---|
| **0. Count, then control (first)** | Four desk weeks from December, then four live weeks in the first county that hears | Desk: Alice's four numbers, the count of last season, the text line, scripts, bench calls. Live week 1: new messages and the reply rule; 25 hearings timed. Week 2: full sheet in all ten counties beside the case record. Week 3: hand-over. Week 4: review with Alice | The four numbers are known; the costliest step is fixed first |
| Readers beside the sheet | From live week 2, if Alice and counsel agreed | Suggest-only | Kept only if they clearly save time with no wrong closing accepted |
| Bench and people | December to 1 April | 20 calls a week; two consultants per office by mid-March | A written yes from each |
| Friday record check | From live week 2 | Case record against the sheet | Sheet right more often for four live weeks |
| Bought tracker | When reminders and history hurt | | Two quotes |
| **Build decision** | September | Build the tower? | The firm's own minutes and forecast. My recommendation today: do not build |
| 1. Shadow | If built | Reads live mail beside the sheet; no sends | Two weeks matching the sheet, no wrong closing |
| 2. One county | Before that county's first notices | Outbox at L0 and L1, consultant link, timers, solver | Fewer minutes than today; zero wrong sends |
| 3. Scale | County by county | Portal and CSV connectors, e-signature, call transcription | A new county live in under a day |

**Why this order.** Phase 0 costs about $10,000 and every later decision depends on a number only it produces. The readers come in early because reading costs almost nothing and sends nothing. Each change is phased so it can be judged.

**The ladder.** At 1,000 hearings: one coordinator with peak help, one workbook, the readers; the bench starts to bind (20 to 33 names). At 5,000: a team per group of counties, a bought tracker, a dispatcher, about 95 bench names. At 20,000: the tower is required, about 310 bench names, and financing for a peak that ties up about $1.3 million.

**Season constraint.** Nothing new goes live in the middle of a peak. Texas boards hear most cases from May to August, Cook County from August to December, Florida from mid-September [sourced, `research/05`].

## 13. Build vs buy

| Approach | Verdict |
|---|---|
| Sheet, then a bought tracker | Right for Phase 0 and the step after. Cannot express evidence, authority or replay |
| Practice-management software (Clio) | Matter-centric; no programmable state engine |
| **If the build is triggered: build the engine, buy everything else** | Ledger and rules built; messaging, mail scanning, e-signature and internal screens bought |

## 14. Privacy and security

Signed, expiring per-assignment links; access removed when a consultant leaves a hearing; least-privilege roles, with the ledger as the audit log; encryption at rest; an AI provider that does not train on API data, with minimal retention; fields the model does not need are redacted; retention per state record rules.

## 15. What I am not sure about

| Uncertainty | Why it matters | How it gets resolved |
|---|---|---|
| Real exception rate (36% in the packet) | Drives the scaling model | Phase 0 and shadow counts |
| AI accuracy on real messages | Sets how much runs without review | A labelled set from shadow mode |
| Alice's volume, fees and consultant pay | Decide build or not | Day 1; §4 recomputes in seconds |
| Whether offices will group the firm's hearings | Sets how far batching goes | Ask the 10 offices |
| Who may appear and sign in each state | Legal exposure | Counsel's answer, typed in Bench S |

## 16. Prototype (`node` only, no installs)

This section describes the control tower's prototype. The season-one tools, with every command and the line it prints, are in `prototype/README.md` (run on Node 22). Hearing Desk, the web app, is described in the README.

1. **Replay** all 72 packet messages on a simulated clock: the readiness board, the evidence behind each fact and the exception queue update live.
2. **Fix a gap:** the solver ranks consultants with reasons and drafts the county-specific notice and offer.
3. **Counties as data:** the Tesswick drift is detected and proposed as a playbook change.
4. **Try your own message** and see the claims and state change.
5. **Scaling and economics** with sliders for every assumption in §4 and §11.

`rules` is an offline reader that always works; the live reader needs a key. Every result says which produced it. The prototype keeps the production module boundaries, with in-memory state and simulated channels so it runs with one command.

## 17. What the build showed

Where this section and sections 1 to 16 disagree, this section is current.

### Results

| Question | Result | Label |
|---|---|---|
| Does the engine handle the problems in the packet? | 216 of 216 checks pass: 63 from the examples, 81 beyond them, 72 on the season-one tools and their agreement with the sheet | measured |
| Can an office's answer be played without the tower? | `node cli/office.js` plays each office; 91 of 91 checks. On 30 unseen office messages the fixed rule sorts 13 right and hands 24 to a person | measured, small set |
| May agreed reader proposals file themselves? | Not this season (§0a) | measured, recorded runs |
| Is it safe when the reader is wrong or attacked? | 0 of 7 safety rules broken in 45,300 hearings; forged and injected messages change nothing | simulated |
| Does human work stay flat with volume? | 5.6 to 5.8 person-minutes a hearing from 100 to 3,200 hearings | simulated, minutes estimated |
| With counties? | 5.5 rising to 7.1 from 5 to 160 counties | simulated, minutes estimated |
| Unseen office messages | 51 of 57 statements found (89%), 51 of 53 applied right (96%), 8 of 30 to a person | measured, small set |
| Cost of reading | $0.0035 a message for two readers; 1 to 2 cents a hearing | measured |
| Does the gate sheet show the example threads as a careful coordinator would? | 180 pass lines, 0 FAIL | measured |
| Does the sheet hold at volume? | 893,010 cells, 0 differences from an independent model on nine generated worlds; not re-run on Part L | measured by the tester, LibreOffice only |
| Does the reply rule decide as a coordinator would? | 39 of 39 example replies (17 filed, 22 to a person); a YES over the daily cap goes to a person | measured; the rule's author wrote the replies |
| Does the Friday record check find the drift? | 11 of 24 records, the same 11 the hand audit found | measured |

### Principles the build added

1. **Two keys to close, one to open.** A statement that closes a gate needs both readers; one that opens work needs one.
2. **Speech is not writing.** A voicemail transcript opens work and closes nothing.
3. **Add measured reading back.** With measured shares to a person (11% on examples, 27% unseen), a typical season costs 6.1 to 14.9 person-minutes a hearing, not 5.6. Reading is the largest remaining cost.
4. **A cut-off answer is asked again with twice the room**, and its cost is counted.

### Where the prototype differs from the design

| Design | As built | Why |
|---|---|---|
| One model provider, about $0.02 a message | Two OpenAI models, one checking the other, $0.0035 a message (measured) | The key available was an OpenAI key. A Claude adapter exists and never ran live |
| Gate G0 | Not built | No example in the packet |
| TypeScript, Postgres, real channels | Plain JavaScript, state in memory, simulated channels | So the firm can open one file and play |
| A multi-part held-out set | One part, 30 office messages, plus a second set of 100 everyday messages | Time |
| The reply rule on the live text line and mailbox | Built and tested on examples; not connected | About three days of the firm's technical help |
| Exception resolver, county research agent, consultant link, MCP server | Not built | Out of scope for the first priority |

### The two baselines

| | By hand | With the tower | Reduction |
|---|---|---|---|
| Desk estimate (§4, §11) | 19.6 | 7.2 at launch, 4.0 mature | 63% to 80% |
| Simulation, with measured reading added | 37.5 | 6.1 to 14.9 | 60% to 84% |

Both agree on the relative result. The absolute saving, about $8 to $23 a hearing, depends on the baseline, and only a timed week at the firm settles it. The full list of what is not known is in `PROBLEM_COVERAGE.md`, sections 6 to 9. Earlier versions of this document are in the Git history.

## 18. The workflows the firm already has

The brief says the firm already has workflows for case records, document collection and notifications. The plan keeps all three and changes how each is checked.

| Workflow | What the plan does this season | Question for the firm |
|---|---|---|
| **Case records** | Kept as the system of record. Every Friday its export is pasted into the Record check tab, which lists each record that disagrees with the sheet (11 of 24 in the example [measured]). A person corrects them the same day | Can the case system import a CSV, so corrections are not typed twice? (Day 1 count B22) |
| **Document collection** | Kept. The homeowner's evidence is asked for at intake, not in the week of the hearing. The sheet tracks case files by version and anything owed to an office. A consultant who leaves a hearing loses access to its files (Hearings EC) | None new |
| **Notifications** | Kept. Homeowner notices go by today's tool; the sheet says which notice is missing or wrong. Consultants are reached by the text line and the shared mailbox | Which tool sends homeowner notices, and can it send from a list? (Day 1 count B23) |

What changes: consultants are offered whole dockets and answer in a fixed form; an office hears a name only after the consultant's yes; date requests go through the firm; and the case record is not trusted until Friday's check agrees with it.
