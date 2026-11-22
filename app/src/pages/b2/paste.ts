export * from '@/lib/paste';
import type { PasteGroup } from '@/lib/paste';

/**
 * The paste groups in plain words for the Paste page and the Integrations examples. The command's
 * own group names ("Other cells by fixed code", "Office changes with HOLD") stay in lib/paste.ts
 * for the Sheet reference; a lawyer reads these.
 */
export const PASTE_WORDS: Record<PasteGroup, { title: string; detail: string }> = {
  proof: { title: 'Proofs to accept or refuse', detail: 'A message proves a check. Accept it, and the proof joins the hearing.' },
  open: { title: 'Checks that stay open', detail: 'The message does not prove the check yet. Nothing to type.' },
  repeat: { title: 'Repeats', detail: 'The same news as an earlier message. Nothing to type.' },
  replace: { title: 'A newer message replaces an older one', detail: 'Accept it to point the check at the newer message.' },
  office: { title: 'Office changes on hold', detail: 'No notice goes to that office until a person approves the change on Offices.' },
  newCells: { title: 'Other facts to record', detail: 'Dates, names and versions found by fixed rules, no AI. Accept or refuse each.' },
  questions: { title: "Consultants' questions", detail: 'Answer the consultant the same day.' },
  person: { title: 'For a person to read', detail: 'The two readers disagreed or could not place a passage.' },
  notRead: { title: 'Not read', detail: 'No reader answer for this message. A person reads it.' },
};
