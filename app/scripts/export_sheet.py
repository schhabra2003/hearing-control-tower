"""Export the installed gate sheet's recalculated values to src/data/sheet.json.

    python3 scripts/export_sheet.py [path/to/gate-sheet.xlsx]

Reads the cached values (openpyxl, data_only=True) that LibreOffice saved with the sheet. It never
writes to the sheet. Columns of the Hearings tab are found by their heading text in row 1, never by
letter alone, because the sheet still changes. Sheet text (statuses, list words, printed lines) is
copied verbatim and never re-cased.

The export stops with an error, and writes nothing, when:
  - a heading it needs is missing or found twice,
  - the six gate parts it computes disagree with Hearings U ("Proofs missing") on any row,
  - the lines it splits column BE into do not join back to the exact cell.
"""

import datetime as dt
import hashlib
import json
import os
import re
import sys

import openpyxl
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
DEFAULT_SHEET = os.path.normpath(os.path.join(APP, "..", "sheet", "gate-sheet.xlsx"))
OUT = os.path.join(APP, "src", "data", "sheet.json")

# Row of the headings on each tab (the first data row is the next one). None: the tab has no
# heading row and every non-empty row is kept as it stands.
HEADER_ROW = {
    "How to use": None,
    "Hearings": 1,
    "Dockets": 3,
    "Measures": 1,
    "Record check": 3,
    "Notices on file": 2,
    "Calendar": 1,
    "Calendar file": None,
    "Offices": 1,
    "Bench": 1,
    "Availability": 1,
    "Who can take it": 3,
    "Reader suggestions": 1,
    "Friday sample": 1,
    "Day 1 count": 1,
    "Hours": 1,
    "Holidays": 1,
    "Settings": 1,
}

# Tabs whose data rows count only when column A holds something: their formulas run far below the
# last example row and print empty strings, zeros or midnight there.
KEYED_BY_A = {"Hearings", "Dockets", "Record check", "Notices on file", "Calendar", "Offices", "Bench",
              "Availability", "Reader suggestions", "Friday sample"}

# Tabs whose rows also count when another column holds the key: the Reader suggestions rows of
# "Messages handed to a person" have no column A; their message number is in column D.
ALSO_KEYED_BY = {"Reader suggestions": "D"}

# The Calendar file tab: column A is the file, column B holds the two sentences about it. The other
# columns are helper formulas on every one of its rows.
CALENDAR_FILE_COLUMNS = {"A", "B"}

# Hearings fields the UI reads, found by the start of their heading text in row 1.
HEARING_FIELDS = {
    "case": "Case",
    "property": "Property",
    "county": "County",
    "date": "Hearing date",
    "time": "Time",
    "format": "Format",
    "stillOn": "Hearing still on?",
    "consultant": "Consultant",
    "g1Link": "G1 Schedule",
    "g2Link": "G2 Consultant's own yes",
    "g3Link": "G3 County has the name on record",
    "g4ClerkLink": "G4 Evidence on file with the clerk",
    "g4ConsultantLink": "G4 Consultant has the packet",
    "owed": "Owed (leave empty",
    "g5Link": "G5 Proof that it is processed",
    "dayBeforeYes": "Day-before YES (video",
    "arrived": "Arrived or joined",
    "result": "Result",
    "missing": "Proofs missing",
    "workingDays": "Working days to hearing",
    "status": "Status (formula)",
    "dailyList": "Daily list (formula)",
    "nextAction": "Next action",
    "owner": "Owner",
    "due": "Due",
    "readerNote": "Example note: what the two AI readers found",
    "dayBeforeTexts": "Day-before texts so far",
    "room": "Room, video link or call-in number",
    "filesCurrent": "Case files: current version",
    "filesConsultant": "Case files: version the consultant confirmed",
    "filesClerk": "Case files: version the clerk confirmed",
    "nameOnRecord": "Name on the office's record",
    "printed": "Deadlines and changes (formula)",
    "tellConsultant": "To tell the consultant",
    "toldConsultant": "Told, or they already have it",
    "owedNotProcessed": "Owed and not yet processed",
    "yesCounts": "The consultant's yes counts",
    "gotItFrom": "GOT IT is from",
    "timeZoneSentence": "Time-zone sentence",
    "linkCheck": "Link check for a video or telephone hearing",
    "routeState": "Office route state",
    "homeowner": "Homeowner (name",
    "homeownerNumber": "Homeowner's customer number",
    "homeownerContact": "Homeowner's contact",
    "officeRow": "Row of this hearing's office on the Offices tab",
    "recordCountsForDate": "The office's record in K counts for the date",
    "officeAddress": "Where a hearing in person is held",
}

# The formula columns whose text column BE prints, found by heading text ("lines for column BE",
# "line for column BE"). BE is these parts and a few of its own, in the order of rule book 10.1.
BE_PART_HEADING = re.compile(r"\blines? for column BE\b", re.I)

GATE_KEYS = ["G1", "G2", "G3", "G4clerk", "G4consultant", "G5"]
GATE_LINK_FIELD = {"G1": "g1Link", "G2": "g2Link", "G3": "g3Link", "G4clerk": "g4ClerkLink",
                   "G4consultant": "g4ConsultantLink", "G5": "g5Link"}


def fail(msg):
    sys.stderr.write(f"export_sheet: FAILED: {msg}\n")
    sys.exit(1)


def clean(v):
    """A cell value as JSON: dates as ISO text, times as HH:MM, whole floats as integers."""
    if v is None:
        return None
    if isinstance(v, dt.datetime):
        if v.hour == 0 and v.minute == 0 and v.second == 0:
            return v.date().isoformat()
        return v.isoformat(timespec="minutes")
    if isinstance(v, dt.date):
        return v.isoformat()
    if isinstance(v, dt.time):
        return v.strftime("%H:%M")
    if isinstance(v, float) and v.is_integer() and abs(v) < 2**53:
        return int(v)
    if isinstance(v, str) and v == "":
        return None
    return v


def blank(v):
    return v is None or (isinstance(v, str) and v.strip() == "")


def read_tab(ws):
    name = ws.title
    hrow = HEADER_ROW.get(name, 1)
    headers = {}
    rows = []
    for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        cells = {}
        for c_idx, raw in enumerate(row, start=1):
            letter = get_column_letter(c_idx)
            if name == "Calendar file" and letter not in CALENDAR_FILE_COLUMNS:
                continue
            v = clean(raw)
            if v is None:
                continue
            cells[letter] = v
        if hrow is not None and r_idx == hrow:
            headers = {k: str(v) for k, v in cells.items()}
            continue
        if not cells:
            continue
        if name in KEYED_BY_A and hrow is not None and r_idx > hrow and blank(cells.get("A")):
            other = ALSO_KEYED_BY.get(name)
            if other is None or blank(cells.get(other)):
                continue
        rows.append({"row": r_idx, "cells": cells})
    return {"headerRow": hrow, "headers": headers, "rows": rows,
            "maxRow": ws.max_row, "maxColumn": ws.max_column}


def find_columns(headers, wanted):
    found = {}
    for key, prefix in wanted.items():
        hits = [c for c, h in headers.items() if h == prefix] or [c for c, h in headers.items() if h.startswith(prefix)]
        if len(hits) != 1:
            fail(f"Hearings heading starting {prefix!r}: found {len(hits)} columns ({hits})")
        found[key] = hits[0]
    return found


def is_link(v):
    return isinstance(v, str) and v.strip().lower().startswith("http")


def num(v, default=0):
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def eq_text(a, b):
    return str(a if a is not None else "").strip() == str(b if b is not None else "").strip()


def compute_gates(c, f):
    """The six gate parts.
    Returns {key: "proved" | "missing" | "not-needed"}."""
    g = lambda key: c.get(f[key])
    written = g("format") == "written statement"
    ax = g("filesCurrent")
    ax_empty = blank(ax)
    out = {}
    out["G1"] = is_link(g("g1Link")) and num(g("linkCheck")) < 4
    out["G2"] = num(g("yesCounts")) == 1 or written
    bd, h = g("nameOnRecord"), g("consultant")
    out["G3"] = num(g("recordCountsForDate")) == 1 and not (not blank(bd) and not blank(h) and not eq_text(bd, h))
    out["G4clerk"] = is_link(g("g4ClerkLink")) and (ax_empty or eq_text(g("filesClerk"), ax))
    out["G4consultant"] = written or (is_link(g("g4ConsultantLink")) and not blank(g("gotItFrom"))
                                      and eq_text(g("gotItFrom"), h) and (ax_empty or eq_text(g("filesConsultant"), ax)))
    out["G5"] = num(g("owedNotProcessed")) != 1
    states = {k: ("proved" if v else "missing") for k, v in out.items()}
    if written:
        states["G4consultant"] = "not-needed"
        if out["G2"]:
            states["G2"] = "not-needed"
    if blank(g("owed")):
        states["G5"] = "not-needed"
    failed = sum(1 for v in out.values() if not v)
    return states, failed


SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"'(])")
NOT_AN_END = re.compile(r"(?:\b[ap]\.m\.|\be\.g\.|\bi\.e\.|\bNo\.|\bSt\.|\bMr\.|\bMs\.|\bDr\.)$")


def sentences(text):
    """Split text after a full stop that ends a sentence; each piece keeps its trailing space."""
    parts, start = [], 0
    for m in SENTENCE_END.finditer(text):
        head = text[start:m.start()]
        if NOT_AN_END.search(head):
            continue
        parts.append(text[start:m.end()])
        start = m.end()
    if start < len(text):
        parts.append(text[start:])
    return parts


def opens_a_line(sentence):
    """A printed line starts with a sentence in capitals that names its subject before a colon in
    its first 90 characters; a sentence without one continues the line before it."""
    head = sentence[:90]
    return ":" in head


def split_printed(be, parts):
    """Split BE into numbered lines, each with the column that writes it. parts: [(letter, text)]."""
    if blank(be):
        return []
    segments = []  # (column, text)
    pos = 0
    for letter, text in parts:
        t = str(text).strip()
        if not t:
            continue
        at = be.find(t, pos)
        if at < 0:
            continue
        if at > pos:
            segments.append(("BE", be[pos:at]))
        end = at + len(t)
        while end < len(be) and be[end] == " ":
            end += 1
        segments.append((letter, be[at:end]))
        pos = end
    if pos < len(be):
        segments.append(("BE", be[pos:]))
    lines = []
    for col, seg in segments:
        first = True
        for s in sentences(seg):
            if first or opens_a_line(s) or not lines:
                lines.append({"column": col, "text": s})
            else:
                lines[-1]["text"] += s
            first = False
    joined = "".join(l["text"] for l in lines)
    if joined != be:
        fail(f"BE lines do not join back to the cell: {be[:80]!r}")
    out = []
    for i, l in enumerate(lines, start=1):
        t = l["text"]
        out.append({"n": i, "column": l["column"], "text": t.rstrip(), "trailing": t[len(t.rstrip()):]})
    return out


def message_number(link):
    if not is_link(link):
        return None
    m = re.search(r"/message/([A-Za-z0-9-]+)\s*$", link.strip())
    return m.group(1) if m else None


def build_hearings(tab):
    headers = tab["headers"]
    f = find_columns(headers, HEARING_FIELDS)
    be_parts = [c for c, h in headers.items() if BE_PART_HEADING.search(h)]
    be_parts.sort(key=lambda c: openpyxl.utils.column_index_from_string(c))
    order = {"CD": 0}
    # Rule book 10.1: the office-deadline line (CD) comes first among the parts; the others print in
    # the order of their columns, which is the order the sheet joins them.
    be_parts.sort(key=lambda c: (order.get(c, 1), openpyxl.utils.column_index_from_string(c)))
    deadline_col = [c for c, h in headers.items() if h.startswith("Office-deadline line for column BE")]
    if len(deadline_col) == 1 and deadline_col[0] not in be_parts:
        be_parts.insert(0, deadline_col[0])
    hearings, mismatches = [], []
    for r in tab["rows"]:
        c = r["cells"]
        states, failed = compute_gates(c, f)
        u = num(c.get(f["missing"]), default=-1)
        if failed != u:
            mismatches.append(f"row {r['row']} {c.get(f['case'])}: computed {failed}, Hearings {f['missing']} says {u}")
        be = c.get(f["printed"])
        lines = split_printed(be if isinstance(be, str) else "", [(p, c.get(p)) for p in be_parts if not blank(c.get(p))])
        gates = {}
        for k in GATE_KEYS:
            link_col = f[GATE_LINK_FIELD[k]]
            link = c.get(link_col)
            gates[k] = {"state": states[k], "linkColumn": link_col, "link": link if is_link(link) else None,
                        "message": message_number(link)}
        h = {"row": r["row"]}
        for key, col in f.items():
            h[key] = c.get(col)
        h["gates"] = gates
        h["printedLines"] = lines
        h["cells"] = c
        hearings.append(h)
    if mismatches:
        fail("the gate parts disagree with column U:\n  " + "\n  ".join(mismatches))
    return {"columns": f, "printedParts": be_parts, "rows": hearings}


# What is known about each released sheet, by md5. A sheet not listed here gets no release line.
RELEASES = {
    "2e74089c917b1bcc1ac36f5f7de3e7ce": "Sheet of 22 Nov 2026. The last change was formatting only; formulas and values are unchanged apart from the random Friday sample draw.",
}


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def calendar_file(tab):
    lines, summary, check = [], None, None
    for r in tab["rows"]:
        a = r["cells"].get("A")
        if r["row"] == 2:
            summary = r["cells"].get("B")
        if r["row"] == 3:
            check = r["cells"].get("B")
        if a is None:
            continue
        lines.append(str(a))
        if a == "END:VCALENDAR":
            break
    if not lines or lines[0] != "BEGIN:VCALENDAR" or lines[-1] != "END:VCALENDAR":
        fail("Calendar file column A does not run from BEGIN:VCALENDAR to END:VCALENDAR")
    return {"summary": summary, "lineCheck": check, "lines": lines}


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SHEET
    if not os.path.isfile(path):
        fail(f"no sheet at {path}")
    st = os.stat(path)
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    tabs = {}
    for ws in wb.worksheets:
        tabs[ws.title] = read_tab(ws)
    if "Hearings" not in tabs:
        fail("the sheet has no Hearings tab")
    hearings = build_hearings(tabs["Hearings"])
    cal = calendar_file(tabs["Calendar file"]) if "Calendar file" in tabs else None
    # The Hearings tab is held once, in "hearings"; the Calendar file tab once, in "calendarFile".
    hearings_tab = tabs.pop("Hearings")
    tabs.pop("Calendar file", None)
    out = {
        "meta": {
            "source": os.path.relpath(os.path.abspath(path), os.path.dirname(APP)).replace(os.sep, "/"),
            "md5": md5_of(path),
            "release": None,
            "bytes": st.st_size,
            "modified": dt.datetime.fromtimestamp(st.st_mtime, dt.timezone.utc).isoformat(timespec="seconds"),
            "exportedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "openpyxl": openpyxl.__version__,
            "tabs": [{"name": ws.title, "maxRow": ws.max_row, "maxColumn": ws.max_column} for ws in wb.worksheets],
            "gateCheck": f"The six gate parts match Hearings {hearings['columns']['missing']} on {len(hearings['rows'])} of {len(hearings['rows'])} rows.",
        },
        "hearingHeaders": hearings_tab["headers"],
        "hearings": hearings,
        "calendarFile": cal,
        "tabs": tabs,
    }
    out["meta"]["release"] = RELEASES.get(out["meta"]["md5"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, OUT)
    print(f"export_sheet: wrote {os.path.relpath(OUT, APP)} ({os.path.getsize(OUT) // 1024} KB) from {out['meta']['source']}, md5 {out['meta']['md5']}, "
          f"{len(hearings['rows'])} hearings. {out['meta']['gateCheck']}")


if __name__ == "__main__":
    main()
