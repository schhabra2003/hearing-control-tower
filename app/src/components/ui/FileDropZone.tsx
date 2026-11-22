/**
 * FileDropZone: drop a file, paste it with Ctrl V or Cmd V, or choose it with the keyboard.
 * Adapted from the 21st.dev component "Drop Zone" by aadixc0de (chatcn,
 * https://21st.dev/r/aadixc0de/drop-zone, id 45616): the drop hook with a drag depth counter (the
 * zone does not flicker when the pointer crosses its own text), accept or reject judged while the
 * file is still being dragged, and rejections with a reason (type, size, count). Changes: no
 * injected stylesheet or icon factory, lucide icons, our tokens, paste of files added, the state
 * said in words as well as colour, a native file input for keyboard and screen readers.
 */

import { FileWarning, Upload } from 'lucide-react';
import { useId, useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FileRejection {
  file: File;
  reason: 'type' | 'size' | 'count';
}

type DropState = 'idle' | 'accept' | 'reject';

const EXT_MIME: Record<string, string> = {
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.eml': 'message/rfc822',
  '.pdf': 'application/pdf',
};

/** Whether a file, or a dragged item that has a type but no name yet, matches an accept string. */
function matches(file: { type: string; name?: string }, accept?: string): boolean {
  const rules = (accept ?? '')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (!rules.length) return true;
  const type = file.type.toLowerCase();
  const name = file.name?.toLowerCase();
  if (!type && !name) return true;
  return rules.some((rule) => {
    if (rule.startsWith('.')) return name ? name.endsWith(rule) : EXT_MIME[rule] === type;
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

function sortFiles(files: File[], accept?: string, maxSize?: number, maxFiles?: number): { accepted: File[]; rejected: FileRejection[] } {
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];
  for (const file of files) {
    if (!matches(file, accept)) rejected.push({ file, reason: 'type' });
    else if (maxSize !== undefined && file.size > maxSize) rejected.push({ file, reason: 'size' });
    else if (maxFiles !== undefined && accepted.length >= maxFiles) rejected.push({ file, reason: 'count' });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

const hasFiles = (e: DragEvent): boolean => Array.from(e.dataTransfer?.types ?? []).includes('Files');

export interface FileDropZoneProps {
  /** Same syntax as the accept attribute: ".json,application/json". */
  accept?: string;
  /** Largest file in bytes. */
  maxSize?: number;
  /** Most files in one drop; default 1. */
  maxFiles?: number;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onReject?: (rejections: FileRejection[]) => void;
  /** "Drop a messages file here, or choose one". */
  title: string;
  /** "A .json file with the day's messages". */
  hint?: string;
  /** Said while a file of the wrong kind is dragged over: "Only .json files". */
  rejectText?: string;
  /** Accessible name of the file input. */
  inputLabel: string;
  icon?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function FileDropZone({
  accept,
  maxSize,
  maxFiles = 1,
  disabled = false,
  onFiles,
  onReject,
  title,
  hint,
  rejectText = 'This kind of file is not read here',
  inputLabel,
  icon,
  className,
  'data-testid': testId,
}: FileDropZoneProps) {
  const [state, setState] = useState<DropState>('idle');
  const depth = useRef(0);
  const hintId = useId();

  const take = (files: File[]): void => {
    const { accepted, rejected } = sortFiles(files, accept, maxSize, maxFiles);
    if (accepted.length) onFiles(accepted);
    if (rejected.length) onReject?.(rejected);
  };

  const handlers = {
    onDragEnter(e: DragEvent<HTMLLabelElement>) {
      if (disabled || !hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      const items = Array.from(e.dataTransfer.items).filter((i) => i.kind === 'file');
      const ok = items.length <= maxFiles && items.every((i) => matches({ type: i.type }, accept));
      setState(ok ? 'accept' : 'reject');
    },
    onDragOver(e: DragEvent<HTMLLabelElement>) {
      if (disabled || !hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave(e: DragEvent<HTMLLabelElement>) {
      if (disabled || !hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setState('idle');
    },
    onDrop(e: DragEvent<HTMLLabelElement>) {
      if (disabled || !hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setState('idle');
      take(Array.from(e.dataTransfer.files));
    },
  };

  const onPaste = (e: ClipboardEvent<HTMLLabelElement>): void => {
    const files = Array.from(e.clipboardData.files);
    if (disabled || !files.length) return;
    e.preventDefault();
    take(files);
  };

  const reject = state === 'reject';
  return (
    <label
      data-testid={testId}
      data-state={state}
      onPaste={onPaste}
      {...handlers}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed px-6 py-8 text-center',
        'transition-colors duration-[var(--dur-color)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
        state === 'accept' && 'border-accent bg-accent-soft',
        reject && 'border-danger bg-danger-bg',
        state === 'idle' && 'border-border-strong bg-surface hover:bg-surface-2',
        disabled && 'cursor-not-allowed opacity-60 hover:bg-surface',
        className,
      )}
    >
      {reject ? (
        <FileWarning aria-hidden className="size-6 text-danger" />
      ) : (
        (icon ?? <Upload aria-hidden className={cn('size-6', state === 'accept' ? 'text-accent' : 'text-ink-2')} />)
      )}
      <span className={cn('text-body font-semibold', reject ? 'text-danger' : 'text-ink')}>
        {reject ? rejectText : state === 'accept' ? 'Release to load the file' : title}
      </span>
      {hint ? (
        <span id={hintId} className="text-body text-ink-2">
          {hint}
        </span>
      ) : null}
      <input
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        disabled={disabled}
        aria-label={inputLabel}
        aria-describedby={hint ? hintId : undefined}
        className="sr-only"
        onChange={(e) => {
          take(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </label>
  );
}
