/**
 * The routes and palette entries: the later control tower pages and Evidence.
 */

import type { PaletteEntry, RouteDef } from '@/lib/router';
import { Board } from './later/Board';
import { Queue } from './later/Queue';
import { Messages } from './later/Messages';
import { TryMessage } from './later/TryMessage';
import { Counties } from './later/Counties';
import { Scale } from './later/Scale';
import { Business } from './later/Business';
import { Checks } from './later/Checks';
import { How } from './later/How';
import { Evidence } from './Evidence';

const later = (id: string, title: string, component: RouteDef['component']): RouteDef => ({
  id: `later-${id}`,
  path: `/later/${id}`,
  title,
  section: 'Later: control tower',
  width: 'work',
  later: true,
  component,
});

export const routes: RouteDef[] = [
  later('board', 'Board', Board),
  later('queue', 'Work queue', Queue),
  later('messages', 'Messages', Messages),
  later('try', 'Try a message', TryMessage),
  later('counties', 'Counties', Counties),
  later('scale', 'Scale', Scale),
  later('business', 'Business case', Business),
  later('checks', 'Checks', Checks),
  later('how', 'How it works', How),
  Object.assign({ id: 'evidence', path: '/evidence', title: 'How we know', section: 'Results', width: 'reading', component: Evidence } as RouteDef, { own: true }),
];

export const palette: PaletteEntry[] = [
  { id: 'later-replay', group: 'Commands', label: 'Replay the example week on the Board', keywords: ['control tower', 'history'], to: '#/later/board' },
  { id: 'later-try', group: 'Commands', label: 'Try a message in the control tower', keywords: ['forged', 'phone', 'reader'], to: '#/later/try' },
  { id: 'later-checks', group: 'Commands', label: 'Run the engine checks in this browser', keywords: ['tests', 'problems'], to: '#/later/checks' },
  { id: 'later-business', group: 'Pages', label: 'Business case: cost and savings', keywords: ['cost', 'costs', 'money', 'budget', 'savings', 'saving', 'business case', 'fee', 'set-up', '12,000', 'pays'], to: '#/later/business' },
  { id: 'later-how-agents', group: 'Pages', label: 'What each later agent may and may never do', keywords: ['autonomy', 'L0', 'L1', 'L2', 'promotion', 'demotion', 'may never', 'agent roles'], to: '#/later/how' },
  { id: 'evidence-live22', group: 'Pages', label: 'Live reader results, Nov 22', keywords: ['live run', 'accuracy', 'reader results', '73 of 81', 'wrong proof'], to: '#/evidence?item=live22' },
  { id: 'evidence-sheet', group: 'Commands', label: 'Show the installed sheet and its MD5', keywords: ['md5', 'gate sheet'], to: '#/evidence?filter=sheet' },
];
