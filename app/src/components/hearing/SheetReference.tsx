/*
 * SheetReference: the one place where gate codes and cell references show. A
 * native details element, closed by default, so it works without script and an agent reads it in
 * the DOM.
 */

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function SheetReference({ children, testId, className, label = 'Sheet reference' }: { children: ReactNode; testId?: string; className?: string; label?: string }) {
  return (
    <details data-testid={testId} className={cn('group text-small text-ink-2', className)}>
      <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-control pr-2 font-medium text-ink-2 outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 transition-transform duration-[var(--dur-color)] group-open:rotate-90 motion-reduce:transition-none" />
        {label}
      </summary>
      <div className="mt-1 pl-4">{children}</div>
    </details>
  );
}
