/**
 * The navigation in the layout's groups (Work, Records, Results, About, Later),
 * for the phone bar, its More sheet and the command palette (the desktop sidebar is layout/Shell.tsx).
 * Its items, icons, test ids and the counts each shows. Counts are read from the data and the session, never typed.
 */

import {
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  Calculator,
  Clock3,
  Code2,
  FileCheck2,
  Gavel,
  Inbox,
  LayoutGrid,
  LayoutList,
  ListChecks,
  ListTodo,
  Mail,
  Map,
  PenLine,
  Plug,
  Reply,
  Sunrise,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { changeCounts } from '@/lib/officeChanges';
import { proposalCounts } from '@/lib/decisions';
import { passDone } from '@/lib/today';
import type { Session } from '@/lib/store';

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  testId: string;
  /** Path prefixes that make this item the active one. */
  match: string[];
  /**
   * Shown only where something waits for a person (proposals, office changes) or, for a pass, its
   * progress ("1/4"). Red only when it needs action today. Totals live in the page header.
   */
  count?: (s: Session) => { value: number; meaning: string; urgent: boolean; display?: string } | null;
  /** The keyboard sequence that opens it, for the tooltip. */
  keys?: string;
}

export interface NavGroup {
  id: string;
  title: string | null;
  items: NavItem[];
  later?: boolean;
}


export const NAV: NavGroup[] = [
  {
    id: 'work',
    title: 'Work',
    items: [
      { id: 'today', label: 'Today', to: '/', icon: LayoutList, testId: 'nav-today', match: ['/'], keys: 'G O' },
      {
        id: 'today-9am',
        label: '9:00 a.m. pass',
        to: '/today/9am',
        icon: Sunrise,
        testId: 'nav-today-9am',
        match: ['/today/9am'],
        keys: 'G T',
        count: (s) => {
          const done = passDone(s, '0900').length;
          return { value: done, meaning: 'of 4 steps done', urgent: false, display: `${done}/4` };
        },
      },
      {
        id: 'today-2pm',
        label: '2:00 p.m. review',
        to: '/today/2pm',
        icon: Clock3,
        testId: 'nav-today-2pm',
        match: ['/today/2pm'],
        count: (s) => {
          const done = passDone(s, '1400').length;
          return { value: done, meaning: 'of 4 steps done', urgent: false, display: `${done}/4` };
        },
      },
      { id: 'hearings', label: 'Hearings', to: '/hearings', icon: Gavel, testId: 'nav-hearings', match: ['/hearings'], keys: 'G H' },
      {
        id: 'suggestions',
        label: 'Check messages',
        to: '/suggestions',
        icon: Inbox,
        testId: 'nav-suggestions',
        match: ['/suggestions'],
        keys: 'G S',
        count: (s) => {
          const n = proposalCounts(s.proposals, s.pasted).waiting;
          return n > 0 ? { value: n, meaning: 'proof links wait for a decision', urgent: false } : null;
        },
      },
      {
        id: 'offices',
        label: 'Offices',
        to: '/offices',
        icon: Building2,
        testId: 'nav-offices',
        match: ['/offices'],
        keys: 'G F',
        count: (s) => {
          const waiting = changeCounts(s).waiting.length;
          return waiting > 0 ? { value: waiting, meaning: waiting === 1 ? 'office change waits for a decision today' : 'office changes wait for a decision today', urgent: true } : null;
        },
      },
    ],
  },
  {
    id: 'records',
    title: 'Records',
    items: [
      { id: 'bench', label: 'Bench', to: '/bench', icon: Users, testId: 'nav-bench', match: ['/bench'], keys: 'G B' },
      { id: 'replies', label: 'Replies', to: '/replies', icon: Reply, testId: 'nav-replies', match: ['/replies'], keys: 'G R' },
      { id: 'calendar', label: 'Calendar file', to: '/calendar', icon: CalendarDays, testId: 'nav-calendar', match: ['/calendar'], keys: 'G C' },
      { id: 'integrations', label: 'Integrations', to: '/integrations', icon: Plug, testId: 'nav-integrations', match: ['/integrations'], keys: 'G I' },
    ],
  },
  {
    id: 'results',
    title: 'Results',
    items: [
      { id: 'measures', label: 'Measures and costs', to: '/measures', icon: BarChart3, testId: 'nav-measures', match: ['/measures'], keys: 'G M' },
      { id: 'evidence', label: 'How we know', to: '/evidence', icon: FileCheck2, testId: 'nav-evidence', match: ['/evidence'], keys: 'G E' },
    ],
  },
  {
    id: 'about',
    title: 'About',
    items: [
      { id: 'how', label: 'How it works', to: '/how', icon: BookOpen, testId: 'nav-how', match: ['/how'] },
      { id: 'ai', label: 'What the AI does', to: '/ai', icon: Bot, testId: 'nav-ai', match: ['/ai'] },
      { id: 'agents', label: 'For agents', to: '/agents', icon: Code2, testId: 'nav-agents', match: ['/agents'] },
    ],
  },
  {
    id: 'later',
    title: 'Later',
    later: true,
    items: [
      { id: 'later-board', label: 'Board', to: '/later/board', icon: LayoutGrid, testId: 'nav-later-board', match: ['/later/board'], keys: 'G L' },
      { id: 'later-queue', label: 'Work queue', to: '/later/queue', icon: ListTodo, testId: 'nav-later-queue', match: ['/later/queue'] },
      { id: 'later-messages', label: 'Messages', to: '/later/messages', icon: Mail, testId: 'nav-later-messages', match: ['/later/messages'] },
      { id: 'later-try', label: 'Try a message', to: '/later/try', icon: PenLine, testId: 'nav-later-try', match: ['/later/try'] },
      { id: 'later-counties', label: 'Counties', to: '/later/counties', icon: Map, testId: 'nav-later-counties', match: ['/later/counties'] },
      { id: 'later-scale', label: 'Scale', to: '/later/scale', icon: TrendingUp, testId: 'nav-later-scale', match: ['/later/scale'] },
      { id: 'later-business', label: 'Business case', to: '/later/business', icon: Calculator, testId: 'nav-later-business', match: ['/later/business'] },
      { id: 'later-checks', label: 'Checks', to: '/later/checks', icon: ListChecks, testId: 'nav-later-checks', match: ['/later/checks'] },
      { id: 'later-how', label: 'How it works', to: '/later/how', icon: BookOpen, testId: 'nav-later-how', match: ['/later/how'] },
    ],
  },
];

export function isActive(item: NavItem, path: string): boolean {
  return item.match.some((m) => (m === '/' ? path === '/' : path === m || path.startsWith(`${m}/`)));
}

/** The five items of the phone's bottom bar; "More" opens the rest. */
export const PHONE_BAR = ['today', 'today-9am', 'hearings', 'suggestions'];
