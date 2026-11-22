/**
 * Simulated drafts: the texts and notices the sheet writes, shown with their recipient and channel
 * and labelled "Simulated, not sent". Nothing here sends anything. Every text is read from the
 * sheet (Dockets H and I, Notices on file, Hearings AX and AY); only the wrapper words are typed.
 *
 * Exports for other pages: DocketDrafts (one card per docket: the numbered offer and the
 * day-before text), FilesDrafts (files messages naming the current version), StaffingDraft (an
 * office's staffing notice in its own format) and NoticesOnFile (an office's notices, void ones
 * marked).
 */

import type { ReactNode } from 'react';
import type { TabRow } from '@/types/data';
import { benchRows, hearingByCase, hearings, officeCell, offices, sheetToday, tab, type Office } from '@/lib/data';
import { dateShort, sheetTime } from '@/lib/format';
import { LabelGlyph } from '@/components/ui/Label';

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const NAME = /([A-Z][a-z]+ [A-Z][a-z]+) \(/g;

/** The sheet's place-holder for a missing address, in plain words. */
const plain = (t: string): string => t.replace(/\s*\(ADDRESS NOT ON RECORD:[^)]*\)/g, ' (address not on record yet)').replace(/\s+/g, ' ').trim();

export interface Draft {
  to: string;
  channel: string;
  text: string;
}

/** One draft: who it goes to, how, the full text, and "Simulated, not sent". */
export function SimulatedDraft({ title, draft, testId, note }: { title: string; draft: Draft; testId: string; note?: ReactNode }) {
  return (
    <div data-testid={testId} style={{ display: 'grid', gap: 4, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
      <p className="l-small l-p" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="l-ink" style={{ fontWeight: 600 }}>{title}</span>
        <span className="l-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} data-testid={`${testId}-label`}>
          <LabelGlyph kind="simulated" className="text-simulated" />
          Simulated, not sent
        </span>
      </p>
      <p className="l-small l-ink2 l-p">
        To <span className="l-ink" style={{ fontWeight: 500 }}>{draft.to}</span>, by {draft.channel}
      </p>
      <p className="l-body l-p" style={{ borderLeft: '2px solid var(--border-strong)', paddingLeft: 12, maxWidth: 'var(--measure)' }}>
        {draft.text}
      </p>
      {note ? <p className="l-small l-muted l-p">{note}</p> : null}
    </div>
  );
}

/* ---------- dockets ---------- */

function benchOf(name: string): TabRow | undefined {
  return benchRows().find((r) => str(r.cells.A) === name);
}

/** True when the consultant's Bench row allows this county (column "Counties allowed"). */
function worksIn(name: string, county: string): boolean {
  const r = benchOf(name);
  if (!r) return false;
  const h = tab('Bench').headers;
  const col = Object.entries(h).find(([, t]) => t.startsWith('Counties allowed'))?.[0];
  const list = col ? str(r.cells[col]).split(',').map((s) => s.trim()) : [];
  return list.includes(county) || offices().every((o) => list.includes(o.county));
}

const channelOf = (name: string, raw: string): string => (new RegExp(`${name} \\(EMAIL ONLY\\)`).test(raw) ? 'email' : str(benchOf(name)?.cells.C) || 'email');

export interface DocketDraft {
  key: string;
  date: string;
  county: string;
  format: string;
  hearings: number;
  /** The numbered offer for the docket's open hearings, or null when every hearing has a yes. */
  offer: Draft | null;
  /** The first names in Ask next, in order, that work in this county. */
  askNext: string[];
  dayBefore: Draft[];
  /** Why no day-before text goes yet, in plain words. */
  dayBeforeWait: string | null;
}

/** The dockets from the sheet's day on, each with its offer and day-before texts (Dockets tab). */
export function docketDrafts(): DocketDraft[] {
  const today = sheetToday();
  return tab('Dockets')
    .rows.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(str(r.cells.A)) && str(r.cells.A) >= today)
    .map((r) => {
      const c = (k: string): string => str(r.cells[k]);
      const county = c('B');
      const raw = `${c('G')} ${c('O')}`;
      const names = [...raw.matchAll(NAME)].map((m) => m[1]!);
      const askNext = [...new Set(names)].filter((n) => worksIn(n, county));
      const offerText = c('H');
      const to = askNext[0];
      const offer = offerText && !/^No offer/.test(offerText) && to ? { to, channel: channelOf(to, raw), text: offerText } : null;
      const i = c('I');
      let dayBefore: Draft[] = [];
      let dayBeforeWait: string | null = null;
      if (/^DO NOT SEND YET/.test(i)) {
        const n = /(\d+) hearings? ha(?:s|ve) no video link/.exec(i)?.[1];
        dayBeforeWait = `Not sent yet: ${n ? `${n} ${n === '1' ? 'hearing has' : 'hearings have'}` : 'a hearing has'} no video link yet. Ask the office today.`;
      } else if (/^No text yet/.test(i)) {
        dayBeforeWait = "No text yet: no hearing on this docket has a consultant's yes.";
      } else if (i) {
        const parts = i.split(/(?=To [A-Z][a-z]+ [A-Z][a-z]+: )/).map((p) => p.trim()).filter(Boolean);
        dayBefore = parts.map((p) => {
          const m = /^To ([A-Z][a-z]+ [A-Z][a-z]+): (.*)$/s.exec(p);
          const who = m ? m[1]! : c('E');
          return { to: who, channel: channelOf(who, raw), text: plain(m ? m[2]! : p) };
        });
      }
      return { key: `${c('A')}-${county}`, date: c('A'), county, format: c('C'), hearings: Number(c('D')) || 0, offer, askNext, dayBefore, dayBeforeWait };
    });
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** One card per docket (one office, one day): the numbered offer text and the day-before text. */
export function DocketDrafts({ only }: { only?: 'offers' } = {}) {
  const list = docketDrafts().filter((d) => (only === 'offers' ? !!d.offer : true));
  return (
    <div data-testid="docket-drafts" style={{ display: 'grid', gap: 16 }}>
      {list.map((d) => (
        <section key={d.key} data-testid={`docket-${d.date}-${slug(d.county)}`} aria-label={`Docket: ${d.county} office, ${dateShort(d.date)}`}>
          <h4 className="l-body l-p" style={{ fontWeight: 600 }}>
            {d.county} office, {dateShort(d.date)}, {d.format}
            <span className="l-small l-muted" style={{ fontWeight: 400 }}>
              {' '}
              · {d.hearings === 1 ? '1 hearing' : `${d.hearings} hearings`}
            </span>
          </h4>
          {d.offer ? (
            <SimulatedDraft
              title="Offer, one numbered text for the whole docket"
              draft={d.offer}
              testId={`docket-offer-${d.date}-${slug(d.county)}`}
              note={d.askNext.length > 1 ? `If ${d.offer.to.split(' ')[0]} says no: ${d.askNext.slice(1, 3).join(', then ')}. Only consultants who work in ${d.county} are asked.` : `Only consultants who work in ${d.county} are asked.`}
            />
          ) : (
            <p className="l-small l-muted l-p">No offer needed: every hearing on this docket has a consultant&rsquo;s yes.</p>
          )}
          {d.dayBefore.map((x, n) => (
            <SimulatedDraft key={n} title="Day-before text" draft={x} testId={`docket-daybefore-${d.date}-${slug(d.county)}-${n + 1}`} />
          ))}
          {d.dayBeforeWait ? <p className="l-small l-muted l-p">{d.dayBeforeWait}</p> : null}
        </section>
      ))}
    </div>
  );
}

/* ---------- case files ---------- */

const num = (v: unknown): number | null => (typeof v === 'number' ? v : /^\d+$/.test(str(v)) ? Number(v) : null);

/** Files messages for coming hearings whose consultant does not hold the current version. */
export function filesDrafts(name?: string): { caseId: string; draft: Draft; why: string }[] {
  const today = sheetToday();
  return hearings
    .filter((h) => str(h.consultant) && (h.date ?? '') >= today && (!name || str(h.consultant) === name))
    .flatMap((h) => {
      const cur = num(h.filesCurrent);
      const theirs = num(h.filesConsultant);
      if (cur == null || (theirs != null && theirs >= cur)) return [];
      const who = str(h.consultant);
      const why = theirs == null ? 'No receipt from the consultant yet.' : `${who.split(' ')[0]} has version ${theirs}; the current version is ${cur}.`;
      const text = `The case files for ${h.property} (${h.case}, ${dateShort(h.date)}, ${sheetTime(h.time)}) are version ${cur}. ${theirs != null ? `Please stop using version ${theirs}. ` : ''}Use version ${cur} only, and reply GOT IT ${cur} when you have it.`;
      return [{ caseId: h.case, draft: { to: who, channel: channelOf(who, ''), text }, why }];
    });
}

export function FilesDrafts({ name }: { name?: string }) {
  const list = filesDrafts(name);
  if (!list.length) return <p className="l-small l-muted l-p">Every named consultant holds the current case files.</p>;
  return (
    <div data-testid="files-drafts">
      {list.map((x) => (
        <SimulatedDraft key={x.caseId} title={`Files message, ${x.caseId}`} draft={x.draft} testId={`files-draft-${x.caseId}`} note={x.why} />
      ))}
    </div>
  );
}

/* ---------- notices on file ---------- */

export interface NoticeRow {
  file: string;
  caseId: string;
  property: string;
  names: string;
  status: string;
  /** "void", "send" or "ok", from the sheet's check (Notices on file I). */
  kind: 'void' | 'send' | 'ok';
  words: string;
}

export function noticesOf(o: Office): NoticeRow[] {
  return tab('Notices on file')
    .rows.filter((r) => str(r.cells.B).startsWith('AX-') && (str(r.cells.J) === o.county || hearingByCase(str(r.cells.B))?.county === o.county))
    .map((r) => {
      const check = str(r.cells.I);
      const names = str(r.cells.D);
      const kind: NoticeRow['kind'] = /^VOID/.test(check) ? 'void' : /^SEND IT/.test(check) ? 'send' : 'ok';
      const lacks = /THE NOTICE LACKS: ([^.]+)/.exec(check)?.[1];
      const words =
        kind === 'void'
          ? `Void, not proof: names ${names}, who has no yes that counts for this hearing.`
          : kind === 'send'
            ? `Ready to send: names ${names}, who said yes. Not sent yet.`
            : `Names ${names}, who said yes.${lacks ? ` It lacks: ${lacks.toLowerCase()}.` : ''}`;
      return { file: str(r.cells.A), caseId: str(r.cells.B), property: str(r.cells.C), names, status: str(r.cells.E), kind, words };
    });
}

export function NoticesOnFile({ office }: { office: Office }) {
  const list = noticesOf(office);
  if (!list.length) return <p className="l-small l-muted l-p">No staffing notice on file for this office.</p>;
  return (
    <ul className="l-checks" data-testid={`notices-${office.slug}`}>
      {list.map((n) => (
        <li key={n.file} className="l-check" data-testid={`notice-${n.caseId}`}>
          <span className="l-check-name">
            <span className="l-clip">
              <a className="l-link" href={`#/hearings/${n.caseId}`}>
                {n.property.replace(/, [^,]+$/, '')}
              </a>{' '}
              <span className="l-num l-muted">{n.caseId}</span>
            </span>
            <span className="l-small l-ink2">{n.words}</span>
          </span>
          <span className="l-small l-muted">{n.kind === 'void' ? 'Void' : n.status.replace(/ \(simulated\)$/, ', simulated').replace(/^./, (ch) => ch.toUpperCase())}</span>
        </li>
      ))}
    </ul>
  );
}

/** The office's staffing notice for a notice ready to send, in the fields the office asks for. */
export function staffingDrafts(o: Office): { caseId: string; draft: Draft }[] {
  const fieldsCol = Object.entries(tab('Offices').headers).find(([, t]) => t.startsWith("Fields this office's notice"))?.[0];
  const fields = fieldsCol ? str(o.cells[fieldsCol]).split(';').map((s) => s.trim()).filter(Boolean) : [];
  const contact = str(officeCell(o, 'Office contact').value);
  return noticesOf(o)
    .filter((n) => n.kind === 'send')
    .map((n) => {
      const h = hearingByCase(n.caseId);
      const value: Record<string, string> = {
        property: n.property,
        case: n.caseId,
        county: o.county,
        representative: n.names,
        'hearing date': h?.date ? dateShort(h.date) : '',
        'hearing times': h ? sheetTime(h.time) : '',
        'contact email': 'the firm’s operations email',
      };
      const lines = fields.map((f) => `${f.charAt(0).toUpperCase()}${f.slice(1)}: ${value[f] ?? ''}`);
      return { caseId: n.caseId, draft: { to: `${o.county} office${contact ? `, ${contact}` : ''}`, channel: 'email, as a staffing notice', text: `Staffing notice. ${lines.join('. ')}.` } };
    });
}

export function StaffingDrafts({ office }: { office: Office }) {
  const list = staffingDrafts(office);
  if (!list.length) return null;
  return (
    <div data-testid={`staffing-drafts-${office.slug}`}>
      {list.map((x) => (
        <SimulatedDraft key={x.caseId} title={`Staffing notice, ${x.caseId}`} draft={x.draft} testId={`staffing-draft-${x.caseId}`} note="A person sends it by the office's route, then links the office's acknowledgment as proof." />
      ))}
    </div>
  );
}
