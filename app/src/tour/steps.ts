/** The eleven stops of the guided tour. Each stop says what is real. */

export interface TourStop {
  n: number;
  /** The route the tour opens first; query parameters open a drawer or a source tip. */
  route: string;
  /** data-testid of the element the spotlight rings. */
  target: string;
  title: string;
  body: string;
  /** Short name of the stop, used on the Next button of the stop before. */
  short: string;
}

export const TOUR: TourStop[] = [
  { n: 1, route: '/how', target: 'overview-hero', short: 'What it does', title: 'What Hearing Desk does', body: 'The goal: a named consultant who said yes on every hearing, three working days ahead. Five checks prove it, and a person decides.' },
  { n: 2, route: '/how', target: 'overview-kpis', short: 'Four numbers', title: 'The example week in four numbers', body: 'The sheet counts each one on the example week. Each label opens its source cell.' },
  { n: 3, route: '/how', target: 'layer-later', short: 'Now and later', title: 'What runs now, and what comes later', body: 'Season one is the sheet and its tools, and it runs now. The control tower is a prototype for later, with simulated numbers.' },
  { n: 4, route: '/today/9am', target: 'pass-stepper', short: 'The 9:00 a.m. pass', title: 'The 9:00 a.m. pass', body: "Four steps, in order. Step 2 stays open until a person decides each office change." },
  { n: 5, route: '/hearings/AX-107', target: 'gates', short: 'One hearing', title: 'One hearing, five checks', body: 'A check is done only with a link to the message that proves it. Click a message to read it.' },
  { n: 6, route: '/today/9am?open=AX-103', target: 'proposal-AX-103-G1', short: 'A person decides', title: 'A person decides', body: 'The readers propose a proof link from message 7. A person accepts or refuses it. Nothing files itself.' },
  { n: 7, route: '/hearings/AX-107?tab=lines', target: 'be-lines', short: 'What the sheet prints', title: 'What the sheet prints', body: 'The next steps as the sheet prints them, with the column that writes each line.' },
  { n: 8, route: '/offices/tesswick', target: 'process-change-tesswick', short: 'An office change', title: 'An office changed how it works', body: 'No notice goes to Tesswick until a person approves the change.' },
  { n: 9, route: '/later/scale', target: 'scale-kpis', short: 'How it scales', title: 'How it scales', body: 'Simulated, not built: a made-up firm grows to 3,200 hearings and person-minutes per hearing stay flat. Run it yourself up to 5,000.' },
  { n: 10, route: '/today/2pm', target: 'focus-card', short: 'The 2:00 p.m. review', title: 'The 2:00 p.m. review', body: 'Every flagged row gets a next action, an owner and a due time by 2:30 p.m. Then the calendar file is refilled.' },
  { n: 11, route: '/evidence', target: 'evidence-checks', short: 'How we know', title: 'How we know', body: 'Each check behind the numbers, with its command and the line it prints. Every figure carries its label.' },
];
