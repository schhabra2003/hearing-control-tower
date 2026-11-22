# Checks

Every command below was run on 22 Nov 2026 from a fresh copy of this repository (a plain file copy
with no `node_modules` and no build output). Result lines are copied from the terminal. Times are
measured on one Linux machine with 4 CPUs, Node v22.23.4, npm 10.9.9, Python 3.13.18 and openpyxl
3.1.5, and vary from run to run.

All data the checks use is fictional. No check sends a message, calls a model or reads a key.

## Summary

| Command | Needs | Result (measured 22 Nov 2026) | Time |
| --- | --- | --- | --- |
| `make check` | Node 22, no install | Pass. 216 of 216 problems, 39 of 39 replies agree, 91 of 91 office checks | 21 s |
| `make sheet-check` | Python 3 with openpyxl, Node 22 | Pass. 180 lines start with `pass`, 0 with `FAIL`, exit code 0 | 13 s |
| `make app` | Node 22, network for `npm ci` | Pass. 303 packages installed, `app/dist/index.html` built (3,240.69 kB) | 22 s |
| `make app-data` | Python 3 with openpyxl, Node 22 | Pass. `sheet.json` and `engine.json` written with the same content as the committed files (apart from export times); `evidence.json` kept | 4 s |
| `npm run typecheck` (in `app/`) | after `make app` | Pass, exit code 0 | 9 s |
| `npm run lint` (in `app/`) | after `make app` | Pass, no findings | 4 s |
| `npm run smoke` (in `app/`) | after `make app`, Playwright Chromium | Pass. 52 steps print `ok`, 0 `FAIL`, exit code 0 | 68 s |
| `npm run engine-check` (in `app/`) | after `make app`, Playwright Chromium | Pass. 7 of 7 checks in the browser build | 3 s |
| `npm run live:check` (in `app/`) | after `make app`; no key | Pass. 4 of 4 checks of the live server in recorded mode | 1 s |
| `make open`, `make tower` | a browser | Opens the file with `xdg-open` or `open`; where neither exists, prints the path | under 1 s |

`make app-check` runs typecheck, smoke and engine-check in that order and stops at the first
failure.

## make check

Runs `node cli/check.js`, `node cli/replies.js` and `node cli/check_office.js` in `prototype/`.
Exit code 0. The key lines, in order:

```
216 of 216 problems pass  (19267 ms)
Cooperative run from the end of the examples: 50 actions and 38 simulated replies; ready 17, closed 2, past 2, after-hearing 3.
Actions by level: automatic 16, one click 25, drafted for a person 4, person only 5.
39 replies: 17 filed by rule, 22 handed to a person.
Self-test against what a coordinator would decide by hand: 39 of 39 agree.
91 of 91 office checks pass.
```

The 39 replies are fictional and were written by the author of the rule, so 39 of 39 shows that
the rule does what it says, not how often real replies fit it (the command prints this caveat).
`node cli/check.js` rewrites `prototype/eval/coverage.json`; after the run the file was identical
to the committed one (measured with `diff`).

## make sheet-check

Runs `python3 prototype/eval/sheet_threads.py sheet/gate-sheet.xlsx` on the shipped sheet (md5
`2e74089c917b1bcc1ac36f5f7de3e7ce`). It needs openpyxl and Node (for its last three sections), not
LibreOffice. Exit code 0. 180 lines start with `pass` and none with `FAIL`. The summary lines, in
the order printed:

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

Parts I to L are described in `docs/kit-appendix.md`. Some `pass` lines, and some text in the sheet
itself, say "round 16" to "round 19": these are the build steps in which Parts I to L were added.

## make app

Runs `npm ci` and `npm run build` in `app/`. Exit code 0.

```
added 303 packages in 5s
vite v5.4.21 building for production...
✓ 3216 modules transformed.
dist/index.html  3,240.69 kB
✓ built in 6.71s
```

The size of the built file varies by a few kB between builds, because Tailwind scans the `app/`
folder for class names, including files left by earlier builds.

The app reads the engine from `../prototype` through the `@engine` alias in `app/vite.config.ts`.
There is one copy of the engine in the repository.

## make app-data

Runs `npm run data` in `app/`. Exit code 0.

```
export_sheet: wrote src/data/sheet.json (482 KB) from sheet/gate-sheet.xlsx, md5 2e74089c917b1bcc1ac36f5f7de3e7ce, 24 hearings. The six gate parts match Hearings U on 24 of 24 rows.
export_engine: wrote src/data/engine.json (516 KB). 39 replies: 17 filed by rule, 22 handed to a person. Self-test against what a coordinator would decide by hand: 39 of 39 agree. Paste: 26 rows for 6 messages, not read: new-1.
export_evidence: skipped: set FAIRAPPEAL_NOTES to a full notes folder to regenerate src/data/evidence.json; the committed file is kept.
```

`evidence.json` quotes check logs that are not published, so it is committed as built. After the run,
all three files held the same data as the committed ones (export times aside).

## npm run smoke

Opens `dist/index.html` from `file://` with the network off, visits all 32 routes and clicks
through the main flows: the 9:00 a.m. pass and its session after a reload, the paste flow, an
office decision, Integrations, the consultant page, dark mode and the guided tour (11 stops), with
an axe accessibility scan. 52 steps printed `ok` and none printed `FAIL`. The last line:

```
All 32 routes, Today, the 9:00 a.m. pass, the paste flow, Integrations, the consultant page and the tour work offline, with no console errors, no request outside the file and no serious or critical axe findings.
```

## npm run engine-check

```
PASS reply rule: 39 of 39 example replies match the node export; "YES 1 3" to an offer of 1 and 3 is filed by rule with numbers 1 and 3
PASS office rule: kind cannot_find, 4 proposals
PASS try a message (offline pattern reader and recorded answers): 72 messages read, 71 with readings that passed, 0 missing recorded answers; a typed message gave 0 readings
PASS session store (control tower replay): session made, 30 fields
PASS counties: 10 county playbooks loaded into the engine
PASS scale run (small): result fields: meta, shards, abortedShards, lostHearings, hearings, held, ready, readyAudited
PASS economics: business case fields: input, perMinute, fee, clientSaving, minutesKit, minutesAfter, minutesSaved, minutesSavedVsToday
All 7 checks pass in the browser build.
```

## npm run live:check

Starts the live server with `--recorded` and no key, and checks it.

```
PASS  status answers: recorded: Started with --recorded.
PASS  another origin is refused
PASS  read answers: 26 rows, 270 ms
PASS  rows equal the command (node cli/sheet.js --paste): 26 rows from the command
```

The live path with a real key is measured separately, on 22 Nov 2026, in
[docs/evaluation/live-readers-22nov.md](docs/evaluation/live-readers-22nov.md).

## Known failures

None.
