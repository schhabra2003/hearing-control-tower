# The agents API of Hearing Desk

Hearing Desk exposes `window.hearingDesk`, a read-only view of its data for software that browses
the app. It reads the same data as the pages. It has no method that writes: a person accepts,
refuses or approves on the pages, and a person types every change on the gate sheet. All data is
fictional.

Every call returns a fresh JSON copy, so changing an answer changes nothing in the app.

| Call | What it returns |
|---|---|
| `version` | The API version, `1.0.0` |
| `help()` | One plain-text page: what the app holds and how to use this API |
| `about()` | The sheet's day, the sheet's md5, when the data was exported, the simulated clock and counts |
| `routes()` | Every page: its hash route, title, section, the query parameters it reads and an example |
| `rules()` | The rules the API applies, in words: at risk, the five checks, owners, labels, no writes |
| `hearings(filter?)` | One summary per hearing. The filter matches the Hearings page filters |
| `hearing(caseId)` | One hearing in full, with each check, the cell that proves it and the message behind it, or `null` |
| `statusCounts()` | How many hearings are in each status, with the sheet cell it comes from |
| `offices()` | The ten fictional offices and their saved processes |
| `pendingChanges()` | Office process changes that wait for a person's approval |
| `proposals(filter?)`, `proposalCounts()` | The readers' proposals and how many wait for a person |
| `measures(filter?)` | Every figure on the Measures page with its label: measured, simulated, estimate or packet |
| `calendar()` | The hearing calendar file: its name, the number of events and where to download it |
| `ai()` | What the AI readers do and do not do |
| `tasks()` | The steps of the 9:00 a.m. pass and the 2:00 p.m. review |
| `state()` | The current view, the same JSON as the page's `<script id="desk-state">` |
| `session()` | What a person decided in this browser. None of it is on the sheet |

Try it in the browser console after opening `app/dist/index.html`:

```js
hearingDesk.help()
hearingDesk.hearings('top')
hearingDesk.hearing('AX-107')
```

The source is `app/src/lib/agentApi.ts`, and the types are in `app/src/types/hearingDesk.ts`.
