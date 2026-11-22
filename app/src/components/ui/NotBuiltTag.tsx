/**
 * NotBuiltTag: the one tag that marks the later control tower as not built this season, rendered as
 * the Badge family's "later" tone. Same words
 * and look everywhere: sentence case, a dashed outline in the --later colour, no dot.
 */
import { Badge } from './Badge';

export function NotBuiltTag({ className, testId }: { className?: string; testId?: string }) {
  return (
    <Badge tone="later" plain size="sm" className={className} testId={testId}>
      Not built
    </Badge>
  );
}
