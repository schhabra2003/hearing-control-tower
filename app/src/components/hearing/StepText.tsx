/**
 * A step sentence with its key facts emphasised: dates, times, the
 * consultants named on the Bench and the offices named on the Offices tab.
 */

import { useMemo } from 'react';
import { Sentence, stepParts } from '@/components/ui/Fact';
import { benchRows, offices } from '@/lib/data';

let cache: { people: string[]; places: string[] } | null = null;
function names(): { people: string[]; places: string[] } {
  if (!cache) cache = { people: benchRows().map((r) => String(r.cells.A ?? '').trim()).filter(Boolean), places: offices().map((o) => o.county) };
  return cache;
}

export function StepText({ text, className, max = 2 }: { text: string; className?: string; max?: number }) {
  const parts = useMemo(() => {
    const n = names();
    return stepParts(text, n.people, n.places);
  }, [text]);
  return <Sentence parts={parts} className={className} max={max} />;
}
