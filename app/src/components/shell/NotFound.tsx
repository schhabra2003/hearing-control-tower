import { MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { navigate } from '@/lib/router';
import { hearings, offices } from '@/lib/data';
import { NAV } from './nav';

/** Edit distance between two short strings. */
function distance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = d[0]!;
    d[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const keep = d[j]!;
      d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return d[b.length]!;
}

/** Every page a typo could mean: the menu, each hearing and each office. Same names get "(later)". */
function candidates(): { label: string; to: string }[] {
  const nav = NAV.flatMap((g) => g.items).filter((i) => i.to !== '/');
  const seen = new Map<string, number>();
  for (const i of nav) seen.set(i.label, (seen.get(i.label) ?? 0) + 1);
  const pages = nav.map((i) => ({ label: (seen.get(i.label) ?? 0) > 1 && i.to.startsWith('/later/') ? `${i.label} (later)` : i.label, to: i.to }));
  return [
    ...pages,
    ...hearings.map((h) => ({ label: `Hearing ${h.case}`, to: `/hearings/${h.case}` })),
    ...offices().map((o) => ({ label: `${o.county} office`, to: `/offices/${o.slug}` })),
  ];
}

/**
 * The pages closest to a path that does not exist, nearest first, compared segment by segment
 * (#/later/busines gives Business case first; #/hearing/AX-107 gives Hearing AX-107 first).
 */
function closest(path: string): { label: string; to: string }[] {
  const typed = path.toLowerCase().replace(/\/+$/, '');
  const segs = typed.split('/').filter(Boolean);
  const score = (to: string): number => {
    const t = to.toLowerCase();
    const ts = t.split('/').filter(Boolean);
    let seg = Math.abs(ts.length - segs.length) * 4;
    for (let k = 0; k < Math.max(ts.length, segs.length); k += 1) seg += distance(segs[k] ?? '', ts[k] ?? '');
    return Math.min(distance(typed, t), seg);
  };
  const ranked = candidates()
    .map((i) => ({ i, d: score(i.to) }))
    .sort((x, y) => x.d - y.d);
  const out: { label: string; to: string }[] = [];
  for (const { i } of ranked) {
    if (!out.some((o) => o.to === i.to)) out.push(i);
    if (out.length === 4) break;
  }
  return out;
}

/** Any route that is not registered ("Go to Today", and the closest routes as links). */
export function NotFound({ path }: { path: string }) {
  const near = closest(path);
  return (
    <EmptyState
      testId="page-not-found"
      size="page"
      headingLevel={1}
      icon={<MapPinOff aria-hidden />}
      title="This page does not exist"
      description={`There is no page at #${path}.`}
      action={<Button variant="primary" size="md" onClick={() => navigate('/')}>Go to Today</Button>}
    >
      <p className="mt-2 text-body text-ink-2">Closest pages:</p>
      <ul className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-2 text-body" data-testid="not-found-closest">
        {near.map((n) => (
          <li key={n.to}>
            <a className="font-medium text-accent hover:underline" href={`#${n.to}`}>
              {n.label}
            </a>
          </li>
        ))}
      </ul>
    </EmptyState>
  );
}
