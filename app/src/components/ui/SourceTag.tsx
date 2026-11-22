import { cn } from '@/lib/cn';

/**
 * Where a value comes from: a cell ("Measures B3") or a command ("node cli/check.js").
 * By default nothing shows beside the value (the reference is read to a screen reader, and a card
 * lists its cells under one "Sheet reference" disclosure), so references never break a sentence.
 * `visible` prints the reference in a sunken mono box, for places whose job is to show it.
 */
export function SourceTag({ children, className, visible = false }: { children: string; className?: string; visible?: boolean }) {
  if (visible) {
    return (
      <span className={cn('inline-flex min-h-5 items-center rounded-nav bg-sunken px-2 font-mono text-small leading-none text-ink-2 [overflow-wrap:anywhere]', className)}>
        {children}
      </span>
    );
  }
  // No glyph after the value: the reference is read to a screen reader and listed under "Sheet reference".
  return (
    <span data-testid="source-ref" data-ref={children} className="sr-only">
      {`Source: ${children}`}
    </span>
  );
}
