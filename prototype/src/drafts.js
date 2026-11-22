// Clerk-liaison and consultant messages. Every draft is rendered from ledger facts and the
// county playbook, so a draft cannot contain a date, time, name or case that the ledger does
// not hold. In AI mode the wording can be polished by the model; the facts still come from here.

import { fmtDate, fmtTime, fmtSlot, fmtWhen } from './time.js';
import { STAFFING_METHODS } from './playbook.js';
import { tidy } from './text.js';

const FIRM = "Alice's Law Firm operations";
const addr = (c) => c.property.split(',')[0];
const modeText = (m) => (m === 'video' ? 'video' : 'in person');
const many = (n, one, two, all) => (n === 1 ? one : n === 2 ? two : all);
const stop = (t) => (/[.!?]$/.test(t) ? t : t + '.');          // "by 4 p.m." already ends the sentence
const slug = (c) => addr(c.ledger).toLowerCase().split(' ').join('-');
const DOC = { settlement: 'settlement offer', withdrawal: 'withdrawal statement', homeowner_statement: 'homeowner statement' };

export function caseLines(cases, { numbered = true } = {}) {
  return cases.map((c, i) => {
    const s = c.ledger.schedule;
    const where = [fmtSlot(s), modeText(s.mode || c.playbook.hearing_mode), s.room ? `room ${s.room}` : null].filter(Boolean).join(', ');
    return `${numbered ? `  ${i + 1}. ` : '  - '}${c.id}  ${addr(c.ledger)}: ${where}`;
  }).join('\n');
}
const sourceStamp = (c) => `confirmed in writing by the ${c.ledger.county} office (message ${c.ledger.schedule.source})`;

export function noticeText(c, repName, replaces) {
  return ['STAFFING NOTICE', `Property: ${c.ledger.property}`, `Case: ${c.id}`, `County: ${c.ledger.county}`, `Hearing: ${fmtSlot(c.ledger.schedule)}`,
    `Representative: ${repName}`, replaces ? `Replaces: ${replaces}` : null, 'Submitted by: ' + FIRM].filter(Boolean).join('\n');
}

// Practical instructions from the office, passed on word for word.
function officeNotes(cases) {
  const seen = new Set(), out = [];
  for (const c of cases) for (const i of c.ledger.instructions || []) {
    if (seen.has(i.text)) continue;
    seen.add(i.text);
    out.push(`From the ${c.ledger.county} office: "${i.text}" (message ${i.source})`);
  }
  return out;
}

// A reminder repeats the original message with one added line. After the allowed number of
// reminders the action becomes a call for a person, with what was sent as the script.
export function renderDraft(item, env) {
  if (item.kind === 'follow_up_call') {
    const lines = [`Call ${item.callee.name}.${item.openNote ? ' ' + item.openNote : ''}`, ''];
    item.parts.forEach((part, i) => {
      const sent = renderBase(part.item, env);
      lines.push(`${item.parts.length > 1 ? `${i + 1}. ` : ''}${part.title.replace('Waiting for ', 'Still waiting for ')} (${part.cases.join(', ')})`);
      lines.push(`   First sent ${fmtWhen(part.sentAt)}, reminded ${part.tries} ${part.tries === 1 ? 'time' : 'times'}${part.calls ? `, called ${part.calls} ${part.calls === 1 ? 'time' : 'times'}` : ''}.`);
      lines.push('   What we asked:');
      for (const l of sent.body.split('\n')) lines.push(`   | ${l}`);
      lines.push('');
    });
    lines.push('Log what you are told as a phone note. An answer by phone is held as provisional until it arrives in writing.');
    return { from: FIRM, to: item.to.name, channel: 'phone', subject: tidy(item.title), body: tidy(lines.join('\n')), attachments: [] };
  }
  if (item.kind === 'triage') {
    const m = item.message;
    const lines = [`From: ${m.sender}${m.address ? ` <${m.address}>` : ''}, by ${m.channel}`, item.cases.length ? `About: ${item.cases.join(', ')}` : 'About: no case could be matched', '', ...m.body.split('\n').map((l) => `| ${l}`), '',
      'Why a person is needed:', ...item.reasons.map((l) => `  - ${l}`), item.used ? 'The parts that passed the checks were applied.' : 'Nothing was changed because of this message.', '',
      m.role === 'homeowner' ? `Call ${m.homeowner} back on the number on file. Do not answer with case details to an address that is not on file.` : 'Read it and act if needed: answer it, call back on the number on file, or file it under the right case.',
      'If the reading was wrong, enter what the message says. The same checks apply: a person can correct what a message says, never who said it.',
      'Then mark it as read. It stays in this list until someone does.'];
    return { from: FIRM, to: item.to.name, channel: 'review', subject: tidy(item.title), body: tidy(lines.join('\n')), attachments: [] };
  }
  const d = renderBase(item, env);
  if (!item.reminder || !d) return d;
  const parts = d.body.split('\n\n');
  const line = `This is a reminder. We wrote on ${fmtWhen(item.firstSentAt)} and have not had an answer.`;
  const body = parts.length > 1 ? [parts[0], line, ...parts.slice(1)].join('\n\n') : `${line}\n\n${d.body}`;
  return { ...d, subject: `Reminder: ${d.subject}`, body: tidy(body) };
}

function renderBase(item, env) {
  const { dir } = env;
  const cases = item.caseViews;
  const first = cases[0];
  const county = first.ledger.county;
  const pb = first.playbook;
  const k = item.to.id ? dir.consultantById[item.to.id] : null;
  const date = first.ledger.schedule ? fmtDate(first.ledger.schedule.date) : '';
  const n = cases.length;
  const ids = cases.map((c) => c.id).join(', ');
  const D = (subject, lines, attachments = []) => ({ from: FIRM, to: item.to.address || item.to.name, channel: item.to.channel, subject: tidy(subject), body: tidy(lines.filter((l) => l !== null && l !== undefined).join('\n')), attachments });

  switch (item.kind) {
    case 'offer':
      return D(`Hearing cover: ${county}, ${date}`, [
        `Hi ${item.to.names ? 'all' : k.first},`, '',
        `Can you represent the homeowner at ${many(n, 'this hearing', 'these two hearings', `these ${n} hearings`)}?`, '',
        caseLines(cases), '',
        `Fee: $${k ? k.rate : 'your usual rate'} per hearing. The ${many(n, 'time is', 'times are', 'times are')} ${sourceStamp(first)}.`,
        ...officeNotes(cases),
        n > 1 ? 'Reply YES to accept all, or answer per hearing (for example "YES 1, NO 2").' : 'Reply YES or NO.',
        item.replyBy ? stop(`Please reply by ${fmtWhen(item.replyBy)}`) : null,
        'A hearing is yours only once you say yes to it.',
      ]);
    case 'nudge':
      return D(`Please confirm: ${county}, ${date}`, [
        `Hi ${k.first},`, '',
        `You said you needed to check before committing to ${many(n, 'this hearing', 'these hearings', 'these hearings')}:`, '',
        caseLines(cases), '',
        `Can you confirm YES or NO${n > 1 ? ' for each' : ''}?${item.replyBy ? ` We need an answer by ${stop(fmtWhen(item.replyBy))} After that we will ask someone else.` : ''}`,
      ]);
    case 'confirm_assignment':
      return D(`Confirmed: you are covering ${county}, ${date}`, [
        `Hi ${k.first},`, '',
        `Thank you. You are confirmed for:`, '', caseLines(cases), '',
        `Fee: $${k.rate} per hearing. The current ${many(n, 'packet', 'packets', 'packets')} (${first.ledger.packet.current}) ${many(n, 'is', 'are', 'are')} linked below. Please reply once you have opened ${many(n, 'it', 'them', 'them')}.`,
        `We are sending ${county} ${pb.replacement.method === 'updated_staffing_notice' ? 'an updated staffing notice' : 'the replacement details'} naming you.`,
        ...officeNotes(cases),
      ], cases.map((c) => `${c.id} packet ${c.ledger.packet.current} (link always opens the current version)`));
    case 'reconfirm':
      if (item.recorded) {
        return D(`Please confirm: ${county}, ${date}`, [
          `Hi ${k.first},`, '',
          `The ${county} office has you recorded as the representative for ${many(n, 'this hearing', 'these hearings', 'these hearings')} (message ${item.recordedIn}):`, '', caseLines(cases), '',
          `We have no confirmation from you on our file. Can you attend? ${n > 1 ? 'Reply YES for all, or answer per hearing (for example "YES 1, NO 2").' : 'Reply YES or NO.'}`,
          item.replyBy ? stop(`Please reply by ${fmtWhen(item.replyBy)}`) : null,
        ]);
      }
      return D(`Changed hearing time: ${county}`, [
        `Hi ${k.first},`, '',
        `The ${county} office has moved ${many(n, 'this hearing', 'these hearings', 'these hearings')} (${sourceStamp(first)}):`, '', caseLines(cases), '',
        item.oldSlot ? `You accepted ${fmtSlot(item.oldSlot)}. Can you attend the new time? Reply YES or NO.` : 'You said this date would work. Please reply YES to confirm, or NO.',
      ]);
    case 'consultant_update': {
      const lines = [`Hi ${k.first},`, '', `Here is the official position, taken from the ${county} office's own messages:`, ''];
      for (const c of cases) {
        const s = c.ledger.schedule;
        lines.push(`  - ${c.id}  ${addr(c.ledger)}: ${fmtSlot(s)}, ${modeText(s.mode || pb.hearing_mode)}${s.room ? ', room ' + s.room : ''} (message ${s.source}).`);
      }
      lines.push('');
      for (const f of item.fragments) lines.push(f);
      return D(`Official schedule: ${county}`, lines);
    }
    case 'stand_down':
      if (item.offerOnly && item.stillOpen && item.stillOpen.length) {
        const open = item.stillOpen.slice().sort((a, b) => (a.n || 0) - (b.n || 0));
        const by = Math.min(...open.map((x) => x.replyBy || Infinity));
        return D(`Partly covered: ${county}, ${date}`, [
          `Hi ${k.first},`, '',
          `${many(n, 'One of the hearings', 'Two of the hearings', 'Some of the hearings')} we asked you about ${many(n, 'is', 'are', 'are')} now covered:`, '',
          caseLines(cases, { numbered: false }), '',
          `We still need someone for:`, '',
          open.map((x) => { const s = x.view.ledger.schedule; return `  ${x.n ? `${x.n}. ` : '- '}${x.view.id}  ${addr(x.view.ledger)}: ${[fmtSlot(s), modeText(s.mode || x.view.playbook.hearing_mode), s.room ? `room ${s.room}` : null].filter(Boolean).join(', ')}`; }).join('\n'), '',
          `Our question for ${many(open.length, 'that one', 'those', 'those')} stands. Please reply YES or NO${open.length > 1 ? ' for each' : ''}${Number.isFinite(by) ? ` by ${fmtWhen(by)}` : ''}.`,
        ]);
      }
      if (item.offerOnly) {
        return D(`Now covered: ${county}, ${date}`, [
          `Hi ${k.first},`, '',
          `${many(n, 'The hearing', 'The two hearings', 'The hearings')} we asked you about ${many(n, 'is', 'are', 'are')} now covered:`, '',
          caseLines(cases, { numbered: false }), '',
          'You do not need to reply or keep the time free. Thank you.',
        ]);
      }
      return D(`Already covered: ${county}, ${date}`, [
        `Hi ${k.first},`, '',
        `Thank you for saying yes to ${many(n, 'this hearing', 'these hearings', 'these hearings')}:`, '',
        caseLines(cases, { numbered: false }), '',
        'Another consultant accepted first, so you do not need to attend. If that changes, you are the first person we will ask.',
      ]);
    case 'unusable_yes': {
      return D(`About your yes: ${county}, ${date}`, [
        `Hi ${k.first},`, '',
        `Thank you for saying yes to ${many(n, 'this hearing', 'these hearings', 'these hearings')}:`, '',
        caseLines(cases, { numbered: false }), '',
        item.reason === 'not_eligible'
          ? `Our roster does not list you for ${county}, so we cannot name you as the representative there. We have not booked you and are asking someone else.`
          : `You already hold ${item.clashWith.length > 1 ? 'hearings' : 'a hearing'} at the same time (${item.clashWith.join(', ')}), so we have not booked you for ${many(n, 'this one', 'these', 'these')}. Your existing ${item.clashWith.length > 1 ? 'hearings are' : 'hearing is'} unchanged, and we are asking someone else.`,
        item.reason === 'not_eligible' ? 'If our roster is out of date, reply and tell us. A person will check it.' : 'If you would rather swap, reply and tell us. A person will sort it out.',
      ]);
    }
    case 'release':
      return D(`Withdrawn: ${first.id}, ${addr(first.ledger)}`, [
        `Hi ${k.first},`, '',
        `The ${county} office has processed the withdrawal for ${first.id}, ${addr(first.ledger)} (message ${first.ledger.withdrawnSource}). You no longer need to attend that hearing.`,
        item.others && item.others.length ? `Your other ${many(item.others.length, 'hearing', 'hearings', 'hearings')} that day ${many(item.others.length, 'is', 'are', 'are')} unchanged:` : null,
        item.others && item.others.length ? caseLines(item.others, { numbered: false }) : null,
      ]);
    case 'calendar_fix':
      return D('Shared calendar corrected', [`Calendar entries for ${ids} are regenerated from the official schedule (${fmtSlot(first.ledger.schedule)}).`, 'Calendar entries are an output of the record. Editing one files a change request; it does not move a hearing.']);
    case 'staffing': {
      const method = pb.staffing.method;
      const rep = item.repName;
      const repl = item.replaces ? ` This replaces ${item.replaces}.` : '';
      if (method === 'staffing_notice') {
        return D(`${item.replaces ? 'Updated staffing' : 'Staffing'} ${many(n, 'notice', 'notices', 'notices')}: ${ids}`, [
          `Dear ${county} hearing office,`, '',
          `Please find the staffing ${many(n, 'notice', 'notices', 'notices')} naming our representative for:`, '', caseLines(cases), '',
          `Representative: ${rep}.${repl}`,
          `Please confirm by reply that ${rep.split(' ')[0]} is recorded for ${many(n, 'this case', 'both cases', 'each case')}.`,
        ], cases.map((c) => ({ name: `${slug(c)}-staffing-notice.txt`, text: noticeText(c, rep, item.replaces) })));
      }
      if (method === 'form_then_call') {
        return D(`Staffing form: ${ids}`, [
          `Dear ${county} hearing office,`, '', 'Staffing form details, as your office now requires:', '',
          `  Case IDs: ${ids}`, `  Representative name: ${rep}`,
          `  Hearing date and times: ${date}, ${cases.map((c) => fmtTime(c.ledger.schedule.time)).join(' and ')}`,
          `  Contact email: ${dir.consultants.find((x) => x.name === rep)?.email || ''}`, '',
          `We will call to have this entered on the list of representatives.${repl} Please confirm in writing once it is entered.`,
        ], [{ name: 'staffing-form-completed.txt', text: 'County staffing form, completed (see fields above).' }]);
      }
      return D(`Representative for ${ids}`, [
        `Dear ${county} hearing office,`, '',
        `Our representative for the following ${many(n, 'case', 'cases', 'cases')} is ${rep}.${repl}`, '', caseLines(cases), '',
        `Please confirm that ${rep.split(' ')[0]} has been recorded.`,
      ]);
    }
    case 'chase_rep':
      return D(`Please confirm our representative: ${ids}`, [
        `Dear ${county} hearing office,`, '',
        item.phone ? `Thank you for confirming by phone that ${item.repName.split(' ')[0]} is recorded. Could you confirm it in writing for our file?`
          : item.fileOnly ? `Our file shows the staffing ${many(n, 'notice', 'notices', 'notices')} naming ${item.repName} as recorded, but we have no confirmation from your office.`
            : `We sent the staffing details naming ${item.repName}${item.sentIn ? ` (message ${item.sentIn})` : ''}. Your office has not yet confirmed them.`, '',
        caseLines(cases), '', `Please reply to confirm ${item.repName.split(' ')[0]} is recorded, or tell us what is missing.`,
      ]);
    case 'call_office':
      return D(`Call task: ${county} hearing office`, [
        `Call the ${county} hearing office (open ${pb.office.contact_hours.days}, ${fmtTime(pb.office.contact_hours.start)} to ${fmtTime(pb.office.contact_hours.end)}).`,
        item.openNote || null, '',
        `Ask: have ${item.repName} entered on the list of representatives for ${ids} (${date}).`,
        item.sentIn ? `Say: the form was sent in message ${item.sentIn}. If they cannot find it, resend it while on the call.` : null,
        'Then: log what the clerk said below. A phone confirmation is held as provisional until it is in writing.',
      ]);
    case 'postponed_notice': {
      const prev = first.ledger.postponed.previous;
      return D(`Postponed: ${county}, ${fmtDate(prev.date)}`, [
        `Hi ${k.first},`, '',
        `The ${county} office has postponed ${many(n, 'this hearing', 'these hearings', 'these hearings')} (message ${first.ledger.postponed.source}):`, '',
        cases.map((c) => `  - ${c.id}  ${addr(c.ledger)}: was ${fmtSlot(c.ledger.postponed.previous)}`).join('\n'), '',
        `Please do not attend on ${fmtDate(prev.date)}. There is no new date yet. We will ask you again as soon as the office sets one.`,
      ]);
    }
    case 'chase_written':
      if (item.off) {
        return D(`Please confirm in writing: ${ids}`, [
          `Dear ${county} hearing office,`, '',
          `Your office told us by phone (message ${first.ledger.provisionalOff.source}) that ${many(n, 'this hearing', 'these hearings', 'these hearings')} will not take place:`, '',
          caseLines(cases, { numbered: false }), '',
          'Please confirm this in writing. Until we have it in writing, our representative will attend as scheduled.',
        ]);
      }
      return D(`Please confirm in writing: ${ids}`, [
        `Dear ${county} hearing office,`, '',
        `Your office told us by phone (message ${first.ledger.provisional.source}) that the hearing for ${addr(first.ledger)} moves to ${fmtSlot(first.ledger.provisional)}.`,
        `Our record still shows ${fmtSlot(first.ledger.schedule)}. Please confirm the new date and time in writing so we can instruct our representative.`,
      ]);
    case 'verify_lead': {
      const leadOf = (c) => (item.leadBy && item.leadBy[c.id]) || item.lead;
      const record = (c) => (c.ledger.schedule ? `Our record, from your message ${c.ledger.schedule.source}, shows ${fmtSlot(c.ledger.schedule)}.` : 'Our record shows no date for this hearing.');
      if (item.hedged) {
        const quotes = [...new Set(cases.map((c) => leadOf(c).text))];
        return D(`Please confirm the schedule: ${ids}`, [
          `Dear ${county} hearing office,`, '',
          `${item.lead.voice === 'phone' ? `Your office told us by phone (our note ${item.lead.source})` : `Your message ${item.lead.source} said`} the following about ${many(n, 'this hearing', 'these hearings', 'these hearings')}:`, '',
          ...quotes.map((q) => `  "${q}"`), '',
          'We read this as not yet settled, so we have changed nothing:', '',
          ...cases.map((c) => `  - ${c.id}  ${addr(c.ledger)}: ${record(c)}`), '',
          `Please tell us plainly, in writing, whether anything has changed. Until then our representative plans for the ${many(n, 'date', 'dates', 'dates')} on our record.`,
        ]);
      }
      if (n === 1) {
        return D(`Please confirm the schedule: ${ids}`, [
          `Dear ${county} hearing office,`, '',
          `We have been told that the hearing for ${addr(first.ledger)} has moved to ${fmtSlot(item.lead.fields)}. The message did not come from your office.`,
          record(first),
          'Please confirm in writing which is correct. We will keep the date on our record until we hear from you.',
        ]);
      }
      return D(`Please confirm the schedule: ${ids}`, [
        `Dear ${county} hearing office,`, '',
        'We have been told that these hearings have moved. The message did not come from your office.', '',
        ...cases.map((c) => `  - ${c.id}  ${addr(c.ledger)}: said to be ${fmtSlot(leadOf(c).fields)}. ${record(c)}`), '',
        'Please confirm in writing which is correct. We will keep the dates on our record until we hear from you.',
      ]);
    }
    case 'send_packet': {
      const v = first.ledger.packet.current || 'current';
      if (item.to.kind === 'office') {
        return D(`Case ${many(n, 'packet', 'packets', 'packets')}: ${ids}`, [
          `Dear ${county} hearing office,`, '',
          `Attached ${many(n, 'is the current case packet', 'are the current case packets', 'are the current case packets')} (${v})${item.resend ? ', resent as PDF because the earlier file could not be opened' : ''}:`, '', caseLines(cases), '',
          `Please confirm that you can open ${many(n, 'it', 'them', 'them')}.`,
        ], cases.map((c) => ({ name: `${slug(c)}-packet-${v}.pdf` })));
      }
      return D(`Current ${many(n, 'packet', 'packets', 'packets')}: ${county}, ${date}`, [
        `Hi ${k.first},`, '',
        `${many(n, 'This link opens', 'These links open', 'These links open')} the current packet (${v})${item.stale ? '. Please discard version 1: the earlier link pointed to an old file' : ''}:`, '', caseLines(cases), '',
        item.stale && item.whatChanged ? `What changed: ${item.whatChanged}` : null,
        item.answers ? `To answer your question: ${v} is the version to use, and you are confirmed for ${many(n, 'this hearing', 'both hearings', 'these hearings')}.` : null,
        `Please reply once you have reviewed ${many(n, 'it', 'them', 'them')}.`,
      ], cases.map((c) => `${c.id} packet ${v} (link always opens the current version)`));
    }
    case 'signature': {
      const o = item.obligation;
      const doc = DOC[o.kind];
      return D(`Signature needed: ${doc}, ${ids}`, [
        `Hi ${k.first},`, '',
        `Please sign the ${doc} for ${first.id}, ${addr(first.ledger)}, using the secure signing link.`,
        pb.signatures.attending_consultant_signs ? `${county} requires the attending representative's signature, and you are the representative on its record.` : `You are the representative on the ${county} record for this case.`,
        o.rejected ? `The office rejected the earlier copy because it named a different person (message ${o.rejected.source}).` : null,
        'The signing link produces a clean copy with the case number and date. Please do not send a phone photo.',
        o.kind === 'withdrawal' && first.ledger.schedule ? `The hearing stays on the schedule (${fmtSlot(first.ledger.schedule)}) until ${county} processes the withdrawal, so please keep it in your diary.` : null,
      ]);
    }
    case 'clear_copy': {
      const doc = DOC[item.obligation.kind];
      return D(`Signing link: ${doc}, ${first.id}`, [
        `Hi ${k.first},`, '',
        `Thank you for signing the ${doc} for ${first.id}, ${addr(first.ledger)}. The photo cannot be read: the case number and date are not legible.`,
        'Please sign again with this secure signing link. It produces a clean copy, so no photo or scan is needed.',
        first.ledger.schedule ? `The hearing stays on the schedule (${fmtSlot(first.ledger.schedule)}) until ${county} processes the ${item.obligation.kind === 'withdrawal' ? 'withdrawal' : 'document'}, so please keep it in your diary.` : null,
      ]);
    }
    case 'obligation': {
      const o = item.obligation;
      const doc = DOC[o.kind];
      if (item.signed) {
        return D(`Signed ${doc}: ${first.id}, ${addr(first.ledger)}`, [
          `Dear ${county} hearing office,`, '',
          `Attached is the ${doc} for ${first.id}, ${addr(first.ledger)}, signed by ${dir.consultantById[o.signer].name}, the representative on your record.`,
          'Please confirm in writing once it has been processed.',
          o.kind === 'withdrawal' && first.ledger.schedule ? `Until we hear from you we will treat the hearing on ${fmtSlot(first.ledger.schedule)} as scheduled, and our representative will attend.` : null,
        ], [{ name: `${slug(first)}-${o.kind}-signed.pdf` }]);
      }
      if (o.kind === 'withdrawal') {
        return D(`Withdrawal: ${first.id}, ${addr(first.ledger)}`, [
          `Dear ${county} hearing office,`, '',
          item.chase ? `We sent the withdrawal for ${first.id} (message ${item.sentIn}). Your reminder still lists the hearing.` : `We confirm the homeowner's request to withdraw the appeal for ${first.id}, ${addr(first.ledger)}.`,
          'Please confirm in writing once it has been processed.',
          first.ledger.schedule ? `Until we hear from you we will treat the hearing on ${fmtSlot(first.ledger.schedule)} as scheduled, and our representative will attend.` : null,
        ]);
      }
      return D(`Homeowner statement: ${first.id}, ${addr(first.ledger)}`, [
        `Dear ${county} hearing office,`, '',
        `Attached is the homeowner statement for ${first.id}, ${addr(first.ledger)}, requested at the hearing.`,
        o.deadline ? stop(`Your deadline is ${fmtWhen(Date.parse(`${o.deadline}:00${pb.office.tz}`), pb.office.tz)}`) : null,
        'Please confirm receipt.',
      ], [{ name: 'homeowner-statement.pdf', note: 'A person must attach the signed statement before this can be sent.' }]);
    }
    case 'homeowner': {
      const h = first.ledger.homeowner;
      const w = item.change === 'withdrawal';
      if (item.phase === 'waiting') {
        return D(`Log the call with ${h}`, [
          `The call to ${h} was made ${fmtWhen(item.sentAt)}. Log the answer as a phone note. The next step depends on it:`, '',
          w ? '  - They confirm the withdrawal: the firm confirms it to the office.' : '  - They confirm they asked for the new date: nothing else is needed from them.',
          w ? '  - They did not ask for it, or changed their mind: the office is told not to process it.' : '  - They did not ask for it: the office is asked in writing which date stands.',
          '  - No answer: this call comes back tomorrow.',
        ]);
      }
      return D(`Call task: ${h}`, [
        `Call ${h} (${first.record.customer_id}) on the number on file.`, '',
        w ? `${county} says ${h} asked the office to withdraw the appeal for ${addr(first.ledger)}. Ask, do not assume:` : `${county} moved the hearing for ${addr(first.ledger)} to ${fmtSlot(first.ledger.provisional || first.ledger.schedule)} and says ${h} asked for it.`,
        w ? '  1. Did you ask the county to withdraw this appeal?' : '  1. Did you ask the county to move the hearing?',
        w ? '  2. Do you understand that a withdrawal ends the appeal for this tax year and cannot be undone?' : "  2. Tell them the firm's representative attends on the new date for them. They do not need to attend, and the firm does not ask homeowners to come to hearings.",
        w ? '  3. Do you want the firm to confirm the withdrawal to the county?' : '  3. Ask them to send future changes through the firm, so that their representative is never caught out.', '',
        w ? 'Nothing is confirmed to the county until the answer is logged. The hearing stays on the schedule in the meantime.' : null,
        w ? 'Ask them to send future changes through the firm, so that their representative is never caught out.' : null,
        'Then log the answer as a phone note.',
      ]);
    }
    case 'dispute': {
      const h = first.ledger.homeowner;
      const s = first.ledger.schedule;
      if (item.dispute === 'withdrawal') {
        return D(`Do not process the withdrawal: ${first.id}, ${addr(first.ledger)}`, [
          `Dear ${county} hearing office,`, '',
          `${h}, our client, has told us that they do not wish to withdraw the appeal for ${first.id}, ${addr(first.ledger)}.`,
          item.sentBefore ? `Please disregard the withdrawal we sent earlier (message ${item.sentBefore}). It was sent before we had confirmed it with our client.` : null,
          `Please do not process the withdrawal, and confirm in writing that the appeal remains active${s ? ` and that the hearing stays on ${fmtSlot(s)}` : ''}.`,
          s ? 'Our representative will attend as scheduled.' : null,
        ]);
      }
      return D(`Which date stands? ${first.id}, ${addr(first.ledger)}`, [
        `Dear ${county} hearing office,`, '',
        `You moved the hearing for ${first.id}, ${addr(first.ledger)} to ${fmtSlot(s)} (message ${s.source}) following a request from the homeowner.`,
        `${h}, our client, tells us they did not ask for this. Please confirm in writing which date stands.`,
        `Until we hear from you we will prepare for ${fmtSlot(s)}.`,
      ]);
    }
    case 'reinstate':
      return D(`Call task: ${county} hearing office`, [
        `Call the ${county} office today.`, '',
        `The office processed a withdrawal for ${first.id}, ${addr(first.ledger)} (message ${first.ledger.withdrawnSource}).`,
        `${first.ledger.homeowner} told the firm they did not want to withdraw (message ${first.ledger.homeownerChange.answerSource}).`, '',
        '  1. Ask how the appeal can be reinstated, and by when.',
        '  2. Ask what the office needs in writing, and send it the same day.',
        "  3. Tell the firm's attorney today. This can be time-critical.", '',
        'Log what you are told as a phone note.',
      ]);
    case 'outcome':
      return D(`How did it go? ${county}, ${date}`, [
        `Hi ${k.first},`, '', `Please report the outcome for:`, '', caseLines(cases), '',
        'For each: HEARD, CONTINUED or OTHER, plus anything the board asked for and any deadline it gave.',
      ]);
    case 'find_out':
      return D(`Find out what happened: ${ids}`, [
        `The hearing time for ${ids} has passed. No consultant was confirmed for the slot and there is no outcome report.`,
        `Call the ${county} office and the consultants involved. Record what happened.`,
      ]);
    case 'escalate':
      return D(`No one available: ${ids}`, [
        `No consultant on the roster can be offered ${ids} (${date}).`,
        ...(item.tried || []).map((t) => `  - ${t}`),
        `Options for a person to weigh: phone the consultants who did not answer, bring in someone from outside the roster, or ask ${county} to move the hearing. A request to move changes nothing until the office approves it.`,
      ]);
    default:
      return D(item.title, [item.why]);
  }
}

// ---- Simulated replies ------------------------------------------------------------------
// The prototype has no real mailbox. These are the replies a consultant or clerk could send.
// They go through the same reader, verifier and ledger as any other message.

export function replyTemplates(item, env) {
  if (item.kind === 'follow_up_call') return item.parts.flatMap((part) => replyTemplates(part.item, env).slice(0, 1));
  if (item.kind === 'triage' || !item.caseViews.length) return [];
  const { dir } = env;
  const cases = item.caseViews;
  const n = cases.length;
  const first = cases[0];
  const s = first.ledger.schedule;
  const k = item.to.id ? dir.consultantById[item.to.id] : null;
  const office = `${first.ledger.county} hearing office`;
  const consChannel = k ? ({ email: 'email', text: 'text note', phone: 'phone note' }[k.notice_preference] || 'email') : 'email';
  const caseIds = cases.map((c) => c.id);
  const list = cases.map((c) => addr(c.ledger)).join(' and ');
  const dateLong = s ? longDate(s.date) : '';
  const R = (label, tone, sender, channel, body) => ({ label, tone, message: { sender, channel, body: tidy(body), caseIds } });
  const cons = (label, tone, body) => R(label, tone, k.name, consChannel, body);
  const gov = (label, tone, body) => R(label, tone, office, 'email', body);

  switch (item.kind) {
    case 'offer': case 'nudge': case 'reconfirm':
      return [
        cons(`${k.first} accepts`, 'good', n === 1 ? `I accept the hearing for ${list} on ${dateLong}.` : `I accept ${n === 2 ? 'both' : 'all of these'} hearings on ${dateLong}.`),
        cons(`${k.first} declines`, 'bad', `I cannot attend on ${dateLong}. I have a conflict.`),
        cons(`${k.first} is unsure`, 'neutral', 'I need to check another commitment before I can say yes.'),
      ];
    case 'staffing': case 'chase_rep': {
      const f = item.repName.split(' ')[0];
      return [
        gov('Office confirms', 'good', `${f} is recorded as representative for ${list}.`),
        gov('Office has nothing', 'bad', `We have not received an assignment for ${list}.`),
      ];
    }
    case 'call_office': {
      const f = item.repName.split(' ')[0];
      return [
        R('Clerk confirms by phone', 'good', FIRM, 'phone note', `Called the ${first.ledger.county} office. Clerk confirmed ${f} is recorded for ${list}.`),
        R('Clerk cannot find the form', 'bad', FIRM, 'phone note', `Called the ${first.ledger.county} office. The clerk cannot find the form.`),
      ];
    }
    case 'verify_lead': {
      // One sentence per hearing, so that each keeps its own time.
      const leadOf = (c) => (item.leadBy && item.leadBy[c.id]) || item.lead;
      const dated = cases.filter((c) => c.ledger.schedule);
      if (!dated.length) return [];
      const stays = dated.map((c) => `The hearing for ${addr(c.ledger)} remains ${longDate(c.ledger.schedule.date)} at ${fmtTime(c.ledger.schedule.time)}.`).join(' ');
      const plain = dated.map((c) => {
        const l = leadOf(c), f = l.fields || {}, sc = c.ledger.schedule;
        if (l.type === 'hearing_postponed') return `The hearing for ${addr(c.ledger)} on ${longDate(sc.date)} is postponed. A new date will follow.`;
        if (l.type === 'change_denied' || !f.date) return null;
        return `The hearing for ${addr(c.ledger)} has been moved to ${longDate(f.date)} at ${fmtTime(f.time || sc.time)}.`;
      });
      const out = [gov('Office says nothing changed', 'good', stays)];
      if (plain.every(Boolean)) out.push(gov(item.hedged ? 'Office states the change plainly' : 'Office confirms the move', 'neutral', plain.join(' ')));
      return out;
    }
    case 'chase_written':
      if (item.off) {
        return [
          gov('Office confirms the postponement in writing', 'good', `The hearing for ${list} on ${dateLong} is postponed. A new date will follow.`),
          gov('Office says it stays', 'neutral', `The hearing for ${list} remains ${dateLong} at ${fmtTime(s.time)}.`),
        ];
      }
      return [
        gov('Office confirms the move in writing', 'good', `The hearing for ${list} has been moved to ${longDate(first.ledger.provisional.date)} at ${fmtTime(first.ledger.provisional.time || s.time)}.`),
        gov('Office says it stays', 'neutral', `The hearing for ${list} remains ${dateLong} at ${fmtTime(s.time)}.`),
      ];
    case 'send_packet':
      if (item.to.kind === 'office') {
        return [
          gov('Clerk confirms receipt', 'good', n === 1 ? `Packet received and readable for ${list}.` : `${n === 2 ? 'Both' : 'All'} packets received and readable.`),
          gov('Clerk cannot open a file', 'bad', `The file for ${addr(first.ledger)} was unreadable. Please resend it.`),
        ];
      }
      return [cons(`${k.first} confirms receipt`, 'good', n === 1 ? 'Current packet received and reviewed.' : 'Current packets received and reviewed.')];
    case 'confirm_assignment':
      return [cons(`${k.first} confirms the files`, 'good', n === 1 ? 'Current packet received and reviewed.' : 'Current packets received and reviewed.')];
    case 'signature': case 'clear_copy': {
      const o = item.obligation;
      if (item.kind === 'clear_copy' && item.phase === 'waiting') return [cons(`${k.first} sends a readable copy`, 'good', `I have emailed a clear scan of the signed ${DOC[o.kind]} for ${addr(first.ledger)}.`)];
      return [cons(`${k.first} signs with the link`, 'good', `I signed the ${DOC[o.kind]} for ${addr(first.ledger)} using the signing link.`)];
    }
    case 'obligation': {
      const o = item.obligation;
      const done = o.kind === 'withdrawal' ? `We have processed the withdrawal for ${addr(first.ledger)}. The hearing is removed from our schedule.`
        : o.kind === 'settlement' ? `We have received the signed settlement for ${addr(first.ledger)}.`
          : `We have received the homeowner statement for ${addr(first.ledger)}.`;
      const out = [gov(o.kind === 'withdrawal' ? 'Office processes the withdrawal' : 'Office confirms receipt', 'good', done)];
      if (o.kind === 'withdrawal' && s) out.push(gov('Office still lists the hearing', 'neutral', `Reminder: the hearing for ${addr(first.ledger)} remains listed for ${dateLong}.`));
      return out;
    }
    case 'homeowner': {
      if (item.phase !== 'waiting') return [];
      const h = first.ledger.homeowner;
      const w = item.change === 'withdrawal';
      return [
        R(`${h} confirms`, 'good', FIRM, 'phone note', w ? `Called ${h}. They confirmed they asked the county to withdraw the appeal for ${addr(first.ledger)} and understand it ends the appeal.` : `Called ${h}. They confirmed they asked the county to move the hearing for ${addr(first.ledger)}.`),
        R(`${h} says no`, 'bad', FIRM, 'phone note', w ? `Called ${h}. They did not ask to withdraw the appeal for ${addr(first.ledger)} and want it to continue.` : `Called ${h}. They did not ask the county to move the hearing for ${addr(first.ledger)}.`),
        R('No answer', 'neutral', FIRM, 'phone note', `Called ${h} about ${addr(first.ledger)}. No answer. Left a voicemail asking them to call back.`),
      ];
    }
    case 'dispute':
      if (item.dispute === 'withdrawal') {
        return [
          gov('Office will not process it', 'good', `We will not process the withdrawal for ${addr(first.ledger)}. The appeal remains active${s ? ` and the hearing stays on ${dateLong}` : ''}.`),
          gov('Office already processed it', 'bad', `We have processed the withdrawal for ${addr(first.ledger)}. The hearing is removed from our schedule.`),
        ];
      }
      return [gov('Office confirms the date', 'good', `The hearing for ${list} remains ${dateLong} at ${fmtTime(s.time)}.`)];
    case 'outcome':
      return [
        cons('Heard, nothing requested', 'good', `${list} ${n === 1 ? 'was' : 'were'} heard and no additional material was requested.`),
        cons('Continued', 'neutral', `They are giving us more time on ${list}.`),
      ];
    case 'consultant_update':
      return [cons(`${k.first} corrects the calendar`, 'good', `Thanks. I have put the ${n === 1 ? 'hearing' : 'hearings'} on ${dateLong} in my calendar.`)];
    default:
      return [];
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function longDate(date) {
  const [, m, d] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}
