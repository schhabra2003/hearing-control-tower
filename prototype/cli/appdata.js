// Assembles everything the web app needs into one object: the example packet, the simulated
// timeline, the county playbooks, the hand labels, and (when they exist) the results of the
// check run, the scale runs and the recorded AI reads. Used by the dev server and by the
// single-file build, so both show exactly the same data.

import fs from 'node:fs';
import path from 'node:path';
import { loadAll, ROOT } from './load.js';

const optional = (p) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return null; } };

export function assembleData() {
  const d = loadAll();
  return {
    packet: d.packet,
    timeline: { note: d.timeline.note, record_snapshot: d.timeline.record_snapshot },
    playbooks: d.playbooks,
    messages: d.messages,
    gold: d.gold,
    coverage: optional('eval/coverage.json'),
    scale: optional('eval/scale.json'),
    recorded: optional('data/recorded_reads.json'),
    reader_results: optional('eval/reader_results.json'),
    heldout: optional('data/heldout.json'),
  };
}
