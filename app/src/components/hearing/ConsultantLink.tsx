/**
 * A consultant's name with a link to the page the consultant sees on a phone (#/consultant/<slug>),
 * so a reviewer can play the consultant from any hearing. With nobody named it says
 * "No consultant named", the one label every page uses for an empty consultant.
 */

import { consultantById, slugOf } from '@/pages/consultant/model';

export const NO_CONSULTANT = 'No consultant named';

export function consultantHref(name: string): string | null {
  const c = consultantById(slugOf(name));
  return c ? `#/consultant/${c.slug}` : null;
}

export function ConsultantName({ name, caseId }: { name: unknown; caseId: string }) {
  const n = name ? String(name).trim() : '';
  if (!n) return <>{NO_CONSULTANT}</>;
  const href = consultantHref(n);
  return (
    <>
      {n}
      {href ? (
        <>
          {' '}
          <a className="l-link l-small" style={{ fontWeight: 400 }} href={href} data-testid={`consultant-page-${caseId}`} aria-label={`Open ${n}’s phone page`}>
            Phone page
          </a>
        </>
      ) : null}
    </>
  );
}
