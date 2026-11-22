/**
 * SourceChip: a small dot and one word (Measured, Simulated, Estimate, Packet, Recorded). The source,
 * the cell and how it was counted open on hover or keyboard focus, so the card itself stays quiet.
 *
 * Written for Hearing Desk. The quiet "swatch beside the text, text never in the series colour"
 * rule comes from uvain, "Charts & KPI Cards" (Layro System), https://21st.dev/uvain/revenue-charts-kpi
 */
import { LabelGlyph } from '@/components/ui/Label';
import { Tooltip } from '@/components/ui/Tooltip';
import type { LabelKind } from '@/lib/labels';
import { cn } from '@/lib/cn';

export const CHIP_WORD: Record<LabelKind, string> = {
  measured: 'Measured',
  simulated: 'Simulated',
  estimate: 'Estimate',
  packet: 'Packet',
  recorded: 'Recorded',
  sheet: 'Measured',
};

const TONE: Record<LabelKind, string> = {
  measured: 'text-measured',
  simulated: 'text-simulated',
  estimate: 'text-estimate',
  packet: 'text-packet',
  recorded: 'text-ink-2',
  sheet: 'text-measured',
};

export interface SourceChipProps {
  kind: LabelKind;
  /** The cell or the command, for example "Measures B3" or "cli/scale.js". */
  source: string;
  /** One short sentence on how the value is counted. Shown in the tooltip only. */
  counted?: string;
  testId?: string;
  className?: string;
}

export function SourceChip({ kind, source, counted, testId, className }: SourceChipProps) {
  const word = CHIP_WORD[kind];
  return (
    <Tooltip
      content={
        <span className="flex flex-col gap-1">
          <span>
            {word}. Source: <span className="font-mono text-small">{source}</span>
          </span>
          {counted ? <span className="opacity-80">{counted}</span> : null}
        </span>
      }
    >
      <button
        type="button"
        data-testid={testId}
        aria-label={`${word}. Source: ${source}${counted ? `. ${counted}` : ''}`}
        className={cn(
          'inline-flex h-6 shrink-0 cursor-default items-center gap-2 rounded-full px-2 text-small font-medium whitespace-nowrap',
          'transition-colors duration-[var(--dur-color)] hover:bg-surface-2 focus-visible:bg-surface-2',
          TONE[kind],
          className,
        )}
      >
        <LabelGlyph kind={kind} />
        <span className="text-ink-2">{word}</span>
      </button>
    </Tooltip>
  );
}
