/**
 * The app root with the layout shell. A consultant's page (#/consultant,
 * the consultant page) renders without the coordinator's shell: it is what a consultant opens from
 * a text or an email, phone first.
 */

import { TooltipProvider } from '@/components/ui/Tooltip';
import { useLocation } from '@/lib/router';
import { ConsultantApp, isConsultantPath } from '@/pages/consultant/ConsultantApp';
import { LayoutShell } from './Shell';
import { palette, routes } from './routes';

export function App() {
  const { path } = useLocation();
  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={100}>
      {isConsultantPath(path) ? <ConsultantApp /> : <LayoutShell routes={routes} palette={palette} />}
    </TooltipProvider>
  );
}
