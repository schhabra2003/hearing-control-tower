import { useState } from 'react';
import { STAFFING_METHODS } from '@engine/src/playbook.js';
import type { PageProps } from '@/lib/router';
import { setQuery } from '@/lib/router';
import { officeSlug } from '@/lib/data';
import { dateShort } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { KpiCell, KpiRow } from '@/components/data/KpiRow';
import { SourceChip } from '@/components/data/SourceChip';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Section } from '@/components/ui/Section';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { CaseLink, HistoryControls, LaterLayout, SelectField, StateBadge, Table } from './parts';
import { COUNTY_START, buildCounty, parseRules, type CountyForm } from './counties';
import { fmtTime, useTower, type Playbook } from './tower';

const methodOf = (pb: Playbook): string => STAFFING_METHODS[pb.staffing.method]?.label ?? pb.staffing.method.replace(/_/g, ' ');
const DRIFT_WORD: Record<string, { tone: 'danger' | 'ok' | 'neutral'; word: string }> = {
  proposed: { tone: 'danger', word: 'To review' },
  approved: { tone: 'ok', word: 'Approved' },
  dismissed: { tone: 'neutral', word: 'Dismissed' },
};

const avg = (a: number[]): number => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);

/** Person-time to add a county: SOLUTION_DESIGN.md section 9, an estimate (AI-drafted, checked and approved by a person). */
const ADD_COUNTY_HOURS = '4 to 12 hours';

export function Counties({ query }: PageProps) {
  const t = useTower();
  // The open county is in the URL (?county=Harthmere), so Back, reload and a shared link keep it.
  const sel = query.get('county');
  const setSel = (n: string | null): void => setQuery('county', n);
  const [f, setF] = useState<CountyForm>(COUNTY_START);
  const [lead, setLead] = useState<{ changed: number; total: number } | null>(null);
  const [added, setAdded] = useState<{ county: string; own: number; inherited: number; caseId: string } | null>(null);
  const { books, layers } = t.eng;
  const def = layers.default;
  const names = layers.counties.map((c) => c.county);
  const drift = Object.entries(t.eng.state.drift ?? {});
  const upcoming = (n: string): number => t.view.cases.filter((c) => c.ledger.county === n && c.stage === 'upcoming').length;
  const exists = names.some((n) => n.toLowerCase() === f.name.trim().toLowerCase());
  const file = sel ? layers.counties.find((c) => c.county === sel) : null;
  const verifiedAt = file ? ((file as unknown as { verified_at?: string | null }).verified_at ?? null) : null;
  const ownLead = layers.counties.filter((c) => (c as { packet?: { lead_hours?: number } }).packet?.lead_hours != null).map((c) => `${c.county} (${(c as { packet?: { lead_hours?: number } }).packet!.lead_hours} hours)`);

  const setLeadHours = (hours: number): void => {
    const dueOf = (): Record<string, number | undefined> => Object.fromEntries(t.view.cases.filter((c) => c.stage === 'upcoming').map((c) => [c.id, c.due.G4]));
    const before = dueOf();
    t.editDefault({ packet: { lead_hours: hours } });
    const after = dueOf();
    const ids = Object.keys(after);
    setLead({ changed: ids.filter((id) => before[id] !== after[id]).length, total: ids.length });
  };

  const addCounty = (): void => {
    if (!t.live || !f.name.trim() || exists) return;
    const form = { ...f, name: f.name.trim() };
    const built = buildCounty(form, t);
    t.addCounty(built.county);
    t.send(built.notice);
    const pb = t.eng.books[form.name];
    if (!pb) return;
    setAdded({ county: form.name, own: pb.own_fields, inherited: pb.inherited_fields, caseId: built.caseId });
    setSel(form.name);
    toast({ title: `${form.name} is added as data`, body: 'A county file, one hearing, and the office’s first notice.', tone: 'ok' });
  };

  return (
    <LaterLayout
      id="later-counties"
      testId="page-later-counties"
      actions={
        <>
          <HistoryControls />
          <Button size="sm" variant="secondary" data-testid="county-add-open" onClick={() => document.querySelector('[data-testid="county-add-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Add a county</Button>
        </>
      }
    >
      <Section
        title="At a glance"
        rule={false}
        actions={<SourceChip kind="measured" source="engine/playbooks/*.json" counted="Counted from the prototype's county files. The settings in them were written from the packet's county notes." />}
      >
        <KpiRow title="County files" showTitle={false} columns={4} testId="counties-kpis">
          <KpiCell label="County files" value={names.length} />
          <KpiCell label="Own settings, on average" value={avg(names.map((n) => books[n]!.own_fields))} />
          <KpiCell label="Shared settings, on average" value={avg(names.map((n) => books[n]!.inherited_fields))} />
          <KpiCell testId="counties-add-time" label="Person-time to add a county" value={ADD_COUNTY_HOURS} target="Draft, check each setting, approve" chip={<SourceChip kind="estimate" source="SOLUTION_DESIGN.md section 9" counted="The author's estimate: a person checks each drafted setting against the office's own words and approves the file. Not timed at the firm." />} />
        </KpiRow>
      </Section>

      <Section title="County files" description="Choose a county to see every setting in its file.">
        <Table label="County files">
          <thead>
            <tr><th scope="col">County</th><th scope="col">Hearings</th><th scope="col">Recording a representative</th><th scope="col">Packet due</th><th scope="col">Proof the clerk has it</th><th scope="col">Office hours</th><th scope="col">Own and shared settings</th><th scope="col">Version</th><th scope="col">Upcoming</th></tr>
          </thead>
          <tbody>
            {names.map((n) => {
              const pb = books[n]!;
              const d = t.eng.state.drift?.[n];
              return (
                <tr key={n} data-testid={`county-row-${officeSlug(n)}`} className={cn(sel === n && 'bg-accent-soft')}>
                  <th scope="row" className="!border-t !border-b-0 !text-body !font-normal whitespace-nowrap !text-ink">
                    <span className="flex items-baseline gap-2">
                      <button type="button" className="font-semibold text-accent underline underline-offset-2" aria-expanded={sel === n} onClick={() => setSel(sel === n ? null : n)}>{n}</button>
                      <span className="text-small text-ink-2">{pb.state}</span>
                    </span>
                    {d?.status === 'proposed' ? <div className="mt-1"><StateBadge tone="danger">Process change to review</StateBadge></div> : null}
                  </th>
                  <td>{pb.hearing_mode === 'video' ? 'Video' : 'In person'}</td>
                  <td>{methodOf(pb)}{pb.signatures.attending_consultant_signs ? <span className="text-ink-2">; the attending consultant signs</span> : null}</td>
                  <td className="whitespace-nowrap tabular-nums">{pb.packet.lead_hours} hours before</td>
                  <td>{pb.packet.clerk_evidence === 'sent_on_time' ? 'An on-time send' : "The clerk's receipt"}</td>
                  <td className="whitespace-nowrap">{fmtTime(pb.office.contact_hours.start)} to {fmtTime(pb.office.contact_hours.end)}</td>
                  <td className="whitespace-nowrap tabular-nums">{pb.own_fields} own, {pb.inherited_fields} shared</td>
                  <td className="whitespace-nowrap">Version {pb.version}<div className="text-small text-ink-2">{pb.verified_at ? `Checked ${dateShort(pb.verified_at)}` : 'Not checked'}</div></td>
                  <td className="tabular-nums">{upcoming(n)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {file ? (
          <div className="mt-6 border-t border-border pt-4" data-testid="county-file">
            <div className="mb-2 flex items-center justify-between gap-4">
              <h3 className="text-h3 text-ink"><span className="font-mono">playbooks/{officeSlug(file.county)}.json</span> <span className="text-body font-normal text-ink-2">{file.county}'s own settings. Everything else is shared.</span></h3>
              <Button size="sm" variant="ghost" aria-label={`Hide ${file.county}'s file`} onClick={() => setSel(null)}>Hide</Button>
            </div>
            <p className="mb-2 text-body text-ink">Verified: {verifiedAt ? dateShort(verifiedAt) : 'Not verified'}</p>
            <pre data-testid="county-file-json" className="max-h-[480px] overflow-auto rounded-control border border-border bg-surface-2 p-4 font-mono text-small text-ink">{JSON.stringify(file, null, 2)}</pre>
          </div>
        ) : null}
      </Section>

      <div className="grid grid-cols-2 gap-x-12 max-xl:grid-cols-1">
        <Section title="Change one shared setting" description={`Packet due ${def.packet.lead_hours} hours before the hearing. A county's own value wins.`}>
          <SegmentedControl<'48' | '72'>
            label="Packet due, shared setting"
            value={String(def.packet.lead_hours) === '48' ? '48' : '72'}
            onValueChange={(v) => setLeadHours(Number(v))}
            options={[48, 72].map((h) => ({ value: String(h) as '48' | '72', label: `${h} hours before`, disabled: !t.live, testId: `county-lead-${h}` }))}
          />
          {lead ? (
            <InlineAlert tone="ok" className="mt-4" title={`One edit moved the packet deadline of ${lead.changed} of ${lead.total} upcoming hearings.`}>
              {ownLead.length ? `Own value kept: ${ownLead.join(', ')}.` : `Every example office's rule says 48 hours, so no county has its own value. Add ${COUNTY_START.name} below (${COUNTY_START.lead} hours, its own) to see it kept.`}
            </InlineAlert>
          ) : null}
          <h3 className="text-h3 mt-6 mb-2 text-ink">Process changes the later tool noticed</h3>
          {drift.length ? (
            <ul className="flex flex-col gap-3">
              {drift.map(([n, d]) => (
                <li key={n} className="text-body">
                  <span className="flex flex-wrap items-center gap-2"><span className="font-semibold">{n}</span><StateBadge tone={DRIFT_WORD[d.status]?.tone ?? 'neutral'}>{DRIFT_WORD[d.status]?.word ?? d.status}</StateBadge></span>
                  <p className="mt-1 border-l-2 border-border-control pl-3 text-ink-2">"{d.quote ?? d.text}"</p>
                  {d.status === 'proposed' ? <a className="text-body text-accent underline underline-offset-2" href="#/later/queue">Review it in the work queue</a> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-body text-ink-2">None so far.</p>}
          <p className="mt-4 text-body text-ink-2">Nothing goes out under the old process until a person approves.</p>
        </Section>

        <Section testId="county-add-panel" title="Add a county" description={`Paste the office's description, read it, check the settings, approve. Person-time: ${ADD_COUNTY_HOURS} a county (estimate).`}>
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); addCounty(); }}>
            <Field label="How the office describes its process">
              <TextArea rows={3} data-testid="county-text" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
            </Field>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm" data-testid="county-read" onClick={() => { const got = parseRules(f.text); setF({ ...f, ...got }); const n = Object.keys(got).length; toast({ title: n ? `Read the description and filled ${n} settings` : 'Nothing recognised in the description', body: n ? 'Check them before you approve.' : 'Fill the settings by hand.' }); }}>Read the description</Button>
              <span className="text-small text-ink-2">Simple word matching, no AI. A person approves either way.</span>
            </div>
            <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
              <Field label="County"><TextInput data-testid="county-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label="State"><TextInput data-testid="county-state" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
              <SelectField label="Hearings" testId="county-mode" value={f.mode} onChange={(v) => setF({ ...f, mode: v as CountyForm['mode'] })}><option value="video">By video</option><option value="in_person">In person</option></SelectField>
              <SelectField label="Recording a representative" testId="county-method" value={f.method} onChange={(v) => setF({ ...f, method: v })}>{Object.entries(STAFFING_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</SelectField>
              <SelectField label="Packet due" testId="county-lead" value={String(f.lead)} onChange={(v) => setF({ ...f, lead: Number(v) })}>{[48, 72, 96].map((h) => <option key={h} value={h}>{h} hours before</option>)}</SelectField>
              <SelectField label="Proof the clerk has it" testId="county-proof" value={f.proof} onChange={(v) => setF({ ...f, proof: v as CountyForm['proof'] })}><option value="receipt">The clerk's receipt</option><option value="sent_on_time">An on-time send (no receipts)</option></SelectField>
              <Field label="Office opens"><TextInput type="time" data-testid="county-start" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
              <Field label="Office closes"><TextInput type="time" data-testid="county-end" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
              <label className="flex min-h-10 items-center gap-2 self-end text-body text-ink"><input type="checkbox" data-testid="county-sign" className="size-4 accent-[var(--accent)]" checked={f.sign} onChange={(e) => setF({ ...f, sign: e.target.checked })} />The attending consultant must sign</label>
            </div>
            <h3 className="text-h3 text-ink">A first hearing there</h3>
            <div className="grid grid-cols-4 gap-4 max-md:grid-cols-1">
              <Field label="Property"><TextInput data-testid="county-property" value={f.property} onChange={(e) => setF({ ...f, property: e.target.value })} /></Field>
              <Field label="Homeowner"><TextInput data-testid="county-homeowner" value={f.homeowner} onChange={(e) => setF({ ...f, homeowner: e.target.value })} /></Field>
              <Field label="Date"><TextInput type="date" data-testid="county-date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
              <Field label="Time"><TextInput type="time" data-testid="county-time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" variant="primary" size="md" data-testid="county-add" disabled={!t.live || exists || !f.name.trim()}>Approve the file and add the county</Button>
              {exists ? <span className="text-body text-ink-2">A county with this name exists already.</span> : null}
            </div>
          </form>
          {added ? (
            <InlineAlert tone="ok" className="mt-4" title={`${added.county} is added as data, with ${added.own} own settings and ${added.inherited} shared.`}>
              Its first notice for <CaseLink id={added.caseId} /> is planned in the <a className="text-accent underline underline-offset-2" href="#/later/queue">work queue</a>.
            </InlineAlert>
          ) : null}
        </Section>
      </div>
    </LaterLayout>
  );
}
