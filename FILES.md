# Files

Every file in the repository, with one line on what it is. Generated files and the built files are
marked.

## (root)

- `.gitignore`: Keeps keys, private folders, node_modules and build output out of the repository
- `CHECKS.md`: Every check command with its last measured result (22 Nov 2026)
- `FILES.md`: This list
- `LICENSE`: MIT license for the code, and the notice that all example data is fictional
- `Makefile`: One-command runs: check, sheet-check, app, app-data, app-check, open, tower, clean
- `render.yaml`: Render deployment of the live server (the hosted copy); the OpenAI key is a dashboard secret, not in the file
- `README.md`: What this is, the answer in five lines, the tour, how to run, live AI mode, real versus simulated, limits

## app

- `app/.gitignore`: Ignores node_modules, scratch builds and screenshots; keeps dist/index.html
- `app/README.md`: How to use, build and test the web app, and how to run its live AI mode with your own key
- `app/eslint.config.js`: ESLint rules for src/
- `app/index.html`: Vite entry page
- `app/package-lock.json`: Exact dependency tree for npm ci
- `app/package.json`: Scripts and pinned dependencies of the web app
- `app/tsconfig.json`: TypeScript settings for src/
- `app/tsconfig.node.json`: TypeScript settings for the Vite configs
- `app/vite.config.ts`: Vite build into one HTML file; the @engine alias points to ../prototype
- `app/vite.engine-check.config.ts`: Vite build of the engine check

## app/dist

- `app/dist/index.html`: The built web app: one offline HTML file that opens with a double-click

## app/engine-check

- `app/engine-check/index.html`: Page for the engine check build
- `app/engine-check/main.ts`: Proves that the engine modules the pages need import and run in a browser build Built by vite.engine-check.config.ts and opened from file:// by script

## app/scripts

- `app/scripts/engine_check.mjs`: Builds engine-check/ into one file and opens it from file:// in Chromium
- `app/scripts/export_engine.mjs`: Export the engine's data to src/data/engine.json
- `app/scripts/export_evidence.mjs`: Export the evidence to src/data/evidence.json
- `app/scripts/export_sheet.py`: Export the installed gate sheet's recalculated values to src/data/sheet.json
- `app/scripts/layout_audit.mjs`: Layout audit: measures how much of each page's width and height the content uses
- `app/scripts/shoot.mjs`: Screenshots of the built file from file://, light and dark, for review
- `app/scripts/smoke.mjs`: The one smoke test: opens dist/index.html from file:// with the network off, visits every route, fails on any console error, any request that leaves t

## app/server

- `app/server/live-check.mjs`: No key, no cost: starts the live server with --recorded, posts the paste example file to /api/read, and checks that the rows equal what `node cli/shee
- `app/server/live.mjs`: Hearing Desk live server: serves the app and the control tower file, runs the two AI readers with a key kept on the server, with a spend cap and, on a public host, a per-visitor hourly limit

## app/src

- `app/src/App.tsx`: Re-export of the app root (layout/App.tsx)
- `app/src/main.tsx`: Entry point: mounts the app and applies the reset parameter

## app/src/components/data

- `app/src/components/data/Charts.tsx`: Compact charts on Recharts: ChartFrame and LineRunChart (lines with an optional low to high band)
- `app/src/components/data/ComparisonTable.tsx`: ComparisonTable: options side by side, one row each, with the attributes as columns
- `app/src/components/data/KpiRow.tsx`: KpiRow and KpiCell: a row of key figures split by hairlines, never cards inside a card
- `app/src/components/data/RangeField.tsx`: RangeField: a labelled slider with a live value readout and its basis chip, on the native range input (keyboard, screen reader and touch behaviour com
- `app/src/components/data/SourceChip.tsx`: SourceChip: a small dot and one word (Measured, Simulated, Estimate, Packet, Recorded)

## app/src/components/feedback

- `app/src/components/feedback/EmptyState.tsx`: EmptyState and ErrorState: what is missing or what went wrong, and what to do next
- `app/src/components/feedback/FirstRunPrompt.tsx`: FirstRunPrompt: on the first visit, one quiet card in the bottom right corner offers "Take the tour" or "Skip"
- `app/src/components/feedback/InlineAlert.tsx`: InlineAlert: a message about one part of the page that stays next to it until it is dealt with
- `app/src/components/feedback/Notifications.tsx`: The notifications list: every toast of this session, newest first, as plain sentences
- `app/src/components/feedback/Toast.tsx`: Toasts and the notifications log they feed

## app/src/components/hearing

- `app/src/components/hearing/CheckList.tsx`: CheckList: the five checks of a hearing in plain words, done or missing, with the message that proves each one a single click away
- `app/src/components/hearing/ChecksCell.tsx`: ChecksCell: the compact checks cell of a hearing list (and the replacement of the old five-square gate strip everywhere)
- `app/src/components/hearing/ConsultantLink.tsx`: A consultant's name with a link to the page the consultant sees on a phone (#/consultant/<slug>), so a reviewer can play the consultant from any heari
- `app/src/components/hearing/MessageTimeline.tsx`: MessageTimeline: every message of the example packet about this property, oldest first, grouped by day on a thin rail
- `app/src/components/hearing/SheetReference.tsx`: SheetReference: the one place where gate codes and cell references show
- `app/src/components/hearing/StepText.tsx`: A step sentence with its key facts emphasised: dates, times, the consultants named on the Bench and the offices named on the Offices tab
- `app/src/components/hearing/checks.ts`: The five checks of a hearing in plain words

## app/src/components/shell

- `app/src/components/shell/AboutDialog.tsx`: About Hearing Desk: what the app is for, and the three things a reader must know before trusting a figure: the data is fictional, nothing is sent, the
- `app/src/components/shell/AppKeyHelp.tsx`: AppKeyHelp: the "?" dialog for this app
- `app/src/components/shell/Command.tsx`: Command: cmdk parts inside a Radix dialog, for the command palette
- `app/src/components/shell/CommandPalette.tsx`: The command palette (Ctrl K or Cmd K): pages, hearings, offices, consultants, cells and commands
- `app/src/components/shell/NotFound.tsx`: Page for an unknown route, with the closest routes as links
- `app/src/components/shell/PageErrorBoundary.tsx`: Keeps one page that throws (a bad link, a corrupt saved session) from blanking the whole app: the shell stays, and the page offers Today or a reset of
- `app/src/components/shell/PhoneBar.tsx`: The phone layout's bottom bar of five main pages and a More sheet
- `app/src/components/shell/ShortcutsDialog.tsx`: ShortcutsDialog ("?"): every key, in groups, with a filter field
- `app/src/components/shell/nav.ts`: The navigation in the layout's groups (Work, Records, Results, About, Later), for the phone bar, its More sheet and the command palette (the desktop s

## app/src/components/ui

- `app/src/components/ui/ActionButton.tsx`: ActionButton: a button that shows the state of its own action (working, done, failed) in place, without changing its width
- `app/src/components/ui/Badge.tsx`: Badge, StatusChip and PhraseChip: the app's status words, text first
- `app/src/components/ui/Button.tsx`: Button: the one button system of the app
- `app/src/components/ui/Card.tsx`: Card: a bordered surface for the few places where a box is right (a rail beside a list, a dialog like decision block, the Overview pass cards)
- `app/src/components/ui/ConfirmDecisionDialog.tsx`: ConfirmDecisionDialog: a modal that records who decided and when, before a decision is kept
- `app/src/components/ui/CopyLink.tsx`: A message link a person pastes on the sheet, shown in full with a Copy button
- `app/src/components/ui/CopyValue.tsx`: "Type in Hearings Y15:" and the value in a copyable box, so a person never has to retype it from memory
- `app/src/components/ui/DetailSheet.tsx`: DetailSheet: the hearing drawer
- `app/src/components/ui/Drawer.tsx`: Drawer: kept as a name for the pages that still open a hearing or a tower case beside a list
- `app/src/components/ui/EmptyState.tsx`: Re-export of the empty and error states (components/feedback/EmptyState.tsx)
- `app/src/components/ui/ExportJsonButton.tsx`: "Export as JSON": downloads the rows a page shows, for people and agents who want the data
- `app/src/components/ui/Fact.tsx`: Fact: the key facts of a sentence, emphasised ("text hierarchy, key facts stand out")
- `app/src/components/ui/Field.tsx`: Field and TextInput: a label, an optional hint, an error, and the control wired to them by id
- `app/src/components/ui/FileDropZone.tsx`: FileDropZone: drop a file, paste it with Ctrl V or Cmd V, or choose it with the keyboard
- `app/src/components/ui/FilterChips.tsx`: FilterChips: one choice from a row of filters, each with its count (the Hearings filters)
- `app/src/components/ui/IconButton.tsx`: IconButton: a square button for one icon (close, previous, next, theme, copy)
- `app/src/components/ui/Kbd.tsx`: Kbd and KeyCombo: key caps for the keyboard map, the palette, the tour and button hints
- `app/src/components/ui/Label.tsx`: The glyph carries the source colour; the chip itself is the Badge look (hairline, surface, ink word; no status fills)
- `app/src/components/ui/LiveChip.tsx`: "Live AI" or "Recorded answers": where the readers' answers come from
- `app/src/components/ui/NotBuiltTag.tsx`: NotBuiltTag: the one tag that marks the later control tower as not built this season, rendered as the Badge family's "later" tone
- `app/src/components/ui/PageHeader.tsx`: PageHeader: the one header of every route
- `app/src/components/ui/Progress.tsx`: Progress: one thin bar with its count in words
- `app/src/components/ui/ProposalRow.tsx`: ProposalRow: one reader suggestion with Accept, Refuse and Undo, the same on every page
- `app/src/components/ui/Section.tsx`: Section and DescriptionList: the open block that replaces boxed cards on working pages
- `app/src/components/ui/SegmentedControl.tsx`: SegmentedControl: the pass switch and the list filters
- `app/src/components/ui/Skeleton.tsx`: Skeleton, SkeletonRows and SkeletonSwap: placeholders shaped like the content that is coming
- `app/src/components/ui/SourceTag.tsx`: Where a value comes from: a cell ("Measures B3") or a command ("node cli/check.js")
- `app/src/components/ui/SourceTip.tsx`: Tooltip that names the source of a number (sheet cell or command)
- `app/src/components/ui/Toast.tsx`: Re-export of the toasts and notifications log (components/feedback/Toast.tsx)
- `app/src/components/ui/Tooltip.tsx`: Tooltip: a short hint on hover and on keyboard focus; Escape closes it
- `app/src/components/ui/useProposalDecision.ts`: One way to decide a row of the Reader suggestions tab, used by the Reader suggestions page, the hearing drawer and the hearing page, so a decision rea

## app/src/data

- `app/src/data/engine.json`: Generated: the engine's data for the app (packet, timeline, playbooks, replies, recorded readings, checks)
- `app/src/data/evidence.json`: Generated: each check command and the line it prints, quoted with file and line
- `app/src/data/sheet.json`: Generated: the recalculated values of the gate sheet

## app/src/layout

- `app/src/layout/Ai.tsx`: What the AI does (#/ai) (one entry per part: what it reads, what it gives, where a person decides, how well it does, what it never does)
- `app/src/layout/App.tsx`: The app root with the layout shell
- `app/src/layout/Detail.tsx`: The Detail region on Today, Hearings and the 9:00 a.m. pass: hearing facts, steps, checks, office changes
- `app/src/layout/QueueList.tsx`: The work queue: a real table (caption, column headers, a row header per item) whose rows read like a queue
- `app/src/layout/Regions.tsx`: The five regions every work page is built from, in this order and with these landmark names: Page header, Summary, Toolbar, List, Detail
- `app/src/layout/Shell.tsx`: LayoutShell: the frame of every page
- `app/src/layout/Today.tsx`: Today (#/), the first screen
- `app/src/layout/layout.css`: Layout classes for the five regions of a work page
- `app/src/layout/model.ts`: What the first screen shows, derived from the typed data layer and the session
- `app/src/layout/routes.ts`: The layout's route table
- `app/src/layout/workflows.ts`: The main tasks, written once

## app/src/lib

- `app/src/lib/agentApi.ts`: window.hearingDesk: a read-only view of the data for agents that browse the app
- `app/src/lib/agentData.ts`: The machine-readable view of the app's data, for agents that browse it: plain JSON built from the typed data layer and the session
- `app/src/lib/boot.ts`: Start-up parameters for the video and the screenshots: ?theme=light|dark, ?clock=0900|1400, ?tour=N, ?reset=1 and ?tip=<id>
- `app/src/lib/cellLabels.ts`: Short plain labels for the sheet columns the fixed-code rules fill, so a proposal reads "Office cannot find our notice" and not the column's typing no
- `app/src/lib/chipCase.ts`: A short sheet phrase in sentence case for a chip: "TOP OF LIST: OWED" reads "Top of list: owed"
- `app/src/lib/cn.ts`: Joins class names; falsy parts are dropped
- `app/src/lib/copy.ts`: The interface's words in one place: page purposes and help, the plain names of statuses, list words, filters and cards, the Overview coverage line, th
- `app/src/lib/data.ts`: The typed data layer: the only place that reads src/data/*.json
- `app/src/lib/decisions.ts`: What the Reader suggestions tab asks of a person, counted one way for every screen
- `app/src/lib/download.ts`: Saves data as a file through a temporary link: the one download helper of the app
- `app/src/lib/focusNext.ts`: Moves focus to the next row after a decision
- `app/src/lib/format.ts`: Dates, times and working-day words, as the interface writes them: US dates with the weekday, "9:00 a.m.", and words for a past hearing ("3 working day
- `app/src/lib/gates.ts`: The five gates and their six parts: one list of names for every screen
- `app/src/lib/ics.ts`: The sheet's own calendar file: Calendar file column A joined by CRLF, byte-equal to the tab
- `app/src/lib/keys.ts`: Keyboard shortcuts
- `app/src/lib/labels.ts`: The labels every number carries: Measured, Simulated, Estimate and Packet, plus Recorded for the readers' answers replayed from a recorded run
- `app/src/lib/live.ts`: Client for the live server: status, reading pasted messages, progress
- `app/src/lib/media.ts`: Media-query hook and the phone breakpoint
- `app/src/lib/motion.ts`: Motion constants for JavaScript animations (motion/react), the same values as the CSS tokens in tokens.css (--ease-out, --dur-*)
- `app/src/lib/officeChanges.ts`: Every office change that waits for a person, in one list: the ones the sheet holds (Offices N says "no notice goes") and, once the example messages we
- `app/src/lib/paste.ts`: The --paste result of the engine export, sorted into the groups the command counts in its summary line, in the same order
- `app/src/lib/returnFocus.ts`: Focus return for overlays (WCAG 2.4.3)
- `app/src/lib/router.ts`: Hash routing for a one-file app opened from file://
- `app/src/lib/sheetText.ts`: The sheet's capitalised lines in sentence case for reading
- `app/src/lib/store.ts`: The session: what a person did here, in this browser
- `app/src/lib/theme.ts`: Light, dark or the system's choice
- `app/src/lib/today.ts`: What the two daily passes count, read from the sheet export and the session

## app/src/pages/agents

- `app/src/pages/agents/Agents.tsx`: For agents (#/agents): what the app holds, every route, and how to do each task, in plain text, for browsing agents and screen readers
- `app/src/pages/agents/PickList.tsx`: A list to pick from, for the reading pages that use the list and detail layout (Measures and costs, How we know, What the AI does, For agents)

## app/src/pages/b1

- `app/src/pages/b1/HearingPage.tsx`: The hearing page (#/hearings/AX-107): the Hearings page with AX-107 selected
- `app/src/pages/b1/Hearings.tsx`: Hearings (#/hearings?filter=&q= and #/hearings/AX-107): every hearing on the five regions of a work page
- `app/src/pages/b1/Measures.tsx`: Measures and costs: the season measures and the business case, each figure labelled
- `app/src/pages/b1/Overview.tsx`: How it works (#/how): the old Overview's content without its hero, as a reading page
- `app/src/pages/b1/PlanBand.tsx`: The plan in four cells, on Today (#/) and How it works (#/how): First, Next, Later and how it scales, each labelled as a process change or a digital t
- `app/src/pages/b1/Today.tsx`: The 9:00 a.m. pass and the 2:00 p.m. review, step by step
- `app/src/pages/b1/caseNotes.tsx`: Key facts for one hearing: short labelled lines that the sheet otherwise prints only in capitals under "Sheet reference"
- `app/src/pages/b1/measures.ts`: The Measures tab, read as the sheet holds it
- `app/src/pages/b1/routes.ts`: The routes and palette entries: Overview, Today, Hearings and the hearing page, Measures

## app/src/pages/b1/components

- `app/src/pages/b1/components/Dockets.tsx`: Dockets: the Dockets tab as the coordinator uses it at the 9:00 a.m. pass, with offer texts
- `app/src/pages/b1/components/MessageQuote.tsx`: A packet message quoted with its sender, channel and time
- `app/src/pages/b1/components/NextStepForm.tsx`: Form for a flagged hearing's next step, owner and time
- `app/src/pages/b1/components/ReviewQueue.tsx`: Proof links that wait for a person's yes or no, in step 1 of the 9:00 a.m. pass

## app/src/pages/b2

- `app/src/pages/b2/Bench.tsx`: Bench: consultants, their hearings per day, availability and who can take a hearing
- `app/src/pages/b2/Calendar.tsx`: Calendar file: the hearing calendar the sheet writes, with download
- `app/src/pages/b2/Offices.tsx`: Offices: each office's saved process, and process changes to approve or keep
- `app/src/pages/b2/Paste.tsx`: Paste new messages: run the readers (recorded or live) and copy the rows for the sheet
- `app/src/pages/b2/Replies.tsx`: Replies: consultants' replies filed by the reply rule or handed to a person
- `app/src/pages/b2/Suggestions.tsx`: Check messages: the readers' proposals by message, to accept or refuse
- `app/src/pages/b2/lib.ts`: Helpers over data the export already holds: the sections of the Reader suggestions tab, the cell a person types for each proposal, the sheet's capital
- `app/src/pages/b2/paste.ts`: The paste groups in plain words for the Paste page and the Integrations examples
- `app/src/pages/b2/routes.ts`: The routes and palette entries: Reader suggestions and Paste, Replies, Offices, Bench, Calendar file

## app/src/pages/b2/components

- `app/src/pages/b2/components/ConsultantAnswers.tsx`: ConsultantAnswers: the answers consultants gave on their own page (#/consultant/<id>), on the coordinator's Replies page
- `app/src/pages/b2/components/Drafts.tsx`: Simulated drafts: the texts and notices the sheet writes, shown with their recipient and channel and labelled "Simulated, not sent"
- `app/src/pages/b2/components/OfficeCard.tsx`: One office in the Offices Detail region: its head (name, pager, one state Badge, and State, Time zone and Hearings coming as facts), then blocks divid
- `app/src/pages/b2/components/OfficeDecision.tsx`: An office process change in the Offices detail: compare, then approve or keep the old process
- `app/src/pages/b2/components/RecordTable.tsx`: RecordTable: the List region's table for the record pages (Offices, Bench, Replies, Calendar file)
- `app/src/pages/b2/components/SheetText.tsx`: A line the sheet prints in capitals, shown in sentence case for reading, with a dotted underline: a click or Enter on the line opens the exact text "a
- `app/src/pages/b2/components/SuggestionCard.tsx`: One reader proposal with its message and proof
- `app/src/pages/b2/components/SuggestionLists.tsx`: The messages the two readers handed to a person: column D the message, E the sender, F why
- `app/src/pages/b2/components/TryOffice.tsx`: Try the office rule (prototype/src/office_rule.js) on a typed office message, in the browser
- `app/src/pages/b2/components/TryReply.tsx`: Try the reply rule (prototype/src/replies.js) on a typed reply, in the browser

## app/src/pages/b3

- `app/src/pages/b3/Evidence.tsx`: How we know: each check behind the numbers, with its command and the line it prints
- `app/src/pages/b3/engine.d.ts`: The engine exports the control tower pages use, beyond the shared declarations in src/types/modules.d.ts
- `app/src/pages/b3/routes.ts`: The routes and palette entries: the later control tower pages and Evidence

## app/src/pages/b3/components

- `app/src/pages/b3/components/CheckList.tsx`: CheckList: the Evidence page's checks as one divided list
- `app/src/pages/b3/components/ItemCard.tsx`: One item of the control tower queue or board, with its state and next step
- `app/src/pages/b3/components/Tower.tsx`: Small pieces every control tower page uses: state chips with a word and a shape, the five gate marks, links to a hearing or a message, the page frame
- `app/src/pages/b3/components/Trace.tsx`: How the control tower read one message, stage by stage

## app/src/pages/b3/later

- `app/src/pages/b3/later/Board.tsx`: Later, not built: the control tower board of every hearing and its checks
- `app/src/pages/b3/later/Business.tsx`: Later, not built: the business case of the tower by volume (estimates)
- `app/src/pages/b3/later/Checks.tsx`: Later, not built: the tower's checks and their last recorded runs
- `app/src/pages/b3/later/Counties.tsx`: Later, not built: county playbooks, adding a county and changing a shared rule (simulated)
- `app/src/pages/b3/later/How.tsx`: Later, not built: how the control tower works
- `app/src/pages/b3/later/Messages.tsx`: Later, not built: the tower's message feed with each reading
- `app/src/pages/b3/later/Queue.tsx`: Later, not built: the tower's queue of actions by level
- `app/src/pages/b3/later/Scale.tsx`: Later, not built: the scale simulation, with runs you can start (simulated)
- `app/src/pages/b3/later/TryMessage.tsx`: Later, not built: try the readers on a typed message (recorded answers offline)
- `app/src/pages/b3/later/counties.ts`: Adding a county as data: the offline stand-in for reading an office's description of its process
- `app/src/pages/b3/later/parts.tsx`: Shared presets for the Later pages
- `app/src/pages/b3/later/presets.ts`: The situations of "Try a message", as the old prototype has them (prototype/app/views/compose.js)
- `app/src/pages/b3/later/scaleData.ts`: The recorded scale runs in engine.json (written by the prototype's cli/scale.js), typed
- `app/src/pages/b3/later/tower.ts`: The control tower's engine session, typed

## app/src/pages/consultant

- `app/src/pages/consultant/ConsultantApp.tsx`: The consultant view: what a consultant opens from the link in their text or email
- `app/src/pages/consultant/HearingCard.tsx`: HearingCard: one hearing as a consultant needs it: when, where, when to arrive, what to bring, the files, anything to sign, and three answers (Yes, No
- `app/src/pages/consultant/SignaturePad.tsx`: SignaturePad: sign with a finger, a stylus or a mouse, or type your name instead
- `app/src/pages/consultant/TextPreview.tsx`: TextPreview: the same hearings as the day-before text messages the sheet writes (Hearings AT), for a consultant who does not use a calendar on a phone
- `app/src/pages/consultant/answers.ts`: A consultant's answers, written to the same session store the app uses for proposals, so the coordinator sees them on Replies and accepts or refuses e
- `app/src/pages/consultant/model.ts`: The consultant page's data: what one consultant needs to know about their own hearings, read from the sheet export (Hearings, Bench, Availability, Set

## app/src/pages/integrations

- `app/src/pages/integrations/EventResult.tsx`: What a simulated event shows, read from the exports: the packet message, the rows the paste path gives, the Reader suggestions rows it replays, the re
- `app/src/pages/integrations/Integrations.tsx`: Integrations: each tool the firm may use, its status and a simulated event to try
- `app/src/pages/integrations/IntegrationsStrip.tsx`: The shell's status strip: "Integrations: 0 connected, 6 simulated, 3 not connected", a link to #/integrations
- `app/src/pages/integrations/api.ts`: The integrations for agents: window.hearingDesk.integrations() returns this, a fresh JSON copy of the map with each card's status, flows, permission
- `app/src/pages/integrations/integrations.ts`: The integrations map as typed data: the firm's own tools, what each would read and write, the permission it asks, what a person approves, what an agen
- `app/src/pages/integrations/liveSimulate.ts`: Simulate with live AI
- `app/src/pages/integrations/routes.ts`: The Integrations routes and palette entries
- `app/src/pages/integrations/simulate.ts`: Simulate an integration event

## app/src/styles

- `app/src/styles/base.css`: Base styles, Tailwind layers and the type scale
- `app/src/styles/fonts.css`: Fonts bundled from npm (@fontsource 5.3.0), Latin subset only, inlined into the one-file build
- `app/src/styles/layout.css`: Layout tokens: grid, spacing, type and sizes
- `app/src/styles/tokens.css`: Design tokens: colour, type, radius, elevation and motion, light and dark

## app/src/tour

- `app/src/tour/GuidedTour.tsx`: GuidedTour: a spotlight tour across pages
- `app/src/tour/Tour.tsx`: The guided tour: eleven stops across the product
- `app/src/tour/steps.ts`: The eleven stops of the guided tour

## app/src/types

- `app/src/types/data.ts`: The shapes of the three generated data files (src/data/*.json)
- `app/src/types/hearingDesk.ts`: The shapes window.hearingDesk returns
- `app/src/types/modules.d.ts`: Ambient types for two kinds of import that TypeScript does not read itself

## docs

- `docs/ASSIGNMENT.md`: The take-home brief from FairAppeal
- `docs/PROBLEM_COVERAGE.md`: Every problem in the brief and the example, with where the plan handles it and the audit verdict
- `docs/README.md`: Index of the docs folder and reading order
- `docs/SOLUTION_DESIGN.md`: The design document: this season's plan, economics and the later control tower
- `docs/agents-api.md`: window.hearingDesk, the read-only data API of the web app
- `docs/integrations.md`: Each tool a firm may use, what it would carry, the permission it would ask and what is connected (nothing)
- `docs/kit-appendix.md`: Reference for the kit: the sheet tab by tab, scripts, reasons, arithmetic and checking it yourself
- `docs/week-one-kit.md`: The coordinator's kit: a normal day, the Monday page, scripts, terms and open questions

## docs/design-system

- `docs/design-system/README.md`: Tokens, type, rules and shared components of the web app

## docs/evaluation

- `docs/evaluation/README.md`: Results of the readers, reply rule, office rule, sheet check and scale simulation, each labelled
- `docs/evaluation/audit-record.json`: The audit record: 125 problems, three review passes and the final verdict of each
- `docs/evaluation/audit-results.md`: Summary of the audit: 109 Yes, 8 pending the firm, 8 Partly, 0 No
- `docs/evaluation/live-readers-22nov.md`: Live run of both AI readers on every labelled set, 22 Nov 2026: method, results, cost, limits

## docs/outside-tests

- `docs/outside-tests/calendar-test.md`: The sheet's calendar file imported into Apple Calendar
- `docs/outside-tests/excel-test.md`: The gate sheet recalculated in Excel for Mac (earlier build)
- `docs/outside-tests/google-sheets-test.md`: An 80-row copy of the sheet in Google Sheets (earlier build) and two faults it found
- `docs/outside-tests/live-reader-run.md`: First live run of the paste command with a real key (4 messages, 21 Nov 2026)

## docs/research

- `docs/research/01_real_appeal_processes.md`: Research: how real appeal boards handle notices, date changes and evidence
- `docs/research/02_industry_and_ops.md`: Research: FairAppeal, comparable firms and coordination practice
- `docs/research/03_tech_costs_reliability.md`: Research: technology costs and reliability (prices seen 17 Nov 2026)
- `docs/research/04_missed_hearings.md`: Research: what happens when nobody attends a hearing
- `docs/research/05_seasons_and_volumes.md`: Research: appeal seasons, notice periods and volumes
- `docs/research/06_unit_economics.md`: Research: fees, win rates and wages
- `docs/research/07_non_software_levers.md`: Research: reminders, wording, standby pay and texting rules
- `docs/research/08_models_and_prices.md`: Research: open and closed models for the reader, prices and benchmarks
- `docs/research/09_orchestration_and_observability.md`: Research: orchestration and observability guidance
- `docs/research/baseline_minutes.py`: Counts coordinator work in the example messages (estimate)
- `docs/research/economics.py`: First cost model, superseded by prototype/src/economics.js

## docs/write-up

- `docs/write-up/one-page-write-up.html`: Source of the one-page write-up; prints to the same page
- `docs/write-up/one-page-write-up.pdf`: The one-page write-up: measures, priorities, process and cost

## media

- `media/hearing-desk-launch.mp4`: The walkthrough video, 10:34, 1920x1080 H.264 with narration and burned-in subtitles
- `media/hearing-desk-launch.srt`: Subtitles for the walkthrough video (SubRip)
- `media/hearing-desk-launch.vtt`: Subtitles for the walkthrough video (WebVTT)

## media/screenshots

- `media/screenshots/consultant-phone.png`: Screenshot: the consultant's phone page (390 px, light)
- `media/screenshots/hearing-ax-107.png`: Screenshot: hearing AX-107 with its five checks (1920 px, light)
- `media/screenshots/integrations.png`: Screenshot: Integrations (1920 px, light)
- `media/screenshots/nine-am-pass.png`: Screenshot: the 9:00 a.m. pass (1920 px, light)
- `media/screenshots/today.png`: Screenshot: Today (1920 px, light)

## prototype

- `prototype/README.md`: The prototype: each command, the line to look for, the tools one by one, the control tower, limits
- `prototype/control-tower.html`: The later control tower in one offline HTML file (built by node cli/build.js)

## prototype/app

- `prototype/app/index.html`: Page of the control tower's source interface (prototype/app/)
- `prototype/app/live.js`: The live AI readers in the control tower interface
- `prototype/app/main.js`: The control tower interface: one page, no framework, no dependencies
- `prototype/app/server.js`: Local server for the control tower interface
- `prototype/app/store.js`: The control tower session: one engine, a simulated clock and a log of events after the examples
- `prototype/app/styles.css`: Styles of the control tower interface
- `prototype/app/ui.js`: Small rendering helpers shared by every view

## prototype/app/views

- `prototype/app/views/board.js`: The readiness board: every hearing, its five gates, and what happens next
- `prototype/app/views/checks.js`: Checks: the list of problems the prototype is tested against, and a button that runs all of them in this browser
- `prototype/app/views/compose.js`: Try a message: write anything, from anyone, and watch what the tower does with it
- `prototype/app/views/counties.js`: Counties: local processes as data
- `prototype/app/views/how.js`: How it works: the design on one page, drawn from the same data the engine runs on
- `prototype/app/views/messages.js`: Messages: every message the firm received or sent, and exactly what the tower made of it
- `prototype/app/views/money.js`: Business case: what one hearing earns and costs, what the change is worth, and at what volume each way of building it pays for itself
- `prototype/app/views/queue.js`: The work queue: what the tower wants to do next, sorted by who has to act
- `prototype/app/views/scale.js`: Scale: what happens to the work of people when hearings and counties grow
- `prototype/app/views/start.js`: Start here: what this is, what the tower sees right now, three flows to try first and five more

## prototype/cli

- `prototype/cli/appdata.js`: Assembles the packet, timeline, playbooks, labels and recorded reads into one object for the interfaces
- `prototype/cli/build.js`: Builds the whole prototype into ONE html file that opens with a double click: no server, no install, no network
- `prototype/cli/calendar.js`: The hearing calendar as an iCalendar file, in UTC
- `prototype/cli/check.js`: Runs every problem in eval/problems.js against the engine and prints pass or fail
- `prototype/cli/check_office.js`: Fixed checks for the office-reply rule (src/office_rule.js) and the submission simulator (cli/office.js)
- `prototype/cli/economics.js`: Prints the business case as tables
- `prototype/cli/inbox.js`: The inbox connector, on exported files
- `prototype/cli/load.js`: Loads the packet, timeline, playbooks and hand labels from disk (Node only)
- `prototype/cli/office.js`: A submission to each hearing office, played as a simulation, and the office-reply rule on the answer
- `prototype/cli/reading.js`: What reading adds to the scale results
- `prototype/cli/replies.js`: Replies filed by rule: the one piece of code the first priority needs in season one
- `prototype/cli/scale.js`: Scale runs of the control tower simulation (simulated)
- `prototype/cli/sheet.js`: The AI readers beside the control sheet, suggest-only
- `prototype/cli/trace.js`: Observability for the AI readers, from the recorded reads

## prototype/data

- `prototype/data/example_replies.json`: 39 fictional consultant replies for the reply rule
- `prototype/data/gold_dev.json`: Answer key for the 72 example messages
- `prototype/data/heldout.json`: Unseen set 1: 30 office messages with labels
- `prototype/data/message_labels.csv`: Labels of the 72 example messages as a table
- `prototype/data/packet.json`: The case's example packet: 24 hearings, 72 messages, offices, consultants, documents
- `prototype/data/record_audit.csv`: Case records compared with the messages (Record check tab source)
- `prototype/data/recorded_reads.json`: Recorded answers of the two readers on the example and unseen set 1 messages
- `prototype/data/recorded_reads_unseen2.json`: Recorded answers of the two readers on unseen set 2
- `prototype/data/timeline.json`: Simulated times for the packet's messages
- `prototype/data/unseen2.json`: Unseen set 2: 100 everyday messages with labels
- `prototype/data/unseen2_author_key.json`: Unseen set 2: the author's intended reading of each message
- `prototype/data/unseen2_key_status.json`: Unseen set 2: which labels are agreed, ambiguous or adjudicated

## prototype/data/inbox-example

- `prototype/data/inbox-example/001-larkmere-hearing-office.eml`: Packet message 1 as an exported email file
- `prototype/data/inbox-example/002-maya-venn.eml`: Packet message 2 as an exported email file
- `prototype/data/inbox-example/005-maya-venn.json`: Packet message 5 as an exported text-line webhook file
- `prototype/data/inbox-example/037-fenwick-vale-hearing-office.eml`: Packet message 37 as an exported email file
- `prototype/data/inbox-example/038-maya-venn.eml`: Packet message 38 as an exported email file
- `prototype/data/inbox-example/039-alices-law-firm-operations.eml`: Packet message 39 as an exported email file
- `prototype/data/inbox-example/040-fenwick-vale-hearing-office.eml`: Packet message 40 as an exported email file
- `prototype/data/inbox-example/041-maya-venn.json`: Packet message 41 as an exported text-line webhook file
- `prototype/data/inbox-example/042-owen-tarris.eml`: Packet message 42 as an exported email file
- `prototype/data/inbox-example/061-larkmere-hearing-office.eml`: Packet message 61 as an exported email file
- `prototype/data/inbox-example/062-leo-arlen.eml`: Packet message 62 as an exported email file
- `prototype/data/inbox-example/063-alices-law-firm-operations.eml`: Packet message 63 as an exported email file
- `prototype/data/inbox-example/064-larkmere-hearing-office.eml`: Packet message 64 as an exported email file
- `prototype/data/inbox-example/065-leo-arlen.eml`: Packet message 65 as an exported email file
- `prototype/data/inbox-example/066-larkmere-hearing-office.eml`: Packet message 66 as an exported email file
- `prototype/data/inbox-example/README.txt`: How the inbox example folder was made
- `prototype/data/inbox-example/hearings-rows.csv`: Hearings tab columns A and B with row numbers
- `prototype/data/inbox-example/sent.json`: The two firm texts that the example texts answer

## prototype/data/paste-example

- `prototype/data/paste-example/new-messages.json`: Six new messages for the paste command

## prototype/eval

- `prototype/eval/analyse_unseen2.mjs`: Splits of the auto-file analysis on the second unseen set
- `prototype/eval/autofile.js`: Auto-file analysis: numbers only, from the recorded runs
- `prototype/eval/autofile.json`: Stored output of eval/autofile.js on the 72 examples
- `prototype/eval/autofile_unseen2.json`: Stored output of eval/autofile.js on unseen set 2
- `prototype/eval/coverage.json`: Result of node cli/check.js: 216 checks with their outcome
- `prototype/eval/office_examples.json`: Examples and expected results for the office rule checks
- `prototype/eval/problems.js`: Every problem found in the example packet, as an executable check
- `prototype/eval/reader_notes.json`: Notes on reader errors by message
- `prototype/eval/reader_results.json`: Reader evaluation results on the 72 examples
- `prototype/eval/reader_runs.json`: Recorded reader runs: counts, intervals, cost
- `prototype/eval/reader_runs_unseen2.json`: Recorded reader runs on unseen set 2
- `prototype/eval/run.js`: Scores a reader against hand labels and prints a table plus JSON
- `prototype/eval/scale.json`: Stored result of the scale simulation (45,300 hearings, simulated)
- `prototype/eval/sheet_threads.py`: The week-one gate sheet against the 11 example threads
- `prototype/eval/summarize.js`: Turns the raw results of the reader evaluation runs into the small table the web app shows
- `prototype/eval/world.js`: A test world: the engine plus a clock, with small helpers to look at cases, take actions and send new messages

## prototype/playbooks

- `prototype/playbooks/_default.json`: Default settings every county inherits
- `prototype/playbooks/brindlefen.json`: County playbook: Brindlefen
- `prototype/playbooks/caldmere.json`: County playbook: Caldmere
- `prototype/playbooks/fenwick-vale.json`: County playbook: Fenwick Vale
- `prototype/playbooks/harthmere.json`: County playbook: Harthmere
- `prototype/playbooks/iverfen.json`: County playbook: Iverfen
- `prototype/playbooks/juniper-reach.json`: County playbook: Juniper Reach
- `prototype/playbooks/larkmere.json`: County playbook: Larkmere
- `prototype/playbooks/orimere.json`: County playbook: Orimere
- `prototype/playbooks/tesswick.json`: County playbook: Tesswick
- `prototype/playbooks/velloran.json`: County playbook: Velloran

## prototype/src

- `prototype/src/audit.js`: Audit: compares the firm's case records with what the messages show
- `prototype/src/derive.js`: Derive: turns ledger state and the clock into gates, readiness and issues
- `prototype/src/documents.js`: Firm-held files: staffing notices, packets and forms
- `prototype/src/drafts.js`: Clerk-liaison and consultant messages
- `prototype/src/economics.js`: The business case as arithmetic anyone can check (estimates)
- `prototype/src/engine.js`: The engine: INGEST -> RESOLVE -> EXTRACT -> VERIFY -> RECONCILE, then DERIVE and PLAN
- `prototype/src/hedge.js`: A sentence that guesses, asks, sets a condition, promises or denies confirms nothing
- `prototype/src/ledger.js`: The evidence ledger: per-case state that is built only from verified claims
- `prototype/src/model.js`: Core vocabulary of the control tower
- `prototype/src/office_rule.js`: An office's message, sorted by fixed code
- `prototype/src/plan.js`: Plan: from open gates to next actions
- `prototype/src/playbook.js`: County playbooks are data, in layers: default -> state -> county
- `prototype/src/replies.js`: Replies that code can check
- `prototype/src/resolve.js`: RESOLVE stage: map a raw message to entities (sender role, county, cases, consultants)
- `prototype/src/score.js`: Scoring for the test harness: compare a reader's claims with hand labels
- `prototype/src/sim.js`: Scale simulation of the control tower (simulated)
- `prototype/src/staffing.js`: Staffing agent: an exact search, not an AI call
- `prototype/src/stats.js`: Small statistics for the reader evaluation
- `prototype/src/telemetry.js`: Observability for the AI readers: a trace per model call, a summary per model, the reader pair's health and alerts
- `prototype/src/text.js`: Small text utilities shared by the extractors and the resolver
- `prototype/src/time.js`: Time helpers: office time zones and working days
- `prototype/src/verify.js`: Verify stage: checks each reading against the message before it can close a gate

## prototype/src/extract

- `prototype/src/extract/claude.js`: Extract stage, live AI reader on the Anthropic Messages API
- `prototype/src/extract/compat.js`: Extract stage, live AI reader on any OpenAI-compatible endpoint
- `prototype/src/extract/crosscheck.js`: Two-reader cross-check: "two keys to close, one key to open"
- `prototype/src/extract/openai.js`: Extract stage, live AI reader on the OpenAI Responses API, with the price table
- `prototype/src/extract/prompt.js`: Extract stage: the readers' instructions, input and output formats, and the code-side guard
- `prototype/src/extract/recorded.js`: Extract stage, recorded reads: replays the AI readers' saved output offline
- `prototype/src/extract/rules.js`: Extract stage, fixed-code baseline reader ("rules" mode)

## sheet

- `sheet/README.md`: How to open the gate sheet in LibreOffice, Excel and Google Sheets, and what was tested in each
- `sheet/gate-sheet.xlsx`: The gate sheet a coordinator runs: 18 tabs, the 24 example hearings, room for 1,200 (md5 2e74089c917b1bcc1ac36f5f7de3e7ce)
