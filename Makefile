# One-command runs. Every firm, office, person and message in this repository is fictional.
# Run `make help` for the list. No target sends a message, calls a model or needs a key.

NODE    ?= node
PYTHON  ?= python3
OPENER  := $(shell command -v xdg-open 2>/dev/null || command -v open 2>/dev/null || echo echo)

.PHONY: help check check-all sheet-check app app-data app-check open tower clean

help:
	@echo "make check        prototype checks: check.js, replies.js, check_office.js (Node 22, no install)"
	@echo "make check-all    the above plus inbox.js and sheet.js summaries"
	@echo "make sheet-check  the gate sheet against the 11 example threads (Python 3 with openpyxl, Node 22)"
	@echo "make app          install and build the web app into app/dist/index.html (needs network for npm ci)"
	@echo "make app-data     regenerate app/src/data/*.json from the sheet and the engine"
	@echo "make app-check    typecheck, smoke test and engine check of the web app (Playwright Chromium)"
	@echo "make clean        remove app/node_modules and scratch builds"
	@echo "make open         open app/dist/index.html in the default browser"
	@echo "make tower        open prototype/control-tower.html in the default browser"

check:
	cd prototype && $(NODE) cli/check.js
	cd prototype && $(NODE) cli/replies.js
	cd prototype && $(NODE) cli/check_office.js

check-all: check
	cd prototype && $(NODE) cli/inbox.js
	cd prototype && $(NODE) cli/sheet.js

sheet-check:
	$(PYTHON) prototype/eval/sheet_threads.py sheet/gate-sheet.xlsx

app:
	cd app && npm ci --no-audit --no-fund
	cd app && npm run build

app-data:
	cd app && npm run data

app-check:
	cd app && npm run typecheck
	cd app && npm run smoke
	cd app && npm run engine-check

open:
	$(OPENER) app/dist/index.html

tower:
	$(OPENER) prototype/control-tower.html

clean:
	rm -rf app/node_modules app/dist-*
