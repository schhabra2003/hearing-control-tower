# The gate sheet

`gate-sheet.xlsx` is the spreadsheet a coordinator would run in season one. Every hearing, office,
consultant and message in it is fictional and comes from the case's example packet.

- **Start here:** the "How to use" tab. It says what to do at the 9:00 a.m. pass and the 2:00 p.m.
  review, and what each tab is for.
- **The rows:** the 24 example hearings are the first rows of the Hearings tab. The tab has room for
  1,200 hearings.
- **The five checks:** each hearing shows OPEN with the number of checks missing, READY when all
  five are proved by a message, and CONFIRMED with the consultant's day-before yes.
- **The 18 tabs:** How to use, Hearings, Dockets, Measures, Record check, Notices on file, Calendar,
  Calendar file, Offices, Bench, Availability, Who can take it, Reader suggestions, Friday sample,
  Day 1 count, Hours, Holidays and Settings.
- **Size:** 20,279,732 bytes (measured), md5 `2e74089c917b1bcc1ac36f5f7de3e7ce` (measured). The last change
  to it was formatting only, with the same formulas and values. Most of
  the size is formulas copied down 1,200 rows.

A block on a spreadsheet is words and order, not a lock: the sheet tells a person what is missing,
and a person types every change.

## Opening it

| Program | What was tested | Result |
|---|---|---|
| LibreOffice Calc 24.2 | This build: built and recalculated in LibreOffice; its stored values are checked by `make sheet-check` | 180 `pass` lines, 0 `FAIL` (measured, [../CHECKS.md](../CHECKS.md)) |
| Excel for Mac | An earlier build of 20 Nov 2026, full recalculation | All formulas kept, 0 error values; only the random-draw cells differ (measured, [../docs/outside-tests/excel-test.md](../docs/outside-tests/excel-test.md)) |
| Google Sheets | An 80-row copy of an earlier build, uploaded with conversion | Two faults found and fixed, then 0 error values (measured, [../docs/outside-tests/google-sheets-test.md](../docs/outside-tests/google-sheets-test.md)) |
| Excel for Windows, Excel on the web, the full 1,200 rows in Google Sheets | Not tested | Unknown |

In Excel, if values look stale, force a full recalculation (Ctrl+Alt+Shift+F9 on Windows,
Ctrl+Option+Shift+F9 on a Mac). In Google Sheets, upload the file to Drive and open it with Google
Sheets; the full file is large, and only an 80-row copy was tried.

The calendar file the sheet builds (the "Calendar file" tab) was imported into Apple Calendar with
no error (measured, [../docs/outside-tests/calendar-test.md](../docs/outside-tests/calendar-test.md)).
