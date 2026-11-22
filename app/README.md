# Hearing Desk, the web app

Hearing Desk shows the season-one plan as a coordinator would use it. It is one offline file,
`dist/index.html`, that opens with a double-click: no server, no install and no network. Every firm,
office, person and message in it is fictional. It sends nothing, reads no mailbox, calls no model
and holds no key.

Every number on a page is read from the gate sheet or the engine, not typed into the page, and
carries a label: measured, simulated, estimate or packet. The Evidence page lists the command
behind each checked number.

## Four things to do in it

Each change is kept in this browser only. Nothing is sent and the sheet is not changed.

**Add a county** (`#/later/counties`, simulated: the later tool, not built)
1. Under "Add a county", paste or keep the office's description of its process.
2. Press "Read the description". The tool proposes the county's own settings.
3. Check each proposed setting against the description.
4. Press "Approve the file and add the county". A person approves every county.

**Change a shared rule** (`#/later/counties`, simulated)
1. Under "Packet due, shared setting", pick a new value, for example 72 hours before.
2. Read the note: it says how many upcoming hearings the one edit moved.
3. A county with its own value keeps it.

**Approve an office change** (`#/offices/tesswick`, the season-one flow)
1. Compare "How we name our consultant now" with "What Tesswick now asks".
2. Press "Approve new process" or "Keep old process", type your name and confirm.
3. The coordinator then records the decision on the sheet. Undo is offered until then.

**Run the scale simulation** (`#/later/scale`, simulated)
1. Under "Run it yourself", pick a size and press run.
2. Read person-minutes per hearing and safety rules broken in "Your runs". The same seed gives
   the same rows. The minutes per kind of work are estimates.

## Live AI mode (optional, your own key)

```
npm ci
npm run build
npm run live -- --key-file /path/to/key.txt --port 4180
```

This serves the app on http://localhost:4180 and reads pasted messages ("Paste new messages", and
"Try it" on Integrations) with the two AI readers of the prototype (gpt-6.1-sol reads, gpt-6-luna
checks), with the same code as `node cli/sheet.js --paste`. The key file holds the key alone or a
line `OPENAI_API_KEY=...`; the environment variable `OPENAI_API_KEY` also works. The key stays in
the server process: it is not sent to the page, logged or written to disk. After $5 of spend in one
run (`--cap <usd>` changes it), the server falls back to recorded answers. Behind a proxy, set
`NODE_USE_ENV_PROXY=1` and `NODE_EXTRA_CA_CERTS`. Only fictional example messages belong here.

Without a key, `npm run live:recorded` replays the recorded answers and says so, and
`npm run live:check` tests that path (status, origin check, and rows equal to the command's).

Measured on 22 Nov 2026 with the same readers on every labelled set: 117 of 117 and 119 of 119
agreed and verified readings right on the 72 examples (two runs), 73 of 81 (90.1%) on unseen set 2,
550 requests, 0 failed, $1.16 for 275 fictional messages
([../docs/evaluation/live-readers-22nov.md](../docs/evaluation/live-readers-22nov.md)).

## Build and test

Run these from the repository root. They need Node 22 and, for the install, network access.

| Command | What it does |
|---|---|
| `make app` | `npm ci`, then builds `app/dist/index.html` |
| `make app-data` | Writes `src/data/sheet.json` and `src/data/engine.json` from `../sheet/gate-sheet.xlsx` and `../prototype/` (needs Python 3 with openpyxl). `src/data/evidence.json` is committed as built. The shipped sheet is md5 `2e74089c917b1bcc1ac36f5f7de3e7ce` |
| `make app-check` | `npm run typecheck`, `npm run smoke` and `npm run engine-check` |
| `npm run lint` (in `app/`) | ESLint on `src/` |
| `make open` | Opens the built file |

The smoke test and the engine check use Playwright. After `make app`, run
`cd app && npx playwright install chromium` once if no Chromium is installed for it. The last
measured results are in [../CHECKS.md](../CHECKS.md).

## How it is built

- React and TypeScript, built by Vite into a single HTML file with the fonts inlined.
- The app imports the engine from `../prototype/` through the `@engine` alias in `vite.config.ts`.
  There is one copy of the engine in the repository.
- `src/data/*.json` is generated and committed, so the app builds without Python.
- Colours, type and sizes are tokens in `src/styles/tokens.css`, for light and dark
  ([../docs/design-system/README.md](../docs/design-system/README.md)).
- Decisions a person makes on the pages (accept, refuse, approve) are kept in this browser only.
  None of them reaches the sheet.
- `window.hearingDesk` is a read-only view of the same data for agents
  ([../docs/agents-api.md](../docs/agents-api.md)).

## Layout

| Path | What is there |
|---|---|
| `src/lib/` | The data layer, the session store, the router, the agents API and helpers |
| `src/components/` | Shared components and the shell (sidebar, top bar, simulated clock) |
| `src/pages/` | The pages |
| `src/tour/` | The guided tour |
| `server/` | The live server (`live.mjs`) and its keyless check (`live-check.mjs`) |
| `scripts/` | Data export, smoke test, engine check, layout audit and screenshots |
| `engine-check/` | A small build that proves the engine runs in a browser |
