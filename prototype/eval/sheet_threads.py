"""The week-one gate sheet against the 11 example threads.

For each thread of the example packet this checks what the sheet shows for its hearings on the
example day (7 June 2030), against what a careful coordinator would want to see. It reads the
values the sheet computed when it was last saved, so it needs only Python 3 and openpyxl:

    python3 prototype/eval/sheet_threads.py [path/to/gate-sheet.xlsx]

With no argument it reads deliverables/gate-sheet.xlsx beside the prototype folder, found from this file's own
place, so it can be run from any directory.

Part seven (round 15c, after the independent test) checks the fixes for the faults F1 to F4: Offices P empty, a record time
against a time typed as text, a row that was cut and pasted or dragged, and a text time after a sort.

Part eight (round 15c, second fix round) checks the fixes for the faults F5 to F7: one typed cell cut and pasted to another
row, an error value in Dockets A1 after Delete cells, and the text-time warning on a row that is out of date order.

Part nine (round 15c, third fix round) checks the faults F8 and F9 (cells shifted to the side; a typed cell cut and pasted to
another tab), a date typed as text, the wording of How to use rows 2 and 14 and of the Reader suggestions tab (the counts are
counted here from the cells), the HOLD sentence, and the six questions for the firm on rows 20 to 25 of the Day 1 count tab.
One expectation of part six changed on purpose in this round: column C of the office proposal no longer starts with
"HOLD: the office changed how it works." It now holds the sentence that node cli/office.js prints, word for word: HOLD holds
only the change of the recorded route, and notices go by both routes until the office confirms the change in writing.

Part ten (round 16) checks the rules of Part I of the rule book on the example sheet: a changed office route is blocked until
a person approves it (D2), a notice the office cannot find (D3), the call the route needs (D4), DONE means done (R10), no
mobile number on file (X14), an illness report (X17), the iCalendar tab and the daylight-time hour (X9), a date-change request
without the homeowner's yes (C1), a settlement (C2), an owed document that the case files may already hold (C3), and the
leftover wording. Expectations of the earlier parts changed on purpose in round 16, each because the behaviour was changed:
  - thread A, AX-102: the daily list adds ILLNESS REPORTED (Maya reported ill on June 5, message 41; the hearing is on June 10);
  - thread D, AX-107 and AX-108: the daily list adds NOTICE BLOCKED and OFFICE CANNOT FIND OUR NOTICE; column BE and Dockets N
    print the block sentence and no route (they printed both routes), because nobody has approved the Tesswick change;
  - thread K, all four rows: column BE ends with the line that the consultant has no mobile number on file;
  - S6: the office's own route is printed on AX-102 and AX-109 only; S14: Bench Q flags all six consultants (no number on file);
  - F8: the last formula column is CZ and the first empty column is DA; F9: 54 typed columns, not 48;
  - HOLD: the sentence is the new one (the block), and "no cell says that no notice goes out" is turned round;
  - Ask: the questions for the firm stand on rows 20 to 28, not 20 to 25.

Round 18 (Part K of the rule book; sheet with Hearings columns DQ to EA, Offices BA and BB): a thirteenth part of checks K1 to K9.
Expectations of earlier parts changed on purpose in round 18, each because the behaviour was changed:
  - thread C, AX-105: OPEN: 4 missing, not 3. The office recorded Nora Pell (message 16) while the hearing was on June 12; the office
    then moved it to June 18 (message 17), so that record does not count for the new date and column BE prints the question (K1);
  - thread H, AX-115: the daily list adds CALL THE HOMEOWNER: the office moved the hearing (message 47) and no link shows that the
    homeowner has the new date (K2);
  - thread K, AX-121 and AX-122: column BE ends with the line that the office's street address is not on record (K5);
  - S11 (Calendar) and J6 (day-before text): an in-person place reads "<county> hearing office: ADDRESS NOT ON RECORD: Offices BA<row>"
    and "at the <county> office (ADDRESS NOT ON RECORD: Offices BA<row>)" (K5);
  - F5, F8, F9, F-4, A14: the last formula column is EA and the column that stays empty is EB (heading in EB1); 71 typed columns, not 63;
    the 80-row copy has 40,994 formulas;
  - Ask: the questions for the firm stand on rows 20 to 32 (row 32 is the street address of an office that hears in person);
  - D4: column AA of the two Tesswick rows holds a date (Monday, June 10), not words, and DX holds the day message 24 is read as
    having arrived (K6); the call line of BE prints "by Mon 10 Jun";
  - J4 and J8: the questions in Offices AY and AZ name both numbers (question 14 and question 15 of the season email to offices,
    numbers 38 and 40 in the kit's list) (K7); the Offices tab has 54 columns;
  - J7 and F17-2: column DO = 1 on five rows, AX-115 is the fifth (K2);
  - J: column BE holds the text of DP, then the text of EA, at its end or just before the TELL line.
A later fix added one check to part thirteen ("K, fix"): Measures B98 reads column DY (F18-1), Dockets A1 names a date
typed as text in DQ, DR, DW or DX (F18-2), and How to use names column EA, not CZ, among the columns A1 watches (F18-A).

Round 19 (Part L of the rule book; sheet with Hearings columns EB to ED, Bench S and T, Who can take it BE): a fourteenth part of checks L1 to L3.
Expectations of earlier parts changed on purpose in round 19, each because the behaviour was changed:
  - thread G, AX-113 and AX-114: column BE is no longer empty: it prints the line that Maya Venn is named in BC and that her access to
    the case files is removed and the date typed in EC, or "files were never sent" typed there (L3; messages 38, 41 and 42);
  - X14: the names of Ask next are counted before the warning of L2 (the names before the warning carry the marks);
  - F5, F9: 73 typed columns, not 71 (EB and EC);
  - F8, F-4, A14, K, "K, fix": the last formula column is ED and the column that stays empty is EE (heading in EE1); the 80-row
    copy has the number of formulas measured for it in round 19;
  - Ask: the questions for the firm stand on rows 20 to 33 (row 33 is the states in which each consultant may appear and sign);
  - J: column BE holds the text of DP, then EA, then ED, at its end or just before the TELL line;
  - K9: 220 cells start with ASK (213 before: the six questions of Bench S and Day 1 count B33 were added).

Round 17 (Part J of the rule book; sheet with Hearings columns DA to DP): a twelfth part of checks J1 to J11.
Expectations of earlier parts changed on purpose in this pass, each because the behaviour was changed:
  - thread A, AX-101: the daily list adds OPENING NOT ARRANGED (J3: first case at opening, one working day ahead, no arrangement linked in DB);
  - thread A, AX-102: the daily list adds ARRIVAL NOT SETTLED (J6: Maya said she cannot get there for 9 a.m., message 5, Availability row 7);
  - threads C, E and I, AX-105, AX-109, AX-110, AX-117: the daily list adds CALL THE HOMEOWNER (J7; AX-105 by J4: the hearing was moved
    at our request and the homeowner's yes to the new date is not on record);
  - Dockets N says whose clock a time is on (J10): ", times are Tesswick office time (UTC-05:00)" after the day;
  - S15: the day-before text of a consultant with an unsettled arrival clash (AX-102) says that the arrival time is being settled
    and gives no clock time;
  - C2: the settlement line lists six things, the offer itself (DC) and its accept-by date (DD) first (J5);
  - F5, F8, F9, F-4: the last formula column is DP and the column that stays empty is DQ; 63 typed columns, not 54;
  - Ask: the questions stand on rows 20 to 31, not 20 to 28;
  - Offices: the proposals for the Offices tab end at the first empty row, because the proposals for the new cells are listed below them (J11).

The rule the sheet must keep: never show a hearing as READY, CONFIRMED or DONE that is not, put
every hearing that needs a person on the daily list or in its Status, and print in "Deadlines and
changes" (column BE) every office deadline, owed item, missing video link, out-of-date case file
and wrong name on an office's record that the messages show.

Round 14 (sheet v14): G1 also needs the video link or call-in number (column AV) for a video or
telephone hearing, column BE prints more lines, and the readers now place the dates of AX-107 and
AX-113. The second part checks the new tabs: Notices on file, Dockets, Who can take it, Calendar.

Round 14b (sheet v14b): three more checks on the other tabs: the notice for 42 Birch Lane (AX-110) names
the county it lacks, the Larkmere offer for June 10 (the next working day) asks for an answer within one
hour, and who signs the 42 Birch Lane withdrawal follows Brindlefen's rule (message 28).

Round 15 (sheet with Hearings columns BW to CB): a third part checks the rules S1 to S5 on the example sheet.
S1 a GOT IT (M) and a day-before YES (Q) count only for the consultant named beside them (BW, BX). S2 a case
record that says "canceled" is contradicted until the office's written proof is in AF, and a typed "tell the
consultant" (BN) with no OK (BO) is always printed and always on the daily list. S3 a send-by moment is past by the
hour (Settings B15, 2:00 PM in the example). S4 the daily cap counts offers that are out (BY, BZ) and the Measures
tab counts consultants over their cap. S5 every text to a consultant says once that times are the office's local
time with the offset from Offices W, and the Calendar tab has a column for it and no stray cells below the events.
One expectation of the first part changed on purpose with S3: AX-101's case-file line now reads PAST THE 48-HOUR
MARK, because its send-by moment (Fri 7 Jun at 9:00 AM) is before the example's time of day (2:00 PM).
What happens when inputs change (a replacement, an offer out, the clock) cannot be seen in saved values; those
runs are in the sheet engineer's scratch tests (patch/r30_scratch_tests.py in the build notes).

Round 15, second pass (sheet with Hearings columns CC to CG): a fourth part checks the rules S6 to S10.
S6 an office's own rules are read by formulas: a standing naming deadline (Offices AF, empty in the example because the
packet states none), who signs as a fixed choice (Offices AC, AG), the office's own travel gaps (AI, AJ), the fields its
notice or form carries (AK, checked on Notices on file), the office's own route in column BE, and a missed hearing or a
"DONE: n proofs missing" row that stays on the daily list. S7 forty consultants, and a warning for names the formulas do
not read. S8 NO HOMEOWNER NOTICE ON RECORD. S9 Measures B18 holds a formula, and a partial decline. S10 the example shows
the sheet after the 9:00 a.m. person pass.
Expectations changed on purpose in this pass, each because the behaviour was changed:
  - thread K (AX-121 to AX-124): column BE is no longer empty on these READY rows; it reads exactly
    "NO HOMEOWNER NOTICE ON RECORD: SEND IT, THEN TYPE THE NAME AND DATE ON IT IN BK AND BL." (S8);
  - the Calendar holds 17 events, not 15, and column BZ names 17 hearings, not 15: the two Juniper Reach hearings of
    June 4 now hold Owen's own yes from message 56, which a person filed in the 9:00 a.m. pass (S10);
  - the Notices on file line for 42 Birch Lane ends with the office's own field list from Offices AK (S6).
The scratch runs for these rules are in patch/r31_scratch_tests.py in the build notes.

Round 15c, the final pass: a sixth part of five checks. The Reader suggestions tab prints, for each proposal, the readers'
words for that check itself, and lists at its foot the office rule's proposals for the Offices tab (a HOLD on Offices M, for a
person). The arrival time in CH belongs to the consultant who gave it: it is cleared on a replacement, How to use says so, and no
example row prints a time of another consultant. No expectation of an earlier part changed in this pass. What the lines say after
a replacement is in the scratch runs (patch/r33_scratch_s1_s5.py in the build notes).

Round 15, third pass (brief round15b; sheet with Hearings columns CH to CO): a fifth part checks the rules S11 to S16.
S11 a video "room" is not a link: a video or telephone hearing has its link only when column AV holds a link or a number of
seven or more digits, or the office has said that the room letter is all it sends (Offices AL; column CJ holds the result).
S12 the current case-file version (AX) is on every row, and a receipt that names no version does not close the files check.
S13 a hearing that starts less than 30 minutes after its office opens is flagged from two working days before. S14 the Bench
tab asks for a mobile number and the agreement to be texted, and flags a preferred channel without a number and Nora's two
channels. S15 the day-before text gives the arrival time as a clock time, and a consultant's own later time is answered.
S16 an office's own hearing length (Offices AP) is used by the travel check, the "not free" check and the Calendar.
Expectations changed on purpose in this pass, each because the behaviour was changed:
  - thread K, AX-123 and AX-124 (the clean Velloran thread, messages 67 to 72): READY became "OPEN: 3 missing" on the
    TOP OF LIST. Room C is not a link (S11), and "Both packets received." (70) and "Files reviewed." (71) name no version (S12);
  - thread K, AX-121 and AX-122 stay READY, and column BE now also prints Leo's own arrival time against the firm's (S15);
  - thread I, AX-117 and AX-118: 2 more proofs missing each: "packets received" (49) and "I have both case files" (50) name no version (S12);
  - thread H, AX-115: 5 missing, not 4: room D is not a link (S11);
  - the SEND CASE FILES lines name VERSION 2 instead of "(the current version)", because AX is now filled on every row (S12);
  - Dockets, Velloran June 11: the day-before text now reads DO NOT SEND YET (S11), so the example holds 6 texts to consultants, not 7;
  - the two Brook Road rows hold AX = 2, and "Hearings held with a proof missing" is 5, not 4: AX-120 was held with receipts that name no version (S12).
The scratch runs for these rules are in patch/r32_scratch_tests.py in the build notes.
"""
import sys, os, datetime
from openpyxl import load_workbook

def _NN(name, mail, word): return (f" {name} HAS NO MOBILE NUMBER ON FILE (Bench O): THE DAY-BEFORE MESSAGE GOES BY EMAIL ({mail}@consultants.example), AND NO NOON CALL AND NO ARRIVAL CALL CAN REACH THEM."
                                  f" ASK FOR THEIR NUMBER IN THAT EMAIL, AND ASK THEM TO ANSWER IT WITH YES AND TO EMAIL {word} ON THE DAY.")
EXPECT = [
    # thread, case, Status, daily list (None = empty), text that must be in "Deadlines and changes" (None = empty; several = all of them; a list = the whole cell, exactly), what the thread is about
    ('A', 'AX-101', 'OPEN: 4 missing', 'TOP OF LIST CONFIRM TODAY OPENING NOT ARRANGED', ('OFFICE DEADLINE Fri 7 Jun at 4:00 PM', 'THE OFFICE HAS ASKED 3 TIMES', 'SEND CASE FILES VERSION 2 TO THE CLERK (the consultant confirmed none; the clerk confirmed none): PAST THE 48-HOUR MARK (Fri 7 Jun at 9:00 AM): SEND NOW AND ASK THE CLERK TO ACCEPT LATE FILES', 'FIRST CASE AT OPENING'),
     'Maya said "usually free", then took only the 9:30. 9:00 has nobody and Maya is on "Declined by"; the office asked three times and wants names by 4 p.m.; its files go to the clerk only, and at 2:00 p.m. their 9:00 a.m. send-by has passed'),
    ('A', 'AX-102', 'OPEN: 3 missing', 'TOP OF LIST CONFIRM TODAY ILLNESS REPORTED ARRIVAL NOT SETTLED', ('OFFICE DEADLINE Fri 7 Jun at 4:00 PM', 'SEND CASE FILES VERSION 2 TO THE CONSULTANT AND THE CLERK', 'MAYA VENN REPORTED ILL ON Wed 5 Jun: ASK TODAY WHETHER THEY WILL ATTEND'),
     "Maya's own yes covers 9:30 only; the county has not recorded her yet; the files for her one hearing go to her and the clerk"),
    ('B', 'AX-103', 'OPEN: 5 missing', 'TOP OF LIST', ('NO VIDEO LINK YET', 'TELL Leo Arlen'),
     'Calendar edited to June 13 and "works for me": the county kept June 11, so the row stays on June 11 with nobody; no video link yet; Leo is told the date stands'),
    ('B', 'AX-104', 'OPEN: 5 missing', 'TOP OF LIST', ('NO VIDEO LINK YET', 'TELL Leo Arlen'), 'Same as AX-103'),
    ('C', 'AX-105', 'OPEN: 4 missing', 'REVIEW CALL THE HOMEOWNER', ('NO VIDEO LINK YET', 'THE HEARING WAS MOVED AT OUR REQUEST', "THE LINK IN K DOES NOT COUNT FOR Tue 18 Jun: THE OFFICE'S RECORD IS FOR Wed 12 Jun. ASK THE ORIMERE OFFICE IN WRITING TODAY: IS Nora Pell STILL ON YOUR RECORD FOR Tue 18 Jun."),
     "The county moved this one to June 18 (17); in the 9:00 a.m. pass Nora's own message 18 is her yes for it; the office recorded her (16) while the hearing was on June 12, so that record does not count for June 18 and the office is asked (round 18, K1); the video link and the files are still missing"),
    ('C', 'AX-106', 'OPEN: 5 missing', 'TOP OF LIST', ('NO VIDEO LINK YET', 'TELL Nora Pell'),
     'The county refused to move this one: still June 12, nobody; Nora on "Declined by" and told it is not hers; no video link yet'),
    ('D', 'AX-107', 'OPEN: 3 missing', 'TOP OF LIST NOTICE BLOCKED OFFICE CANNOT FIND OUR NOTICE', ('NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY', 'SEND CASE FILES VERSION 2 TO THE CONSULTANT AND THE CLERK', 'OWEN TARRIS SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY.'),
     "The readers now place its date (message 19, June 12 at 11 a.m.) and Owen's yes (20); as AX-108, nobody on the office's record in writing and no files sent"),
    ('D', 'AX-108', 'OPEN: 3 missing', 'TOP OF LIST NOTICE BLOCKED OFFICE CANNOT FIND OUR NOTICE', ('NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY', 'SEND CASE FILES VERSION 2 TO THE CONSULTANT AND THE CLERK', 'OWEN TARRIS SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY.'),
     'A voicemail and a phone call do not put Owen on record; the process changed by phone (Offices tab, column M); no files sent to Owen or the office'),
    ('E', 'AX-109', 'OPEN: 5 missing', 'REVIEW CALL THE HOMEOWNER', ("HOMEOWNER'S WRITTEN YES MISSING", 'NO VIDEO LINK YET'),
     "A settlement needs the homeowner's written yes, then Priya's signature; the firm's own file is not the office's record; no video link yet"),
    ('E', 'AX-110', 'OPEN: 4 missing', 'REVIEW CALL THE HOMEOWNER', ("HOMEOWNER'S WRITTEN YES MISSING", 'NO VIDEO LINK YET'),
     "Withdrawal signed by the wrong person, then an unreadable photo: owed, the homeowner's written yes not linked, the hearing stays on; no video link yet"),
    ('F', 'AX-111', 'OPEN: 2 missing', 'REVIEW', ('SEND CASE FILES VERSION 2 TO THE CONSULTANT (the consultant confirmed version 1; the clerk confirmed version 2)', 'NO VIDEO LINK YET'),
     "Eli's links open version 1; the clerk's receipt names this file (34); no video link yet"),
    ('F', 'AX-112', 'OPEN: 3 missing', 'REVIEW', ('SEND CASE FILES VERSION 2 TO THE CONSULTANT AND THE CLERK', 'NO VIDEO LINK YET'),
     'Same, the clerk could not open this file, and no video link yet'),
    ('G', 'AX-113', 'RESULT DUE', 'NOBODY NAMED: POSSIBLY MISSED', 'Maya Venn IS NAMED IN BC (DECLINED OR TAKEN OFF THIS HEARING): IF CASE FILES OR FOLDER LINKS FOR IT WENT TO THEM, REMOVE THEIR ACCESS TODAY',
     'The readers now place its date (message 37, June 6 at 9 a.m.); as AX-114, Maya ill, nobody confirmed, the hearing time has passed'),
    ('G', 'AX-114', 'RESULT DUE', 'NOBODY NAMED: POSSIBLY MISSED', 'Maya Venn IS NAMED IN BC (DECLINED OR TAKEN OFF THIS HEARING): IF CASE FILES OR FOLDER LINKS FOR IT WENT TO THEM, REMOVE THEIR ACCESS TODAY', 'Maya ill the evening before, nobody confirmed, the hearing time has passed'),
    ('H', 'AX-115', 'OPEN: 5 missing', 'REVIEW CALL THE HOMEOWNER', ('THE OFFICE HAS Leo Arlen, WHO IS NOT ON THIS HEARING', 'THE HEARING WAS MOVED FROM Thu 6 Jun TO Thu 13 Jun: A PERSON CALLS THE HOMEOWNER TODAY WITH THE NEW DATE', 'VIDEO ROOM ONLY, NO LINK: ASK THE OFFICE TODAY WHETHER A LINK COMES AND WHETHER THE ROOM IS AT THE OFFICE (Offices AL).', 'TELL Leo Arlen'),
     'The homeowner moved it to June 13; Leo cannot do June 13, so nobody, and the office still lists Leo; room D in column AV is a room letter, not a link'),
    ('H', 'AX-116', 'RESULT DUE', 'RESULT DUE', None, 'Held June 6, nobody reported the result'),
    ('I', 'AX-117', 'OPEN: 4 missing', 'REVIEW CALL THE HOMEOWNER', ("HOMEOWNER'S WRITTEN YES MISSING", 'NO VIDEO LINK YET', "THE CONSULTANT'S RECEIPT NAMES NO VERSION: ASK THEM TO REPLY GOT IT 2.", "THE CLERK'S RECEIPT NAMES NO FILES: SEND THE FILES EMAIL THAT NAMES EVERY FILE (VERSION 2) AND ASK FOR A REPLY TO IT."),
     'Marked "canceled" inside the firm, but the county has not processed the withdrawal: staffed, the withdrawal and the homeowner\'s written yes still owed, no video link yet'),
    ('I', 'AX-118', 'OPEN: 3 missing', 'REVIEW', ('NO VIDEO LINK YET', "THE CONSULTANT'S RECEIPT NAMES NO VERSION: ASK THEM TO REPLY GOT IT 2.", "THE CLERK'S RECEIPT NAMES NO FILES: SEND THE FILES EMAIL THAT NAMES EVERY FILE (VERSION 2) AND ASK FOR A REPLY TO IT."),
     'The other hearing is untouched, but the office has sent no video link (49), and "packets received" (49) and "I have both case files" (50) name no version, so it is not READY'),
    ('J', 'AX-119', 'OWED', 'TOP OF LIST: OWED', ('OWED: SEND BY Fri 7 Jun at 4:00 PM, because the office is closed on Sat 8 Jun', 'THE OFFICE HAS ASKED 2 TIMES'),
     'Statement due on a Saturday: must arrive by Friday, today; the office asked twice (59, 60)'),
    ('J', 'AX-120', 'ERROR DUE', 'ERROR DUE', "WAITING FOR THE BOARD'S WRITTEN DECISION",
     'Heard; Owen phoned in the result, but the error entry is still empty, and the written decision is still to come (59)'),
    ('K', 'AX-121', 'READY', 'CONFIRM TODAY', ['LEO ARLEN SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY. NO HOMEOWNER NOTICE ON RECORD: SEND IT, THEN TYPE THE NAME AND DATE ON IT IN BK AND BL.' + _NN('LEO ARLEN', 'leo', 'ARRIVED') + ' ADDRESS NOT ON RECORD: Offices BA2: ASK THE LARKMERE OFFICE TODAY FOR ITS STREET ADDRESS, THE HEARING ROOM AND WHERE TO REPORT, AND TYPE THE ANSWER THERE. THE DAY-BEFORE TEXT AND THE CALENDAR ENTRY PRINT IT.'],
     'A clean thread: Leo and the office both name the current packets (65, 66); the day-before YES is still due, so not yet CONFIRMED; Leo gave 10:45 as his arrival and the firm needs 10:30'),
    ('K', 'AX-122', 'READY', 'CONFIRM TODAY', ['LEO ARLEN SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY. NO HOMEOWNER NOTICE ON RECORD: SEND IT, THEN TYPE THE NAME AND DATE ON IT IN BK AND BL.' + _NN('LEO ARLEN', 'leo', 'ARRIVED') + ' ADDRESS NOT ON RECORD: Offices BA2: ASK THE LARKMERE OFFICE TODAY FOR ITS STREET ADDRESS, THE HEARING ROOM AND WHERE TO REPORT, AND TYPE THE ANSWER THERE. THE DAY-BEFORE TEXT AND THE CALENDAR ENTRY PRINT IT.'], 'Same'),
    ('K', 'AX-123', 'OPEN: 3 missing', 'TOP OF LIST', ["VIDEO ROOM ONLY, NO LINK: ASK THE OFFICE TODAY WHETHER A LINK COMES AND WHETHER THE ROOM IS AT THE OFFICE (Offices AL). THE CONSULTANT'S RECEIPT NAMES NO VERSION: ASK THEM TO REPLY GOT IT 2. THE CLERK'S RECEIPT NAMES NO FILES: SEND THE FILES EMAIL THAT NAMES EVERY FILE (VERSION 2) AND ASK FOR A REPLY TO IT. NO HOMEOWNER NOTICE ON RECORD: SEND IT, THEN TYPE THE NAME AND DATE ON IT IN BK AND BL." + _NN('OWEN TARRIS', 'owen', 'IN')],
     'The thread reads clean, but room C is a room letter and not a link (70), and "Both packets received." (70) and "Files reviewed." (71) name no version: three checks stay open, each with its question'),
    ('K', 'AX-124', 'OPEN: 3 missing', 'TOP OF LIST', ["VIDEO ROOM ONLY, NO LINK: ASK THE OFFICE TODAY WHETHER A LINK COMES AND WHETHER THE ROOM IS AT THE OFFICE (Offices AL). THE CONSULTANT'S RECEIPT NAMES NO VERSION: ASK THEM TO REPLY GOT IT 2. THE CLERK'S RECEIPT NAMES NO FILES: SEND THE FILES EMAIL THAT NAMES EVERY FILE (VERSION 2) AND ASK FOR A REPLY TO IT. NO HOMEOWNER NOTICE ON RECORD: SEND IT, THEN TYPE THE NAME AND DATE ON IT IN BK AND BL." + _NN('OWEN TARRIS', 'owen', 'IN')], 'Same'),
]

HERE = os.path.dirname(os.path.abspath(__file__))
SHEET = sys.argv[1] if len(sys.argv) > 1 else os.path.normpath(os.path.join(HERE, '..', '..', 'deliverables', 'gate-sheet.xlsx'))
wb = load_workbook(SHEET, data_only=True)
hs = wb['Hearings']
rows = {hs.cell(row=r, column=1).value: r for r in range(2, 60) if hs.cell(row=r, column=1).value}
ok = 0
def seen(r):
    return (hs.cell(row=r, column=23).value, hs.cell(row=r, column=24).value or None, hs.cell(row=r, column=57).value or None)
def fits(got, status, daily, change):
    if isinstance(change, list): return got[0] == status and got[1] == daily and got[2] == change[0]
    need = (change,) if isinstance(change, str) else (change or ())
    return got[0] == status and got[1] == daily and ((change is None and got[2] is None) or (change is not None and got[2] is not None and all(t in got[2] for t in need)))
for thread, case, status, daily, change, why in EXPECT:
    r = rows.get(case)
    got = seen(r) if r else (None, None, None)
    good = fits(got, status, daily, change)
    ok += good
    print(f"{'pass' if good else 'FAIL'}  {thread}  {case}  {got[0]!s:16} {got[1]!s:31} {why}")
threads = sorted({t for t, *_ in EXPECT})
bad = sorted({t for t, c, st, d, ch, _ in EXPECT if not fits(seen(rows[c]) if c in rows else (None, None, None), st, d, ch)})
print(f'\n{ok} of {len(EXPECT)} hearings as expected; {len(threads) - len(bad)} of {len(threads)} threads.\n')

# ---- The other tabs: what the threads need from them
dk = wb['Dockets']; nf = wb['Notices on file']; cl = wb['Calendar']
def docket(month_day, county):
    for r in range(4, 304):
        d = dk.cell(row=r, column=1).value
        if isinstance(d, datetime.datetime) and (d.month, d.day) == month_day and dk.cell(row=r, column=2).value == county: return r
    return None
def dcell(month_day, county, col):
    r = docket(month_day, county)
    return str(dk.cell(row=r, column=col).value or '') if r else ''
notice = {nf.cell(row=r, column=2).value: str(nf.cell(row=r, column=9).value or '') for r in range(3, 203) if nf.cell(row=r, column=2).value}
ask = dcell((6, 12), 'Orimere', 15)
order = sorted((n for n in ('Leo Arlen', 'Maya Venn', 'Owen Tarris', 'Nora Pell') if n in ask), key=ask.index)
TABS = [
    ('A', 'Notices on file: 14 Willow Lane (AX-101) names Maya, who has no yes for it: VOID', notice.get('AX-101', '').startswith('VOID')),
    ('A', 'Notices on file: 28 Willow Lane (AX-102) names Maya, who said yes, not yet sent: SEND IT', notice.get('AX-102', '').startswith('SEND IT')),
    ('C', 'Notices on file: 24 Orchard Road (AX-106) names Nora, who has no yes for it: VOID', notice.get('AX-106', '').startswith('VOID')),
    ('G', 'Notices on file: 11 and 29 Brook Road name Maya, who is ill: VOID, send the replacement', all(notice.get(c, '').startswith('VOID') and 'replacement notice' in notice.get(c, '') for c in ('AX-113', 'AX-114'))),
    ('*', 'Notices on file: 12 notices, 1 SEND IT, 7 OK, 4 VOID', (len(notice), sum(v.startswith('SEND IT') for v in notice.values()), sum(v.startswith('OK') for v in notice.values()), sum(v.startswith('VOID') for v in notice.values())) == (12, 1, 7, 4)),
    ('A', 'Dockets, Larkmere June 10: the open number 1 is offered first to Leo, already at that office (A4)', dcell((6, 10), 'Larkmere', 7).startswith('Offer the open number (1) first to Leo Arlen')),
    ('A', 'Dockets, Larkmere June 10: Tell the office names only Maya for AX-102, with the 4 p.m. deadline (A5, A6)',
     'Case AX-102, 28 Willow Lane, 9:30 a.m.: Maya Venn.' in dcell((6, 10), 'Larkmere', 14) and 'AX-101' not in dcell((6, 10), 'Larkmere', 14) and "THE OFFICE'S DEADLINE: Fri 7 Jun, 4:00 PM" in dcell((6, 10), 'Larkmere', 14)),
    ('B', "Dockets, Velloran June 11: the day-before text waits (DO NOT SEND YET: 2 hearings): room C on Owen's two hearings is a room letter, not a link, until Offices AL says it is all the office sends", dcell((6, 11), 'Velloran', 9).startswith('DO NOT SEND YET: 2 hearings') and 'room letter alone is not a link' in dcell((6, 11), 'Velloran', 9)),
    ('B', 'Dockets, Velloran June 11: Ask next has Owen first and leaves Leo out (B7)', dcell((6, 11), 'Velloran', 15).startswith('Already at this office that day: Owen Tarris') and 'Leo' not in dcell((6, 11), 'Velloran', 15)),
    ('C', 'Dockets, Orimere June 12 (24 Orchard Road): Ask next is Leo, then Maya, then Owen; Nora left out (C6)', order == ['Leo Arlen', 'Maya Venn', 'Owen Tarris']),
    ('D', 'Dockets, Tesswick June 12: Tell the office starts with the block sentence, says WAITING TO GO, and prints no route and no "Put in" line, because no person has approved the change (D2, round 16)',
     dcell((6, 12), 'Tesswick', 14).startswith('NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY: the Tesswick office said it changed how it works (Offices M5).')
     and 'WAITING TO GO to the Tesswick office about Wednesday, June 12, times are Tesswick office time (UTC-05:00): Case AX-107' in dcell((6, 12), 'Tesswick', 14) and 'HOW' not in dcell((6, 12), 'Tesswick', 14)
     and 'ROUTES' not in dcell((6, 12), 'Tesswick', 14) and 'Put in' not in dcell((6, 12), 'Tesswick', 14)),
    ('E', "Dockets, Brindlefen June 13: DO NOT SEND YET, no video link for Priya's two hearings", dcell((6, 13), 'Brindlefen', 9).startswith('DO NOT SEND YET: 2 hearings')),
    ('E', 'Dockets, Brindlefen June 13: Tell the office names Priya for 16 Birch Lane only; 42 Birch Lane is on record (E1)', 'AX-109' in dcell((6, 13), 'Brindlefen', 14) and 'AX-110' not in dcell((6, 13), 'Brindlefen', 14)),
    ('H', 'Dockets, Harthmere June 13 (48 Linden Avenue): offered whole; Leo is left out (H5)', dcell((6, 13), 'Harthmere', 7).startswith('Offer whole') and 'Leo' not in dcell((6, 13), 'Harthmere', 15)),
    ('*', 'Calendar: one event for each hearing with a yes that counts, 17 in the example', sum(1 for r in range(2, 1201) if cl.cell(row=r, column=1).value not in (None, '')) == 17),
    ('E', 'Notices on file: 42 Birch Lane (AX-110) names Priya, who has a yes: OK, and THE NOTICE LACKS: county',
     notice.get('AX-110', '') == 'OK: it names the consultant with a yes. THE NOTICE LACKS: county. This office\'s notice or form carries: property; case; county; representative (Offices AK)'),
    ('A', 'Dockets, Larkmere June 10 (the next working day): the offer asks for an answer within one hour', 'Please answer within one hour.' in dcell((6, 10), 'Larkmere', 8)),
    ('E', "Hearings, 42 Birch Lane (AX-110) who signs the withdrawal (BP): Priya Marden, the name on the office's record: the office's rule (message 28)",
     'AX-110' in rows and hs.cell(row=rows['AX-110'], column=68).value == "Priya Marden, the name on the office's record: the office's rule"),
]
tok = 0
for thread, what, good in TABS:
    tok += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {thread}  {what}")
print(f'\n{tok} of {len(TABS)} checks on the other tabs as expected.\n')

# ---- Round 15: the rules S1 to S5, on the values the example sheet holds
from openpyxl.utils import column_index_from_string as CI
st = wb['Settings']; rc = wb['Record check']; ms = wb['Measures']; of = wb['Offices']; bn = wb['Bench']
def H(r, col):
    v = hs.cell(row=r, column=CI(col)).value
    return '' if v is None else v
def http(v): return isinstance(v, str) and v.startswith('http')
ALL = [r for r in range(2, 1201) if hs.cell(row=r, column=1).value not in (None, '')]
def not_held(r): return H(r, 'G') == 'no' and http(H(r, 'AF'))
def gotit_ok(r): return http(H(r, 'M')) and str(H(r, 'BW')).strip() != '' and str(H(r, 'BW')).strip() == str(H(r, 'H')).strip()
def dby_ok(r): return http(H(r, 'Q')) and str(H(r, 'BX')).strip() != '' and str(H(r, 'BX')).strip() == str(H(r, 'H')).strip()
today = st['B2'].value; clock = st['B15'].value
now = (datetime.datetime.combine(today.date(), clock) if isinstance(today, datetime.datetime) and isinstance(clock, datetime.time) else None)
def case_be(case): return str(H(rows[case], 'BE')) if case in rows else ''
record = {rc.cell(row=r, column=1).value: (str(rc.cell(row=r, column=6).value or ''), str(rc.cell(row=r, column=11).value or '')) for r in range(4, 1204) if rc.cell(row=r, column=1).value}
cap = {bn.cell(row=r, column=1).value: bn.cell(row=r, column=5).value for r in range(2, 60) if bn.cell(row=r, column=1).value and isinstance(bn.cell(row=r, column=5).value, (int, float))}
held = {}
for r in ALL:
    if H(r, 'BV') == 1 and H(r, 'H') and not not_held(r) and H(r, 'F') != 'written statement' and isinstance(H(r, 'D'), datetime.datetime) and isinstance(today, datetime.datetime) and H(r, 'D') >= today:
        held[(H(r, 'H'), H(r, 'D'))] = held.get((H(r, 'H'), H(r, 'D')), 0) + 1
over = sorted(k for k, n in held.items() if k[0] in cap and n > cap[k[0]])
over_rows = [r for r in ALL if (H(r, 'H'), H(r, 'D')) in over and H(r, 'BV') == 1 and not not_held(r) and H(r, 'F') != 'written statement']
m_cap = next((ms.cell(row=r, column=2).value for r in range(2, 40) if str(ms.cell(row=r, column=1).value or '').startswith('Consultants over their daily cap')), None)
def zone(county):
    """The sentence the sheet should print, worked out here from Offices W."""
    for r in range(2, 41):
        if of.cell(row=r, column=1).value == county:
            w = of.cell(row=r, column=23).value
            if isinstance(w, (int, float)):
                a = abs(w); return f"Times are {county} office time (UTC{'-' if w < 0 else '+'}{int(a):02d}:{round((a % 1) * 60):02d})."
    return f'Times are {county} office time.'
texts = []      # (county, text, how many consultants it addresses)
for r in range(4, 304):
    county = dk.cell(row=r, column=2).value
    if not county: continue
    for col in (8, 9):
        t = str(dk.cell(row=r, column=col).value or '')
        if 'Reply YES' in t: texts.append((county, t, max(1, t.count('We are expecting you'))))
events = [r for r in range(2, 1201) if cl.cell(row=r, column=1).value not in (None, '')]
last_event = max(events) if events else 1
stray = [c.coordinate for row in cl.iter_rows(min_row=last_event + 1, max_row=1200) for c in row if c.value not in (None, '')]
offw = {of.cell(row=r, column=1).value: of.cell(row=r, column=23).value for r in range(2, 41) if of.cell(row=r, column=1).value}
def event_county(r):
    subject = str(cl.cell(row=r, column=1).value)
    return next((c for c in offw if f': {c} hearing, ' in subject), None)
sendby = [(c, case_be(c)) for c in ('AX-101', 'AX-102', 'AX-103', 'AX-104')]
R15 = [
    ('S1', 'Hearings has the typed columns BW (whose GOT IT), BX (whose day-before YES) and BY (offer out to)',
     str(H(1, 'BW')).startswith('GOT IT is from') and str(H(1, 'BX')).startswith('Day-before YES is from') and str(H(1, 'BY')).startswith('Offer out to')),
    ('S1', 'BW is filled from the sender of each GOT IT in the example: Leo Arlen (message 65) on AX-121 and AX-122, Owen Tarris (71) on AX-123 and AX-124, Nora Pell (50) on AX-117 and AX-118',
     all(c in rows and H(rows[c], 'BW') == who and H(rows[c], 'H') == who for c, who in (('AX-121', 'Leo Arlen'), ('AX-122', 'Leo Arlen'), ('AX-123', 'Owen Tarris'), ('AX-124', 'Owen Tarris'), ('AX-117', 'Nora Pell'), ('AX-118', 'Nora Pell')))),
    ('S1', 'No hearing that someone attends reads READY or CONFIRMED unless its GOT IT is from the consultant on the row (M with BW = H), and none reads CONFIRMED unless the day-before YES is (Q with BX = H)',
     len(ALL) == 24 and str(H(1, 'BW')).startswith('GOT IT') and all((H(r, 'W') not in ('READY', 'CONFIRMED') or H(r, 'F') == 'written statement' or gotit_ok(r)) and (H(r, 'W') != 'CONFIRMED' or dby_ok(r)) for r in ALL)),
    ('S1', 'Every GOT IT or day-before YES link without the right name beside it is named in column BE (none in the example, so BE has no such line)',
     str(H(1, 'BW')).startswith('GOT IT') and all((not http(H(r, 'M')) or gotit_ok(r) or 'GOT IT' in str(H(r, 'BE')) or H(r, 'F') == 'written statement' or not_held(r)) for r in ALL)
     and not any('TYPE WHOSE' in str(H(r, 'BE')) or 'IS FROM' in str(H(r, 'BE')) for r in ALL)),
    ('S2', 'Record check, 18 Maple Lane (AX-117): the record says canceled and column AF has no proof, so it is contradicted in the new words',
     record.get('AX-117', ('', ''))[1] == 'RECORD SAYS CANCELED, BUT THE OFFICE HAS NOT CONFIRMED IT IN WRITING: THE HEARING IS STILL ON ITS LIST'),
    ('S2', 'Record check: no record is flagged for saying "scheduled" while column AF of its hearing is empty, and every "canceled" record without that proof is flagged',
     str(H(1, 'BW')).startswith('GOT IT') and all((not k.startswith('RECORD SAYS SCHEDULED') or (c in rows and http(H(rows[c], 'AF')))) and ('cancel' not in f or c not in rows or http(H(rows[c], 'AF')) or k.startswith('RECORD SAYS CANCELED, BUT THE OFFICE HAS NOT CONFIRMED')) for c, (f, k) in record.items())),
    ('S2', 'Every row with something to tell the consultant (BN typed, no OK linked in BO) prints TELL in column BE and is on the daily list: 8 rows in the example (AX-103, AX-104, AX-106, AX-111, AX-112, AX-115, AX-117, AX-118; the last four since finisher 1 of round 17: the questions of messages 35 and 54)',
     str(H(1, 'BW')).startswith('GOT IT') and sorted(H(r, 'A') for r in ALL if H(r, 'BN') and not http(H(r, 'BO'))) == ['AX-103', 'AX-104', 'AX-106', 'AX-111', 'AX-112', 'AX-115', 'AX-117', 'AX-118']
     and all('TELL ' + str(H(r, 'BN'))[:20] in str(H(r, 'BE')) and H(r, 'X') for r in ALL if H(r, 'BN') and not http(H(r, 'BO')))),
    ('S3', 'Settings row 15 is "Time of day now", 2:00 PM in the example', st['A15'].value == 'Time of day now' and clock == datetime.time(14, 0)),
    ('S3', 'At 2:00 PM on Friday, June 7 the four send-by moments earlier that day are PAST THE 48-HOUR MARK (AX-101 9:00 AM, AX-102 9:30 AM, AX-103 1:00 PM, AX-104 1:30 PM), and each says to ask the clerk to accept late files',
     all(f'PAST THE 48-HOUR MARK (Fri 7 Jun at {t}): SEND NOW AND ASK THE CLERK TO ACCEPT LATE FILES' in be for (c, be), t in zip(sendby, ('9:00 AM', '9:30 AM', '1:00 PM', '1:30 PM')))),
    ('S3', 'Every SEND CASE FILES line agrees with the clock: PAST exactly when the send-by moment (BM) is before today plus the time of day; AX-106 (Mon 10 Jun at 2:00 PM) still reads BY',
     now is not None and 'TO THE CLERK (the consultant confirmed none; the clerk confirmed none) BY Mon 10 Jun at 2:00 PM.' in case_be('AX-106') and sum('SEND CASE FILES' in str(H(r, 'BE')) for r in ALL) >= 10
     and all(('PAST THE 48-HOUR MARK' in str(H(r, 'BE'))) == (H(r, 'BM') < now) for r in ALL if 'SEND CASE FILES' in str(H(r, 'BE')) and isinstance(H(r, 'BM'), datetime.datetime))),
    ('S3', 'Moments still ahead at 2:00 PM are not called past: the Larkmere office deadline (4:00 PM, AX-101 and AX-102) and the owed statement for AX-119 (send by 4:00 PM)',
     now is not None and all('OFFICE DEADLINE Fri 7 Jun at 4:00 PM.' in case_be(c) and 'DEADLINE PASSED' not in case_be(c) for c in ('AX-101', 'AX-102')) and 'OWED: SEND BY Fri 7 Jun at 4:00 PM' in case_be('AX-119') and 'PASSED' not in case_be('AX-119')),
    ('S4', 'Column BZ names who each hearing counts for on its day: the consultant with a yes that counts, or else the one it is on offer to (BY); 17 hearings held and no offer out in the example',
     str(H(1, 'BZ')).startswith('Held by') and all(H(r, 'BZ') == ('' if (not_held(r) or H(r, 'F') == 'written statement' or not isinstance(H(r, 'D'), datetime.datetime)) else (H(r, 'H') if H(r, 'BV') == 1 else H(r, 'BY'))) for r in ALL)
     and sum(1 for r in ALL if H(r, 'BZ')) == 17 and not any(H(r, 'BY') for r in ALL)),
    ('S4', 'Measures counts consultants over their daily cap, and it agrees with a count made here from the rows and Bench E (0 in the example); column BE prints OVER THE DAILY CAP on exactly those rows',
     m_cap is not None and m_cap == len(over) == 0 and len(cap) == 6 and sorted(r for r in ALL if 'OVER THE DAILY CAP' in str(H(r, 'BE'))) == sorted(over_rows)),
    ('S4', 'Dockets: every docket with something to offer tells the coordinator to type the name in Hearings BY when the offer goes (4 dockets in the example)',
     [dcell(md, c, 7).endswith('When the offer goes, type the name in column BY of the Hearings tab on each hearing offered.') for md, c in (((6, 10), 'Larkmere'), ((6, 11), 'Velloran'), ((6, 12), 'Orimere'), ((6, 13), 'Harthmere'))] == [True] * 4
     and not dcell((6, 12), 'Tesswick', 7).endswith('offered.')),
    ('S5', 'Every offer and every day-before text says once, for each consultant it addresses, that times are the office\'s local time, with the offset from Offices W: for example "Times are Larkmere office time (UTC-05:00)." (6 texts in the example, in person and video; the Velloran day-before text waits for a link since round 15b)',
     len(texts) == 6 and all(t.count('Times are ') == n and t.count(zone(c)) == n for c, t, n in texts) and 'Times are Larkmere office time (UTC-05:00).' in dcell((6, 10), 'Larkmere', 8)
     and {dk.cell(row=r, column=3).value for r in range(4, 304) if 'Times are' in str(dk.cell(row=r, column=8).value) + str(dk.cell(row=r, column=9).value)} == {'in person', 'video'}),
    ('S5', 'Calendar: column J gives each event\'s office hours from UTC, equal to Offices W for its county (-5 on all 17 events), after the nine import columns',
     str(cl.cell(row=1, column=10).value or '').startswith('Office hours from UTC') and cl.cell(row=1, column=9).value == 'Private' and len(events) == 17
     and all(event_county(r) is not None and cl.cell(row=r, column=10).value == offw[event_county(r)] == -5 for r in events)),
    ('S5', 'Calendar: the rows below the last event are completely empty (All Day Event no longer reads True on unused rows)', len(events) == 17 and last_event == 18 and stray == []),
]
rok = 0
for rule, what, good in R15:
    rok += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok} of {len(R15)} checks on rules S1 to S5 as expected.\n')

# ---- Round 15, second pass: the rules S6 to S10, on the values the example sheet holds
wf = load_workbook(SHEET)                      # the same file with its formulas, for the two checks that a cell holds a formula
nf = wb['Notices on file']; av = wb['Availability']; wc = wb['Who can take it']; rs = wb['Reader suggestions']; hd = wb['Holidays']
def O(r, col):
    v = of.cell(row=r, column=CI(col)).value
    return '' if v is None else v
OFF = {O(r, 'A'): r for r in range(2, 41) if O(r, 'A')}
CHOICES = [st.cell(row=r, column=7).value for r in range(2, 6)]
coming = lambda r: isinstance(H(r, 'D'), datetime.datetime) and H(r, 'D') >= today
NOHON = 'NO HOMEOWNER NOTICE ON RECORD: SEND IT, THEN TYPE THE NAME AND DATE ON IT IN BK AND BL.'
nohon_rows = [r for r in ALL if NOHON in str(H(r, 'BE'))]
route_rows = [r for r in ALL if "BY THE OFFICE'S OWN ROUTE" in str(H(r, 'BE'))]
want_route = [r for r in ALL if (H(r, 'D') == '' or coming(r)) and H(r, 'BV') == 1 and not http(H(r, 'K')) and H(r, 'BD') == '' and not not_held(r)]
FIELDS = {'Larkmere': 'property; case; county; representative', 'Velloran': 'case; representative', 'Tesswick': 'case; representative; hearing date; hearing times; contact email', 'Brindlefen': 'property; case; county; representative'}
notice_rows = [r for r in range(3, 203) if nf.cell(row=r, column=2).value]
def notice_county(r):
    hr = rows.get(nf.cell(row=r, column=2).value); return H(hr, 'C') if hr else None
names3 = [wc.cell(row=3, column=c).value for c in range(2, 42)]
m_names = next((r for r in range(2, 40) if str(ms.cell(row=r, column=1).value or '').startswith('Names the formulas do not read')), None)
bench_names = [bn.cell(row=r, column=1).value for r in range(2, 42) if bn.cell(row=r, column=1).value]
bc = next((r for r in range(30, 90) if ms.cell(row=r, column=1).value == 'Consultant'), 0)
by_consultant = [ms.cell(row=r, column=1).value for r in range(bc + 1, bc + 41) if ms.cell(row=r, column=1).value not in (None, '')]
maya = next((r for r in range(2, 300) if av.cell(row=r, column=2).value == 'Maya Venn' and isinstance(av.cell(row=r, column=1).value, datetime.datetime) and av.cell(row=r, column=1).value.day == 10), None)
LINK = 'https://mailbox.example/message/'
head = next((r for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith('Missed by the readers, added by a person at 9:00')), None)
added = []
if head:
    r = head + 1
    while rs.cell(row=r, column=2).value: added.append((rs.cell(row=r, column=1).value, rs.cell(row=r, column=2).value, rs.cell(row=r, column=3).value)); r += 1
colof = {hs.cell(row=1, column=c).value: c for c in range(1, hs.max_column + 1)}
score = next((str(rs.cell(row=r, column=1).value) for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith("The readers' measured score does not change")), '')
mlog = next((r for r in range(2, 40) if str(ms.cell(row=r, column=1).value or '').startswith('GOAL: LESS HUMAN WORK')), None)
R15B = [
    ('S6', 'Hearings has the helper columns CC (office deadline in force), CD, CE, CF and CG; Offices has AF (naming deadline, working days), AG, AH, AI, AJ and AK',
     str(H(1, 'CC')).startswith("Office's deadline in force") and str(H(1, 'CE')).startswith('Next-step lines') and str(H(1, 'CG')).startswith('Travel gap')
     and str(O(1, 'AF')).startswith('Naming deadline: working days before the hearing') and str(O(1, 'AG')).startswith('Who signs a withdrawal statement') and str(O(1, 'AI')).startswith('Gap around an in-person hearing')
     and str(O(1, 'AJ')).startswith('Gap between video sessions') and str(O(1, 'AK')).startswith("Fields this office's notice or form must carry")),
    ('S6', 'No office in the packet states a standing naming rule: Offices AF is empty on all ten offices and column O keeps its question; the deadline in force (CC) is the one typed in AW (AX-101 and AX-102, Fri 7 Jun 4:00 PM) and empty on the other 22 rows',
     len(OFF) == 10 and all(O(r, 'AF') == '' and 'ASK' in str(O(r, 'O')).upper() for r in OFF.values()) and all(H(r, 'CC') == H(r, 'AW') for r in ALL) and sum(1 for r in ALL if H(r, 'CC') != '') == 2
     and all('OFFICE DEADLINE Fri 7 Jun at 4:00 PM' in case_be(c) for c in ('AX-101', 'AX-102'))),
    ('S6', 'Who signs (Offices AC, AG) is one of the fixed choices on Settings G2 to G5: Brindlefen holds "the consultant who attends" and, for a withdrawal statement, "the representative on the office\'s record", with its source in AH; the other nine hold the question',
     CHOICES[:3] == ['the consultant who attends', "the representative on the office's record", 'the homeowner'] and str(CHOICES[3]).startswith('ASK:') and all(O(r, 'AC') in CHOICES and O(r, 'AG') in CHOICES + [''] for r in OFF.values())
     and O(OFF.get('Brindlefen', 1), 'AC') == CHOICES[0] and O(OFF.get('Brindlefen', 1), 'AG') == CHOICES[1] and 'message 27' in str(O(OFF.get('Brindlefen', 1), 'AH')) and 'message 28' in str(O(OFF.get('Brindlefen', 1), 'AH'))
     and sum(1 for r in OFF.values() if O(r, 'AC') == CHOICES[3]) == 9),
    ('S6', "Column BP follows the choice: the 16 Birch Lane settlement (AX-109) is signed by Priya Marden, who attends; the 42 Birch Lane withdrawal (AX-110) by Priya Marden, the name on the office's record; where the office still holds the question BP says ASK",
     case_be('AX-109') != '' and H(rows['AX-109'], 'BP') == "Priya Marden, who attends: the office's rule" and H(rows['AX-110'], 'BP') == "Priya Marden, the name on the office's record: the office's rule"
     and 'ASK the office' in str(H(rows['AX-117'], 'BP')) and 'ASK the office' in str(H(rows['AX-119'], 'BP'))),
    ('S6', 'Travel gaps: no office in the packet has its own (Offices AI and AJ empty), so every hearing reads the Settings values in CF and CG (60 and 15 minutes)',
     all(O(r, 'AI') == '' and O(r, 'AJ') == '' for r in OFF.values()) and all(H(r, 'CF') == st['B12'].value == 60 and H(r, 'CG') == st['B13'].value == 15 for r in ALL)),
    ('S6', 'Offices AK lists the fields each office\'s notice or form carries (Tesswick\'s form: case; representative; hearing date; hearing times; contact email), and Notices on file reads that list for each notice (column N) and names what lacks (42 Birch Lane: county; nothing else lacks)',
     all(O(OFF.get(c, 1), 'AK') == f for c, f in FIELDS.items()) and all(O(r, 'AK') != '' for r in OFF.values()) and len(notice_rows) == 12
     and all(nf.cell(row=r, column=14).value == O(OFF[notice_county(r)], 'AK') for r in notice_rows) and [nf.cell(row=r, column=2).value for r in notice_rows if nf.cell(row=r, column=15).value] == ['AX-110']
     and sum(1 for r in notice_rows if 'THE NOTICE LACKS' in str(nf.cell(row=r, column=9).value)) == 1),
    ('S6', 'Column BE names the office\'s own route on every coming row with a yes that counts and no name confirmed by the office, unless the office\'s change waits for approval (round 16: column CX is 1), and on no other row (AX-102, AX-109; the two Tesswick rows print the block and no route)',
     sorted(route_rows) == sorted(r for r in want_route if H(r, 'CX') != 1) and sorted(H(r, 'A') for r in route_rows) == ['AX-102', 'AX-109']
     and sorted(H(r, 'A') for r in want_route if H(r, 'CX') == 1) == ['AX-107', 'AX-108']),
    ('S6', 'Tesswick said it changed how it works (Offices M, message 22) and nobody has approved the change: AX-107 and AX-108 print the block sentence and neither route (round 16; they printed both routes); Larkmere (AX-102) prints its route from Offices F',
     all("THE OFFICE HAS NOT CONFIRMED Owen Tarris IN WRITING. NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY: the Tesswick office said it changed how it works (Offices M5). To approve, a person types their name in Offices AQ5 and the date in Offices AR5. No route is printed until then." in case_be(c)
         and 'BOTH ROUTES' not in case_be(c) and 'staffing form, then a call' not in case_be(c).split('THE NOTICE WAS SENT')[0] and 'Email case IDs' not in case_be(c) for c in ('AX-107', 'AX-108'))
     and "BY THE OFFICE'S OWN ROUTE (Offices F): Staffing notice naming the representative; government acknowledgment required before coverage is recorded as accepted." in case_be('AX-102')),
    ('S6', 'A missed hearing and a "DONE: n proofs missing" row never leave the daily list unfinished: MISSED reads TOP OF LIST: MISSED, LETTER DUE until column N holds the letter\'s link, then MISSED: ANSWER DUE until O holds the office\'s answer; DONE: n reads PROOFS DUE (the example has no such row, so this holds on 0 rows; the scratch runs show it)',
     all((H(r, 'W') != 'MISSED' or H(r, 'X') == ('TOP OF LIST: MISSED, LETTER DUE' if 'http' not in str(H(r, 'N')) else 'MISSED: ANSWER DUE') or (http(H(r, 'O')) and 'http' in str(H(r, 'N'))))
         and (not str(H(r, 'W')).startswith('DONE:') or H(r, 'X') == 'PROOFS DUE') for r in ALL)),
    ('S7', 'Who can take it has 40 consultant columns (B to AO, the six example names first), the codes from AP and Ask next in AV; the Dockets tab still names someone to ask on every open docket',
     len(names3) == 40 and [n for n in names3 if n] == bench_names and len(bench_names) == 6 and wc.cell(row=3, column=42).value == '1 at this office' and str(wc.cell(row=3, column=48).value).startswith('Ask next')
     and all(str(dk.cell(row=r, column=15).value or '') == str(wc.cell(row=r, column=48).value or '') for r in range(4, 304))),
    ('S7', 'Nothing sits in the rows a new consultant or office would use: Bench A8 to A1000 and Offices A12 to A1000 are empty (the notes moved to Bench B43 and Offices B42), and Holidays M1 no longer shows a note',
     all(bn.cell(row=r, column=1).value in (None, '') for r in range(8, 1001)) and all(of.cell(row=r, column=1).value in (None, '') for r in range(12, 1001)) and str(bn['B43'].value or '').startswith('Up to 40 consultants, rows 2 to 41')
     and str(of['B42'].value or '').startswith('The formulas read rows 2 to 40') and hd['M1'].value in (None, '') and by_consultant == bench_names),
    ('S7', 'The warning is silent in the example: Dockets A1 reads "Rows are sorted: yes" and the Measures row "Names the formulas do not read" is 0',
     dk['A1'].value == 'Rows are sorted: yes' and m_names is not None and ms.cell(row=m_names, column=2).value == 0 and str(ms.cell(row=m_names, column=3).value) == '0'),
    ('S8', 'NO HOMEOWNER NOTICE ON RECORD prints on every coming hearing with a yes that counts and nothing in BK or BL, and on no other row (14 rows in the example)',
     sorted(nohon_rows) == sorted(r for r in ALL if coming(r) and H(r, 'BV') == 1 and H(r, 'BK') == '' and H(r, 'BL') == '' and not not_held(r)) and len(nohon_rows) == 14),
    ('S8', 'BK holds only what the packet says a notice says: Maya Venn on the two Brook Road rows (message 39); BL is empty on every row, because no message gives a date on a notice',
     sorted(H(r, 'A') for r in ALL if H(r, 'BK') != '') == ['AX-113', 'AX-114'] and all(H(rows[c], 'BK') == 'Maya Venn' for c in ('AX-113', 'AX-114')) and all(H(r, 'BL') == '' for r in ALL)),
    ('S9', 'Measures: the row "Coordinator minutes per hearing, and hearings per coordinator" holds a formula over the weekly log (empty until the first week is typed)',
     mlog is not None and str(wf['Measures'].cell(row=mlog, column=2).value or '').startswith('=IF(COUNT(D') and ms.cell(row=mlog, column=2).value in (None, '')),
    ('S9', 'A partial decline: Maya\'s "not free" row for June 10 runs from 9:00 to 9:30, the declined hearing; her 9:30 hearing (AX-102) keeps its yes (BR 0, BV 1) and the 9:00 hearing (AX-101) has nobody',
     maya is not None and av.cell(row=maya, column=3).value == datetime.time(9, 0) and av.cell(row=maya, column=4).value == datetime.time(9, 30) and av.cell(row=maya, column=8).value == 'not free'
     and H(rows['AX-102'], 'BR') == 0 and H(rows['AX-102'], 'BV') == 1 and H(rows['AX-101'], 'H') == '' and H(rows['AX-101'], 'BV') == 0),
    ('S10', 'After the 9:00 a.m. pass the two Juniper Reach rows hold Owen\'s yes (56), the office\'s record (55), the clerk\'s receipt (55) and his GOT IT (56, BW = Owen Tarris); the two Brook Road rows hold the clerk\'s receipt (40), with the current version 2 in AX since round 15b and no version in AZ, because the receipt names none',
     all(H(rows[c], col) == LINK + m for c in ('AX-119', 'AX-120') for col, m in (('J', '56'), ('K', '55'), ('L', '55'), ('M', '56'))) and all(H(rows[c], 'BW') == 'Owen Tarris' == H(rows[c], 'BD') for c in ('AX-119', 'AX-120'))
     and all(H(rows[c], 'L') == LINK + '40' and H(rows[c], 'AX') == 2 and H(rows[c], 'AZ') == '' and H(rows[c], 'M') == '' for c in ('AX-113', 'AX-114'))),
    ('S10', 'Reader suggestions lists them under "Missed by the readers, added by a person at 9:00": 16 proof links, each one in its Hearings cell, 10 of them new cells; the readers\' measured score is quoted unchanged (208 of 215)',
     head is not None and len(added) == 16 and '16 proof links' in str(rs.cell(row=head, column=1).value) and '(10 of them were empty cells until this pass' in str(rs.cell(row=head, column=1).value)
     and all(c in rows and col in colof and hs.cell(row=rows[c], column=colof[col]).value == link for c, col, link in added) and '208 of 215' in score),
    ('S10', 'The person pass itself moved no status; with round 15b (S11, S12) the example reads 17 OPEN, 2 READY, 3 RESULT DUE, 1 OWED, 1 ERROR DUE, and "Hearings held with a proof missing" on the Measures tab is 5 (AX-113, AX-114, AX-116, AX-119, AX-120)',
     sorted(str(H(r, 'W')).split(':')[0] for r in ALL) == sorted(['OPEN'] * 17 + ['READY'] * 2 + ['RESULT DUE'] * 3 + ['OWED', 'ERROR DUE']) and ms['B6'].value == 5
     and sorted(H(r, 'A') for r in ALL if isinstance(H(r, 'D'), datetime.datetime) and H(r, 'D') < today and H(r, 'G') == 'yes' and isinstance(H(r, 'U'), (int, float)) and H(r, 'U') > 0) == ['AX-113', 'AX-114', 'AX-116', 'AX-119', 'AX-120']),
]
rok2 = 0
for rule, what, good in R15B:
    rok2 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok2} of {len(R15B)} checks on rules S6 to S10 as expected.\n')

# ---- Round 15, third pass (brief round15b): the rules S11 to S16, on the values the example sheet holds
import re
def B(r, col):
    v = bn.cell(row=r, column=CI(col)).value
    return '' if v is None else v
ROOMS = [st.cell(row=r, column=8).value for r in range(2, 6)]
ROOM_LINK, ROOM_ALL, ROOM_AT, ASKROOM = (ROOMS + [None] * 4)[:4]
ROOMLINE = 'VIDEO ROOM ONLY, NO LINK: ASK THE OFFICE TODAY WHETHER A LINK COMES AND WHETHER THE ROOM IS AT THE OFFICE (Offices AL).'
CVER = "THE CONSULTANT'S RECEIPT NAMES NO VERSION: ASK THEM TO REPLY GOT IT 2."
KVER = "THE CLERK'S RECEIPT NAMES NO FILES: SEND THE FILES EMAIL THAT NAMES EVERY FILE (VERSION 2) AND ASK FOR A REPLY TO IT."
OPENLINE = 'FIRST CASE AT OPENING: THE OFFICE CANNOT BE REACHED BEFORE THE HEARING. ARRANGE TODAY, WHILE IT IS OPEN: THE END-OF-DOCKET REQUEST AND THE ALTERNATE (Offices T), AND ASK WHOM TO REACH BEFORE OPENING.'
def minutes(v):
    if isinstance(v, datetime.time): return v.hour * 60 + v.minute
    if isinstance(v, datetime.datetime): return v.hour * 60 + v.minute
    if isinstance(v, (int, float)): return round((v % 1) * 1440)
    m = re.match(r'^(\d{1,2}):(\d{2})', str(v or ''))
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None
def office(r): return OFF.get(H(r, 'C'))
def link_code(r):
    """Column CJ worked out here from the row's format, column AV and the office's choice in Offices AL."""
    if H(r, 'F') not in ('video', 'telephone'): return 0
    av_ = str(H(r, 'AV'))
    if av_.strip() == '': return 5
    if 'http' in av_.lower() or '://' in av_ or sum(ch.isdigit() for ch in av_) >= 7: return 1
    choice = O(office(r), 'AL') if office(r) else ''
    return 2 if choice == ROOM_ALL else 3 if (choice == ROOM_AT and H(r, 'F') == 'video') else 4
def version_in_record(case):
    m = re.search(r'-v(\d+)\.txt$', next((str(rc.cell(row=r, column=5).value or '') for r in range(4, 1204) if rc.cell(row=r, column=1).value == case), ''))
    return int(m.group(1)) if m else None
attends = lambda r: H(r, 'F') != 'written statement'
room_rows = sorted(H(r, 'A') for r in ALL if ROOMLINE in str(H(r, 'BE')))
m_nolink = next((ms.cell(row=r, column=2).value for r in range(2, 40) if str(ms.cell(row=r, column=1).value or '').startswith('Video or telephone hearings to come with no link or number')), None)
cver_rows = sorted(H(r, 'A') for r in ALL if CVER in str(H(r, 'BE'))); kver_rows = sorted(H(r, 'A') for r in ALL if KVER in str(H(r, 'BE')))
want_cver = sorted(H(r, 'A') for r in ALL if (H(r, 'D') == '' or coming(r)) and not not_held(r) and attends(r) and gotit_ok(r) and H(r, 'AX') != '' and H(r, 'AY') == '')
want_kver = sorted(H(r, 'A') for r in ALL if (H(r, 'D') == '' or coming(r)) and not not_held(r) and http(H(r, 'L')) and H(r, 'AX') != '' and H(r, 'AZ') == '')
props = [(rs.cell(row=r, column=1).value, str(rs.cell(row=r, column=2).value or ''), rs.cell(row=r, column=3).value, rs.cell(row=r, column=4).value) for r in range(2, 400) if str(rs.cell(row=r, column=2).value or '').startswith('G')]
files_head = next((str(rs.cell(row=r, column=1).value) for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith('The case files: what each receipt')), '')
b17 = st['B17'].value; b16 = st['B16'].value
def opens(r): return minutes(O(office(r), 'AM')) if office(r) else None
at_open = sorted(H(r, 'A') for r in ALL if coming(r) and not not_held(r) and attends(r) and minutes(H(r, 'E')) is not None and opens(r) is not None and isinstance(b17, (int, float)) and minutes(H(r, 'E')) < opens(r) + b17)
open_rows = sorted(H(r, 'A') for r in ALL if OPENLINE in str(H(r, 'BE')))
flags = {B(r, 'A'): str(B(r, 'Q')) for r in range(2, 42) if B(r, 'A')}
def need_at(r):
    """The time the firm needs the consultant at the office (CL): their first case on the docket less Settings B16, or less the office's own larger number in CI."""
    mine_ = [minutes(H(k, 'E')) for k in ALL if coming(k) and not not_held(k) and H(k, 'BV') == 1 and H(k, 'H') == H(r, 'H') and H(k, 'D') == H(r, 'D') and H(k, 'C') == H(r, 'C') and H(k, 'F') == H(r, 'F') and minutes(H(k, 'E')) is not None]
    return (min(mine_) - max(b16, H(r, 'CI') if isinstance(H(r, 'CI'), (int, float)) else 0)) if mine_ and isinstance(b16, (int, float)) else None
def clock(m): return f"{(m // 60 + 11) % 12 + 1}:{m % 60:02d} {'a.m.' if m < 720 else 'p.m.'}"
held_inperson = [r for r in ALL if coming(r) and not not_held(r) and H(r, 'BV') == 1 and H(r, 'F') == 'in person']
arrive_rows = sorted(H(r, 'A') for r in ALL if 'SAID THEY ARRIVE AT' in str(H(r, 'BE')))
inperson_texts = [t for c, t, k in texts if 'be at the office by' in t or 'text ARRIVED' in t]
def cal_minutes(v):
    m = re.match(r'^(\d{1,2}):(\d{2}) (AM|PM)$', str(v or ''))
    return (int(m.group(1)) % 12 + (12 if m.group(3) == 'PM' else 0)) * 60 + int(m.group(2)) if m else None
def event_row(r):
    m = re.search(r'\((AX-\d+)\)', str(cl.cell(row=r, column=1).value)); return rows.get(m.group(1)) if m else None
wc_inp = next((c for c in range(40, 70) if str(wc.cell(row=3, column=c).value or '').startswith('This docket counts as in person for travel')), None)
R15C = [
    ('S11', 'Offices AL "A video room here means" is one of the four fixed choices on Settings H2 to H5; the packet answers it for no office, so the six offices that hear by video keep the question and the four in-person offices are empty; Velloran and Harthmere carry the exact question in AE as well',
     str(O(1, 'AL')).startswith('A video room here means') and ROOMS[:3] == ['a link or number is sent as well', "the room letter is all the office sends: join by the office's standing link", 'a room at the office: the consultant attends in person'] and str(ASKROOM).startswith('ASK:')
     and sorted(c for c, r in OFF.items() if O(r, 'AL') == ASKROOM) == ['Brindlefen', 'Caldmere', 'Harthmere', 'Iverfen', 'Orimere', 'Velloran'] and sum(1 for r in OFF.values() if O(r, 'AL') == '') == 4
     and all('do you also send a link or a call-in number, and when? Or is the room at your office' in str(O(OFF[c], 'AE')) for c in ('Velloran', 'Harthmere'))),
    ('S11', 'Column CJ (the link check) agrees on all 24 rows with a check made here from the format, column AV and Offices AL: 10 in-person rows 0, 10 video rows with an empty AV 5, and the 4 rows that hold only a room letter 4 (AX-115, AX-116, AX-123, AX-124)',
     str(H(1, 'CJ')).startswith('Link check for a video or telephone hearing') and all(H(r, 'CJ') == link_code(r) for r in ALL) and sorted(H(r, 'A') for r in ALL if H(r, 'CJ') == 4) == ['AX-115', 'AX-116', 'AX-123', 'AX-124']
     and sum(1 for r in ALL if H(r, 'CJ') == 5) == 10 and sum(1 for r in ALL if H(r, 'CJ') == 0) == 10),
    ('S11', 'No video or telephone hearing reads READY or CONFIRMED without a link, a number or the office\'s word that the room letter is all it sends; BE prints VIDEO ROOM ONLY, NO LINK on the three coming rows with a room letter (AX-115, AX-123, AX-124) and on no other row',
     str(H(1, 'CJ')).startswith('Link check') and all(H(r, 'W') not in ('READY', 'CONFIRMED') or H(r, 'CJ') in (0, 1, 2, 3) for r in ALL) and room_rows == ['AX-115', 'AX-123', 'AX-124']
     and all(H(rows[c], 'AV') == 'room C' and H(rows[c], 'W') == 'OPEN: 3 missing' for c in ('AX-123', 'AX-124'))),
    ('S11', 'The Measures row for video or telephone hearings to come with no link or number counts the room-letter rows too: 13 (it was 10), equal to a count made here from column CJ',
     m_nolink == 13 == sum(1 for r in ALL if coming(r) and H(r, 'G') == 'yes' and H(r, 'F') in ('video', 'telephone') and link_code(r) >= 4)),
    ('S11', 'Calendar: an in-person event is placed at the hearing office, with its street address from Offices BA or, as on the example, ADDRESS NOT ON RECORD and the cell (round 18, K5); a video event reads "<county> board, by video", with the room and "(not a link: ..." where AV holds only a room letter (AX-116, AX-123, AX-124)',
     len(events) == 17 and all((str(cl.cell(row=r, column=8).value) == f"{H(event_row(r), 'C')} hearing office: ADDRESS NOT ON RECORD: Offices BA{OFF[H(event_row(r), 'C')]}" == f"{H(event_row(r), 'C')} hearing office: {H(event_row(r), 'DZ')}") if H(event_row(r), 'F') == 'in person' else str(cl.cell(row=r, column=8).value).startswith(f"{H(event_row(r), 'C')} board, by video") for r in events)
     and sorted(H(event_row(r), 'A') for r in events if '(not a link: ask the office whether a link comes and whether the room is at the office)' in str(cl.cell(row=r, column=8).value)) == ['AX-116', 'AX-123', 'AX-124']),
    ('S12', 'The current case-file version (AX) is on all 24 rows: on 22 it is the version in the case record\'s packet reference (Record check, column E), and the two Elm Street rows hold 2 from messages 33 and 36 while their records still point to v1 (flagged on the Record check tab; 11 of 24 records disagree, as before)',
     all(H(r, 'AX') == 2 for r in ALL) and sum(1 for r in ALL if version_in_record(H(r, 'A')) == H(r, 'AX')) == 22 and sorted(H(r, 'A') for r in ALL if version_in_record(H(r, 'A')) != H(r, 'AX')) == ['AX-111', 'AX-112']
     and all(record.get(c, ('', ''))[0] != '' and 'RECORD POINTS TO' in str(rc.cell(row=next(r for r in range(4, 1204) if rc.cell(row=r, column=1).value == c), column=10).value) for c in ('AX-111', 'AX-112')) and str(rc['C1'].value).startswith('11 of 24')),
    ('S12', 'AY and AZ hold a version only where the linked message names one or says "current": AY 2 on AX-121 and AX-122 (message 65), AY 1 on AX-111 and AX-112 (message 35); AZ 2 on AX-121 and AX-122, whose clerk receipt is now message 66 ("we have the current packets"), and on AX-111 (message 34); every other row is empty',
     {H(r, 'A'): H(r, 'AY') for r in ALL if H(r, 'AY') != ''} == {'AX-121': 2, 'AX-122': 2, 'AX-111': 1, 'AX-112': 1} and {H(r, 'A'): H(r, 'AZ') for r in ALL if H(r, 'AZ') != ''} == {'AX-121': 2, 'AX-122': 2, 'AX-111': 2}
     and all(H(rows[c], 'L') == LINK + '66' and H(rows[c], 'M') == LINK + '65' for c in ('AX-121', 'AX-122'))),
    ('S12', 'A receipt that names no version keeps the files check open and BE prints the question: on every coming row with a GOT IT that counts and an empty AY, and on every coming row with a clerk\'s receipt and an empty AZ, and on no other row (AX-117, AX-118, AX-123, AX-124, both questions on each)',
     cver_rows == want_cver == ['AX-117', 'AX-118', 'AX-123', 'AX-124'] and kver_rows == want_kver == ['AX-117', 'AX-118', 'AX-123', 'AX-124']),
    ('S12', 'No hearing reads READY or CONFIRMED unless the clerk\'s version (AZ) and, where someone attends, the consultant\'s version (AY) equal the current version (AX): 2 rows are READY (AX-121, AX-122)',
     all(H(r, 'W') not in ('READY', 'CONFIRMED') or (H(r, 'AZ') == H(r, 'AX') != '' and (not attends(r) or H(r, 'AY') == H(r, 'AX'))) for r in ALL) and sorted(H(r, 'A') for r in ALL if H(r, 'W') == 'READY') == ['AX-121', 'AX-122']),
    ('S12', 'Reader suggestions: 10 of the readers\' 12 proposals to close the files check rest on words that name no version and are shown as "names no version: a person asks for it"; the 2 on message 65 stay "close"; the tab lists what each of the 19 linked receipts names, and the readers\' score is quoted unchanged (208 of 215)',
     sum(1 for c, gate, shown, m in props if gate.startswith('G4') and shown == 'names no version: a person asks for it') == 10 and [(m) for c, gate, shown, m in props if gate.startswith('G4') and shown == 'close'] == [65, 65]
     and sum(1 for c, gate, shown, m in props if shown == 'close') == 53 and '19 receipts are linked on the example rows: 5 count for a version, 14 name none' in files_head and '208 of 215' in score),
    ('S13', 'Offices AM and AN hold each office\'s opening hours as times (9:00 AM and 4:00 PM on all ten, from the packet\'s contact hours), AO asks all ten whom to reach before opening, and Settings B17 is 30 minutes',
     str(O(1, 'AM')).startswith('Office opens') and str(O(1, 'AN')).startswith('Office closes') and all(O(r, 'AM') == datetime.time(9, 0) and O(r, 'AN') == datetime.time(16, 0) and str(O(r, 'AO')).startswith('ASK:') for r in OFF.values()) and b17 == 30),
    ('S13', 'Column CO marks the coming hearings that start less than 30 minutes after their office opens, equal to a check made here: 2 in the example (AX-101, Mon 10 Jun 9:00; AX-105, Tue 18 Jun 9:00); the 9:30 hearings are not marked',
     str(H(1, 'CO')).startswith('Starts at opening') and sorted(H(r, 'A') for r in ALL if H(r, 'CO') == 1) == at_open == ['AX-101', 'AX-105']),
    ('S13', 'BE prints FIRST CASE AT OPENING from two working days before, on a day before the hearing: on AX-101 (1 working day ahead) and not yet on AX-105 (7 working days ahead)',
     open_rows == sorted(H(r, 'A') for r in ALL if H(r, 'CO') == 1 and H(r, 'D') > today and H(r, 'V') <= 2) == ['AX-101']),
    ('S14', 'Bench O (mobile number for texts) and P (agreed to be texted) hold a question for all six consultants, because the packet gives an email address only; Q flags all six (round 16: no mobile number on file, so the day-before text, the noon call, the arrival call and the evening text cannot reach them), names the preferred channel of Priya Marden (phone) and Nora Pell (text), and keeps the two-channels flag on Nora Pell only',
     str(B(1, 'O')) == 'Mobile number for texts' and str(B(1, 'P')).startswith('Agreed to be texted') and all(str(B(r, 'O')).startswith('ASK') and str(B(r, 'P')).startswith('ASK') for r in range(2, 8)) and len(flags) == 6
     and all(v == 'NO MOBILE NUMBER ON FILE: THE DAY-BEFORE TEXT, THE NOON CALL, THE ARRIVAL CALL AND THE EVENING TEXT TO EVERYONE IN ASK NEXT CANNOT REACH ' + k + '. UNTIL A NUMBER IS IN COLUMN O, EACH OF THOSE STEPS GOES BY EMAIL (COLUMN B). ASK IN THE SEASON LETTER.' for k, v in flags.items() if k not in ('Nora Pell', 'Priya Marden'))
     and flags.get('Priya Marden') == 'NO MOBILE NUMBER ON FILE: THE DAY-BEFORE TEXT, THE NOON CALL, THE ARRIVAL CALL AND THE EVENING TEXT TO EVERYONE IN ASK NEXT CANNOT REACH Priya Marden. UNTIL A NUMBER IS IN COLUMN O, EACH OF THOSE STEPS GOES BY EMAIL (COLUMN B), THOUGH THEIR PREFERRED CHANNEL IS phone. ASK IN THE SEASON LETTER.'
     and [k for k, v in flags.items() if 'TWO CHANNELS ON RECORD' in v] == ['Nora Pell']
     and flags.get('Nora Pell') == 'NO MOBILE NUMBER ON FILE: THE DAY-BEFORE TEXT, THE NOON CALL, THE ARRIVAL CALL AND THE EVENING TEXT TO EVERYONE IN ASK NEXT CANNOT REACH Nora Pell. UNTIL A NUMBER IS IN COLUMN O, EACH OF THOSE STEPS GOES BY EMAIL (COLUMN B), THOUGH THEIR PREFERRED CHANNEL IS text. ASK IN THE SEASON LETTER. TWO CHANNELS ON RECORD: THE PREFERRED CHANNEL IS text, BUT THEIR OWN WORDS SAY "Confirm by email; no standing commitment": SETTLE WITH Nora Pell WHICH ONE HOLDS.'),
    ('S15', 'Settings B16 is 30 minutes; the arrival time a consultant gave is typed in CH: 10:45 on AX-121 and AX-122 (Leo, message 65) and on AX-107 and AX-108 (Owen, message 20); Fenwick Vale\'s "arrive 15 minutes before the first case" (message 40) is 15 in CI of the two Brook Road rows and no longer words in AV',
     b16 == 30 and {H(r, 'A'): H(r, 'CH') for r in ALL if H(r, 'CH') != ''} == {c: datetime.time(10, 45) for c in ('AX-107', 'AX-108', 'AX-121', 'AX-122')}
     and {H(r, 'A'): H(r, 'CI') for r in ALL if H(r, 'CI') != ''} == {'AX-113': 15, 'AX-114': 15} and all(H(rows[c], 'AV') == '' for c in ('AX-113', 'AX-114'))),
    ('S15', 'Column CL, the time the firm needs the consultant at the office, equals a count made here on every coming in-person hearing with a yes (5 rows: 9:00 a.m. for Maya\'s 9:30, 10:30 a.m. for Leo\'s and for Owen\'s 11:00), and each in-person day-before text gives that clock time once for each consultant and no "30 minutes before"',
     len(held_inperson) == 5 and all(H(r, 'CL') == need_at(r) for r in held_inperson) and sorted(H(r, 'CL') for r in held_inperson) == [540, 630, 630, 630, 630] and len(inperson_texts) == 2
     and all(t.count('be at the office by') + t.count('Your arrival time is being settled') == max(1, t.count('We are expecting you')) and 'minutes before' not in t for t in inperson_texts)
     and all((f"Please be at the office by {clock(H(r, 'CL'))} and text ARRIVED when you are there." if H(r, 'DL') != -1 else 'Your arrival time is being settled: we will confirm it with you today. Please text ARRIVED when you are at the office.')
             in dcell((H(r, 'D').month, H(r, 'D').day), H(r, 'C'), 9) for r in held_inperson) and [H(r, 'A') for r in held_inperson if H(r, 'DL') == -1] == ['AX-102']),
    ('S15', 'BE answers a consultant who gave a later time: "LEO ARLEN SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY." on AX-121 and AX-122, and the same for OWEN TARRIS on AX-107 and AX-108; no other row',
     arrive_rows == ['AX-107', 'AX-108', 'AX-121', 'AX-122'] and all(f"{H(rows[c], 'H').upper()} SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY." in case_be(c) for c in arrive_rows)),
    ('S16', 'Offices AP holds the length of one hearing: 30 for Orimere (message 13) and the question for the other nine; column CN reads it or else Settings B11 (30 on all 24 rows), and every Calendar event ends that many minutes after it starts',
     str(O(1, 'AP')).startswith('Length of one hearing here') and O(OFF.get('Orimere', 1), 'AP') == 30 and sum(1 for r in OFF.values() if str(O(r, 'AP')) == 'ASK: How long does one of our hearings usually run?') == 9
     and all(H(r, 'CN') == 30 == st['B11'].value for r in ALL) and all(cal_minutes(cl.cell(row=r, column=5).value) == cal_minutes(cl.cell(row=r, column=3).value) + H(event_row(r), 'CN') for r in events)),
    ('S16', 'Who can take it: a docket counts as in person for travel when its format is in person (2 of the 9 dockets: Larkmere June 10, Tesswick June 12); no office has said that its video room is at the office, so no video docket does',
     wc_inp is not None and [wc.cell(row=r, column=wc_inp).value for r in range(4, 13)] == [1 if dk.cell(row=r, column=3).value == 'in person' else 0 for r in range(4, 13)] and sum(wc.cell(row=r, column=wc_inp).value for r in range(4, 13)) == 2
     and all(H(r, 'CK') == (1 if H(r, 'F') == 'in person' else 0) for r in ALL)),
]
rok3 = 0
for rule, what, good in R15C:
    rok3 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok3} of {len(R15C)} checks on rules S11 to S16 as expected.\n')

# ---- Round 15c, the final pass: the Reader suggestions tab and the arrival time on a replacement
hu = wb['How to use']
howto = ' '.join(str(hu.cell(row=r, column=1).value or '') for r in range(1, 120))      # round 19: the tab has 83 rows
pend = next(r for r in range(2, 400) if rs.cell(row=r, column=1).value in (None, ''))     # the proposals are rows 2 to the first empty row
props = list(range(2, pend))
def words(case, gate, message): return [str(rs.cell(row=r, column=6).value) for r in props if rs.cell(row=r, column=1).value == case and str(rs.cell(row=r, column=2).value).startswith(gate) and str(rs.cell(row=r, column=4).value) == str(message)]
closing_g1 = [str(rs.cell(row=r, column=6).value) for r in props if str(rs.cell(row=r, column=2).value).startswith('G1') and rs.cell(row=r, column=3).value == 'close']
MONTHS = ('June', 'July')
ohead = next((r for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith('Proposals for the Offices tab: ')), None)
_oend = next((r for r in range((ohead or 0) + 1, (ohead or 0) + 60) if rs.cell(row=r, column=1).value in (None, '')), (ohead or 0) + 1)      # round 17: the proposals for the new cells stand below, after an empty row
orows = [r for r in range((ohead or 0) + 1, _oend) if ohead]
def off_row(county): return next((r for r in range(2, 41) if of.cell(row=r, column=1).value == county), None)
def off_cell(r):
    """'Offices M5: heading' on a proposal row -> (column letter, row number, heading)"""
    m = re.match(r'Offices ([A-Z]+)(\d+): (.*)$', str(rs.cell(row=r, column=2).value or ''))
    return (m.group(1), int(m.group(2)), m.group(3)) if m else (None, None, None)
ch_rows = [r for r in ALL if H(r, 'CH') != '']
def other_name(r): return any(str(H(r, c)).strip() != '' and str(H(r, c)).strip().lower() != str(H(r, 'H')).strip().lower() for c in ('BW', 'BX'))
R15D = [
    ('Readers', 'Reader suggestions column F prints the readers\' words for the check itself: the proposal to close the schedule check of AX-101 quotes the office\'s schedule from message 1 and not "Please tell us who will attend."; every one of the 27 proposals that close a schedule check quotes words that name the date or the room; Nora\'s yes for AX-117 (message 50) reads "Accepted." and her receipt reads "I have both case files"',
     words('AX-101', 'G1', 1) == ['We have set 14 Willow Lane, Larkmere and 28 Willow Lane, Larkmere for June 10 at 9 a.m. and 9:30 a.m., in person.']
     and len(closing_g1) == 27 and all(any(m in w for m in MONTHS) or 'room' in w for w in closing_g1) and not any(w.startswith('Please') for w in closing_g1)
     and words('AX-117', 'G2', 50) == ['Accepted.'] and words('AX-117', 'G4', 50) == ['I have both case files']),
    ('Readers', 'The proposals themselves did not move: 103 rows, 53 shown as "close" and 10 as "names no version: a person asks for it", and column G (accept) is empty on every one',
     len(props) == 103 and sum(1 for r in props if rs.cell(row=r, column=3).value == 'close') == 53
     and sum(1 for r in props if rs.cell(row=r, column=3).value == 'names no version: a person asks for it') == 10 and all(rs.cell(row=r, column=7).value in (None, '') for r in props)),
    ('Offices', 'The foot of the Reader suggestions tab lists the office rule\'s proposals for the Offices tab: 1 in the example, Tesswick, cell Offices M5 under that column\'s own heading, a HOLD from the firm\'s phone note (message 22), said to be for a person, with what to type and the note that the office has not said it in writing; its accept cell is empty',
     ohead is not None and 'Proposals for the Offices tab: 1,' in str(rs.cell(row=ohead, column=1).value) and 'for a person and never fills its cell on its own' in str(rs.cell(row=ohead, column=1).value)
     and len(orows) == 1 and rs.cell(row=orows[0], column=1).value == 'Tesswick' and off_cell(orows[0])[:2] == ('M', off_row('Tesswick'))
     and off_cell(orows[0])[2] == of.cell(row=1, column=13).value and str(rs.cell(row=orows[0], column=3).value).startswith('HOLD: NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY.')
     and str(rs.cell(row=orows[0], column=4).value) == '22' and 'phone note' in str(rs.cell(row=orows[0], column=5).value)
     and str(rs.cell(row=orows[0], column=6).value).startswith('To type: "Clerk Ren said emailing names is no longer enough')
     and 'The office has not said it in writing.' in str(rs.cell(row=orows[0], column=6).value) and rs.cell(row=orows[0], column=7).value in (None, '')),
    ('Offices', 'The proposal agrees with the Offices tab as a person left it: Offices M of Tesswick already holds the change with its source (message 22), and the proposal row says that the cell holds it; How to use names the foot of the tab in the 9:00 a.m. step',
     off_row('Tesswick') is not None and 'message 22' in str(of.cell(row=off_row('Tesswick'), column=13).value)
     and len(orows) == 1 and f"the cell Offices M{off_row('Tesswick')} already holds this change, typed by a person" in str(rs.cell(row=orows[0], column=6).value)
     and 'The foot of that tab lists the proposals for the Offices tab (HOLD: an office changed how it works)' in howto),
    ('CH', 'The arrival time in CH is cleared on a replacement: How to use lists CH with the cells of the consultant who left and with the cells to paste back; on the 4 example rows that hold a time (AX-121, AX-122, AX-107, AX-108) neither BW nor BX names another consultant than column H, so each prints "... SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY." under the name in H, and no row prints the "MAY BE FROM" flag',
     'Q and BX (their day-before YES and their name) and CH (the arrival time they gave)' in howto and '(their GOT IT in M with AY and BW, and their arrival time in CH)' in howto
     and 'clear CH when another consultant takes the hearing' in howto and 'column BE prints the time in CH as possibly theirs' in howto
     and sorted(H(r, 'A') for r in ch_rows) == ['AX-107', 'AX-108', 'AX-121', 'AX-122'] and not any(other_name(r) for r in ch_rows)
     and all(f"{str(H(r, 'H')).upper()} SAID THEY ARRIVE AT 10:45 AM, WE NEED 10:30 AM: REPLY TODAY." in str(H(r, 'BE')) for r in ch_rows)
     and not any('MAY BE FROM' in str(H(r, 'BE')) or 'MAY BE FROM' in str(H(r, 'CM')) for r in ALL)),
]
rok4 = 0
for rule, what, good in R15D:
    rok4 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok4} of {len(R15D)} checks on Reader suggestions, Offices proposals and the arrival time as expected.')

# ---- Round 15c, fixes after the independent test (faults F1 to F4): on the values and the formulas of the example sheet
import datetime as _dt, re as _re
def _mins(x):
    """Minutes after midnight of a time cell or of a time typed as text ("10:00 a.m.", "3:30 pm", "15:30"); None when it is no time."""
    if isinstance(x, _dt.datetime) or isinstance(x, _dt.time): return x.hour * 60 + x.minute
    if isinstance(x, (int, float)): return round((x % 1) * 1440)
    m = _re.fullmatch(r'\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\s*', str(x).lower().replace('a.m.', 'am').replace('p.m.', 'pm'))
    if not m: return None
    h = int(m.group(1)) % 12 + (12 if m.group(3) == 'pm' else 0) if m.group(3) else int(m.group(1))
    return h * 60 + int(m.group(2))
case_row = {str(H(r, 'A')): r for r in ALL}
rc_rows = [r for r in range(4, 1204) if rc.cell(row=r, column=1).value not in (None, '')]
def _time_differs(r):
    hr = case_row.get(str(rc.cell(row=r, column=1).value))
    if hr is None: return False
    b, d = rc.cell(row=r, column=2).value, H(hr, 'D')
    if b in (None, '') or d == '' or (hasattr(b, 'date') and hasattr(d, 'date') and b.date() != d.date()): return False
    a, e = _mins(rc.cell(row=r, column=3).value), _mins(H(hr, 'E'))
    return rc.cell(row=r, column=3).value not in (None, '') and H(hr, 'E') != '' and a is not None and e is not None and a != e
time_flag = [r for r in rc_rows if _re.match(r'RECORD SAYS \d\d:\d\d, THE COUNTY SAYS \d\d:\d\d$', str(rc.cell(row=r, column=8).value or ''))]
off_rows = [r for r in range(2, 41) if of.cell(row=r, column=1).value not in (None, '')]
ar = [H(r, 'AR') for r in ALL]
a1f = str(wf['Dockets']['A1'].value); arf = str(wf['Hearings'].cell(row=2, column=CI('AR')).value); cef = str(wf['Hearings'].cell(row=2, column=CI('CE')).value); rhf = str(wf['Record check']['H4'].value)
R15E = [
    ('F1', 'The missed-hearing line reads NOT KNOWN YET when Offices P is empty as well as when it holds a question: the formula of Hearings CE tests the trimmed cell for empty; on the example all ten offices hold a question or an answer in P, and no row prints "(Offices P): ." with nothing after it',
     'OR(TRIM(' in cef and '="",LEFT(TRIM(' in cef and 'NOT KNOWN YET, SO PHONE THE OFFICE TODAY' in cef
     and len(off_rows) == 10 and all(str(of.cell(row=r, column=16).value or '').strip() != '' for r in off_rows) and not any('(Offices P): .' in str(H(r, 'BE')) for r in ALL)),
    ('F2', 'Record check H reads a time typed as text with "a.m." or "p.m." the way Hearings AG does (the formula replaces both before it reads the time, on the record\'s side and on the sheet\'s side), and on the example the records it flags for the time are exactly the ones whose time differs when both are read here',
     rhf.count('SUBSTITUTE(SUBSTITUTE(LOWER(') == 4 and rhf.count('"a.m.","am"') == 4 and sorted(time_flag) == sorted(r for r in rc_rows if _time_differs(r))),
    ('F3', 'A row that no longer reads its own row is flagged: Hearings AR holds -1 for it (the formula compares the row of its own references, and ROWS of its range over the rows above, with the row it stands on, and turns an error into -1), and Dockets A1 names the row before it says anything about sorting. On the example AR is 1 on all 24 rows, A1 reads "Rows are sorted: yes", and How to use says never to cut and paste or drag a row or a single cell, and never to insert a row between two hearings',
     'ROWS(A$1:A1)<>ROW()-1' in arf and 'ROW(A2)-ROW()' in arf and arf.startswith('=IFERROR(') and arf.endswith(',-1)')
     and 'NO LONGER READS ITS OWN ROW' in a1f and a1f.index('NO LONGER READS ITS OWN ROW') < a1f.index('Rows are sorted: yes')
     and len(ar) == 24 and all(x == 1 for x in ar) and dk['A1'].value == 'Rows are sorted: yes'
     and 'Never cut and paste or drag a row or a single cell to another place, never insert a row between two hearings' in howto),
    ('F4', 'A time typed as text that a sort has put after the other times of its docket is named: Dockets A1 then reads "THE TIME IN ROW n OF THE HEARINGS TAB IS TYPED AS TEXT AND SORTS AFTER THE OTHER TIMES" instead of asking for the same sort again. On the example the 24 times in column E are text in 24-hour form with two digits for the hour ("09:00"), which a sort puts in time order, so A1 reads "Rows are sorted: yes"; How to use says what the sheet does with a time typed as text',
     'IS TYPED AS TEXT AND SORTS AFTER THE OTHER TIMES' in a1f and 'ISTEXT(Hearings!$E$2:$E$1200)' in a1f
     and len(ALL) == 24 and all(isinstance(H(r, 'E'), str) and _re.fullmatch(r'[0-2]\d:[0-5]\d', H(r, 'E')) for r in ALL) and dk['A1'].value == 'Rows are sorted: yes'
     and 'A time typed as text, such as 3:30 p.m. with the dots, is still read, but a sort puts it after the other times of its docket' in howto),
]
rok5 = 0
for rule, what, good in R15E:
    rok5 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok5} of {len(R15E)} checks on the fixes after the independent test (F1 to F4) as expected.')

# ---- Round 15c, second fix round (faults F5 to F7): on the values and the formulas of the example sheet
_TYPED16 = ['CP', 'CQ', 'CR', 'CS', 'CT', 'CU']      # round 16: six more typed columns
_TYPED17 = ['DA', 'DB', 'DC', 'DD', 'DE', 'DF', 'DG', 'DH', 'DI']      # round 17: nine more
_TYPED18 = ['DQ', 'DR', 'DS', 'DT', 'DU', 'DV', 'DW', 'DX']      # round 18: eight more
_TYPED19 = ['EB', 'EC']      # round 19: two more
_TYPED = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'Y', 'Z', 'AA', 'AB', 'AC', 'AF',
          'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BC', 'BD', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BN', 'BO', 'BQ', 'BW', 'BX', 'BY', 'CH', 'CI'] + _TYPED16 + _TYPED17 + _TYPED18 + _TYPED19
_hf = wf['Hearings']
_typed_now = [_hf.cell(row=1, column=c).column_letter for c in range(1, 135) if not str(_hf.cell(row=2, column=c).value or '').startswith('=')
              and not str(_hf.cell(row=1200, column=c).value or '').startswith('=')]
ar1200 = str(_hf.cell(row=1200, column=CI('AR')).value)
ar_all = [hs.cell(row=r, column=CI('AR')).value for r in range(2, 1201)]
g1f = str(wf['Dockets']['G1'].value)
_i = lambda s: a1f.index(s)
R15F = [
    ('F5', 'One typed cell that is cut and pasted or dragged to another row or column is flagged: the formula of Hearings AR tests the row and the column of each of the 73 typed cells of its row (48, the 6 of round 16, the 9 of round 17, the 8 of round 18 and the 2 of round 19; the 73 are exactly the columns of the Hearings tab that hold no formula), the test stands before the test for an empty case number, so an unused row is tested too, and no row of the example, used or unused, holds -1. Dockets A1 says how many rows are concerned, and How to use says how to move what a cell holds',
     len(_TYPED) == 73 and _typed_now == _TYPED and all(f'ROW({k}2)-ROW(),COLUMN({k}2)-{CI(k)}' in arf and f'ROW({k}1200)-ROW(),COLUMN({k}1200)-{CI(k)}' in ar1200 for k in _TYPED)
     and arf.startswith('=IFERROR(IF(OR(SUMSQ(') and arf.index('SUMSQ(') < arf.index('IF(A2="","",')
     and -1 not in ar_all and '-1' not in [str(x) for x in ar_all] and sum(1 for x in ar_all if x == 1) == 24
     and 'AND NEITHER DO "&(COUNTIF(Hearings!$AR$2:$AR$1200,-1)-1)&" OTHER ROWS' in a1f and 'a row or a cell was cut and pasted, dragged, inserted or deleted' in a1f
     and 'To move what a cell holds, copy it, paste it into the right cell, then empty the old cell with the Delete key' in howto and 'never use Insert cells or Delete cells' in howto),
    ('F6', 'Dockets A1 never shows an error value in place of its warning: the count behind the CHECK warning is read through IFERROR, the warning for a row that no longer reads its own row is tested next, then a warning names the first row whose status shows an error value, and the whole formula ends in a text of last resort. G1 reads "Dockets from today on: not counted, see cell A1" in place of an error value. On the example A1 reads "Rows are sorted: yes" and G1 "Dockets from today on: 9"',
     a1f.startswith('=IFERROR(IF(') and a1f.endswith('SO THE ROWS CANNOT BE CHECKED: undo the last change (Ctrl+Z), or go back to the last saved copy of the sheet")')
     and 'IF(IFERROR((SUMPRODUCT(' in a1f and _i('CHECK THE HEARINGS TAB') < _i('NO LONGER READS ITS OWN ROW') < _i('SHOWS AN ERROR VALUE IN ITS STATUS (column W)') < _i('Rows are sorted: yes')
     and g1f.startswith('=IFERROR(') and g1f.endswith('"Dockets from today on: not counted, see cell A1")')
     and dk['A1'].value == 'Rows are sorted: yes' and dk['G1'].value == 'Dockets from today on: 9'),
    ('F7', 'A row that is out of date order gets the SORT warning also when its time is typed as text: Dockets A1 gives the text-time warning only when the first row out of order that holds a text time has no later date above it (the formula counts the dates above that row that are later than its own), and the SORT text is tested before the text-time text',
     'ISNUMBER(Hearings!$D$2:$D$1200)*(Hearings!$D$2:$D$1200>INDEX(Hearings!$D$1:$D$1200,' in a1f and a1f.count('"SORT THE HEARINGS TAB by date, office and time"') == 2
     and a1f.rindex('"SORT THE HEARINGS TAB by date, office and time"') < _i('IS TYPED AS TEXT AND SORTS AFTER THE OTHER TIMES')),
]
rok6 = 0
for rule, what, good in R15F:
    rok6 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok6} of {len(R15F)} checks on fixes F5 to F7 as expected.')

# ---- Round 15c, third fix round: F8, F9, a date typed as text, the wording, the questions for the firm
def _all_text(book):
    return [(w.title, c.coordinate, c.value) for w in book.worksheets for row in w.iter_rows() for c in row if isinstance(c.value, str)]
_texts = _all_text(wb)
_nform = sum(1 for w in wf.worksheets for row in w.iter_rows() for c in row if isinstance(c.value, str) and c.value.startswith('='))
_row2 = str(hu.cell(row=2, column=1).value or ''); _row14 = str(hu.cell(row=14, column=1).value or '')
_m2 = _re.search(r'and (\d+) more that a person added in that pass \((\d+) of them are listed on the tab "Reader suggestions": the (\d+) of its second list of the 9:00 a.m. pass and (\d+) more that only its first list holds; the other (\d+) are', _row2)
_n2 = [int(x) for x in _m2.groups()] if _m2 else [None] * 5
_h1 = next((r for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith('The 9:00 a.m. pass in the example, first list: ')), None)
_h2 = next((r for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith('Missed by the readers, added by a person at 9:00: ')), None)
_h3 = next((r for r in range((_h2 or 0) + 1, 400) if str(rs.cell(row=r, column=1).value or '').startswith("The readers' measured score")), None)
def _rows(a, b): return [r for r in range((a or 0) + 1, b or 0) if rs.cell(row=r, column=1).value not in (None, '')]
_islink = lambda r: str(rs.cell(row=r, column=3).value or '').startswith('http')
_cell = lambda r: (rs.cell(row=r, column=1).value, rs.cell(row=r, column=2).value, rs.cell(row=r, column=3).value)
_l1 = _rows(_h1, _h2); _l2 = _rows(_h2, _h3)
_links1 = {_cell(r) for r in _l1 if _islink(r)}; _links2 = {_cell(r) for r in _l2 if _islink(r)}
_bo = sum(1 for r in ALL if str(H(r, 'BO')).startswith('http'))
_t1 = str(rs.cell(row=_h1, column=1).value) if _h1 else ''; _t2 = str(rs.cell(row=_h2, column=1).value) if _h2 else ''
_rule = next((str(rs.cell(row=r, column=1).value) for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith('The rule for proposals: ')), '')
_HOLD = ('HOLD: NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY. The Tesswick office said it changed how it works. A person reads the change and types their name in Offices AQ and the date in Offices AR. '
         'After the approval the new route is the route, and the old route is a second route only while the office still accepts it (Offices AS: yes or not known).')
dc1 = wb['Day 1 count']; dc1f = wf['Day 1 count']
_Q = [(20, 'Which mail service holds the shared hearing mailbox'), (21, 'Which service runs the text line that consultants answer'), (22, 'Can the case system import a CSV file'),
      (23, 'Which tool sends the homeowner notices today'), (24, "the readers' proposals by kind"), (25, 'Is "arrive 15 minutes before the first case" your standing rule'),
      (26, 'Does your office change its clocks in March and November'), (27, 'Do you ask for more time between hearings than our own rule'), (28, "which consultant's name and which hearing date stand on the notice the homeowner was sent"),
      (29, 'How many working days before a hearing is the last day you accept a request to change its date'), (30, 'What is your daytime telephone number, and which clerk should we ask for'), (31, "the homeowner's telephone number and email address"), (33, 'In which states may each of our consultants appear and sign for a homeowner'), (32, 'What is your street address, in which room are our hearings held, and where does our consultant report on arrival')]
_VOL = ('INDIRECT(', 'OFFSET(', 'NOW(', 'TODAY(', 'RAND(', 'RANDBETWEEN(', 'CELL(', 'INFO(')
_row2f = [str(_hf.cell(row=2, column=c).value or '') for c in range(1, 132)]
R15G = [
    ('F8', 'Cells shifted to the side are seen from outside the row: Dockets A1 counts the rows whose column ED holds nothing, whose column EE holds something (round 19: ED is the last formula column), or that have a case number and no number in AR, names the first one ("HAS LOST A FORMULA OR HAS CELLS OUT OF THEIR COLUMNS"), and tests this after the CHECK text and the moved-row warning and before everything else. On the example every row from 2 to 1200 holds a formula in ED, nothing in EE, and How to use says to type nothing to the right of column ED',
     'NOT(ISBLANK(Hearings!$EE$2:$EE$1200))+ISBLANK(Hearings!$ED$2:$ED$1200)+(Hearings!$A$2:$A$1200<>"")*NOT(ISNUMBER(Hearings!$AR$2:$AR$1200))' in a1f
     and _i('NO LONGER READS ITS OWN ROW') < _i('HAS LOST A FORMULA OR HAS CELLS OUT OF THEIR COLUMNS') < _i('SHOWS AN ERROR VALUE IN ITS STATUS (column W)')
     and all(str(_hf.cell(row=r, column=134).value or '').startswith('=') and _hf.cell(row=r, column=135).value in (None, '') for r in range(2, 1201)) and _hf.max_column == 135
     and all(isinstance(H(r, 'AR'), (int, float)) for r in ALL) and dk['A1'].value == 'Rows are sorted: yes'
     and 'Type nothing to the right of column ED.' in howto and 'a row whose cells were shifted to the side' in howto),
    ('F9', 'A typed cell cut and pasted to the same address on another tab is flagged: the formula of Hearings AR compares each of the 73 typed cells (48, the 6 of round 16, the 9 of round 17, the 8 of round 18 and the 2 of round 19) with the cell that stands in its column of the Hearings tab on its own row, read through a whole-column reference, and holds -1 when they differ. The formula uses no volatile function. On the example no row holds -1',
     all(f'IFERROR({k}2<>INDEX(${k}:${k},ROW()),FALSE)' in arf.replace('FALSE()', 'FALSE') and f'IFERROR({k}1200<>INDEX(${k}:${k},ROW()),FALSE)' in ar1200.replace('FALSE()', 'FALSE') for k in _TYPED)
     and not any(v in arf for v in _VOL) and -1 not in ar_all and sum(1 for x in ar_all if x == 1) == 24
     and 'A typed cell that was cut and pasted to another tab is named whenever the cell that the formulas now read holds something else than the cell in its old place' in howto
     and 'cut and pasted or dragged (also to another tab)' in str(_hf.cell(row=1, column=CI('AR')).value)),
    ('DATE', 'A date typed as text reads like an empty date on its row: no formula of row 2 tests column D for empty any more (each tests it for a number), Dockets A1 names the row ("IS TYPED AS TEXT, SO THE ROW READS NO DATE AND IS ON NO DOCKET") after the warnings for broken rows and before "sorted: yes", and on the example all 24 dates are dates',
     not any(_re.search(r'(?<![A-Z$])D2(=|<>)""', f) for f in _row2f) and sum(f.count('ISNUMBER(D2)') for f in _row2f) >= 9
     and _i('SHOWS AN ERROR VALUE IN ITS STATUS (column W)') < _i('SO THE ROW READS NO DATE AND IS ON NO DOCKET') < _i('Rows are sorted: yes')
     and '(Hearings!$A$2:$A$1200<>"")*ISTEXT(Hearings!$D$2:$D$1200)' in a1f
     and len(ALL) == 24 and all(isinstance(H(r, 'D'), _dt.datetime) for r in ALL)
     and 'A date typed as text (for example "to be set") makes its row read NO DATE, and cell A1 names the row.' in howto),
    ('A14', f'How to use row 14 says which sheet ran where, with the measured numbers: this sheet with its own number of formulas ({_nform:,}, counted here from the file) checked in LibreOffice 24.2; Excel for Mac 16 on the 1,200-row sheet as it stood on 20 Nov (143,729 formulas, 42 of 16,534 cells differ, all the random draw); Google Sheets on an 80-row copy as it stood before the rules of 21 Nov (39,652 formulas, 45 random cells and 780 holiday blanks differ); the keep-empty heading named in EE1; the 80-row copy of the sheet as it is now (41,413 formulas, LibreOffice only); and what was not tested',
     f'This sheet ({_nform:,} formulas) is recalculated and checked in LibreOffice 24.2.' in _row14
     and '143,729 formulas' in _row14 and 'only the 42 of the random draw' in _row14 and 'an 80-row copy of this sheet as it stood before the rules added on 21 Nov (39,652 formulas then' in _row14 and 'the heading in DA1 of the Hearings tab exist' not in _row14 and 'is in EE1 now' in _row14
     and 'an 80-row copy of the sheet as it is now has 41,413 formulas' in _row14 and '780 empty holiday cells' in _row14
     and 'Not tested: the full 1,200 rows in Google Sheets, Excel for Windows or in a browser' in _row14 and 'It was not run in Excel' not in _row14),
    ('Links', f'How to use row 2 and the Reader suggestions tab agree on the links a person added, and both agree with the cells: the first list holds {len(_l1)} cells ({len(_links1)} links and 1 name), the second list {len(_l2)} links, {len(_links1 & _links2)} of them in both, so the tab lists {len(_links1 | _links2)}; with the {_bo} links in Hearings column BO that is {len(_links1 | _links2) + _bo}',
     _m2 is not None and _n2 == [len(_links1 | _links2) + _bo, len(_links1 | _links2), len(_links2), len(_links1 - _links2), _bo]
     and len(_l1) == 4 and len(_links1) == 3 and len(_l2) == len(_links2) == 16 and all(str(rs.cell(row=r, column=5).value) == 'a person (9:00 a.m. pass)' for r in _l1 + _l2)
     and f'the {len(_l1)} cells a person filled while reading the messages handed to them, following the kit: {len(_links1)} proof links and 1 consultant\'s name' in _t1
     and f'{len(_links1 & _links2)} of the {len(_links1)} links stand again in the second list below' in _t1 and 'Message 16 was not handed over' in _t1
     and _t2.startswith(f'Missed by the readers, added by a person at 9:00: {len(_links2)} proof links')
     and f'this tab lists {len(_links1 | _links2)} links that a person added. With the {_bo} consultants\' messages in Hearings column BO, a person added {len(_links1 | _links2) + _bo} links in all' in _t2),
    ('HOLD', 'A changed office route (round 16): the office proposal holds the new HOLD sentence (no notice goes to this office until a person approves the change today; after the approval the new route is the route, and the old one a second route only while the office still accepts it), the heading of the block and How to use say the same, and no cell of the sheet says BOTH ROUTES any more. The sentence is the one the sheet engineer handed to the prototype engineer for node cli/office.js',
     len(orows) == 1 and str(rs.cell(row=orows[0], column=3).value) == _HOLD
     and 'HOLD in column C means: NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY.' in str(rs.cell(row=ohead, column=1).value)
     and 'HOLD means: NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY.' in howto
     and 'After the approval the new route is the route; the old route is printed as a second route only while column AS says yes or not known.' in howto
     and not any('BOTH ROUTES' in v or 'by both routes' in v.lower() for _, _, v in _texts)),
    ('Auto', 'Auto-filing: the rule on the Reader suggestions tab is the condition (Alice at the live-week-4 review, and only if the Friday sample found no wrong link of that kind in four weeks running), and it names the two-week tally on row 24 of the Day 1 count tab as the measurement that feeds it; row 24 says the same',
     'Nothing fills a cell on its own in season one.' in _rule and 'only if the Friday sample found no wrong link of that kind in four weeks running' in _rule
     and 'two-week tally of the proposals by kind (row 24 of the "Day 1 count" tab): it is the measurement, and the four clean Friday samples are the condition.' in _rule
     and 'This tally is the measurement.' in str(dc1.cell(row=24, column=4).value) and 'four weeks running' in str(dc1.cell(row=24, column=4).value)),
    ('Ask', 'The questions that had no cell stand on rows 20 to 33 of the Day 1 count tab (six from round 15, three from round 16: the clocks, number 28 of the kit\'s list on the gaps, number 36 on the homeowner notices; three from round 17: question 14 of the season email on the last day for a change request, question 15 on the telephone number of each office, the contact of each homeowner; one from round 18: the street address of each office that hears in person; and one from round 19: the states in which each consultant may appear and sign), each with an amber ASK cell in column B, who answers in column C and what the answer decides in column D. Rows 2 to 19 are as they were (18 rows), and Offices K8 still holds the Fenwick Vale office\'s own words from message 40: the question about its standing rule is on row 25 and not over that cell',
     all(q in str(dc1.cell(row=r, column=1).value or '') and str(dc1.cell(row=r, column=2).value or '').startswith('ASK') and dc1f.cell(row=r, column=2).fill.fill_type == 'solid'
         and str(dc1f.cell(row=r, column=2).fill.fgColor.rgb).endswith('FFE9B8') and str(dc1.cell(row=r, column=3).value or '') != '' and str(dc1.cell(row=r, column=4).value or '') != '' for r, q in _Q)
     and all(dc1.cell(row=r, column=1).value not in (None, '') for r in range(2, 20)) and dc1.cell(row=34, column=1).value in (None, '')
     and str(of.cell(row=off_row('Fenwick Vale'), column=11).value or '').startswith('Arrive 15 minutes before the first case (40).') and off_row('Fenwick Vale') == 8),
]
rok7 = 0
for rule, what, good in R15G:
    rok7 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok7} of {len(R15G)} checks on fixes F8 and F9, a date typed as text, the wording and the questions for the firm as expected.')

# ---- Round 16 (Part I of the rule book): the new rules, on the values the example sheet holds
_BLOCK = 'NO NOTICE GOES TO THIS OFFICE UNTIL A PERSON APPROVES THE CHANGE TODAY'
_of_f = wf['Offices']; _tw = OFF.get('Tesswick', 1); cf = wb['Calendar file']
_avf = str(_of_f.cell(row=_tw, column=CI('AV')).value or ''); _awf = str(_of_f.cell(row=_tw, column=CI('AW')).value or '')
_wf2 = str(_hf.cell(row=2, column=CI('W')).value or ''); _cvf = str(_hf.cell(row=2, column=CI('CV')).value or '')
_be = lambda r: str(H(r, 'BE')); _x = lambda r: str(H(r, 'X'))
_tess = [r for r in ALL if H(r, 'C') == 'Tesswick']
_blocked = [r for r in ALL if H(r, 'CX') == 1 and H(r, 'BV') == 1 and coming(r) and (H(r, 'G') == 'yes' or not http(H(r, 'AF'))) and (not http(H(r, 'K')) or (H(r, 'BD') != '' and H(r, 'H') != '' and H(r, 'BD') != H(r, 'H')))]
_HELD = ('reduction', 'no change', 'heard: decision awaited', 'held open for a statement')
_past_held = [r for r in ALL if H(r, 'G') == 'yes' and isinstance(H(r, 'D'), _dt.datetime) and H(r, 'D') < today and H(r, 'S') in _HELD and H(r, 'F') != 'written statement']
_no_arr = [r for r in ALL if H(r, 'G') != 'no' and isinstance(H(r, 'D'), _dt.datetime) and H(r, 'D') < today and H(r, 'S') in _HELD and H(r, 'F') != 'written statement' and str(H(r, 'R')).strip() == '']
_no_dby = [r for r in _past_held if not (http(H(r, 'Q')) and str(H(r, 'BX')).strip() != '' and str(H(r, 'BX')).strip() == str(H(r, 'H')).strip())]
_b4 = st['B4'].value
_nonum_want = sorted(H(r, 'A') for r in ALL if coming(r) and H(r, 'BV') == 1 and H(r, 'H') != '' and H(r, 'F') != 'written statement' and H(r, 'CW') == 0 and isinstance(H(r, 'V'), (int, float)) and H(r, 'V') <= _b4)
_nonum_got = sorted(H(r, 'A') for r in ALL if 'HAS NO MOBILE NUMBER ON FILE (Bench O)' in _be(r))
_names = [B(r, 'A') for r in range(2, 42) if B(r, 'A')]
_asknext = [str(dk.cell(row=r, column=15).value or '') for r in range(4, 304) if dk.cell(row=r, column=15).value not in (None, '')]
def _day(v):
    if isinstance(v, _dt.datetime): return v.date()
    if isinstance(v, (int, float)) and v > 0: return (_dt.datetime(1899, 12, 30) + _dt.timedelta(days=int(v))).date()
    return None
_ill_rows = [r for r in range(2, 301) if av.cell(row=r, column=9).value == 'illness']
_cy = {H(r, 'A'): _day(H(r, 'CY')) for r in ALL if H(r, 'CY') != ''}
_ics = []
for _r in range(1, 23986):
    _v = cf.cell(row=_r, column=1).value
    if _v in (None, ''): break
    _ics.append(str(_v))
_ev = [i for i, l in enumerate(_ics) if l == 'BEGIN:VEVENT']
_cal_rows = [r for r in range(2, 1201) if cl.cell(row=r, column=1).value not in (None, '')]
def _utc(r):
    # the start of the Calendar tab's row r in UTC, counted here from its local date and time and the hours from UTC in column J
    d = _dt.datetime.strptime(f"{cl.cell(row=r, column=2).value} {cl.cell(row=r, column=3).value}", '%m/%d/%Y %I:%M %p') - _dt.timedelta(hours=float(cl.cell(row=r, column=10).value))
    return d.strftime('DTSTART:%Y%m%dT%H%M%SZ')
_c1_want = sorted(H(r, 'A') for r in ALL if (H(r, 'D') == '' or coming(r)) and H(r, 'BI') != '' and not http(H(r, 'BJ')) and not http(H(r, 'CR')))
_c1_got = sorted(H(r, 'A') for r in ALL if "OUR DATE-CHANGE REQUEST IS OUT WITHOUT THE HOMEOWNER'S YES TO THE NEW DATE" in _be(r))
_c3_got = sorted(H(r, 'A') for r in ALL if 'BEFORE IT IS COLLECTED AGAIN: CHECK WHETHER CASE FILES VERSION' in _be(r))
_c3_want = sorted(H(r, 'A') for r in ALL if H(r, 'BU') == 1 and str(H(r, 'N')).strip() != '' and 'settle' not in str(H(r, 'N')).lower() and 'withdraw' not in str(H(r, 'N')).lower() and H(r, 'W') != 'MISSED' and str(H(r, 'AX')) != '')
R16 = [
    ('D2', 'A changed office route is blocked until a person approves it: Offices AV (route state) is 1 for Tesswick and 0 for the nine other offices; Offices AQ and AR (approved by, approved on) are empty, because no message in the packet names a person at the firm who approved the change; AS is "no" (message 22: emailing names is no longer enough) and AT is 4 Jun 2030 (the date on the staffing form); Offices N says APPROVE OR REJECT THE CHANGE TODAY; Hearings CX is 1 on the two Tesswick rows only, their daily list says NOTICE BLOCKED, and Measures B98 counts them (2, equal to a count made here)',
     O(_tw, 'AV') == 1 and [O(r, 'AV') for c, r in OFF.items() if c != 'Tesswick'] == [0] * 9 and O(_tw, 'AQ') == '' and O(_tw, 'AR') == '' and O(_tw, 'AS') == 'no' and O(_tw, 'AT') == _dt.datetime(2030, 6, 4)
     and O(_tw, 'N') == 'APPROVE OR REJECT THE CHANGE TODAY (AQ AND AR): ' + _BLOCK and sorted(H(r, 'A') for r in ALL if H(r, 'CX') == 1) == ['AX-107', 'AX-108'] == sorted(H(r, 'A') for r in _blocked)
     and all(' NOTICE BLOCKED' in _x(r) and _x(r).startswith('TOP OF LIST') for r in _tess) and [r for r in ALL if 'NOTICE BLOCKED' in _x(r)] == _tess and ms['B98'].value == len(_blocked) == 2),
    ('D2', 'After the approval the new route is the route: the formula of Offices AV reads state 2 or 3 when AQ holds a name and AR a date that is on or after the day of the change (AT), or when the office confirmed in writing (L) on or after the day of the change (whole days in both cases; changed after the independent test of round 16, which showed an approval older than the change lifting the block); state 2 (AS is no) prints the new route and DO NOT USE the old one, state 3 (AS is yes or not known) prints the new route first and the old one second. The example shows state 1 only; the scratch runs (patch/r37_scratch_r16.py) show the others',
     'OR(AND(TRIM(AQ%d&"")<>"",ISNUMBER(AR%d),ISNUMBER(AT%d),INT(N(AR%d))>=INT(N(AT%d))),AND(ISNUMBER(L%d),ISNUMBER(AT%d),INT(N(L%d))>=INT(N(AT%d))))' % ((_tw,) * 9) in _avf and 'IF(LOWER(TRIM(AS%d&""))="no",2,3)' % _tw in _avf
     and 'THE OFFICE NO LONGER ACCEPTS THE OLD ROUTE (Offices AS): DO NOT USE IT' in _awf and '; (2) THE OLD ROUTE, WHICH THE OFFICE ' in _awf and _BLOCK + ': the ' in _awf
     and O(_tw, 'AW').endswith('No route is printed until then')),
    ('D3', 'The office says it cannot find our notice: Hearings CP holds the link to message 24 and CQ the link to message 23 (the firm\'s own word that the form went; the packet gives no date for it) on the two Tesswick rows and on no other row; column BE prints THE NOTICE WAS SENT ... BUT THE OFFICE CANNOT FIND IT with both links, and that it is resent only after the approval; the daily list says OFFICE CANNOT FIND OUR NOTICE',
     sorted(H(r, 'A') for r in ALL if H(r, 'CP') != '') == ['AX-107', 'AX-108'] and all(H(r, 'CP') == 'https://mailbox.example/message/24' and H(r, 'CQ') == 'https://mailbox.example/message/23' for r in _tess)
     and all("THE NOTICE WAS SENT (https://mailbox.example/message/23) BUT THE OFFICE CANNOT FIND IT (https://mailbox.example/message/24): IT IS RESENT ONLY AFTER A PERSON APPROVES THE OFFICE'S CHANGE (Offices AQ AND AR)." in _be(r) for r in _tess)
     and [r for r in ALL if 'OFFICE CANNOT FIND OUR NOTICE' in _x(r)] == _tess and [r for r in ALL if 'BUT THE OFFICE CANNOT FIND IT' in _be(r)] == _tess),
    ('D4', 'The call the office asked for is a task with a name and a time: columns Y, Z and AA of the two Tesswick rows hold the call from message 24 (who: the coordinator; by when: Monday, June 10, a date since round 18, with the day the message is read as having arrived, Friday, June 7, in DX), column BE prints CALL THE TESSWICK OFFICE IN ITS HOURS with the hours from Offices D and the task, and says that a call never closes a check; the status of both rows is still OPEN: 3 missing; no other row prints a call line',
     all(str(H(r, 'Y')).startswith('Call the Tesswick office in the morning, as clerk Sol asked (message 24)') and H(r, 'Z') == 'the coordinator' and H(r, 'AA') == datetime.datetime(2030, 6, 10) and H(r, 'DX') == datetime.datetime(2030, 6, 7) for r in _tess)
     and all('CALL THE TESSWICK OFFICE IN ITS HOURS (Offices D: ' + str(O(_tw, 'D')) + '): THE CALL IS IN Y, Z AND AA (' + str(H(r, 'Y')) + '; the coordinator; by Mon 10 Jun). A CALL NEVER CLOSES A CHECK: ASK FOR IT IN WRITING.' in _be(r) and H(r, 'W') == 'OPEN: 3 missing' for r in _tess)
     and [r for r in ALL if ' OFFICE IN ITS HOURS' in _be(r)] == _tess),
    ('R10', f'DONE means done: the Status formula tests for "RESULT IN: ARRIVAL NOT RECORDED" (a held hearing with a result and no time in column R) before every DONE branch, so no such row can read DONE. On the example {len(_past_held)} past hearings were held (AX-119 and AX-120) and neither has a time in R: their statuses are OWED and ERROR DUE, which come first, column BE of both asks for the time, and Measures B95 counts them from the cells ({len(_no_arr)}, equal to a count made here). The day-before YES is not chased after the hearing and DONE does not wait for it: Measures B96 counts the hearings held without one ({len(_no_dby)}, equal to a count made here)',
     '"RESULT IN: ARRIVAL NOT RECORDED"' in _wf2 and _wf2.index('"RESULT IN: ARRIVAL NOT RECORDED"') < _wf2.index('"DONE') and sorted(H(r, 'A') for r in _no_arr) == ['AX-119', 'AX-120']
     and [H(r, 'W') for r in _no_arr] == ['OWED', 'ERROR DUE'] and [r for r in ALL if 'NO ARRIVAL OR JOIN TIME IS RECORDED IN R: ASK OWEN TARRIS WHEN THEY ARRIVED OR JOINED AND TYPE THE TIME IN R.' in _be(r)] == _no_arr
     and ms['B95'].value == len(_no_arr) == 2 and ms['B96'].value == len(_no_dby) == 2
     and not any(str(H(r, 'W')).startswith('DONE') and H(r, 'R') == '' and H(r, 'S') in _HELD and H(r, 'F') != 'written statement' for r in ALL)),
    ('X14', f'No mobile number on file: Bench R (reach) is 0 for all six consultants, because the packet gives an email address only, Hearings CW is 0 on every row with a consultant, and Measures B97 is 6; column BE prints "HAS NO MOBILE NUMBER ON FILE (Bench O)" with the email address on every coming hearing within {_b4} working days that has a yes that counts ({len(_nonum_want)} rows, equal to a list made here) and on no other row; every name in "Ask next" on the Dockets tab is followed by (EMAIL ONLY)',
     [B(r, 'R') for r in range(2, 8)] == [0] * 6 and all(H(r, 'CW') == 0 for r in ALL if H(r, 'H') != '') and ms['B97'].value == 6 and _nonum_got == _nonum_want and len(_nonum_want) > 0
     and len(_asknext) > 0 and all(sum(t.split(' WHO MAY APPEAR AND SIGN IN ')[0].count(nm) for nm in _names) == t.count(' (EMAIL ONLY)') > 0 for t in _asknext)),
    ('X17', 'An illness report: the Availability row of message 41 (Maya Venn, "I am ill and cannot attend tomorrow") has the reason illness and "said on" 5 Jun 2030 (the hearings of message 37 are on June 6, so "tomorrow" was said on June 5); Settings B18 is 7 days (our suggestion) and B19 counts 1 report; Hearings CY holds 5 Jun on AX-102 (Maya, June 10, a coming hearing with her yes) and on no other row; its BE says REPORTED ILL ... ASK TODAY ... LINE UP A BACKUP with the office\'s deadline, its daily list says ILLNESS REPORTED, and CT and CU are empty, because no message holds her yes after the report',
     len(_ill_rows) == 1 and av.cell(row=_ill_rows[0], column=2).value == 'Maya Venn' and av.cell(row=_ill_rows[0], column=8).value == 'not free' and av.cell(row=_ill_rows[0], column=10).value == _dt.datetime(2030, 6, 5)
     and _day(av.cell(row=_ill_rows[0], column=11).value) == _dt.date(2030, 6, 5) and st['B18'].value == 7 and st['B19'].value == 1 and _cy == {'AX-102': _dt.date(2030, 6, 5)}
     and "MAYA VENN REPORTED ILL ON Wed 5 Jun: ASK TODAY WHETHER THEY WILL ATTEND, AND LINE UP A BACKUP BEFORE THE OFFICE'S NAMING DEADLINE (Fri 7 Jun at 4:00 PM). WHEN THEY SAY YES, LINK IT IN CT AND TYPE ITS DATE IN CU." in case_be('AX-102')
     and [H(r, 'A') for r in ALL if 'ILLNESS REPORTED' in _x(r)] == ['AX-102'] and all(H(r, 'CT') == '' and H(r, 'CU') == '' for r in ALL)),
    ('X9', f'The calendar as a file: the "Calendar file" tab holds an iCalendar text in column A: BEGIN:VCALENDAR, VERSION:2.0, one event of exactly 20 lines for each row of the Calendar tab ({len(_cal_rows)}; the subject on 2 lines, the location on 4, the description on 8), END:VCALENDAR on line {len(_ics)}, no line longer than 75 octets, cell B3 of the tab saying so and cell B1 giving the limits, and every DTSTART in UTC with the letter Z, equal to the local start on the Calendar tab less the office\'s hours from UTC, counted here',
     _ics[:4] == ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gate sheet//Hearing calendar//EN', 'CALSCALE:GREGORIAN'] and _ics[-1] == 'END:VCALENDAR' and len(_ev) == len(_cal_rows) == 17
     and len(_ics) == 4 + 20 * len(_ev) + 1 and _ev == [4 + 20 * k for k in range(len(_ev))] and all(_ics[i + 19] == 'END:VEVENT' and _ics[i + 1].startswith('UID:') and _ics[i + 2].startswith('DTSTAMP:') for i in _ev)
     and max(len(l.encode('utf-8')) for l in _ics) <= 75 and all(_ics[i + 3] == _utc(_cal_rows[k]) for k, i in enumerate(_ev)) and len({_ics[i + 1] for i in _ev}) == len(_ev)
     and str(cf['B2'].value) == f'{len(_ev)} events, {len(_ics)} lines' and str(cf['B3'].value) == 'Line length: no line of column A is longer than 75 characters.'
     and all(t in str(cf['B1'].value) for t in ('at most 140 characters', 'a location at most 287', 'a description at most 580'))),
    ('X9', 'Daylight time is never typed by hand: Hearings CV is the office\'s hours from UTC on the hearing date, Offices W plus one hour between the second Sunday of March and the first Sunday of November when Offices AU says yes. Offices AU holds a question (ASK) for all ten offices, because the packet says UTC-05:00 "fixed for this exercise" and not which offices change their clocks, so CV equals Offices W (-5) on all 24 rows; the question stands on row 26 of the Day 1 count tab',
     'DATE(YEAR(D2),3,8)+MOD(8-WEEKDAY(DATE(YEAR(D2),3,8)),7)' in _cvf and 'DATE(YEAR(D2),11,1)+MOD(8-WEEKDAY(DATE(YEAR(D2),11,1)),7)' in _cvf and '="yes"' in _cvf
     and all(str(O(r, 'AU')).startswith('ASK: does your office change its clocks') for r in OFF.values()) and len(OFF) == 10 and all(H(r, 'CV') == O(OFF[H(r, 'C')], 'W') == -5 for r in ALL)
     and all(cl.cell(row=r, column=10).value == -5 for r in _cal_rows) and 'Does your office change its clocks in March and November' in str(dc1.cell(row=26, column=1).value)),
    ('C1', f'A date-change request the firm sent to the office (BI typed, BJ not linked) asks for the homeowner\'s yes to the new date (CR) and for the note that the bench was asked first (CS): the BE line stands on every such row ({len(_c1_want)} in the example, equal to a list made here; the scratch runs show the line), and CR and CS are headed and empty',
     _c1_got == _c1_want and str(H(1, 'CR')).startswith('Homeowner agreed to the new date we asked the office for') and str(H(1, 'CS')).startswith('Bench asked first, before the office was asked to move the hearing')
     and all(H(r, 'CR') == '' and H(r, 'CS') == '' for r in ALL)),
    ('C2', 'A settlement keeps its hearing staffed until the office says in writing that it is off its schedule: 16 Birch Lane (AX-109, the settlement of messages 26 to 28) prints SETTLEMENT, STILL MISSING with the six things that are missing (the offer itself in DC and the date by which it must be accepted in DD, both added in round 17; the homeowner\'s written acceptance in BG, the office\'s receipt in O, the office\'s written word in AF, the date in BA), stays "yes" in column G and on its docket; no other row prints it',
     [H(r, 'A') for r in ALL if 'SETTLEMENT, STILL MISSING: ' in _be(r)] == ['AX-109'] and H(rows['AX-109'], 'G') == 'yes' and 'AX-109' in dcell((6, 13), 'Brindlefen', 14)
     and "SETTLEMENT, STILL MISSING: the settlement offer itself (DC); the date by which the offer must be accepted (DD); the homeowner's written acceptance (BG); the office's receipt of the signed settlement (O); the office's written word that the hearing is off its schedule (AF); the date by which the settlement must reach the office (BA). UNTIL AF IS LINKED THE HEARING STAYS STAFFED AND ON ITS DOCKET: ASK THE OFFICE IN WRITING WHETHER THE SIGNED SETTLEMENT TAKES THE HEARING OFF, AND BY WHEN IT MUST ARRIVE." in case_be('AX-109')),
    ('C3', 'An owed document is checked against the case files before it is collected again: 57 Clover Road (AX-119, the statement of messages 59 and 60) prints BEFORE IT IS COLLECTED AGAIN: CHECK WHETHER CASE FILES VERSION 2 ALREADY HOLD WHAT THE OFFICE ASKS FOR; the line stands on every row with something owed that is not a settlement, a withdrawal or a missed hearing (1 row, equal to a list made here). A formula cannot read a file, so the line is a check for a person',
     _c3_got == _c3_want == ['AX-119'] and "ALREADY HOLD WHAT THE OFFICE ASKS FOR. IF THEY DO, ANSWER WITH THAT VERSION AND THE CLERK'S RECEIPT (L), AND ASK WHETHER THE OFFICE WANTS IT SEPARATELY." in case_be('AX-119')),
    ('Words', 'The leftover wording: Day 1 count D19 and Measures C18 claim no saving (91 to 96 hearings a coordinator in a peak week with the plan as it stands, an estimate), the Record check tab counts a record whose hearing is not on the sheet, and no formula on the Record check, Day 1 count or Measures tab shows an error',
     'no saving is claimed' in str(dc1.cell(row=19, column=4).value) and '91 to 96 with the plan as it stands' in str(ms['C18'].value) and 'No saving in minutes is claimed for season one' in str(ms['C18'].value)
     and 'THE RECORD HAS A HEARING THAT IS NOT ON THE SHEET' in rhf
     and not any(isinstance(c.value, str) and c.value.startswith(('#', 'Err:')) for w_ in (rc, dc1, ms, cf) for row in w_.iter_rows(max_row=400) for c in row)),
    ('F-1', 'After the independent test: Measures B96 compares the name in BX with the consultant in H after trimming both, as the status does, so a space typed after a name does not turn a day-before YES that counts into a missed one; on the example the count equals a list made here the same way',
     str(wf['Measures']['B96'].value).count('TRIM(') == 3 and ms['B96'].value == len(_no_dby)),
    ('F-3', 'After the independent test: an approval lifts the block only for the change it was typed for. The formula of Offices AV counts the approval in AQ and AR only when the date of the change is in AT and AR is on or after that day, and counts a written confirmation in L the same way; Tesswick, where nobody approved, stays blocked, and Offices N and AW hold the words that say why an approval does not count',
     'ISNUMBER(AT' in _avf and 'INT(N(AR' in _avf and '>=INT(N(AT' in _avf and 'INT(N(L' in _avf and O(_tw, 'AV') == 1
     and 'IS OLDER THAN THIS CHANGE' in str(_of_f.cell(row=_tw, column=CI('N')).value) and 'COUNTS ONLY ONCE THAT DATE IS THERE' in str(_of_f.cell(row=_tw, column=CI('N')).value)
     and 'is dated before this change' in _awf and 'counts once the date of the change is typed' in _awf),
    ('F-4', 'After the independent test: the Calendar tab looks each hearing up once. Every formula of its row 2 reads the hearing row from column S of the Calendar file tab (column F, or a row that does not exist when there is no event, so that Google Sheets shows an empty row too) and holds no lookup of its own, column S of an unused row holds 9999999, cell EE1 of the Hearings tab (EB1 in round 18) holds a heading so that the column exists in Google Sheets, and the Calendar tab still lists the same 17 events in the order of column BT of the Hearings tab',
     all("'Calendar file'!$S2" in str(wf['Calendar'].cell(row=2, column=c).value) and "'Calendar file'!$F2" not in str(wf['Calendar'].cell(row=2, column=c).value) and 'MATCH(' not in str(wf['Calendar'].cell(row=2, column=c).value) for c in range(1, 11))
     and str(wf['Calendar file']['S2'].value) == '=IF($F2="",9999999,$F2)' and wb['Calendar file']['S2'].value == wb['Calendar file']['F2'].value and wb['Calendar file']['S100'].value == 9999999
     and str(wb['Hearings']['EE1'].value).startswith('Keep this column empty') and all(wb['Hearings'].cell(row=r_, column=135).value is None for r_ in range(2, 60))
     and len(_cal_rows) == 17 and [str(cl.cell(row=r, column=1).value).split(' (')[-1].split(')')[0] for r in _cal_rows] == [H(r, 'A') for r in sorted((r for r in ALL if isinstance(H(r, 'BT'), (int, float))), key=lambda r: H(r, 'BT'))]),
    ('N-1', 'After the second independent test: when a calendar text gives lines longer than 75 characters, cell B3 of the Calendar file tab prints one sentence for each kind of text that is over, and each sentence names the cells that text is built from (a subject: Hearings H, C, B and A; a location: C and AV; a description: A, B, AV and AX; an event name: A and Settings B10) with the length of each; the hint that named column AV for every kind of text is gone; the hidden cells E3 to E6 hold the row of the Calendar tab to name and are empty on the example, where no line is too long',
     (lambda b3: all(t in b3 for t in ('The longest subject', "a subject is built from the consultant's name (H", 'The longest location', 'a location is built from the county (C', 'The longest description', 'a description is built from the case number (A', 'the case files version (AX',
                                       'The first event name (UID) that is too long', 'the part of Settings B10 after the @', 'shorten the longest of the cells named', '$E$3', '$E$4', '$E$5', '$E$6'))
      and 'holds the room or the link' not in b3)(str(wf['Calendar file']['B3'].value))
     and all(str(wf['Calendar file'][f'E{k}'].value).startswith('=IF(') for k in (3, 4, 5, 6)) and all(cf[f'E{k}'].value in (None, '') for k in (3, 4, 5, 6))
     and str(cf['B3'].value) == 'Line length: no line of column A is longer than 75 characters.'),
]
rok8 = 0
for rule, what, good in R16:
    rok8 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok8} of {len(R16)} checks on Part I of the rule book as expected.')
# ---- Part twelve (round 17): the rules of Part J of the rule book, J1 to J11, on the example -------------------------
# What the lines say when the inputs change (a date in DA, a time in CH, an eleventh office, a seventh consultant, a repeat
# marked in the input) is in the sheet engineer's scratch runs (patch/r38_scratch_r17.py in the build notes).
_of_f17 = wf['Offices']; _dp = lambda r: str(H(r, 'DP')); _x = lambda r: str(H(r, 'X')); _cases = lambda rr: [H(r, 'A') for r in rr]
_REP = 'REPEAT: THE CELL KEEPS ITS FIRST LINK'
_dpea = lambda r: ' '.join(x for x in (str(H(r, 'DP')).strip(), str(H(r, 'EA')).strip(), str(H(r, 'ED')).strip()) if x)      # round 18: BE prints DP, then EA; round 19: then ED
_ASK38 = "ASK (question 14 of the season email to offices; number 38 in the kit's list): how many working days before a hearing is the last day you accept a request to change its date?"
_ASK15 = "ASK (question 15 of the season email to offices; number 40 in the kit's list): your daytime telephone number, and the clerk we should ask for"
_tenoff = sorted(OFF.values())
_call_office = [r for r in ALL if (isinstance(H(r, 'BH'), (int, float)) and H(r, 'BH') >= 2) or ': PASSED, CALL THE OFFICE TODAY' in str(H(r, 'BE')) or 'DEADLINE PASSED' in str(H(r, 'BE')) and 'CALL THE OFFICE' in str(H(r, 'BE'))
                or 'PHONE THE OFFICE' in str(H(r, 'BE')) or ' OFFICE IN ITS HOURS' in str(H(r, 'BE'))]
_ncell_head = next((r for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith('Proposals for the cells the sheet gained in round 16: ')), None)
_ncell_rows = []
if _ncell_head:
    for _r in range(_ncell_head + 1, _ncell_head + 80):
        if rs.cell(row=_r, column=1).value in (None, ''): break
        _ncell_rows.append(_r)
_rep_cells = [str(rs.cell(row=r, column=3).value) for r in range(2, 400) if _REP in str(rs.cell(row=r, column=3).value or '')]
_rep_note = [r for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith(_REP + '. ')]
_tell = [r for r in ALL if H(r, 'BN') != '' and not http(H(r, 'BO'))]
# Finisher 1 of round 17 (after the independent test; the sheet is now built from the input sheet_ai.v17.json). Expectations changed on purpose:
#   - S2 and J10: 8 rows have something to tell, not 4: the questions of messages 35 (Eli Corven) and 54 (Nora Pell) are typed in BN of AX-111, AX-112,
#     AX-117 and AX-118 (audit gap I3), so column BE of each prints TELL; their daily lists did not change;
#   - A14: How to use row 14 names the keep-empty heading in DQ1 and the 80-row copy of the sheet as it is now (40,264 formulas);
#   - J: on AX-117 column BE holds the text of DP just before the TELL line, not at its end.
# Four checks are new, at the end of this part: F17-1, F17-2, F17-3 (the tester's faults) and "K2, I3" (the repeats and questions on the Reader suggestions tab).
# finisher 1 of round 17: the block of repeats and questions (input v17), below the proposals for the new cells
_f1_head = next((r for r in range(2, 400) if str(rs.cell(row=r, column=1).value or '').startswith('Repeats and questions in the example messages: ')), None)
_f1_rows = []
if _f1_head:
    for _r in range(_f1_head + 1, 400):
        if rs.cell(row=_r, column=1).value in (None, ''): break
        _f1_rows.append(_r)
_dn_to = [str(dk.cell(row=r, column=14).value) for r in range(4, 304) if 'o the ' in str(dk.cell(row=r, column=14).value or '') and ' office about ' in str(dk.cell(row=r, column=14).value or '')]
import re as _re17
R17 = [
    ('J1', 'An eleventh office is read like the first ten: rows 12 to 40 of the Offices tab hold the formulas of columns N (the route flag) and Z (signed letters against the number needed), the same formulas as row 2 with their own row number; on the example these rows are unused and show nothing',
     all(_re17.sub(r'(?<![A-Z$])([A-Z]{1,2})2(?![0-9])', lambda m: m.group(1) + str(r), str(_of_f17.cell(row=2, column=c).value)) == str(_of_f17.cell(row=r, column=c).value or '') for r in range(12, 41) for c in (14, 26))
     and all(of.cell(row=r, column=c).value in (None, '') for r in range(12, 41) for c in (14, 26)) and len(OFF) == 10),
    ('J2', 'The wait for a clearer copy is on the sheet: Hearings DA holds when the copy was asked for, and column DM works out when the fallback falls due from Settings B14 (noon, that many working days later, by the office\'s own holidays). On the example 42 Birch Lane (AX-110) holds the link to message 30 in DA, because the messages carry no date: BE says not to ask again and to type the date; no row reads FALLBACK DUE, and no row prints the line without something in DA',
     'Settings!$B$14' in str(_hf.cell(row=2, column=CI('DM')).value) and 'WORKDAY(INT(DA2)' in str(_hf.cell(row=2, column=CI('DM')).value) and st['B14'].value == 1
     and {H(r, 'A'): H(r, 'DA') for r in ALL if H(r, 'DA') != ''} == {'AX-110': 'https://mailbox.example/message/30'}
     and 'A CLEARER COPY WAS ASKED FOR (https://mailbox.example/message/30): DO NOT ASK AGAIN. TYPE THE DATE OF THAT REQUEST IN DA: THE SHEET THEN PRINTS WHEN THE FALLBACK FALLS DUE (NOON ON THE WORKING DAY THAT Settings B14 NAMES).' in case_be('AX-110')
     and not any('FALLBACK DUE' in _x(r) for r in ALL) and _cases(r for r in ALL if 'CLEARER COPY' in str(H(r, 'BE'))) == ['AX-110'] and all(H(r, 'DM') == '' for r in ALL)
     and 'Column DM of the Hearings tab reads this number' in str(st['C14'].value)),
    ('J3', 'A first case at opening is on the daily list until its arrangement is linked: OPENING NOT ARRANGED stands on a coming hearing that starts at opening (CO = 1), from two working days before, while Hearings DB holds no link. On the example: AX-101 (Monday 9:00, one working day ahead) and not AX-105 (seven working days ahead); DB is empty on every row, because no message arranges anything',
     _cases(r for r in ALL if 'OPENING NOT ARRANGED' in _x(r)) == ['AX-101'] and H(rows['AX-105'], 'CO') == 1 and 'FIRST CASE AT OPENING' in case_be('AX-101')
     and all(H(r, 'DB') == '' for r in ALL) and str(H(1, 'DB')).startswith('Arrangement for a first case at opening made')),
    ('J4', 'A date-change request does not vanish when the office answers: Hearings DI holds the answer (refused on AX-103, AX-104 and AX-106, messages 11 and 17; moved on AX-105, message 17). The moved hearing prints that the homeowner\'s yes to the new date is not on record (CR) and that no bench note is linked (CS), and, because Nora Pell had accepted it before the request (message 14, typed in DH), that such a request is not made. The three refused rows print none of these lines',
     {H(r, 'A'): H(r, 'DI') for r in ALL if H(r, 'DI') != ''} == {'AX-103': 'refused', 'AX-104': 'refused', 'AX-106': 'refused', 'AX-105': 'moved'}
     and "THE HEARING WAS MOVED AT OUR REQUEST AND THE HOMEOWNER'S YES TO THE NEW DATE IS NOT ON RECORD: A PERSON CALLS THE HOMEOWNER TODAY AND LINKS THEIR WRITTEN YES IN CR. NO RECORD THAT THE BENCH WAS ASKED BEFORE THE OFFICE WAS ASKED TO MOVE THE HEARING: LINK THE NOTE OF WHO WAS ASKED AND SAID NO IN CS. THIS DATE-CHANGE REQUEST WAS MADE FOR A HEARING THAT Nora Pell (https://mailbox.example/message/14) HAD ALREADY ACCEPTED. THE RULE: NO SUCH REQUEST IS MADE, A YES IS NEVER TRADED AWAY. TELL THE CONSULTANT WHICH DATE NOW STANDS AND GET THEIR OWN YES FOR IT (J)." in case_be('AX-105')
     and _cases(r for r in ALL if 'MOVED AT OUR REQUEST' in str(H(r, 'BE')) or 'HAD ALREADY ACCEPTED' in str(H(r, 'BE'))) == ['AX-105'] and all(http(H(rows[c], 'BJ')) for c in ('AX-103', 'AX-104', 'AX-105', 'AX-106'))),
    ('J4', 'The office\'s last day for a change request has a cell: Offices AY (working days before the hearing) holds question 14 of the season email to offices (number 38 in the kit\'s list) in amber on all ten offices, because no office in the packet states one; so Hearings DN is empty on every row and no row prints LAST DAY FOR A CHANGE REQUEST',
     str(O(1, 'AY')).startswith('Last day this office accepts a change request: working days before the hearing') and all(O(r, 'AY') == _ASK38 and str(_of_f17.cell(row=r, column=CI('AY')).fill.fgColor.rgb).endswith('FFE9B8') for r in _tenoff)
     and all(H(r, 'DN') == '' for r in ALL) and not any('LAST DAY FOR A CHANGE REQUEST' in str(H(r, 'BE')) for r in ALL) and 'Offices!$AY' in str(_hf.cell(row=2, column=CI('DN')).value).replace("'", '')),
    ('J5', 'A settlement names its offer: Hearings DC (the offer, a link) and DD (the date by which it must be accepted) are both empty on the example, because the packet holds no offer and no date for it (message 27 only mentions a settlement), and the settlement line of AX-109 lists both first among the things still missing',
     all(H(r, 'DC') == '' and H(r, 'DD') == '' for r in ALL) and 'SETTLEMENT, STILL MISSING: the settlement offer itself (DC); the date by which the offer must be accepted (DD); ' in case_be('AX-109')
     and not any('THE OFFER MUST BE ACCEPTED BY' in str(H(r, 'BE')) or 'COLUMN N DOES NOT SAY settlement' in str(H(r, 'BE')) for r in ALL)),
    ('J6', 'A consultant who said they are not free at the arrival time is not told a time they cannot keep: Maya Venn said she cannot get there for 9 a.m. on June 10 (message 5, row 7 of the Availability tab, "not free" from 9:00 to 9:30), and the firm needs her at 9:00 for the 9:30 hearing (AX-102). Hearings DK holds 7, DL holds -1, the daily list reads ARRIVAL NOT SETTLED, BE names the row and her words, and her day-before text says that the arrival time is being settled. No other row has a clash; Settings B20 counts the 2 "not free" rows with a time',
     {H(r, 'A'): H(r, 'DK') for r in ALL if H(r, 'DK') not in (0, '')} == {'AX-102': 7} and H(rows['AX-102'], 'DL') == -1 and _cases(r for r in ALL if 'ARRIVAL NOT SETTLED' in _x(r)) == ['AX-102']
     and 'ARRIVAL NOT SETTLED: MAYA VENN SAID THEY ARE NOT FREE FROM 9:00 AM UNTIL 9:30 AM ON Mon 10 Jun (Availability row 7: "I can take the 9:30 a.m. case on June 10, but cannot get there for 9 a.m." (message 5)), AND THE FIRM NEEDS THEM AT THE OFFICE AT 9:00 AM. ASK THE TIME THEY CAN ARRIVE AND TYPE IT IN CH, OR ASK THE OFFICE TO HEAR THE CASE LATER. THE DAY-BEFORE TEXT GIVES NO ARRIVAL TIME UNTIL CH HOLDS A TIME.' in case_be('AX-102')
     and 'To Maya Venn: We are expecting you on Monday, June 10, from 9:30 a.m. at the Larkmere office (ADDRESS NOT ON RECORD: Offices BA2) for one hearing.' in dcell((6, 10), 'Larkmere', 9)
     and 'Your arrival time is being settled: we will confirm it with you today. Please text ARRIVED when you are at the office.' in dcell((6, 10), 'Larkmere', 9)
     and 'Please be at the office by 9:00 a.m.' not in dcell((6, 10), 'Larkmere', 9) and st['B20'].value == 2 and av.cell(row=7, column=2).value == 'Maya Venn' and av.cell(row=7, column=8).value == 'not free'),
    ('J7', 'Every line that orders a call to a homeowner names the homeowner: Hearings DE and DF hold the name and the customer number from the case records on all 24 rows, DG holds a question in amber on all 24 (the packet gives no way to reach a homeowner). The five rows with such a line (AX-105, AX-109, AX-110, AX-115, AX-117; column DO = 1; AX-115 since round 18, K2) read CALL THE HOMEOWNER on the daily list and print THE HOMEOWNER TO CALL with CONTACT NOT ON RECORD; the two Birch Lane rows, one homeowner, each say that one call covers the other',
     len(ALL) == 24 and all(H(r, 'DE') != '' and str(H(r, 'DF')).startswith('H') and str(H(r, 'DG')).startswith('ASK') and str(_hf.cell(row=r, column=CI('DG')).fill.fgColor.rgb).endswith('FFE9B8') for r in ALL)
     and sorted(_cases(r for r in ALL if H(r, 'DO') == 1)) == sorted(_cases(r for r in ALL if 'CALL THE HOMEOWNER' in _x(r))) == sorted(_cases(r for r in ALL if 'THE HOMEOWNER TO CALL: ' in str(H(r, 'BE')))) == ['AX-105', 'AX-109', 'AX-110', 'AX-115', 'AX-117']
     and 'THE HOMEOWNER TO CALL: Riley Fern (H008). CONTACT NOT ON RECORD: ASK THE FIRM FOR IT AND TYPE IT IN DG.' in case_be('AX-115')
     and 'THE HOMEOWNER TO CALL: Taylor Finch (H005). CONTACT NOT ON RECORD: ASK THE FIRM FOR IT AND TYPE IT IN DG. ONE CALL COVERS THIS HEARING AND AX-110.' in case_be('AX-109')
     and 'THE HOMEOWNER TO CALL: Taylor Finch (H005). CONTACT NOT ON RECORD: ASK THE FIRM FOR IT AND TYPE IT IN DG. ONE CALL COVERS THIS HEARING AND AX-109.' in case_be('AX-110')
     and 'THE HOMEOWNER TO CALL: Cameron Hale (H009). CONTACT NOT ON RECORD: ASK THE FIRM FOR IT AND TYPE IT IN DG.' in case_be('AX-117') and 'ONE CALL COVERS' not in case_be('AX-117') and 'ONE CALL COVERS' not in case_be('AX-105')
     and len({H(r, 'DF') for r in ALL}) == 12 and all(len({H(r, 'DE') for r in ALL if H(r, 'DF') == k}) == 1 for k in {H(r, 'DF') for r in ALL})),
    ('J8', 'Every line that orders a call to an office says where its number is: Offices AZ (daytime telephone and the clerk to ask for) holds question 15 of the season email to offices (number 40 in the kit\'s list) in amber on all ten offices, because the packet gives no telephone number, and each of the rows with such a line (a list made here from BH and from the words of BE) prints TO CALL THE ... OFFICE: NUMBER NOT ON RECORD with the cell; no other row prints it',
     str(O(1, 'AZ')).startswith('Daytime telephone and the clerk to ask for') and all(O(r, 'AZ') == _ASK15 and str(_of_f17.cell(row=r, column=CI('AZ')).fill.fgColor.rgb).endswith('FFE9B8') for r in _tenoff)
     and _cases(r for r in ALL if 'TO CALL THE ' in str(H(r, 'BE'))) == _cases(_call_office) == ['AX-119', 'AX-101', 'AX-102', 'AX-107', 'AX-108']
     and all(f"TO CALL THE {str(H(r, 'C')).upper()} OFFICE: NUMBER NOT ON RECORD: Offices AZ{OFF[H(r, 'C')]}." in str(H(r, 'BE')) and H(r, 'DJ') == OFF[H(r, 'C')] for r in _call_office) and of.max_column == 54),
    ('J9', 'The route of an office is confirmed in writing and asked again after six months: the formula of Offices N prints CONFIRM THE ROUTE IN WRITING while column L holds no date, and ASK AGAIN: OVER SIX MONTHS when the date in L is more than 180 days before the day in Settings B2 (both only while no change stands in M). On the example nine offices hold no date in L and read CONFIRM THE ROUTE IN WRITING; Tesswick holds a change and reads the block line',
     'IF(NOT(ISNUMBER(L2)),"CONFIRM THE ROUTE IN WRITING",IF(Settings!$B$2-L2>180,"ASK AGAIN: OVER SIX MONTHS",""))' in str(_of_f17['N2'].value)
     and [O(r, 'N') for r in _tenoff if O(r, 'A') != 'Tesswick'] == ['CONFIRM THE ROUTE IN WRITING'] * 9 and str(O(OFF['Tesswick'], 'N')).startswith('APPROVE OR REJECT THE CHANGE TODAY')
     and all(not isinstance(O(r, 'L'), (datetime.datetime, datetime.date)) for r in _tenoff if O(r, 'A') != 'Tesswick')),
    ('J10', 'Every text that gives a clock time says whose clock: the TELL line of column BE ends the words of BN with the zone sentence of column CB on each of the 8 rows that have something to tell, and every notice to an office in Dockets N says ", times are ... office time" after the day',
     len(_tell) == 8 and all(f"TELL {H(r, 'BN')}. {H(r, 'CB')} (change notice, Reply OK;" in str(H(r, 'BE')) and str(H(r, 'CB')).startswith(f"Times are {H(r, 'C')} office time") for r in _tell)
     and len(_dn_to) >= 3 and all(_re17.search(r'o the (.+) office about [A-Z][a-z]+, [A-Z][a-z]+ \d+, times are \1 office time( \(UTC[+-]\d\d:\d\d\))?: Case ', t) for t in _dn_to)),
    ('J11', 'The Reader suggestions tab lists, below the proposals for the Offices tab, the proposals of the fixed code for the cells the sheet gained in round 16, as many rows as its heading says, each "for a person" or marked as a repeat, with an empty accept cell. A proposal that the input marks as a repeat of an earlier message reads REPEAT: THE CELL KEEPS ITS FIRST LINK with the number of that message, and the tab then explains the mark once; with no repeat in the input, no cell says REPEAT',
     _ncell_head is not None and ohead is not None and _ncell_head > ohead and len(_ncell_rows) == int(_re17.search(r'round 16: (\d+)', str(rs.cell(row=_ncell_head, column=1).value)).group(1)) > 0
     and all(str(rs.cell(row=r, column=3).value).startswith(('for a person: ', _REP)) and rs.cell(row=r, column=7).value in (None, '') for r in _ncell_rows)
     and all(_re17.fullmatch(_re17.escape(_REP) + r' \(the same statement as message \S+: type nothing\)', c) for c in _rep_cells) and len(_rep_note) == (1 if _rep_cells else 0)),
    ('J', 'The new cells are announced where a person looks: How to use ends with the paragraphs of 21 Nov 2026 on Part J, and the heading of Hearings DP lists the seven lines it adds to column BE; column BE holds the text of DP and then the text of EA (round 18) and of ED (round 19) at its end, or just before the TELL line where the row has one (AX-115, AX-117), on every row where DP holds something (10 rows)',
     'Added on 21 Nov 2026 (the rules of Part J of the rule book)' in howto and str(H(1, 'DP')).startswith('Round 17 lines for column BE')
     and all(str(H(r, 'BE')).strip().endswith(_dpea(r)) or (r in _tell and (_dpea(r) + ' TELL ' + str(H(r, 'BN'))) in str(H(r, 'BE'))) for r in ALL if str(H(r, 'DP')).strip() != '')
     and len([r for r in ALL if str(H(r, 'DP')).strip() != '']) == 10),
    # ---- finisher 1 of round 17: the tester's faults F17-1 to F17-4, the input v17 and audit gap I3
    ('F17-1', 'An arrival time in CH that is later than the consultant\'s first case settles nothing: the formula of DL gives -1 for it, and DP then says THE TIME IN CH ... IS LATER THAN THEIR FIRST CASE. On the example AX-102 (CH empty) still reads ARRIVAL NOT SETTLED with the step ASK THE TIME THEY CAN ARRIVE AND TYPE IT IN CH',
     '>CL2+MAX(N(Settings!$B$16),N(CI2)),-1,' in str(wf['Hearings']['DL2'].value) and 'IS LATER THAN THEIR FIRST CASE (' in str(wf['Hearings']['DP2'].value)
     and [H(r, 'A') for r in ALL if isinstance(H(r, 'DL'), (int, float)) and H(r, 'DL') < 0] == ['AX-102']
     and all('ARRIVAL NOT SETTLED' in str(H(r, 'X')) and 'ASK THE TIME THEY CAN ARRIVE AND TYPE IT IN CH' in str(H(r, 'DP')) and 'LATER THAN THEIR FIRST CASE' not in str(H(r, 'DP')) for r in ALL if H(r, 'A') == 'AX-102')),
    ('F17-2', 'Column DO also marks the row when the fallback after a clearer copy is due and its line orders a call to the homeowner (the homeowner\'s written yes is missing, or the homeowner is the person who signs in BP). On the example no fallback is due, and DO = 1 on AX-105, AX-109, AX-110 and AX-117 as before and on AX-115 (round 18, K2)',
     'LEFT(BP2&"",13)="the homeowner"' in str(wf['Hearings']['DO2'].value) and 'N(DM2)>0,N(DM2)<=' in str(wf['Hearings']['DO2'].value)
     and sorted(H(r, 'A') for r in ALL if H(r, 'DO') == 1) == ['AX-105', 'AX-109', 'AX-110', 'AX-115', 'AX-117']),
    ('F17-3', 'Column DI takes only moved or refused: the list refuses another text, and when one is there all the same (pasted), DP prints the line that asks for the answer and quotes what DI holds. On the example DI holds one of the two words on the four rows with an answer in BJ, and no row prints the line',
     'WHICH IS NEITHER WORD: TYPE ONLY moved OR refused THERE' in str(wf['Hearings']['DP2'].value)
     and any('DI2' in str(d.sqref) and d.showErrorMessage and d.formula1 == '"moved,refused"' for d in wf['Hearings'].data_validations.dataValidation)
     and sorted((H(r, 'A'), H(r, 'DI')) for r in ALL if H(r, 'DI') != '') == [('AX-103', 'refused'), ('AX-104', 'refused'), ('AX-105', 'moved'), ('AX-106', 'refused')]
     and not any('CHOOSE ITS ANSWER IN DI' in str(H(r, 'BE')) for r in ALL)),
    ('K2, I3', 'Built from the input of round 17, the Reader suggestions tab lists the repeats and the consultants\' questions below the proposals for the new cells: as many rows as its heading says (30), 18 of them marked REPEAT with the message they repeat, 4 that are not repeats, and 8 questions proposed for Hearings BN. The questions of messages 35 and 54 are typed in BN of AX-111, AX-112, AX-117 and AX-118 with BO empty, so column BE of each prints TELL with the answer',
     _f1_head is not None and _ncell_head is not None and _f1_head > _ncell_head and len(_f1_rows) == int(_re17.search(r'example messages: (\d+) lines', str(rs.cell(row=_f1_head, column=1).value)).group(1)) == 30
     and sum(1 for r in _f1_rows if str(rs.cell(row=r, column=3).value).startswith(_REP + ' (the same statement as message ')) == 18
     and sum(1 for r in _f1_rows if ' BN' in str(rs.cell(row=r, column=2).value) and str(rs.cell(row=r, column=3).value).startswith('for a person: ')) == 8
     and all(rs.cell(row=r, column=7).value in (None, '') for r in _f1_rows) and len(_rep_note) == 1
     and all(str(H(r, 'BN')).startswith({'AX-111': 'Eli Corven (answers his message 35): yes, the case files changed', 'AX-112': 'Eli Corven (answers his message 35): yes, the case files changed',
                                         'AX-117': 'Nora Pell (answers her message 54): yes, prepare both.', 'AX-118': 'Nora Pell (answers her message 54): yes, prepare both.'}[H(r, 'A')])
             and H(r, 'BO') == '' and ('TELL ' + str(H(r, 'BN'))) in str(H(r, 'BE')) and H(r, 'X') != '' for r in ALL if H(r, 'A') in ('AX-111', 'AX-112', 'AX-117', 'AX-118'))),
]
rok10 = 0
for rule, what, good in R17:
    rok10 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok10} of {len(R17)} checks on Part J of the rule book as expected.')

# ---- Part thirteen (round 18): the rules of Part K of the rule book, K1 to K9, on the example ------------------------
# What the lines say when the inputs change (a date in DQ, DR or DW, a link in DS, a result that is not clear, an address in
# Offices BA, an eleventh office) is in the sheet engineer's scratch runs (patch/r39_scratch_r18.py in the build notes).
_D = lambda m, d: datetime.datetime(2030, m, d); _ea = lambda r: str(H(r, 'EA')); _f2 = lambda col: str(_hf.cell(row=2, column=CI(col)).value or '')
_inp = [r for r in ALL if H(r, 'F') == 'in person']
_K1Q = "THE LINK IN K DOES NOT COUNT FOR Tue 18 Jun: THE OFFICE'S RECORD IS FOR Wed 12 Jun. ASK THE ORIMERE OFFICE IN WRITING TODAY: IS Nora Pell STILL ON YOUR RECORD FOR Tue 18 Jun. KEEP THE OLD LINK IN A NOTE (Y) AND CLEAR K; WHEN THE OFFICE ANSWERS, LINK ITS ANSWER IN K AND TYPE Tue 18 Jun IN DQ."
_K2L = "THE HEARING WAS MOVED FROM Thu 6 Jun TO Thu 13 Jun: A PERSON CALLS THE HOMEOWNER TODAY WITH THE NEW DATE AND SENDS THE CORRECTED HOMEOWNER NOTICE (WHAT IT SAYS GOES IN BK AND BL), THEN LINKS THE DATED CALL NOTE, THE HOMEOWNER'S OWN MESSAGE OR THE NOTICE SENT IN DS. THE HOMEOWNER TO CALL: Riley Fern (H008)."
_ASKADDR = 'ASK: your street address, the hearing room and where our consultant reports on arrival (for hearings in person)'
_K9COLS = ['O', 'P', 'Q', 'R', 'T', 'U', 'AA', 'AC', 'AD', 'AE', 'AL', 'AO', 'AP', 'AU', 'AY', 'AZ', 'BA']
_s_list = [d.formula1 for d in wf['Hearings'].data_validations.dataValidation if any(str(rg).startswith('S2') for rg in d.sqref.ranges)]
_asks = sum(1 for t in _texts if t[2].startswith('ASK'))
_oldq = [t[:2] for t in _texts if 'season question 38' in t[2] or '(question 38)' in t[2] or 'season question 15' in t[2] or '(question 15)' in t[2]]
R18 = [
    ('K1', "The office's record of our representative does not survive a move: Hearings DQ holds the hearing date the record in K is about, and column DY says whether K counts for the date in column D. AX-105: the office recorded Nora Pell (message 16) while the hearing was on June 12 (DQ and DR), the office then moved it to June 18 (message 17), so DY is 0, the check is open (OPEN: 4 missing) and column BE prints the written question to the office. AX-116 (DQ = its own date) and every other row with a link in K count as before, and no other row prints the question",
     str(H(1, 'DQ')).startswith("The office's record in column K is for the hearing date of") and str(H(1, 'DY')).startswith("The office's record in K counts for the date in column D: 1 = yes")
     and {H(r, 'A'): H(r, 'DQ') for r in ALL if H(r, 'DQ') != ''} == {'AX-105': _D(6, 12), 'AX-116': _D(6, 6)} and H(rows['AX-105'], 'D') == _D(6, 18) and http(H(rows['AX-105'], 'K'))
     and [H(r, 'A') for r in ALL if http(H(r, 'K')) and H(r, 'DY') != 1] == ['AX-105'] and all(H(r, 'DY') == (1 if http(H(r, 'K')) and H(r, 'A') != 'AX-105' else 0) for r in ALL)
     and H(rows['AX-105'], 'W') == 'OPEN: 4 missing' and _K1Q in case_be('AX-105') and _cases(r for r in ALL if 'STILL ON YOUR RECORD FOR' in _be(r)) == ['AX-105']
     and sum(_f2(c).count('DY2<>1') for c in ('U', 'W', 'CC', 'CE', 'CX', 'CZ', 'BF')) >= 3 and 'the name on the office\'s record (K, DQ, BD); ' in _f2('CE')),
    ('K2', 'A hearing that was moved puts the call to the homeowner on the daily list until a link shows that the homeowner has the new date: Hearings DR holds the date the hearing had before (AX-105: June 12, messages 13 and 17; AX-115: June 6, message 47) and DS the link, empty on every row because no message shows it. AX-115 (moved by the office): DO = 1, the daily list reads REVIEW CALL THE HOMEOWNER, and BE orders the call and the corrected notice and names the homeowner. AX-105 was moved at our own request (DI = moved) and keeps the lines of round 16 and 17; no other row prints the line',
     str(H(1, 'DR')).startswith('This hearing was moved: the date it had before') and str(H(1, 'DS')).startswith('The homeowner has the new date (link')
     and {H(r, 'A'): H(r, 'DR') for r in ALL if H(r, 'DR') != ''} == {'AX-105': _D(6, 12), 'AX-115': _D(6, 6)} and all(H(r, 'DS') == '' for r in ALL)
     and H(rows['AX-115'], 'DO') == 1 and H(rows['AX-115'], 'X') == 'REVIEW CALL THE HOMEOWNER' and _K2L in case_be('AX-115')
     and _cases(r for r in ALL if 'THE HEARING WAS MOVED FROM ' in _be(r)) == ['AX-115'] and 'THE HEARING WAS MOVED AT OUR REQUEST' in case_be('AX-105')),
    ('K3', 'A result has a source, and a result that fits no value of the list has its own value: the list of Hearings S holds "reported: not clear", the formulas of W and X print RESULT NOT CLEAR for it, and DT (who reported it and when) and DU (the link) are filled on the two rows with a result: AX-119 (Owen Tarris by telephone, message 57, then the office in writing, message 59; link 59) and AX-120 (link 57). On the example no row reads RESULT NOT CLEAR and no row prints the line for a result without a source',
     len(_s_list) == 1 and 'reported: not clear' in _s_list[0] and 'RESULT NOT CLEAR' in _f2('W') and 'RESULT NOT CLEAR' in _f2('X')
     and str(H(1, 'DT')) == 'Result reported by (who and when)' and str(H(1, 'DU')) == 'Link to the note or message that reported the result'
     and _cases(r for r in ALL if H(r, 'S') != '') == _cases(r for r in ALL if H(r, 'DT') != '') == _cases(r for r in ALL if http(H(r, 'DU'))) == ['AX-119', 'AX-120']
     and H(rows['AX-119'], 'DU') == 'https://mailbox.example/message/59' and H(rows['AX-120'], 'DU') == 'https://mailbox.example/message/57' and H(rows['AX-119'], 'S') == 'held open for a statement'
     and all('message 57' in str(H(rows[c], 'DT')) and 'message 59' in str(H(rows[c], 'DT')) for c in ('AX-119', 'AX-120'))
     and not any('RESULT NOT CLEAR' in str(H(r, 'W')) + _x(r) or 'HAS NO SOURCE ON THE ROW' in _be(r) or 'FITS NO VALUE OF THE RESULT LIST' in _be(r) for r in ALL)),
    ('K4', 'A date-change request names who decided it: Hearings DV (name and date) is empty on every row, because messages 8 and 15 name no person, so the four rows with a request (AX-103, AX-104, AX-106, AX-105) print NO NAMED PERSON DECIDED THIS DATE-CHANGE REQUEST. The three requests the office refused were made without the bench being asked and without the homeowner\'s yes: each keeps one record line, and none of the three reads CALL THE HOMEOWNER on the daily list',
     str(H(1, 'DV')) == 'Date-change request decided by (name and date)' and all(H(r, 'DV') == '' for r in ALL)
     and _cases(r for r in ALL if 'NO NAMED PERSON DECIDED THIS DATE-CHANGE REQUEST: TYPE WHO DECIDED IT AND WHEN IN DV.' in _be(r)) == _cases(r for r in ALL if H(r, 'DI') != '' or H(r, 'BI') != '' or http(H(r, 'BJ'))) == ['AX-103', 'AX-104', 'AX-106', 'AX-105']
     and _cases(r for r in ALL if "ON RECORD: THE REQUEST THE OFFICE REFUSED WAS MADE WITHOUT THE BENCH BEING ASKED FIRST (CS) AND WITHOUT THE HOMEOWNER'S YES (CR)." in _be(r)) == ['AX-103', 'AX-104', 'AX-106']
     and all(_x(rows[c]) == 'TOP OF LIST' and H(rows[c], 'DO') == 0 for c in ('AX-103', 'AX-104', 'AX-106'))),
    ('K5', 'An in-person hearing says where it is held: Offices BA (street address, room and where to report) holds a question in amber at the four offices that hear in person and is empty at the six others, because the packet gives no address. Hearings DZ reads ADDRESS NOT ON RECORD with the cell on the 10 in-person rows and is empty on the 14 others; the day-before text and the Calendar print it (checked in J6 and S11); column BE orders the question on the six in-person hearings of the next three working days; and row 32 of the Day 1 count tab asks it',
     str(O(1, 'BA')).startswith('Street address, hearing room and where to report') and sorted(O(r, 'A') for r in _tenoff if O(r, 'BA') == _ASKADDR) == sorted(O(r, 'A') for r in _tenoff if O(r, 'E') == 'in person') == ['Fenwick Vale', 'Juniper Reach', 'Larkmere', 'Tesswick']
     and all(O(r, 'BA') in ('', _ASKADDR) and (O(r, 'BA') == '' or str(_of_f17.cell(row=r, column=CI('BA')).fill.fgColor.rgb).endswith('FFE9B8')) for r in _tenoff)
     and len(_inp) == 10 and all(H(r, 'DZ') == (f"ADDRESS NOT ON RECORD: Offices BA{OFF[H(r, 'C')]}" if r in _inp else '') for r in ALL)
     and _cases(r for r in ALL if 'OFFICE TODAY FOR ITS STREET ADDRESS, THE HEARING ROOM AND WHERE TO REPORT, AND TYPE THE ANSWER THERE.' in _be(r)) == ['AX-101', 'AX-102', 'AX-121', 'AX-122', 'AX-107', 'AX-108']
     and all(f"ADDRESS NOT ON RECORD: Offices BA{OFF[H(r, 'C')]}: ASK THE {str(H(r, 'C')).upper()} OFFICE TODAY" in _be(r) for r in ALL if 'FOR ITS STREET ADDRESS' in _be(r))
     and not any('WHERE WHOEVER TAKES THIS HEARING OVER GOES' in _be(r) for r in ALL) and '(ADDRESS NOT ON RECORD: Offices BA5)' in dcell((6, 12), 'Tesswick', 9)),
    ('K6', 'Dates are dates: column AA of the two Tesswick rows holds Monday, June 10 where it held words, DX holds the day message 24 is read as having arrived (Friday, June 7, the example\'s own reading, said in a note on each of the four cells, because no message carries a date), and no row holds words in AA. Hearings DW (the day a notice arrived) is empty on every row, because no message says when the paper notice of message 43 arrived; Offices BB marks Harthmere as an office that sends paper notices, and column BE asks for the arrival day on its one coming hearing (AX-115) and not on AX-116, which was held',
     str(H(1, 'DW')).startswith('Notice arrived on (date') and str(H(1, 'DX')).startswith('The message behind the next action in column Y arrived on')
     and {H(r, 'A'): (H(r, 'AA'), H(r, 'DX')) for r in ALL if H(r, 'AA') != '' or H(r, 'DX') != ''} == {'AX-107': (_D(6, 10), _D(6, 7)), 'AX-108': (_D(6, 10), _D(6, 7))}
     and all(_hf.cell(row=r, column=CI(c)).comment is not None and 'no message carries a date' in _hf.cell(row=r, column=CI(c)).comment.text.lower() for r in _tess for c in ('AA', 'DX'))
     and not any('COLUMN AA HOLDS WORDS' in _be(r) for r in ALL) and all(H(r, 'DW') == '' for r in ALL)
     and [O(r, 'A') for r in _tenoff if str(O(r, 'BB')).strip().lower() == 'yes'] == ['Harthmere'] and all(O(r, 'BB') == '' for r in _tenoff if O(r, 'A') != 'Harthmere')
     and _cases(r for r in ALL if 'OFFICE SENDS ITS NOTICES ON PAPER (Offices BB): TYPE THE DAY THE NOTICE IN I ARRIVED IN DW.' in _be(r)) == ['AX-115']),
    ('K7', 'A question number says which list it counts in: the last day for a change request is question 14 of the season email to offices and number 38 in the kit\'s list, the office telephone number is question 15 of the season email and number 40 in the kit\'s list, and the gaps and the homeowner notices are numbers 28 and 36 of the kit\'s list. Offices AY and AZ (heading and question), rows 27 to 30 of the Day 1 count tab and How to use say so, and no cell of the workbook still says "question 38" or "question 15" alone',
     "question 14 of the season email to offices, number 38 in the kit's list" in str(O(1, 'AY')) and "question 15 of the season email to offices, number 40 in the kit's list" in str(O(1, 'AZ'))
     and "(number 28 in the kit's list of open questions)" in str(dc1['A27'].value) and "(number 36 in the kit's list of open questions)" in str(dc1['A28'].value)
     and "(question 14 of the season email to offices; number 38 in the kit's list)" in str(dc1['A29'].value) and "(question 15 of the season email to offices; number 40 in the kit's list)" in str(dc1['A30'].value)
     and not _oldq),
    ('K8', 'The example says only what the messages say: column BN of AX-117 and AX-118 cites message 49 for the times and message 53 for the two hearings staying listed, and How to use states the limit of a link cell (the sheet cannot open a link, so BO and DB count whatever link is pasted there, and the Friday sample is the check)',
     all('message 53 says both remain listed for June 14; the times are in message 49' in str(H(rows[c], 'BN')) for c in ('AX-117', 'AX-118'))
     and 'The limit: a proof cell takes any text that starts with http. The sheet cannot open a link or read what it says' in howto and 'The Friday sample is the check that a link says what its cell claims.' in howto),
    ('K9', f'The questions of a new office appear without copying: on rows 12 to 40 of the Offices tab the 17 question cells of each row hold a formula that is empty while column A is empty (493 formulas), so on the example they show nothing; no count moved: the workbook holds {_asks} cells that start with ASK (208 before round 18, plus the four address questions and Day 1 count B32; round 19 adds the six questions of Bench S and Day 1 count B33)',
     all(str(_of_f17.cell(row=r, column=CI(c)).value or '').startswith((f'=IF($A{r}="","",', f'=IF(OR($A{r}="",')) and of.cell(row=r, column=CI(c)).value in (None, '') for r in range(12, 41) for c in _K9COLS)
     and sum(1 for r in range(12, 41) for c in range(1, 55) if str(_of_f17.cell(row=r, column=c).value or '').startswith(('=IF($A', '=IF(OR($A'))) == 493 and _asks == 220 and len(OFF) == 10),
    ('K', 'The new cells are announced where a person looks: How to use holds the paragraphs "Added later on 21 Nov 2026 (the rules of Part K of the rule book)", the heading of Hearings EA lists the lines it adds to column BE, and the heading "Keep this column empty" stands one column to the right of the last column in use (EB1 in round 18, EE1 since round 19). The fixed words of these lines stand once, in Settings J2 to J25 (24 cells, none empty, none with a space at either end), and the formulas of Hearings EA and DP read them there',
     all(isinstance(st.cell(row=r, column=10).value, str) and st.cell(row=r, column=10).value == st.cell(row=r, column=10).value.strip() != '' for r in range(2, 26)) and st.cell(row=26, column=10).value in (None, '')
     and st['J2'].value == 'THE LINK IN K DOES NOT COUNT FOR' and st['J25'].value == 'THE HEARING WAS MOVED FROM' and str(st['J1'].value).startswith('Words of the lines of round 18')
     and all(f'Settings!$J${n}' in _f2('EA') for n in range(2, 24)) and 'Settings!$J$24' in _f2('DP') and 'Settings!$J$25' in _f2('DP')
     and 'Added later on 21 Nov 2026 (the rules of Part K of the rule book)' in howto and str(H(1, 'EA')).startswith('Round 18 lines for column BE') and str(H(1, 'EE')).startswith('Keep this column empty') and hs.max_column == 135
     and all(_ea(r).strip() == '' or _ea(r).strip() in _be(r) for r in ALL) and len([r for r in ALL if _ea(r).strip() != '']) == 11),
    ('K, fix', 'The faults of the round-18 test are fixed: the count of coming hearings whose notice to the office is blocked (Measures B98) reads column DY, as every other test of the office\'s record does, so it counts exactly the rows whose daily list says NOTICE BLOCKED (2 on the example: AX-107 and AX-108); Dockets A1 names a date typed as text in DQ, DR, DW or DX, after the test of a text date in D (none on the example, so A1 reads "Rows are sorted: yes"), and How to use says so beside the step for a moved hearing; How to use names W, AR and ED (EA in round 18) as the columns whose lost formula A1 names',
     'Hearings!$DY$2:$DY$' in str(wf['Measures']['B98'].value) and 'LEFT(Hearings!$K$2' not in str(wf['Measures']['B98'].value)
     and wb['Measures']['B98'].value == len([r for r in ALL if 'NOTICE BLOCKED' in _x(r)]) == 2
     and all(f'ISTEXT(Hearings!${c}$2:${c}$1200)' in str(wf['Dockets']['A1'].value) for c in ('D', 'DQ', 'DR', 'DW', 'DX')) and 'IS TYPED AS TEXT, SO THE SHEET READS NO DATE THERE' in str(wf['Dockets']['A1'].value)
     and wb['Dockets']['A1'].value == 'Rows are sorted: yes' and all(H(r, c) == '' or not isinstance(H(r, c), str) for r in ALL for c in ('DQ', 'DR', 'DW', 'DX'))
     and 'a date typed there as text reads as no date, so a move typed as text in DR is not seen either, and cell A1 of the Dockets tab names the row and the column' in howto
     and 'a row that lost a formula of column W, AR or ED.' in howto and 'W, AR or CZ' not in howto),
]
rok13 = 0
for rule, what, good in R18:
    rok13 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok13} of {len(R18)} checks on Part K of the rule book as expected.')
# ---- Part fourteen (round 19): the rules of Part L of the rule book, L1 to L3, on the example ------------------------
# What the lines say when the inputs change (a consultant in EB, an answer in Bench S, a GOT IT from someone else, a date in EC)
# is in the sheet engineer's scratch runs (patch/r40_scratch_r19.py in the build notes).
_ed = lambda r: str(H(r, 'ED')); _bs = lambda r: str(B(r, 'S'))
_EB19 = {'AX-103': 'the firm (message 8)', 'AX-104': 'the firm (message 8)', 'AX-105': 'the firm (message 15)', 'AX-106': 'the firm (message 15)', 'AX-115': 'the homeowner (message 47)'}
_ASKST = 'ASK counsel (Offices R) and the consultant (their own licence or registration): in which states may this consultant appear and sign for a homeowner?'
_WARN19 = 'IS NOT ANSWERED YET: ASK COUNSEL (Offices R) AND THE CONSULTANT, AND CHECK THAT THE NAME ON WHAT IS SIGNED IS THE NAME THE OFFICE HAS (BD), BEFORE ANYTHING MORE IS SIGNED FOR THIS HEARING.'
_SIGN19 = {'AX-119': ('Owen Tarris', 'EVEREN', 5), 'AX-109': ('Priya Marden', 'CINDERVALE', 6), 'AX-110': ('Priya Marden', 'CINDERVALE', 6), 'AX-117': ('Nora Pell', 'EVEREN', 4)}
_BCL19 = 'IS NAMED IN BC (DECLINED OR TAKEN OFF THIS HEARING): IF CASE FILES OR FOLDER LINKS FOR IT WENT TO THEM, REMOVE THEIR ACCESS TODAY (OR ASK THEM IN WRITING TO DELETE THE FILES) AND TYPE THE DATE IN EC; IF NOTHING WENT TO THEM, TYPE files were never sent IN EC.'
_L3_19 = {'AX-113': 'Maya Venn', 'AX-114': 'Maya Venn', 'AX-101': 'Maya Venn', 'AX-103': 'Leo Arlen', 'AX-104': 'Leo Arlen', 'AX-115': 'Leo Arlen', 'AX-106': 'Nora Pell'}
_wct = wb['Who can take it']
_ask19 = [(str(dk.cell(row=r, column=2).value), str(dk.cell(row=r, column=15).value or ''), str(_wct.cell(row=r, column=57).value or '')) for r in range(4, 304) if dk.cell(row=r, column=10).value not in (None, '')]
R19 = [
    ('L1', 'Who asked for a date change (Hearings EB, typed): the firm on AX-103 and AX-104 (message 8) and on AX-105 and AX-106 (message 15), the homeowner on AX-115 (message 47), empty on the 19 other rows; no row names a consultant (Leo Arlen moved calendar events only, messages 9 and 10), so no line of L1 prints: no consultant asked an office, and both moved rows (AX-105, AX-115) say who asked',
     {H(r, 'A'): H(r, 'EB') for r in ALL if H(r, 'EB') != ''} == _EB19 and str(H(1, 'EB')).startswith('Who asked for the date change')
     and all('WITHOUT THE FIRM (EB)' not in _be(r) and 'WHO ASKED FOR THIS MOVE IS NOT ON RECORD' not in _be(r) for r in ALL)
     and st['K2'].value.startswith('HAS ASKED FOR THE DATE CHANGE WITHOUT THE FIRM (EB): ASK THEM TODAY WHY, AND TELL THEM THE RULE: DATE REQUESTS GO THROUGH THE FIRM, WHICH ASKS THE HOMEOWNER AND THE BENCH FIRST.')),
    ('L2 Bench', 'Bench S (typed) holds, for all six consultants, the question (so Bench T, the formula the other tabs read, is empty) to counsel and to the consultant about the states in which they may appear and sign; the heading is the one of the brief; Offices R of the ten offices carries the question into Bench S, and Day 1 count row 33 asks it',
     str(B(1, 'S')) == "States where this consultant may appear and sign (from counsel's answer and the consultant's own licence or registration)" and all(_bs(r) == _ASKST for r in range(2, 8)) and B(8, 'S') == ''
     and str(B(1, 'T')).startswith('States answered (formula)') and all(B(r, 'T') == '' for r in range(2, 8))
     and all(str(O(r, 'R')).endswith('And which of our consultants may appear and sign there (the answer goes in Bench S)?') for r in OFF.values()) and 'appear and sign for a homeowner' in str(dc1.cell(row=33, column=1).value)),
    ('L2 Ask next', f'While Bench S is a question, every docket\'s Ask next ({len(_ask19)} dockets) keeps its ranking, marks each consultant it names (STATES: ASK) and ends with a short warning for the state of its office (Who can take it BE): the offer may go. The ranking itself did not change: Velloran June 11 still has Owen first and no Leo; Orimere June 12 is still Leo, Maya, Owen',
     len(_ask19) == 9 and all(a.endswith("(Bench S; counsel's question, Offices R): THE OFFER MAY GO, AND THE ANSWER IS CHASED.") and f' WHO MAY APPEAR AND SIGN IN {s.upper()} IS NOT ANSWERED YET FOR THE NAMES MARKED (STATES: ASK) (' in a and s != ''
             and a.split(' WHO MAY APPEAR')[0].count('(STATES: ASK)') == sum(a.split(' WHO MAY APPEAR')[0].count(nm) for nm in _names) > 0 for c, a, s in _ask19 if not a.startswith('Nobody'))
     and dcell((6, 11), 'Velloran', 15).startswith('Already at this office that day: Owen Tarris') and 'Leo' not in dcell((6, 11), 'Velloran', 15) and order == ['Leo Arlen', 'Maya Venn', 'Owen Tarris']),
    ('L2 signing', 'Where something owed is still to be signed (AX-119, AX-109, AX-110, AX-117), column BE asks whether the consultant may sign in the state of the office before anything more is signed, naming Bench S; on AX-110 (message 28: the office returned a statement that named Owen, because Priya Marden is on its record) the person who signs is Priya Marden, the name on the office\'s record. No row prints MAY NOT APPEAR, and the status and daily list of no row changed',
     all((f'WHETHER {n} MAY SIGN FOR A HOMEOWNER IN {s} (Bench S) {_WARN19}' in _be(r)) for r in ALL for (n, s, b) in [_SIGN19.get(H(r, 'A'), (None, None, None))] if n)
     and sorted(H(r, 'A') for r in ALL if 'MAY SIGN FOR A HOMEOWNER' in _be(r)) == sorted(_SIGN19) and all('MAY NOT APPEAR OR SIGN' not in _be(r) for r in ALL)
     and str(H(rows['AX-110'], 'BP')).startswith("Priya Marden, the name on the office's record")),
    ('L3', 'Case files after a consultant leaves (Hearings EC, typed, empty on every row: no message shows that access was removed): column BE prints the BC line for Maya Venn on AX-113, AX-114 and AX-101, Leo Arlen on AX-103, AX-104 and AX-115, Nora Pell on AX-106, and no row prints CASE FILES WENT TO (every GOT IT in BW is from the consultant on its row); the line puts nothing on the daily list',
     all(H(r, 'EC') == '' for r in ALL) and {H(r, 'A'): _be(r) for r in ALL if _BCL19 in _be(r)}.keys() == _L3_19.keys()
     and all(f'{n} {_BCL19}' in _be(rows[c]) for c, n in _L3_19.items()) and all('CASE FILES WENT TO' not in _be(r) for r in ALL)
     and str(H(1, 'EC')) == "Files access removed from the earlier consultant (date, or 'files were never sent')" and all('FILES' not in _x(r) for r in ALL)),
    ('L', 'The new cells are announced where a person looks: How to use holds the paragraphs "Added on 21 Nov 2026, round 19 (the rules of Part L of the rule book)"; the heading of Hearings ED lists its lines; ED is the last column in use and "Keep this column empty" stands in EE1; the fixed words of the lines stand once, in Settings K2 to K11 (10 cells, none empty, none starting with ASK), and the formula of ED reads them; column BE holds the text of ED on every row where ED holds something (11 rows)',
     'Added on 21 Nov 2026, round 19 (the rules of Part L of the rule book)' in howto and str(H(1, 'ED')).startswith('Round 19 lines for column BE') and str(H(1, 'EE')).startswith('Keep this column empty') and hs.max_column == 135
     and all(isinstance(st.cell(row=r, column=11).value, str) and st.cell(row=r, column=11).value == st.cell(row=r, column=11).value.strip() != '' and not st.cell(row=r, column=11).value.startswith('ASK') for r in range(2, 12)) and st.cell(row=12, column=11).value in (None, '')
     and all(f'Settings!$K${n}' in _f2('ED') for n in range(2, 12)) and all(_ed(r).strip() == '' or _ed(r).strip() in _be(r) for r in ALL) and len([r for r in ALL if _ed(r).strip() != '']) == 11
     and wb['Dockets']['A1'].value == 'Rows are sorted: yes' and 'something is typed to the right of column ED' in str(wf['Dockets']['A1'].value)),
]
rok14 = 0
for rule, what, good in R19:
    rok14 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok14} of {len(R19)} checks on Part L of the rule book as expected.')
# ---- Part eleven (round 16, added by the prototype engineer): the command-line tools against THIS sheet ----------------
# These four checks test the prototype, not the sheet: they run the tools with Node and compare what they print and
# propose with the cells of the sheet read above. They need `node` on the path (the prototype needs it anyway).
import subprocess as _sp, json as _json, shutil as _shutil
_PROTO = os.path.normpath(os.path.join(HERE, '..'))
_av = wb['Availability']
def _iso(v): return v.strftime('%Y-%m-%d') if isinstance(v, (datetime.datetime, datetime.date)) else ('' if v in (None, '') else 'not a date: ' + str(v))
_offices = [{'county': O(r, 'A'), 'row': r, 'change': str(O(r, 'M') or ''), 'approvedBy': str(O(r, 'AQ') or ''), 'approvedOn': _iso(O(r, 'AR')), 'stillAccepts': str(O(r, 'AS') or ''),
             'saidOn': _iso(O(r, 'AT')), 'confirmedOn': _iso(O(r, 'L')), 'oldRoute': str(O(r, 'F') or '')} for r in sorted(OFF.values())]
_JS = r"""
const path = require('path'); const root = process.argv[1]; const offices = JSON.parse(process.argv[2]);
const rule = require(path.join(root, 'src/office_rule.js'));
(async () => {
  const sheet = await import('file://' + path.join(root, 'cli/sheet.js')); const { loadAll } = await import('file://' + path.join(root, 'cli/load.js'));
  const data = loadAll(); const out = sheet.readMailbox(data.messages, data);
  console.log(JSON.stringify({ hold: rule.holdSentence('the Tesswick office'), block: rule.BLOCK, states: offices.map((o) => rule.routeState(o)),
    lines: offices.map((o) => rule.routeText(o).line), cells: sheet.NEW_CELLS, proposals: out.newCellProposals, officeProposals: out.officeProposals,
    pasteColumns: sheet.PASTE_COLUMNS || [], repeatWords: sheet.REPEAT || '', repeats: out.repeatProposals || [], questions: out.questionProposals || [],
    cells18: sheet.NEW_CELLS_R18 || {}, drHeader: (rule.classifyOfficeReply('The hearing for 48 Linden Avenue has been moved from June 6 to June 13 at 10 a.m.', { county: 'Harthmere' }).proposals.find((p) => p.column === 'DR') || {}).header || '',
    calendar: await (async () => { try { const cal = await import('file://' + path.join(root, 'cli/calendar.js')); return cal.calendarHearings(out, data.packet).map((h) => ({ id: h.id, county: h.county, mode: h.mode, location: cal.eventOf(h, '20300607T000000Z').location })); } catch (e) { return []; } })() }));
})().catch((e) => { console.error(e); process.exit(1); });
"""
_tool = None
if _shutil.which('node'):
    _r = _sp.run(['node', '-e', _JS, _PROTO, _json.dumps(_offices)], capture_output=True, text=True, cwd=_PROTO)
    if _r.returncode == 0:
        _tool = _json.loads(_r.stdout)
_T = _tool or {'hold': '', 'block': '', 'states': [], 'lines': [], 'cells': {}, 'proposals': [], 'officeProposals': [], 'pasteColumns': [], 'repeatWords': '', 'repeats': [], 'questions': [], 'cells18': {}, 'drHeader': '', 'calendar': []}
_why = '' if _tool else ' (THE TOOLS COULD NOT BE RUN: node was not found, or the command failed)'
_row1 = {'Hearings': lambda col: H(1, col), 'Offices': lambda col: O(1, col), 'Availability': lambda col: _av.cell(row=1, column=CI(col)).value}
_tp = lambda rule, col, **k: [p for p in _T['proposals'] if p['rule'] == rule and p['column'] == col and all(p.get(a) == b for a, b in k.items())]
_ill_rows = [r for r in range(2, 300) if _av.cell(row=r, column=CI('I')).value == 'illness']
_tess = OFF.get('Tesswick')
P16 = [
    ('Tools D2', 'The HOLD sentence that node cli/office.js, cli/inbox.js and cli/sheet.js print for Tesswick is word for word column C of the Offices M proposal on the Reader suggestions tab of this sheet, and the generator input written by node cli/sheet.js --json holds the same sentence for its one office proposal' + _why,
     ohead is not None and _T['hold'] != '' and _T['hold'] == str(rs.cell(row=ohead + 1, column=3).value) and len(_T['officeProposals']) == 1 and _T['officeProposals'][0]['proposal'] == _T['hold']
     and _T['block'] in str(O(_tess, 'N')) and _T['block'] in case_be('AX-107')),
    ('Tools D2', f'The route state the office rule works out from the cells of each office (M, AQ, AR, AS, AT, L) equals the formula in Offices AV on all {len(_offices)} offices of this sheet, and its block line for Tesswick is Offices AW{_tess} word for word' + _why,
     len(_offices) == 10 and _T['states'] == [O(o['row'], 'AV') for o in _offices] and _T['states'].count(1) == 1
     and [l.rstrip('.') for l, o in zip(_T['lines'], _offices) if o['county'] == 'Tesswick'] == [str(O(_tess, 'AW')).rstrip('.')]),
    ('Tools headings', f'Every heading the tools show for a cell the sheet gained in round 16 ({len(_T["cells"])} cells on the Hearings, Offices and Availability tabs) is word for word row 1 of this sheet' + _why,
     len(_T['cells']) == 14 and all(_row1[k.split(' ')[0]](k.split(' ')[1]) == v for k, v in _T['cells'].items())),
    ('Tools D3, D2, X17', 'What the fixed code proposes for the new cells agrees with what a person typed into the example: Hearings CP and CQ of AX-107 and AX-108 (messages 24 and 23), Offices AS and AT of Tesswick (no; 4 June 2030), and the illness row of the Availability tab (Maya Venn, said on 5 June 2030), whose later hearing on the sheet (AX-102, the only row with ILLNESS REPORTED) is the one the tool names' + _why,
     all(len(_tp('D3', 'CP', case=c)) == 1 and str(H(rows[c], 'CP')).endswith('/message/' + str(_tp('D3', 'CP', case=c)[0]['message']))
         and len(_tp('D3', 'CQ', case=c)) == 1 and str(H(rows[c], 'CQ')).endswith('/message/' + str(_tp('D3', 'CQ', case=c)[0].get('valueMessage'))) for c in ('AX-107', 'AX-108'))
     and [p['value'] for p in _tp('D2', 'AS', county='Tesswick')] == [str(O(_tess, 'AS'))] and [p['value'] for p in _tp('D2', 'AT', county='Tesswick')] == [_iso(O(_tess, 'AT'))]
     and len(_ill_rows) == 1 and [p['value'] for p in _tp('X17', 'B')] == [_av.cell(row=_ill_rows[0], column=2).value] and [p['value'] for p in _tp('X17', 'J')] == [_iso(_av.cell(row=_ill_rows[0], column=CI('J')).value)]
     and [h['case'] for p in _tp('X17', 'I') for h in p['heldInTheDaysAfter']] == [H(r, 'A') for r in ALL if isinstance(H(r, 'CY'), (datetime.datetime, datetime.date))] == ['AX-102']),
]
rok9 = 0
for rule, what, good in P16:
    rok9 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok9} of {len(P16)} checks on the command-line tools against this sheet (Part I) as expected.')
# ---- Part eleven, continued (round 17, the prototype engineer): new mail onto the sheet, repeats, questions ----------
_reps = [p for p in _T['repeats'] if p.get('repeatOf') is not None]
_nots = [p for p in _T['repeats'] if p.get('repeatOf') is None]
_cellv = lambda p: H(rows[p['case']], p['column']) if p['case'] in rows else None
_rep_cells = [str(rs.cell(row=r, column=3).value) for r in range(2, rs.max_row + 1) if str(rs.cell(row=r, column=3).value or '').startswith('REPEAT')]
_bn_held = sorted({p['case'] for p in _T['questions'] if p['case'] in rows and str(H(rows[p['case']], 'BN') or '').strip() != ''})
_bn_empty = sorted({p['case'] for p in _T['questions'] if p['case'] in rows and str(H(rows[p['case']], 'BN') or '').strip() == ''})
P17 = [
    ('Tools R8', 'The seven columns of the file that node cli/sheet.js --paste writes for new mail are word for word row 1 of the Reader suggestions tab of this sheet (A to G), so the rows can be pasted under its last row' + _why,
     len(_T['pasteColumns']) == 7 and _T['pasteColumns'] == [rs.cell(row=1, column=c).value for c in range(1, 8)] and rs.cell(row=1, column=8).value in (None, '')),
    ('Tools K2', f'A repeat keeps the first link. For each of the {len(_reps)} repeats the tools find in the example messages, the cell of this sheet holds the link of the earlier message the tool names (repeatOf) and not the link of the message that repeats it. The {len(_nots)} lines the tools do NOT call a repeat are message 66 on AX-121 and AX-122: there Hearings L holds the link of message 66 and AZ holds the current version (AX), as the tool proposes. {len(_rep_cells)} cells of the Reader suggestions tab say REPEAT, each in the tools\' own words' + _why,
     len(_reps) == 18 and all(str(_cellv(p)) == LINK + str(p['repeatOf']) and str(_cellv(p)) != LINK + str(p['message']) for p in _reps)
     and len(_nots) == 4 and sorted((p['case'], p['column']) for p in _nots) == [('AX-121', 'AZ'), ('AX-121', 'L'), ('AX-122', 'AZ'), ('AX-122', 'L')]
     and all((_cellv(p) == LINK + str(p['message'])) if p['column'] == 'L' else (_cellv(p) == H(rows[p['case']], 'AX') != '') for p in _nots)
     and all(H(1, p['column']) == p['header'] for p in _T['repeats']) and _T['repeatWords'] != '' and all(c.startswith(_T['repeatWords'] + ' (the same statement as message ') for c in _rep_cells)),
    ('Tools I3', f'A consultant\'s question is proposed for Hearings BN under that column\'s own heading: {len(_T["questions"])} proposals from messages 12, 35, 48 and 54, each on a row of this sheet. In the example a person has typed a text in BN on {len(_bn_held)} of those rows ({", ".join(_bn_held) or "none"}); BN is empty on {len(_bn_empty)} ({", ".join(_bn_empty) or "none"}), where the tool\'s proposal is the only thing that shows the question' + _why,
     len(_T['questions']) == 8 and sorted({p['message'] for p in _T['questions']}) == [12, 35, 48, 54] and all(p['case'] in rows and p['tab'] == 'Hearings' and p['column'] == 'BN' and p['header'] == H(1, 'BN') for p in _T['questions'])),
]
rok11 = 0
for rule, what, good in P17:
    rok11 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok11} of {len(P17)} checks on the command-line tools against this sheet (Part J) as expected.')
# ---- Part eleven, continued (round 18, the prototype engineer): the tools follow Part K of the sheet -------------------
_k = lambda rule, col: [p for p in _T['proposals'] if p['rule'] == rule and p['column'] == col]
_hd = lambda c, col: _iso(H(rows[c], col)) if c in rows else 'no row'
_cal_h = {str(cl.cell(row=r, column=8).value) for r in range(2, cl.max_row + 1) if ' hearing office' in str(cl.cell(row=r, column=8).value or '')}
_cal_t = [h for h in _T['calendar'] if h['mode'] == 'in_person']
_dx_rows = sorted(H(r, 'A') for r in ALL if H(r, 'DX') not in (None, ''))
_bb_rows = sorted(str(O(r, 'A')) for r in OFF.values() if str(O(r, 'BB') or '').strip().lower() == 'yes')
P18 = [
    ('Tools K headings', f'Every heading the tools show for a cell the sheet gained in round 18 ({len(_T["cells18"])} cells: Hearings DQ, DR, DT, DU, DX and Offices BB), and the heading of Hearings DR that the office rule shows, is word for word row 1 of this sheet' + _why,
     len(_T['cells18']) == 6 and all(_row1[k.split(' ')[0]](k.split(' ')[1]) == v for k, v in _T['cells18'].items()) and _T['drHeader'] == H(1, 'DR')),
    ('Tools K1', f'The date before a move (DR) that the tools propose equals what a person typed on this sheet for AX-105 and AX-115 ({_hd("AX-105", "DR")}, {_hd("AX-115", "DR")}), and the date of the office\'s record (DQ) proposed for AX-105 from message 16 equals DQ on this sheet ({_hd("AX-105", "DQ")}); the tools propose DQ only for a hearing moved after the office\'s record (AX-105, AX-115). On this sheet K is empty on AX-115, so its DQ is empty there and the proposal waits for a link in K' + _why,
     sorted((p['case'], p['value']) for p in _k('K1', 'DR')) == [('AX-105', _hd('AX-105', 'DR')), ('AX-115', _hd('AX-115', 'DR'))]
     and [(p['case'], p['value'], p['message']) for p in _k('K1', 'DQ') if p['case'] == 'AX-105'] == [('AX-105', _hd('AX-105', 'DQ'), 16)] and str(H(rows['AX-105'], 'K')).endswith('/message/16')
     and sorted(p['case'] for p in _k('K1', 'DQ')) == ['AX-105', 'AX-115']),
    ('Tools K3', f'The link that reported the result (DU) on this sheet is among the tools\' proposals for that row: AX-119 {H(rows["AX-119"], "DU") if "AX-119" in rows else "no row"}, AX-120 {H(rows["AX-120"], "DU") if "AX-120" in rows else "no row"} (the tools propose messages 57 and 59 for each; a person keeps one)' + _why,
     all(c in rows and str(H(rows[c], 'DU') or '').startswith(LINK) and int(str(H(rows[c], 'DU')).rsplit('/', 1)[1]) in [p['message'] for p in _k('K3', 'DU') if p['case'] == c] for c in ('AX-119', 'AX-120'))
     and len(_k('K3', 'DU')) == 4 and len(_k('K3', 'DT')) == 4),
    ('Tools K6', f'The tools propose Hearings DX on the rows where this sheet holds it ({", ".join(_dx_rows) or "none"}), and Offices BB = yes for the offices this sheet marks as sending notices on paper ({", ".join(_bb_rows) or "none"})' + _why,
     sorted(p['case'] for p in _k('K6', 'DX')) == _dx_rows == ['AX-107', 'AX-108'] and sorted(p['county'] for p in _k('K6', 'BB')) == _bb_rows == ['Harthmere']),
    ('Tools K5', f'The LOCATION that node cli/calendar.js writes for each of its {len(_cal_t)} hearings in person is word for word a location of the Calendar tab of this sheet (column H), ADDRESS NOT ON RECORD and the cell of Offices BA included' + _why,
     len(_cal_t) == 6 and all(h['location'] in _cal_h and 'ADDRESS NOT ON RECORD: Offices BA' in h['location'] for h in _cal_t)),
]
rok12 = 0
for rule, what, good in P18:
    rok12 += bool(good)
    print(f"{'pass' if good else 'FAIL'}  {rule}  {what}")
print(f'\n{rok12} of {len(P18)} checks on the command-line tools against this sheet (Part K) as expected.')
sys.exit(0 if rok12 == len(P18) and rok11 == len(P17) and ok == len(EXPECT) and tok == len(TABS) and rok == len(R15) and rok2 == len(R15B) and rok3 == len(R15C) and rok4 == len(R15D) and rok5 == len(R15E) and rok6 == len(R15F) and rok7 == len(R15G) and rok8 == len(R16) and rok9 == len(P16) and rok10 == len(R17) and rok13 == len(R18) and rok14 == len(R19) else 1)
