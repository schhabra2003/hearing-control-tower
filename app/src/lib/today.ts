/**
 * What the two daily passes count, read from the sheet export and the session. The steps are the kit's 9:00 a.m. and 2:00 p.m. rows of the daily schedule.
 */

import type { Hearing } from '@/types/data';
import { hearings, listOrder, listPhrases, officeCell, officeOfHearing } from '@/lib/data';
import { clockText } from '@/lib/format';
import { changeCounts } from '@/lib/officeChanges';
import { proofCounts, proposalCounts } from '@/lib/decisions';
import type { Pass, Session } from '@/lib/store';

const text = (v: unknown): string => (v == null ? '' : String(v).trim());

/** A BE line orders a call to the office: "TO CALL THE ... OFFICE" or "CALL THE ... OFFICE IN ITS HOURS". */
export const ordersOfficeCall = (h: Hearing): boolean => h.printedLines.some((l) => /\bCALL THE\b[^.]*\bOFFICE\b/.test(l.text));

/** A BE line orders a call to the homeowner: "A PERSON CALLS THE HOMEOWNER", "THE HOMEOWNER TO CALL", "CALL THE HOMEOWNER". */
export const ordersHomeownerCall = (h: Hearing): boolean => h.printedLines.some((l) => /\bCALLS? THE HOMEOWNER\b|\bHOMEOWNER TO CALL\b/.test(l.text));

export const ordersCall = (h: Hearing): boolean => ordersOfficeCall(h) || ordersHomeownerCall(h);

/** A consultant's question waits: the sheet holds words in BN (to tell the consultant) and no link in BO. */
export const questionWaits = (h: Hearing): boolean => text(h.tellConsultant) !== '' && text(h.toldConsultant) === '';

export const flagged = (): Hearing[] => listOrder().filter((h) => text(h.dailyList) !== '');

/** The sheet already holds a next action, an owner and a due time (Y, Z and AA), or this session gave one. */
export const hasNextStep = (h: Hearing, s: Pick<Session, 'nextSteps'>): boolean =>
  (text(h.nextAction) !== '' && text(h.owner) !== '' && text(h.due) !== '') || !!s.nextSteps[h.case];

export const SAME_DAY_WORDS = ['ARRIVAL NOT SETTLED', 'FALLBACK DUE', 'OPENING NOT ARRANGED', 'CALL THE HOMEOWNER'] as const;

export const sameDay = (h: Hearing): boolean => listPhrases(h.dailyList).some((p) => (SAME_DAY_WORDS as readonly string[]).includes(p));

/** The consultants' questions that wait: one per question (the BN words up to the colon), with the hearings it covers. */
export function questionGroups(): { question: string; hearings: Hearing[] }[] {
  const m = new Map<string, Hearing[]>();
  for (const h of listOrder().filter(questionWaits)) {
    const key = text(h.tellConsultant).split(':')[0]!.trim();
    m.set(key, [...(m.get(key) ?? []), h]);
  }
  return [...m.entries()].map(([question, hs]) => ({ question, hearings: hs }));
}

/** "9:00 a.m." from the sheet's "09:00". */
const hhmm = (v: unknown): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(text(v));
  return m ? clockText(Number(m[1]) * 60 + Number(m[2])) : text(v);
};

/**
 * One call line per row of the Calls due list: whom to call, the number or "Number not on record:
 * ask by email", and the hours in office time. Read from the hearing and its office row.
 */
export function callLine(h: Hearing): { who: string; number: string; hours: string | null } {
  const o = officeOfHearing(h);
  if (ordersOfficeCall(h) && o) {
    const phone = text(officeCell(o, 'Daytime telephone').value);
    const opens = officeCell(o, 'Office opens').value;
    const closes = officeCell(o, 'Office closes').value;
    return {
      who: `Call the ${o.county} office`,
      number: phone && !/^ASK\b/.test(phone) ? phone : 'Number not on record: ask by email',
      hours: opens && closes ? `${hhmm(opens)} to ${hhmm(closes)}, ${o.county} office time` : null,
    };
  }
  const contact = text(h.homeownerContact);
  const name = text(h.homeowner);
  return {
    who: `Call the homeowner${name ? `, ${name}` : ''}`,
    number: /\d{3}/.test(contact) ? contact : 'Number not on record: ask by email',
    hours: null,
  };
}

/** The answer to send a consultant (Hearings BN), and whether a person marked it sent. */
export const answerSent = (h: Hearing, s: Pick<Session, 'sent'>): boolean => !!s.sent?.includes(h.case);

export function morningCounts(s: Pick<Session, 'proposals' | 'changes' | 'pasted' | 'called' | 'sent'>) {
  const changes = changeCounts(s);
  const calls = listOrder().filter(ordersCall);
  return {
    proofs: proofCounts(s.proposals),
    proposals: proposalCounts(s.proposals, s.pasted),
    changesWaiting: changes.waiting.length,
    changesHeld: changes.held.length,
    changes: changes.all,
    changesOpen: changes.waiting,
    calls,
    callsLeft: calls.filter((h) => !s.called?.includes(h.case)).length,
    questionCount: questionGroups().length,
    answersLeft: questionGroups().filter((g) => g.hearings.some((h) => !answerSent(h, s))).length,
    officeCalls: hearings.filter(ordersOfficeCall),
    homeownerCalls: hearings.filter(ordersHomeownerCall),
    questions: listOrder().filter(questionWaits),
  };
}

export function afternoonCounts(s: Pick<Session, 'nextSteps' | 'called'>) {
  const rows = flagged();
  const withStep = rows.filter((h) => hasNextStep(h, s));
  const words = Object.fromEntries(SAME_DAY_WORDS.map((w) => [w, rows.filter((h) => listPhrases(h.dailyList).includes(w)).length])) as Record<(typeof SAME_DAY_WORDS)[number], number>;
  const same = rows.filter(sameDay);
  const sameLeft = same.filter((h) => !s.called?.includes(h.case)).length;
  return { rows, withStep, words, same, sameLeft };
}

/**
 * The steps of a pass that are done: marked by a person, or done because their work is done. The
 * Today page and the sidebar read this one function, so they never disagree.
 */
export function passDone(s: Session, pass: Pass): number[] {
  const auto: number[] = [];
  if (pass === '0900') {
    const m = morningCounts(s);
    if (m.proposals.waiting === 0) auto.push(1);
    if (m.changesWaiting === 0) auto.push(2);
    if (m.calls.length > 0 && m.callsLeft === 0) auto.push(3);
    if (m.questions.length > 0 && m.answersLeft === 0) auto.push(4);
  } else {
    const a = afternoonCounts(s);
    if (a.withStep.length === a.rows.length) auto.push(2);
    if (a.same.length > 0 && a.sameLeft === 0) auto.push(3);
    if (s.icsDownloaded) auto.push(4);
  }
  return [...new Set([...s.passSteps[pass], ...auto])].sort((x, y) => x - y);
}
