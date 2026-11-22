/**
 * Start-up parameters for the video and the screenshots: ?theme=light|dark,
 * ?clock=0900|1400, ?tour=N, ?reset=1 and ?tip=<id>. They may sit in the page's own query
 * (index.html?theme=dark#/today) or in the hash (#/today?theme=dark); the hash wins.
 */

const search = new URLSearchParams(window.location.search);
const hashQuery = (() => {
  const h = window.location.hash;
  const q = h.indexOf('?');
  return new URLSearchParams(q < 0 ? '' : h.slice(q + 1));
})();

/** The value of a start-up parameter as the page was opened. */
export function bootParam(name: string): string | null {
  return hashQuery.get(name) ?? search.get(name);
}
