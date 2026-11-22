/**
 * Light, dark or the system's choice. Sets data-theme on <html> and remembers the choice in
 * localStorage ("hd.theme"), inside try/catch. ?theme=light|dark wins for screenshots and the video.
 */

import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'hd.theme';

function stored(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

let choice: ThemeChoice = stored();
const subs = new Set<() => void>();
const media = window.matchMedia('(prefers-color-scheme: dark)');

export function resolvedTheme(c: ThemeChoice = choice): 'light' | 'dark' {
  if (c === 'system') return media.matches ? 'dark' : 'light';
  return c;
}

function apply(): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
  for (const f of subs) f();
}

export function setTheme(c: ThemeChoice, { remember = true }: { remember?: boolean } = {}): void {
  choice = c;
  if (remember) {
    try {
      window.localStorage.setItem(KEY, c);
    } catch {
      /* Storage blocked: the choice holds for this page only. */
    }
  }
  apply();
}

export function toggleTheme(): void {
  setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark');
}

media.addEventListener('change', () => {
  if (choice === 'system') apply();
});

export function initTheme(fromUrl: string | null): void {
  if (fromUrl === 'light' || fromUrl === 'dark') choice = fromUrl;
  apply();
}

export function useTheme(): { choice: ThemeChoice; resolved: 'light' | 'dark' } {
  const c = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => choice,
  );
  return { choice: c, resolved: resolvedTheme(c) };
}
