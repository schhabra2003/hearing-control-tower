import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Hearing } from '@/types/data';
import { benchRows } from '@/lib/data';
import { dateShort, sheetTime } from '@/lib/format';
import { firstInstruction } from '@/lib/sheetText';
import { actions, getSession } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';

/** The people a next step can go to: the consultants on the Bench tab, by name. */
const benchNames = (): string[] => [...new Set(benchRows().filter((r) => r.row > 1).map((r) => String(r.cells.A).trim()))];
const DEFAULT_DUE = '14:30';

/** "2030-06-07T14:30" as "Fri, Jun 7, 2:30 p.m.", or null when it is not a date and time. */
function dueText(v: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(v);
  return m ? `${dateShort(m[1])}, ${sheetTime(m[2])}` : null;
}

/**
 * Next action (Y), owner (Z) and due (AA) for a flagged row, at the 2:00 p.m. review. Owner starts
 * empty (or with the name typed last time), with the Bench names to pick from, and Due as today at 2:30 p.m. (the review's own deadline), in office time.
 * "Use the first line" fills the action with the sheet's first instruction in plain case. Saving
 * keeps it in this session only, says which cells to type, and moves on to the next row.
 */
export function NextStepForm({ hearing, onSaved, autoFocus = false, bare = false }: { hearing: Hearing; onSaved?: () => void; autoFocus?: boolean; /** Inside a titled block: no heading of its own. */ bare?: boolean }) {
  const day = getSession().clock.day;
  const [action, setAction] = useState('');
  const me = getSession().me ?? '';
  const [owner, setOwner] = useState(me);
  const [due, setDue] = useState(`${day}T${DEFAULT_DUE}`);
  const [tried, setTried] = useState(false);
  const first = useRef<HTMLTextAreaElement>(null);
  const line1 = hearing.printedLines[0]?.text ?? '';
  const dueWords = dueText(due);
  const valid = action.trim() !== '' && owner.trim() !== '' && dueWords !== null;

  useEffect(() => {
    setAction('');
    setOwner(getSession().me ?? '');
    setDue(`${day}T${DEFAULT_DUE}`);
    setTried(false);
    if (autoFocus) first.current?.focus({ preventScroll: true });
  }, [hearing.case, autoFocus, day]);

  const save = (e?: FormEvent): void => {
    e?.preventDefault();
    setTried(true);
    if (!valid || !dueWords) return;
    actions.setNextStep(hearing.case, { action: action.trim(), owner: owner.trim(), due: dueWords });
    if (!benchNames().includes(owner.trim())) actions.rememberMe(owner.trim());
    toast({ title: 'Next step saved here', body: 'The coordinator types it on the sheet.', tone: 'success' });
    onSaved?.();
  };

  return (
    <form data-testid="next-step-form" onSubmit={save} noValidate className="flex flex-col gap-4" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}>
      <div className={bare ? 'flex flex-wrap items-center justify-end gap-2' : 'flex flex-wrap items-center justify-between gap-2'}>
        {bare ? null : <h3 className="text-h3 text-ink">Next step</h3>}
        <Button size="sm" variant="ghost" data-testid="next-step-use-line" disabled={!line1} onClick={() => setAction(firstInstruction(line1, hearing.owed == null ? null : String(hearing.owed)))}>
          Fill in from the daily list
        </Button>
      </div>
      <Field label="Next action" hint="What happens next, in plain words." required error={tried && !action.trim() ? 'Write the next action.' : undefined}>
        <TextArea ref={first} data-autofocus={autoFocus ? '' : undefined} data-testid="next-step-action" value={action} onChange={(e) => setAction(e.target.value)} rows={3} />
      </Field>
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field label="Owner" hint="Your name, or a consultant on the Bench." required error={tried && !owner.trim() ? 'Name an owner.' : undefined}>
          <TextInput data-testid="next-step-owner" value={owner} list={`owners-${hearing.case}`} autoComplete="off" onChange={(e) => setOwner(e.target.value)} />
        </Field>
        <datalist id={`owners-${hearing.case}`}>
          {[...(me ? [me] : []), ...benchNames().filter((n) => n !== me)].map((n) => <option key={n} value={n} />)}
        </datalist>
        <Field label="Due, office time" hint="In the office's own time." required error={tried && !dueWords ? 'Pick a date and time.' : undefined}>
          <TextInput type="datetime-local" data-testid="next-step-due" value={due} min={`${day}T00:00`} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <div>
        <Button type="submit" variant="primary" data-testid="save-next" title="Ctrl Enter">
          Save and go to the next hearing
        </Button>
      </div>
    </form>
  );
}
