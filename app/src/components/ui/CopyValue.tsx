import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { copyText } from '@/lib/download';
import { Button } from './Button';

/** "Type in Hearings Y15:" and the value in a copyable box, so a person never has to retype it from memory. */
export function CopyValue({ label, value, testId, className }: { label: string; value: string; testId?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div data-testid={testId} className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-small text-ink-2">{label}:</span>
      <div className="flex min-w-0 items-start gap-2">
        <span className="min-w-0 flex-1 rounded-control border border-border bg-surface-2 px-3 py-2 font-mono text-small leading-[20px] break-words text-ink">{value}</span>
        <Button
          size="sm"
          variant="secondary"
          aria-label={`Copy: ${value}`}
          icon={done ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
          onClick={() => {
            void copyText(value).then((ok) => setDone(ok));
          }}
        >
          {done ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
