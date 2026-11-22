# Design system of Hearing Desk

The web app's look is set by tokens in `app/src/styles/tokens.css` and the type scale in
`app/src/styles/base.css`. Pages use the tokens through Tailwind class names and never type a
colour.

## Tokens

| Group | Tokens |
|---|---|
| Surfaces and text | `--bg`, `--surface`, `--surface-2`, `--sunken`, `--ink`, `--ink-2`, `--muted`, `--border`, `--border-strong` |
| Action | `--primary`, `--primary-hover`, `--on-primary`, `--accent`, `--accent-soft`, `--on-accent` |
| State | `--ok`, `--warn`, `--danger`, each with a `-bg`, and `--dot-ok`, `--dot-warn`, `--dot-danger` |
| Number labels | `--measured`, `--simulated`, `--estimate`, `--packet`, each with a `-bg` |
| Later-stage pages | `--later`, `--later-bg` |
| Depth | `--shadow-e1` to `--shadow-e3`, `--shadow-control`, `--shadow-primary`, `--scrim` |
| Shape | `--radius-card`, `--radius-chip`, `--radius-control`, `--radius-feature`, `--radius-nav`, `--radius-quote` |
| Layout | `--sidebar-width`, `--sidebar-collapsed`, `--topbar-height`, `--drawer-width`, `--reading-max` |
| Motion | `--dur-color`, `--dur-pop`, `--dur-press`, `--dur-spot`, `--dur-step`, `--ease-out` |
| Type | `--font-sans` (Inter), `--font-mono` (IBM Plex Mono) |

Dark mode follows the system setting and can be set by hand; both are defined in `tokens.css`
(`[data-theme='dark']` and `prefers-color-scheme`).

## Rules the pages follow

- **Every number has a label chip:** measured, simulated, estimate or packet, each with its own
  colour, and a source (the sheet tab and cell, or the command).
- **Later-stage pages are marked.** The control tower pages carry a "Not built" tag.
- **Plain words.** Full sentences, US dates, office times as the sheet writes them.
- **Accessible.** The smoke test fails on any serious or critical axe finding.

## Shared components

They live in `app/src/components/ui/`: `Button`, `IconButton`, `ActionButton`, `Badge` (with
`StatusChip`), `Label`, `LiveChip`, `SourceTag`, `SourceTip`, `Tooltip`, `Card`, `Section`,
`PageHeader`, `DetailSheet`, `Drawer`, `FilterChips`, `SegmentedControl`, `Progress`,
`ProposalRow`, `NotBuiltTag`, `ConfirmDecisionDialog`, `Field`, `FileDropZone`, `CopyLink`,
`CopyValue`, `ExportJsonButton`, `Fact`, `Kbd`, `Skeleton`, `EmptyState` and `Toast`. The page frame (five regions:
header, summary, toolbar, list and detail) is in `app/src/layout/`.
