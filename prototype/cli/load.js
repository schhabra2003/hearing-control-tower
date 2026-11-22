// Loads the packet, timeline, playbooks and hand labels from disk (Node only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

export function loadAll() {
  const packet = readJson('data/packet.json');
  const timeline = readJson('data/timeline.json');
  const gold = readJson('data/gold_dev.json');
  const dirPb = path.join(ROOT, 'playbooks');
  const files = fs.readdirSync(dirPb).filter((f) => f.endsWith('.json')).sort();
  const playbooks = { default: null, states: {}, counties: [] };
  for (const f of files) {
    const pb = JSON.parse(fs.readFileSync(path.join(dirPb, f), 'utf8'));
    if (pb.layer === 'default') playbooks.default = pb;
    else if (pb.layer === 'state') playbooks.states[pb.state] = pb;
    else playbooks.counties.push(pb);
  }
  const messages = packet.messages
    .map((m) => ({ ...m, at: timeline.times[String(m.id)] }))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return { packet, timeline, playbooks, messages, gold, readJson };
}
