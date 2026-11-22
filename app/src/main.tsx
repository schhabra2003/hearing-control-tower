import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';
import { App } from './App';
import { bootParam } from './lib/boot';
import { actions } from './lib/store';
import { clearLog } from './components/feedback/Toast';
import { initTheme } from './lib/theme';
import { refreshLiveStatus } from './lib/live';

initTheme(bootParam('theme'));
if (bootParam('reset') === '1') {
  actions.reset();
  clearLog();
}
const clock = bootParam('clock');
if (clock === '0900' || clock === '1400') actions.setClock(clock);
const tour = Number(bootParam('tour'));
if (Number.isInteger(tour) && tour >= 1) actions.setTourStep(tour);
// Live AI or recorded answers: asks the live server once, when the app is served by it.
void refreshLiveStatus();

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element.');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
