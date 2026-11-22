import type { PageProps } from '@/lib/router';
import { Hearings } from './Hearings';

/**
 * The hearing page (#/hearings/AX-107): the Hearings page with AX-107 selected.
 * There is no drawer and no second layout. Previous and next follow the list on screen (J and K),
 * and Back returns to the filtered list. The wrapper only carries the page's test id.
 */
export function HearingPage(props: PageProps) {
  return (
    <div data-testid="page-hearing" style={{ display: 'contents' }}>
      <Hearings {...props} />
    </div>
  );
}

/** The Hearings list route: the same page with the first hearing selected. */
export function HearingsPage(props: PageProps) {
  return (
    <div data-testid="page-hearings" style={{ display: 'contents' }}>
      <Hearings {...props} />
    </div>
  );
}
