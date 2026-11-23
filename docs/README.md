# Documents

Everything in this folder describes a fictional firm. The names, offices, addresses and messages
come from the case's example packet. Every number carries a label: measured, sourced, simulated or
estimate.

## Read in this order

| Read | File | What it is |
|---|---|---|
| Brief | [ASSIGNMENT.md](ASSIGNMENT.md) | The take-home brief from FairAppeal |
| First, 2 minutes | [write-up/one-page-write-up.pdf](write-up/one-page-write-up.pdf) | The priorities, the measures, the process and the money on one page. [The HTML source](write-up/one-page-write-up.html) prints to the same page |
| Second, 5 minutes | [week-one-kit.md](week-one-kit.md#a-normal-day-on-one-page), a normal day on one page | What the coordinator types and when, then [the Monday page](week-one-kit.md#the-monday-page) for the first day |
| Reference | [week-one-kit.md](week-one-kit.md) | The whole kit. A person at the firm can follow it without the appendix |
| Reference | [kit-appendix.md](kit-appendix.md) | More scripts, the reasons and the arithmetic. Section 15 is the written procedure for growing past one workbook, which was not run |
| Reference | [PROBLEM_COVERAGE.md](PROBLEM_COVERAGE.md) | Every problem one by one. Section 11 covers the 125 problems of the audit and three found after it (X32 to X34), each with what the firm does this season, where it lives, and the question for the firm or the office where only they know the answer |
| Reference | [SOLUTION_DESIGN.md](SOLUTION_DESIGN.md) | The design document. Section 0a is this season's plan; the rest covers the economics and the later control tower |

The four reference documents are long (about 89,000 words together, measured with `wc -w`). They
are meant to be searched, not read end to end.

## Evidence

| File | What it is |
|---|---|
| [evaluation/README.md](evaluation/README.md) | Results of the AI readers, the reply rule, the office rule and the scale simulation, each number labelled, with the file or command behind each |
| [evaluation/live-readers-22nov.md](evaluation/live-readers-22nov.md) | The two AI readers run live on every labelled set on 22 Nov 2026: 117 of 117 and 119 of 119 agreed and verified readings right on the 72 examples, 73 of 81 (90.1%) on unseen set 2, 550 requests, 0 failed, $1.16 (measured) |
| [evaluation/audit-results.md](evaluation/audit-results.md) | A summary of the audit of the season-one plan against 125 problems: 109 Yes, 8 pending the firm's answer, 8 Partly (measured from the record) |
| [evaluation/audit-record.json](evaluation/audit-record.json) | The audit record behind that summary, one entry for each of the 125 problems |
| [outside-tests/excel-test.md](outside-tests/excel-test.md) | The gate sheet opened and recalculated in Excel for Mac, on an earlier build of the sheet |
| [outside-tests/google-sheets-test.md](outside-tests/google-sheets-test.md) | An 80-row copy of the sheet converted and recalculated in Google Sheets, on an earlier build, and the two faults it found |
| [outside-tests/calendar-test.md](outside-tests/calendar-test.md) | The sheet's calendar file imported into Apple Calendar. Google Calendar and Outlook were not tried |
| [outside-tests/live-reader-run.md](outside-tests/live-reader-run.md) | The first run of the paste command with a real key on 21 Nov 2026 (4 messages). A test of the path, not an accuracy measure |

The commands that produce the checked numbers, and their last results, are in
[../CHECKS.md](../CHECKS.md).

## The web app

| File | What it is |
|---|---|
| [integrations.md](integrations.md) | The tools a firm may already use (mailbox, file storage, calendar, phone and text, e-signature, case system, county office channels, the model provider): what each would carry, the permission it would ask, what a person approves, and what is not connected. None is connected in this prototype |
| [agents-api.md](agents-api.md) | `window.hearingDesk`, the read-only view of the app's data for agents that browse it |
| [design-system/README.md](design-system/README.md) | Tokens, type, colour and the shared components of the web app |

How to build and test the app, how to run its live AI mode with your own OpenAI key, and how the
hosted copy (https://hearing-desk.onrender.com/) is deployed, is in [../app/README.md](../app/README.md).

## Research

[research/](research/) holds nine notes with their sources:

| File | Topic |
|---|---|
| [01_real_appeal_processes.md](research/01_real_appeal_processes.md) | How real property tax appeal boards handle notices, date changes, evidence and channels |
| [02_industry_and_ops.md](research/02_industry_and_ops.md) | FairAppeal, comparable firms and coordination practices |
| [03_tech_costs_reliability.md](research/03_tech_costs_reliability.md) | Technology costs and reliability, with prices seen on 2026-11-17 |
| [04_missed_hearings.md](research/04_missed_hearings.md) | What happens when nobody attends a hearing |
| [05_seasons_and_volumes.md](research/05_seasons_and_volumes.md) | Seasons and volumes |
| [06_unit_economics.md](research/06_unit_economics.md) | Fees, win rates and wages |
| [07_non_software_levers.md](research/07_non_software_levers.md) | Levers that need no software |
| [08_models_and_prices.md](research/08_models_and_prices.md) | Open and closed models for the reader: prices and benchmarks |
| [09_orchestration_and_observability.md](research/09_orchestration_and_observability.md) | Orchestration and observability: what published guidance says |

Two scripts are kept with the notes. `baseline_minutes.py` counts coordinator work from the example
messages. `economics.py` is the first cost model and is superseded: the business case now lives in
`../prototype/src/economics.js` (run `node cli/economics.js` from `prototype/`). Both give estimates.
