# Integrations: what each tool would carry, and what is connected

Nothing is connected in this prototype. No mailbox, text line, calendar, file store, case system or
county system is read or written, and no message is sent. The firm and every message are
fictional. The products named below are examples of what a small firm may already use, not
products this repository connects to.

Each tool has one of three states. **Simulated** means the prototype runs the same step on
fictional files. **Proposed** means it is designed and not built. **Not connected** means there is
no code for it.

| Tool | Examples | State | What the prototype does today |
|---|---|---|---|
| Shared mailbox | Gmail, Microsoft 365 | Exported files: Simulated. Live mailbox: Not connected | Reads a folder of saved `.eml` and text-line files, and the Paste page reads one file of new messages |
| File storage | Google Drive, OneDrive, Dropbox | Not connected. Sharing per hearing: Proposed | File links are placeholders. The packet's 40 documents are names with versions, not files (packet) |
| Calendars | Google, Outlook, Apple | Hearing calendar file: Simulated. Per-consultant feeds: Proposed | Writes and checks an `.ics` file. The sheet's file was imported into Apple Calendar with no error (measured, [outside-tests/calendar-test.md](outside-tests/calendar-test.md)). Google Calendar and Outlook were not tried |
| Phone and text line | Twilio, RingCentral | Text exports and reply rule: Simulated. Live line and calls: Not connected | The reply rule runs on 39 fictional replies: 17 filed by rule, 22 handed to a person (measured; the author of the rule wrote the replies) |
| E-signature | DocuSign, Dropbox Sign | Not connected | Season one uses a free fill-and-sign PDF or a scanned signed page |
| Case system | The firm's own case records | Record check: Simulated. Live export: Not connected | The Record check tab compares the packet's 24 case records with the sheet (measured on the example) |
| Document collection and homeowner notices | The firm's own intake and notice tools | Not connected | The sheet records what each notice said |
| County office channels | Email, form, phone, paper, portal | Office rule and submission simulator: Simulated. Portals: Proposed | 90 simulated submissions to the ten offices, sorted 90 of 90 as prepared (simulated; handling, not accuracy). On 30 unseen office messages the office rule sorted 13 right and handed 24 to a person (measured, small sample) |
| AI model provider | OpenAI in season one | Offline file: recorded answers. Live server with a key held on the server: hosted demo at https://hearing-desk.onrender.com/, or run locally | The offline file replays answers recorded from paid runs and needs no key. `npm run live -- --key-file <file>` in `app/` runs the two readers on pasted messages, with the key kept in the server process; the hosted demo runs the same server from `render.yaml` ([../app/README.md](../app/README.md)). Measured live on 22 Nov 2026: 117 of 117 and 119 of 119 agreed and verified readings right on the 72 examples, 73 of 81 on unseen set 2, 550 requests, 0 failed, $1.16 ([evaluation/live-readers-22nov.md](evaluation/live-readers-22nov.md)) |

## The permission each would ask, and what a person approves

| Tool | Would ask for | Would never | A person approves |
|---|---|---|---|
| Shared mailbox | Read-only access to the one shared hearing mailbox, or no access at all: a mail rule that saves each message as an `.eml` file | Send, delete or mark mail as read | Every proposed link, every hold on an office and every send |
| File storage | Read-only access to the one documents folder; later, share links on that folder only | Share, unshare, move or delete a file in season one | A new file version, the files message and removing a departed consultant's access |
| Calendars | Nothing, to publish a file; for a feed, write access to one firm-owned calendar | Read or write a consultant's own calendar | Each refill of the hearing calendar |
| Phone and text line | Read incoming texts on the one hearing number, by webhook or export | Send anything but texts the firm approves; place or answer a call | Every reply the rule hands over, every illness report and backup, every call |
| E-signature | Later: envelopes from one template folder, and their status | Open any other document; send a request or sign | Each signing request, and whether a signed copy is readable |
| Case system | A read-only export | Write to the case system | Every correction |
| Document collection | Read-only access to intake records | Write to a homeowner | Every homeowner notice |
| County office channels | Read the office's messages in the shared mailbox; for a portal, a read-only login | Approve a process change; send a notice or write to a government system | Every process change, with the approver's name and date, every notice and every call |
| AI model provider | An API key held by the firm in its own environment | Show, store or ask for a key in the app; file a cell on the sheet | Every proposal |

The web app's Integrations page shows the same list with a simulated event for each tool.
