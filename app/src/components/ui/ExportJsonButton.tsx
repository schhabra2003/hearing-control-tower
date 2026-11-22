import { Braces } from 'lucide-react';
import { downloadJson } from '@/lib/agentData';
import { Button } from './Button';

/** "Export as JSON": downloads the rows a page shows, for people and agents who want the data. */
export function ExportJsonButton({ name, rows, testId }: { name: string; rows: () => unknown; testId: string }) {
  return (
    <Button variant="secondary" size="md" data-testid={testId} icon={<Braces aria-hidden className="size-4" />} onClick={() => downloadJson(name, rows())}>
      Export as JSON
    </Button>
  );
}
