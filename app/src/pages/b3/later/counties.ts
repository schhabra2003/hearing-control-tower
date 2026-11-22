/**
 * Adding a county as data (from engine/app/views/counties.js): the offline stand-in for the
 * onboarding agent that reads an office's own description, and the county file, hearing and
 * first notice the engine loads. A person approves before anything is added.
 */

import { STAFFING_METHODS } from '@engine/src/playbook.js';
import { longDate } from '@engine/src/drafts.js';
import { localParts } from '@engine/src/time.js';
import { fmtTime, type Tower } from './tower';

export interface CountyForm {
  name: string;
  state: string;
  mode: 'video' | 'in_person';
  method: string;
  lead: number;
  proof: 'receipt' | 'sent_on_time';
  sign: boolean;
  start: string;
  end: string;
  property: string;
  homeowner: string;
  date: string;
  time: string;
  text: string;
}

export const COUNTY_START: CountyForm = {
  name: 'Kestrel Bay', state: 'Asterland', mode: 'video', method: 'email_case_ids', lead: 96, proof: 'receipt', sign: false, start: '10:00', end: '15:00',
  property: '5 Harbor Row', homeowner: 'Quinn Marsh', date: '2030-06-24', time: '10:00',
  text: 'Hearings are held by video. Email the case IDs and the name of the representative to the clerk. Case packets are due 96 hours before the hearing. The office is open 10 a.m. to 3 p.m.',
};

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Keyword rules over the office's own words. With an API key an AI agent drafts this; a person approves either way. */
export function parseRules(text: string): Partial<CountyForm> {
  const t = text.toLowerCase();
  const out: Partial<CountyForm> = {};
  if (/form/.test(t) && /(call|phone)/.test(t)) out.method = 'form_then_call';
  else if (/case (id|number)s?/.test(t)) out.method = 'email_case_ids';
  else if (/staffing notice|notice naming/.test(t)) out.method = 'staffing_notice';
  const h = t.match(/(\d{2,3})\s*hours?/);
  if (h) out.lead = Number(h[1]);
  if (/video|remote|online/.test(t)) out.mode = 'video';
  else if (/in person|in-person/.test(t)) out.mode = 'in_person';
  if (/(no|not|never|n't)\b[^.]*(receipt|acknowledg)/.test(t)) out.proof = 'sent_on_time';
  if (/(attending|consultant|representative)[^.]*(must|has to|needs to|required to)[^.]*sign/.test(t)) out.sign = true;
  const hrs = t.match(/(\d{1,2})(?::(\d\d))?\s*a\.?m\.?\s*(?:to|until|-)\s*(\d{1,2})(?::(\d\d))?\s*p\.?m\.?/);
  if (hrs) {
    out.start = `${String(Number(hrs[1])).padStart(2, '0')}:${hrs[2] ?? '00'}`;
    out.end = `${String((Number(hrs[3]) % 12) + 12).padStart(2, '0')}:${hrs[4] ?? '00'}`;
  }
  return out;
}

/** The county record, county file, one hearing, its packet and the office's first notice, in the shapes the engine loads. */
export function buildCounty(f: CountyForm, t: Tower) {
  const dir = t.eng.dir;
  const def = t.eng.layers.default;
  const id = slug(f.name);
  const email = `clerk@${id.replace(/-/g, '')}.example`;
  const file: Record<string, unknown> = {
    id, layer: 'county', county: f.name, state: f.state, version: 1, verified_at: localParts(t.now).date, verified_from: 'Entered in the prototype and approved by a person',
    office: { email } as Record<string, unknown>, hearing_mode: f.mode,
    staffing: { method: f.method, template: { staffing_notice: 'staffing_notice', email_case_ids: 'staffing_email', form_then_call: 'staffing_form' }[f.method], source_text: `${STAFFING_METHODS[f.method]!.steps.join('. ')}.`, ...(f.method === 'form_then_call' ? { channel: 'email, then phone' } : {}) },
    replacement: f.method === 'staffing_notice' ? { method: 'updated_staffing_notice', source_text: 'Submit an updated staffing notice naming the replacement for each changed case.' } : { method: 'email_replacement', source_text: 'Email the replacement name and affected case IDs.' },
  };
  const packet: Record<string, unknown> = {};
  if (f.lead !== def.packet.lead_hours) packet.lead_hours = f.lead;
  if (f.proof !== def.packet.clerk_evidence) packet.clerk_evidence = f.proof;
  if (Object.keys(packet).length) file.packet = packet;
  if (f.sign) file.signatures = { attending_consultant_signs: true };
  if (f.start !== def.office.contact_hours.start || f.end !== def.office.contact_hours.end) (file.office as Record<string, unknown>).contact_hours = { days: 'Mon-Fri', start: f.start, end: f.end };
  const n = 200 + dir.cases.filter((c) => /^AX-2\d\d$/.test(c.case_id)).length + 1;
  const caseId = `AX-${n}`;
  const property = `${f.property}, ${f.name}`;
  const packetName = `${slug(f.property)}-packet-v1.txt`;
  return {
    caseId,
    county: {
      record: { county: f.name, state: f.state, office_email: email, hearing_mode: f.mode },
      file,
      eligible: dir.consultants.map((k) => k.id),
      cases: [{ property, case_id: caseId, customer_id: `H${n}`, homeowner: f.homeowner, county: f.name, state: f.state, tax_year: '2029', hearing_date: '', hearing_time: '', timezone: 'UTC-05:00', consultant_id: '', status: 'new', packet_reference: packetName, record_updated_at: new Date(t.now).toISOString() }],
      documents: [{ name: packetName, kind: 'packet', version: 1, case_id: caseId, text: `Property: ${property}\nHomeowner: ${f.homeowner}\nCase: ${caseId}\nCounty: ${f.name}\nTax year: 2029\nPacket version: 1` }],
    },
    notice: { sender: `${f.name} hearing office`, address: email, channel: 'email', caseIds: [caseId], body: `The hearing for ${property} is scheduled for ${longDate(f.date)} at ${fmtTime(f.time)} ${f.mode === 'video' ? 'by video' : 'in person'}. Please confirm your representative.` },
  };
}
