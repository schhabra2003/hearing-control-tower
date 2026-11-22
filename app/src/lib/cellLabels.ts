/**
 * Short plain labels for the sheet columns the fixed-code rules fill, so a proposal reads "Office
 * cannot find our notice" and not the column's typing note. The column's own heading and cell stay
 * in the Sheet reference.
 */

const LABELS: [RegExp, string][] = [
  [/^G1 /, 'Date confirmed by the office'],
  [/^G2 /, 'Consultant said yes'],
  [/^G3 /, "Office has our consultant's name"],
  [/^G4 Evidence on file with the clerk/, 'Clerk has the files'],
  [/^G4 Consultant has the packet/, 'Consultant has the files'],
  [/^G4 /, 'Files sent and received'],
  [/^G5 /, 'Owed items received'],
  [/^The office says it cannot find our notice/, 'Office cannot find our notice'],
  [/^Our notice or form for this hearing went/, 'Date our notice went to the office'],
  [/^Next action/, 'Next action'],
  [/^Due/, 'Due'],
  [/^Changed since/, 'Office change'],
  [/^Does the office still accept the old route/, 'Old route still accepted'],
  [/^Change said on/, 'Date the office said it'],
  [/^Homeowner's written yes/, "Homeowner's written yes"],
  [/^Proof of cancellation or withdrawal/, 'Proof of cancellation or withdrawal'],
  [/^Owed by/, 'Owed by'],
  [/^Consultant \(a new row/, 'Availability: consultant'],
  [/^free or not free/, 'Availability: free or not'],
  [/^Reason \(choose illness/, 'Availability: reason not free'],
  [/^Said on \(the date of their message/, 'Availability: date they said it'],
  [/^Case files: version the clerk confirmed/, 'Case-file version the clerk confirmed'],
  [/^To tell the consultant/, 'Answer to send the consultant'],
  [/^Result reported by/, 'Who reported the result'],
  [/^Link to the note or message that reported the result/, 'Link to the result report'],
];

/** The heading part of a column B text: "Hearings CP16: The office says..." gives "The office says...". */
export function headingOf(b: string): string {
  return b.replace(/^(Hearings|Offices|Bench|Availability|Settings) [A-Z]{1,3}\d*:\s*/, '').replace(/:\s*(Hearings|Offices) [A-Z]{1,3}$/, '').trim();
}

/** "Office cannot find our notice", or the heading itself when no label is known. */
export function cellLabel(b: string): string {
  const h = headingOf(b);
  const hit = LABELS.find(([re]) => re.test(h));
  if (hit) return hit[1];
  const short = h.replace(/\s*\([^)]*\)/g, '').trim();
  return short.charAt(0).toUpperCase() + short.slice(1);
}
