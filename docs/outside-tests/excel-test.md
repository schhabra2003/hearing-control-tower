# Excel test of the gate sheet (measured, 20 Nov 2026, 11:27 PM Eastern)

- File tested: the installed sheet of that hour, md5 3416e290603fd30f2e6ca5f9af36c6a5 (14,676,985 bytes, 143,729 formulas, 1,200 hearing rows), a build of 20 Nov 2026.
- Program: Microsoft Excel for Mac (version line below, read from the saved file).
- Steps: opened the file in Excel, forced a full rebuild and recalculation (Ctrl+Option+Shift+F9), saved a copy with Save As (gate-sheet-excel-saved.xlsx, 16,333,071 bytes), compared every non-empty cell of the Excel copy with the LibreOffice-calculated sheet (a comparison script using openpyxl, not published).
- Result: all 18 tabs present; 143,729 of 143,729 formulas kept; 0 error values; 16,534 non-empty cells compared, 42 differ. All 42 are the random draw: Hearings AD (18 cells, RAND) and the Friday sample that is drawn from it (24 cells). That the random cells changed shows Excel did recalculate. No other cell differs.
- Not covered: Excel for Windows, Excel in a browser, typing new rows, cut, paste, insert, delete and sort in Excel (those are LibreOffice results), speed in Excel.
- Version line in the saved file: Application "Microsoft Macintosh Excel", AppVersion 16.0300, calcId 191029.
