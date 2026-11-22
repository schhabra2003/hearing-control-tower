/**
 * The labels every number carries: Measured, Simulated, Estimate and Packet, plus Recorded for the
 * readers' answers replayed from a recorded run. A value read from a cell of the sheet is Measured
 * (the sheet counted it on the example data); its cell shows on hover. The kind "sheet" stays only
 * so a source can say it came from a cell; it shows the word Measured.
 * Each label has a word and a shape, so nothing depends on colour.
 */

export type LabelKind = 'measured' | 'simulated' | 'estimate' | 'packet' | 'recorded' | 'sheet';

export interface LabelInfo {
  kind: LabelKind;
  word: string;
  /** One sentence for "What the labels mean". */
  meaning: string;
}

export const LABELS: Record<LabelKind, LabelInfo> = {
  measured: {
    kind: 'measured',
    word: 'Measured',
    meaning: 'Counted by a command or by the sheet on the example data, and the count can be run again.',
  },
  simulated: {
    kind: 'simulated',
    word: 'Simulated',
    meaning: 'Produced by the simulator or the simulated clock: generated offices, consultants and homeowners, not the firm.',
  },
  estimate: {
    kind: 'estimate',
    word: 'Estimate',
    meaning: 'A calculation from stated assumptions. Every number in minutes or dollars is an estimate; nobody has timed the firm.',
  },
  packet: {
    kind: 'packet',
    word: 'Packet',
    meaning: "Taken from the firm's fictional example packet: its hearings, messages and records.",
  },
  recorded: {
    kind: 'recorded',
    word: 'Recorded',
    meaning: "The readers' answers from an earlier run, replayed. No model is called.",
  },
  sheet: {
    kind: 'sheet',
    word: 'Measured',
    meaning: 'Counted by the installed gate sheet on the example data, as LibreOffice last calculated it.',
  },
};

/** The labels a reader meets on the pages, in the order the legend lists them. Recorded runs show as Measured. */
export const LABEL_ORDER: LabelKind[] = ['measured', 'simulated', 'estimate', 'packet'];
