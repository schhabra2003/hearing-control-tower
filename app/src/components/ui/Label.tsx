import { forwardRef, type HTMLAttributes } from 'react';
import { LABELS, type LabelKind } from '@/lib/labels';
import { cn } from '@/lib/cn';

/** The glyph carries the source colour; the chip itself is the Badge look (hairline, surface, ink word; no status fills). */
const TONE: Record<LabelKind, string> = {
  measured: '[&>svg]:text-measured',
  simulated: '[&>svg]:text-simulated',
  estimate: '[&>svg]:text-estimate',
  packet: '[&>svg]:text-packet',
  recorded: '[&>svg]:text-ink-2',
  sheet: '[&>svg]:text-measured',
};

/** The glyph of each label: a shape, so the label never depends on colour alone. */
export function LabelGlyph({ kind, className }: { kind: LabelKind; className?: string }) {
  const c = cn('size-2.5 shrink-0', className);
  switch (kind) {
    case 'measured':
    case 'sheet':
      return <svg aria-hidden viewBox="0 0 10 10" className={c}><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>;
    case 'simulated':
      return <svg aria-hidden viewBox="0 0 10 10" className={c}><circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.6" /></svg>;
    case 'estimate':
      return <svg aria-hidden viewBox="0 0 10 10" className={c}><circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M5 1.4a3.6 3.6 0 0 1 0 7.2z" fill="currentColor" /></svg>;
    case 'packet':
      return <svg aria-hidden viewBox="0 0 10 10" className={c}><rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor" /></svg>;
    case 'recorded':
      return <svg aria-hidden viewBox="0 0 10 10" className={c}><path d="M2 1.5 8.5 5 2 8.5z" fill="currentColor" /></svg>;
    default:
      return null;
  }
}

export interface LabelProps extends HTMLAttributes<HTMLSpanElement> {
  kind: LabelKind;
  /** A longer description, shown on hover; the chip itself always shows its one word. */
  text?: string;
  size?: 'sm' | 'md';
}

/** A badge with a glyph and one word: Measured, Simulated, Estimate or Packet. */
export const Label = forwardRef<HTMLSpanElement, LabelProps>(function Label({ kind, text, size = 'md', className, title, ...rest }, ref) {
  return (
    <span
      ref={ref}
      data-testid={`label-${kind}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-chip border border-border bg-surface font-medium whitespace-nowrap text-ink',
        size === 'sm' ? 'h-6 px-2 text-small' : 'h-7 px-2 text-small',
        TONE[kind],
        className,
      )}
      title={title ?? text}
      {...rest}
    >
      <LabelGlyph kind={kind} />
      {LABELS[kind].word}
    </span>
  );
});
