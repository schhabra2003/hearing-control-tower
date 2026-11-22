import { clsx, type ClassValue } from 'clsx';

/** Joins class names; falsy parts are dropped. */
export function cn(...parts: ClassValue[]): string {
  return clsx(parts);
}
