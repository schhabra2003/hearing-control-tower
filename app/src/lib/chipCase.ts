/** A short sheet phrase in sentence case for a chip: "TOP OF LIST: OWED" reads "Top of list: owed". */
export function chipCase(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const lower = t.toLowerCase();
  return lower[0]!.toUpperCase() + lower.slice(1);
}
