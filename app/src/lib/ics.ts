import { sheet } from './data';
import { actions } from './store';
import { downloadFile } from './download';

/** The sheet's own calendar file: Calendar file column A joined by CRLF, byte-equal to the tab. */
export function icsText(): string {
  const lines = sheet.calendarFile?.lines ?? [];
  return `${lines.join('\r\n')}\r\n`;
}

/** Hands the viewer hearings.ics. Nothing is sent anywhere. */
export function downloadIcs(markStep = true): void {
  downloadFile('hearings.ics', icsText(), 'text/calendar;charset=utf-8');
  if (markStep) actions.markIcsDownloaded();
}
