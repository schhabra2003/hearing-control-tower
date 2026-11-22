/**
 * Drawer: kept as a name for the pages that still open a hearing or a tower case beside a list.
 * It is a thin wrapper of DetailSheet (21st.dev "Sheet" by
 * kevingirelli, https://21st.dev/r/kevingirelli/sheet).
 * The header slot becomes the sheet's `nav` slot. New pages use the layout's Detail region instead
 * (no drawer on Hearings).
 */
import type { ReactNode } from 'react';
import { DetailSheet } from './DetailSheet';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title of the drawer. */
  title: string;
  /** Shown visually in the drawer's own header row. */
  header?: ReactNode;
  /** Right side of the header row, before Close. */
  actions?: ReactNode;
  /** A bar fixed at the bottom for the one primary action. */
  footer?: ReactNode;
  children: ReactNode;
  testId?: string;
  closeTestId?: string;
  className?: string;
  /** Where focus goes when the drawer closes (for example the list row of the hearing shown). */
  returnFocusTo?: () => HTMLElement | null;
}

export function Drawer({ header, testId, ...rest }: DrawerProps) {
  return <DetailSheet {...rest} nav={header} data-testid={testId} />;
}
