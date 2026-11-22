import { shortcutsEnabled } from './keys';

/**
 * After a decision the decided row collapses and its buttons go away. Focus then moves to the
 * Accept button of the next undecided proposal after it (marked data-accept), or to the row's own
 * Undo when none is left, so a keyboard user never falls back to the top of the page.
 */
export function focusNextDecision(from: HTMLElement | null): void {
  window.requestAnimationFrame(() => {
    const all = [...document.querySelectorAll<HTMLElement>('[data-accept]')].filter((b) => !b.closest('[inert]'));
    const after = from ? all.find((b) => from.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING && !from.contains(b)) : undefined;
    const target = after ?? all[0] ?? from?.querySelector<HTMLElement>('[data-undo]') ?? null;
    target?.focus();
    target?.scrollIntoView({ block: 'nearest' });
  });
}

/** A, R and U act on the row that holds focus, also when focus is on one of its buttons. */
export function decisionKey(e: { key: string; target: EventTarget | null; metaKey: boolean; ctrlKey: boolean; altKey: boolean }): 'a' | 'r' | 'u' | null {
  if (e.metaKey || e.ctrlKey || e.altKey || !shortcutsEnabled()) return null;
  const t = e.target as HTMLElement | null;
  if (t && /^(input|textarea|select)$/i.test(t.tagName)) return null;
  const k = e.key.toLowerCase();
  return k === 'a' || k === 'r' || k === 'u' ? k : null;
}
