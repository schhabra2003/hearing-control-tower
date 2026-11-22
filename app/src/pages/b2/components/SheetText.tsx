import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/cn';
import { SourceTag } from '@/components/ui/SourceTag';
import { appDates } from '@/lib/sheetText';
import { hasCapitals, sentenceCase } from '../lib';

/**
 * A line the sheet prints in capitals, shown in sentence case for reading, with a dotted underline:
 * a click or Enter on the line opens the exact text "as printed on the sheet", with its cell. Text without a run of capitals
 * is shown as typed, with no button.
 */
export function SheetText({
  text,
  cell,
  className,
  as: Tag = 'span',
  heading = 'As printed on the sheet',
}: {
  text: string;
  cell: string;
  className?: string;
  as?: 'span' | 'p';
  /** Where the capitals come from, when not the sheet itself: "As the office rule prints it". */
  heading?: string;
}) {
  if (!hasCapitals(text)) return <Tag className={className}>{text}</Tag>;
  return (
    <Tag className={className}>
      <Popover.Root>
        <Popover.Trigger
          className="inline cursor-help text-left underline decoration-border-strong decoration-dotted underline-offset-4 transition-colors duration-[var(--dur-color)] hover:decoration-ink-2 data-[state=open]:decoration-accent"
        >
          {appDates(sentenceCase(text))}
          <span className="sr-only">{`. ${heading}, ${cell}`}</span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={16}
            className={cn('z-[60] w-[min(520px,calc(100vw-32px))] rounded-[var(--radius-card)] bg-surface p-4 text-ink shadow-e2')}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-eyebrow text-muted">{heading}</p>
              <SourceTag visible>{cell}</SourceTag>
            </div>
            <p className="font-mono text-small leading-relaxed break-words text-ink">{text}</p>
            <Popover.Arrow className="fill-surface" width={12} height={6} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </Tag>
  );
}
