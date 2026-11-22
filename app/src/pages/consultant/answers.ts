/**
 * A consultant's answers, written to the same session store the app uses for proposals, so the
 * coordinator sees them on Replies and accepts or refuses each. Every answer has an Undo.
 */

import { toast } from '@/components/ui/Toast';
import { actions, replyKey, useSession, type ConsultantReply, type ConsultantReplyKind, type ConsultantTopic } from '@/lib/store';

export const KIND_WORDS: Record<ConsultantReplyKind, string> = {
  yes: 'Yes, I will attend',
  no: 'No, I am not taking it',
  cannot: 'Can’t make it',
  files: 'I have the files',
  signed: 'Signed',
};

export function useReply(caseId: string, topic: ConsultantTopic): ConsultantReply | undefined {
  return useSession((s) => s.consultantReplies?.[replyKey(caseId, topic)]);
}

export function reply(topic: ConsultantTopic, r: Omit<ConsultantReply, 'at'>, label: string): void {
  actions.consultantReply(topic, r);
  toast({
    title: label,
    body: 'The firm sees it now.',
    tone: r.kind === 'cannot' || r.kind === 'no' ? undefined : 'ok',
    action: { label: 'Undo', run: () => actions.undoConsultantReply(r.case, topic) },
  });
}

export function undo(caseId: string, topic: ConsultantTopic): void {
  actions.undoConsultantReply(caseId, topic);
  toast({ title: 'Answer taken back' });
}
