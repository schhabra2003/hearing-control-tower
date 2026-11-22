import { Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

/** A message link a person pastes on the sheet, shown in full with a Copy button. */
export function CopyLink({ link, className }: { link: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link);
      setState('copied');
    } catch {
      setState('failed');
    }
  };
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <code className="rounded-chip bg-sunken px-2 py-1 font-mono text-small [overflow-wrap:anywhere] text-ink">{link}</code>
      <button
        type="button"
        data-testid="copy-link"
        onClick={() => void copy()}
        className="inline-flex h-8 items-center gap-1 rounded-control px-2 text-small font-medium text-accent hover:bg-accent-soft"
      >
        <Copy aria-hidden className="size-3.5" />
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy link'}
      </button>
    </span>
  );
}
