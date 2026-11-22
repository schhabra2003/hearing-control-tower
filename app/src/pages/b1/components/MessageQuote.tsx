import { CalendarClock, FileText, Mail, MessageSquareText, Phone } from 'lucide-react';
import type { EngineMessage } from '@/types/data';
import { engine } from '@/lib/data';
import { clockText, dateShort } from '@/lib/format';
import { cn } from '@/lib/cn';

const CHANNEL_ICON = { email: Mail, 'text note': MessageSquareText, 'phone note': Phone, 'mail transcript': FileText, 'calendar activity': CalendarClock } as const;

export function messageById(id: string | number): EngineMessage | undefined {
  return engine.messages.find((m) => String(m.id) === String(id));
}

/** "Thu, May 30, 9:18 a.m." from the packet's "2030-05-30T09:18:00-05:00", in the time the packet wrote. */
export function messageTime(at: string): string {
  const t = /T(\d{2}):(\d{2})/.exec(at);
  return `${dateShort(at)}${t ? `, ${clockText(Number(t[1]) * 60 + Number(t[2]))}` : ''}`;
}

export function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  const Icon = CHANNEL_ICON[channel as keyof typeof CHANNEL_ICON] ?? Mail;
  return <Icon aria-hidden className={cn('size-4', className)} />;
}
