/**
 * The shell's status strip: "Integrations: 0 connected, 6 simulated, 3 not connected", a link to
 * #/integrations. No green dot and never the word "connected" for a tool: the count of connected
 * tools is 0 in this prototype. Goes in the top bar before the simulated clock.
 */

import { Plug } from 'lucide-react';
import { cn } from '@/lib/cn';
import { statusCounts, statusSentence } from './integrations';

export function IntegrationsStrip({ className }: { className?: string }) {
  const c = statusCounts();
  return (
    <a
      href="#/integrations"
      data-testid="integrations-strip"
      aria-label={`${statusSentence()}. Open Integrations.`}
      title={statusSentence()}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-2 rounded-control border border-border bg-surface px-3 text-small text-ink-2 transition-colors duration-[var(--dur-color)] hover:border-border-strong hover:text-ink max-md:w-8 max-md:justify-center max-md:px-0',
        className,
      )}
    >
      <Plug aria-hidden className="size-4 shrink-0" />
      <span aria-hidden className="max-md:hidden 2xl:hidden">
        <span className="tabular-nums">{c.simulated}</span> simulated
      </span>
      <span aria-hidden className="hidden 2xl:inline">
        Integrations: <span className="tabular-nums">{c.connected}</span> connected, <span className="tabular-nums">{c.simulated}</span> simulated, <span className="tabular-nums">{c.notConnected}</span> not connected
      </span>
    </a>
  );
}
