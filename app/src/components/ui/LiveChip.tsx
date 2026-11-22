import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { getLive, liveLabel, liveSentence, refreshLiveStatus, useLive, usd } from '@/lib/live';
import { Tooltip } from './Tooltip';

/**
 * "Live AI" or "Recorded answers": where the readers' answers come from. The same quiet chip as
 * StatusChip (hairline, 6 px dot, the word in ink); the sentence behind it is also the chip's
 * accessible name, so the fact never lives only in the hint. Asks the server once on mount.
 */
export function LiveChip({ className, showCost = false }: { className?: string; showCost?: boolean }) {
  const s = useLive((x) => x);
  useEffect(() => {
    if (getLive().server === 'unknown') void refreshLiveStatus();
  }, []);
  const label = liveLabel(s);
  const live = label === 'Live AI';
  const sentence = liveSentence(s);
  return (
    <Tooltip content={sentence}>
      <span
        tabIndex={0}
        role="status"
        aria-label={`${label}. ${sentence}`}
        data-testid="live-chip"
        data-mode={live ? 'live' : 'recorded'}
        className={cn('inline-flex h-7 items-center gap-2 rounded-chip border border-border bg-surface px-2 text-small leading-none font-medium whitespace-nowrap text-ink', className)}
      >
        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', live ? 'bg-dot-ok' : 'shadow-[inset_0_0_0_1.25px_var(--border-strong)]')} />
        {/* A phone shows the first word only ("Recorded"); the full words stay in the aria-label. */}
        <span className="hd-chip-full">{label}</span>
        <span className="hd-chip-short" aria-hidden>{label.split(' ')[0]}</span>
        {showCost && live && s.status ? <span className="font-normal text-ink-2 tabular-nums">{usd(s.status.costUsd)} spent</span> : null}
      </span>
    </Tooltip>
  );
}
