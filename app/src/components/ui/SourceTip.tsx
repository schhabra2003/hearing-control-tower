import * as RT from '@radix-ui/react-tooltip';
import { useSession } from '@/lib/store';
import { useState, type ReactNode } from 'react';
import { useLocation } from '@/lib/router';
import { LABELS, type LabelKind } from '@/lib/labels';
import { bootParam } from '@/lib/boot';
import { Label } from './Label';
import { SourceTag } from './SourceTag';

export interface SourceInfo {
  label: LabelKind;
  /** The label's word when it differs, for example "Measured on the sheet". */
  labelText?: string;
  /** The cell or the command, for example "Measures B3". */
  source: string;
  /** How it was counted, in the source's own words. */
  counted: string;
  /** "Friday, June 7, 2030 (Settings B2)". */
  asOf: string;
}

/**
 * "How this number is known": a Label pill that opens, on hover or keyboard focus, the label, the
 * source, how it was counted and the date it stands on. ?tip=<tipId> opens it for a screenshot.
 */
export function SourceTip({ info, tipId, children }: { info: SourceInfo; tipId?: string; children?: ReactNode }) {
  const loc = useLocation();
  const forced = tipId !== undefined && (loc.query.get('tip') === tipId || bootParam('tip') === tipId);
  const [open, setOpen] = useState(false);
  const touring = useSession((s) => s.tourStep !== null);
  return (
    <RT.Root open={!touring && (forced || open)} onOpenChange={setOpen} delayDuration={150}>
      <RT.Trigger asChild>
        {children ?? (
          <Label kind={info.label} text={info.labelText} title="" tabIndex={0} role="button" aria-label={`${info.labelText ?? LABELS[info.label].word}. How this number is known`} />
        )}
      </RT.Trigger>
      <RT.Portal>
        <RT.Content
          data-testid="source-tip"
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-[60] w-[340px] rounded-card bg-surface p-4 text-ink shadow-e2"
        >
          <p className="text-eyebrow mb-3 text-muted">How this number is known</p>
          <dl className="grid grid-cols-[84px_1fr] gap-x-3 gap-y-2 text-small">
            <dt className="text-muted">Label</dt>
            <dd className="flex flex-col items-start gap-1"><Label kind={info.label} size="sm" title="" />{info.labelText ? <span className="text-ink-2">{info.labelText}</span> : null}</dd>
            <dt className="text-muted">Source</dt>
            <dd><SourceTag visible>{info.source}</SourceTag></dd>
            <dt className="text-muted">Counted</dt>
            <dd className="text-ink-2">{info.counted}</dd>
            <dt className="text-muted">As of</dt>
            <dd className="text-ink-2">{info.asOf}</dd>
          </dl>
          <RT.Arrow className="fill-surface" width={12} height={6} />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
