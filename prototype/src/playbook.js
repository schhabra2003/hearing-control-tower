// County playbooks are data, in layers: default -> state -> county. A county file holds only
// what differs from the layers above it. Adding a county means adding a small file, not code.

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function deepMerge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  return out;
}

// layers: { default: {...}, states: { [state]: {...} }, counties: [ {...}, ... ] }
export function resolvePlaybooks(layers) {
  const out = {};
  for (const county of layers.counties) {
    const stateLayer = (layers.states || {})[county.state] || {};
    const merged = deepMerge(deepMerge(layers.default, stateLayer), county);
    merged.layers = ['default', ...(layers.states && layers.states[county.state] ? [`state:${county.state}`] : []), `county:${county.id}`];
    merged.own_fields = countLeaves(county);
    merged.inherited_fields = countLeaves(merged) - merged.own_fields;
    out[county.county] = merged;
  }
  return out;
}

function countLeaves(o) {
  if (!isObj(o)) return 1;
  let n = 0;
  for (const [k, v] of Object.entries(o)) {
    if (['layers', 'own_fields', 'inherited_fields', 'note', 'autonomy_note', 'layer', 'history'].includes(k)) continue;
    n += countLeaves(v);
  }
  return n;
}

export const STAFFING_METHODS = {
  staffing_notice: {
    label: 'Staffing notice per case',
    steps: ['Email one staffing notice per case, naming the representative', 'Wait for the office to acknowledge'],
  },
  email_case_ids: {
    label: 'Email with case IDs and name',
    steps: ['Email the case IDs and the representative name to the clerk', 'Wait for the office to acknowledge'],
  },
  form_then_call: {
    label: 'County form, then a phone call',
    steps: ['Email the county staffing form, filled in', 'Call the clerk to have it entered on the list of representatives', 'Ask for written confirmation'],
  },
};

// Turn a government statement that contradicts the saved rules into a proposed change.
// In rules mode this recognises the patterns below. In AI mode the playbook agent drafts the
// same structure from the text. Either way a person approves it before it takes effect.
export function proposeChange(playbook, text) {
  const t = text.toLowerCase();
  const changes = [];
  if (/form/.test(t) && /call/.test(t)) {
    changes.push({ path: 'staffing.method', from: playbook.staffing.method, to: 'form_then_call' });
    changes.push({ path: 'staffing.template', from: playbook.staffing.template, to: 'staffing_form' });
    changes.push({ path: 'staffing.channel', from: playbook.staffing.channel, to: 'email, then phone' });
  } else if (/form/.test(t)) {
    changes.push({ path: 'staffing.method', from: playbook.staffing.method, to: 'staffing_notice' });
  } else if (/portal/.test(t)) {
    changes.push({ path: 'staffing.channel', from: playbook.staffing.channel, to: 'portal' });
  }
  const hours = t.match(/(\d{2,3})\s*hours? before/);
  if (hours && +hours[1] !== playbook.packet.lead_hours) changes.push({ path: 'packet.lead_hours', from: playbook.packet.lead_hours, to: +hours[1] });
  return changes;
}

export function applyChange(playbook, changes, meta) {
  const next = JSON.parse(JSON.stringify(playbook));
  for (const ch of changes) {
    const keys = ch.path.split('.');
    let o = next;
    for (const k of keys.slice(0, -1)) o = o[k] = o[k] || {};
    o[keys[keys.length - 1]] = ch.to;
  }
  next.version = (playbook.version || 1) + 1;
  next.verified_at = meta.date;
  next.verified_from = meta.source;
  next.history = [...(playbook.history || []), { version: playbook.version || 1, replaced_at: meta.date, changes }];
  return next;
}
