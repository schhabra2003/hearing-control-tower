/**
 * TextPreview: the same hearings as the day-before text messages the sheet writes (Hearings AT),
 * for a consultant who does not use a calendar on a phone. A reply chip under each text answers
 * for every hearing in it, through the same store as the page's buttons.
 *
 * Adapted from the 21st.dev component "Chat Messages" by solaceui,
 * https://21st.dev/r/solaceui/chat-messages-2 (id 20130): incoming bubbles on the left with the
 * sender and time above, the reply as an outgoing bubble on the right, inside a quiet phone frame.
 * Changes for Hearing Desk: no device chassis, no animated reveal, no gradients; tokens only; the
 * frame is a plain surface with a hairline; reply chips are 44 px buttons; a print action for a
 * paper copy.
 */

import { Printer } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSession, replyKey } from "@/lib/store";
import type { Consultant, ConsultantHearing } from "./model";
import { firmPhone, textsFor } from "./model";
import { KIND_WORDS, reply } from "./answers";
import { Button } from "@/components/ui/Button";

export function TextPreview({
  c,
  list,
  className,
  print = true,
}: {
  c: Consultant;
  list: ConsultantHearing[];
  className?: string;
  print?: boolean;
}) {
  const texts = textsFor(list);
  const replies = useSession((s) => s.consultantReplies);
  const noMobile = c.reach === 0;

  return (
    <section
      aria-labelledby="text-preview-h"
      data-testid="consultant-text-preview"
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex min-h-12 items-center justify-between gap-3">
        <h2 id="text-preview-h" className="text-section text-ink">
          The day-before messages
        </h2>
        {print ? (
          <Button
            size="lg"
            variant="ghost"
            icon={<Printer aria-hidden />}
            onClick={() => window.print()}
            className="print:hidden"
            data-testid="consultant-print"
          >
            Print
          </Button>
        ) : null}
      </div>
      {noMobile ? (
        <p data-testid="consultant-no-mobile" className="text-body text-ink-2">
          We have no mobile number for you, so these come by email to {c.email}.
          Answer with the buttons here
          {firmPhone() ? `, or call ${firmPhone()}` : ""}.
        </p>
      ) : null}

      <div className="flex flex-col gap-4 rounded-feature border border-border bg-sunken p-3">
        {texts.length === 0 ? (
          <p className="p-2 text-body text-ink-2">
            No texts are due for these hearings.
          </p>
        ) : null}
        {texts.map((t, i) => {
          // Only hearings without an answer get the YES: a "Can't make it" given on the page is never overwritten.
          const open = t.items.filter(
            (x) => !replies?.[replyKey(x.caseId, "attend")],
          );
          const done = t.items.filter(
            (x) => replies?.[replyKey(x.caseId, "attend")],
          );
          return (
            <div
              key={t.text}
              className="flex flex-col gap-2"
              data-testid={`consultant-text-${i}`}
            >
              <p className="px-1 text-small text-ink-2">
                From the firm, the day before, by {c.reach === 0 ? "email" : "text"}. Simulated, not sent.
              </p>
              <p className="max-w-[92%] rounded-feature rounded-bl-chip border border-border bg-surface px-4 py-3 text-body text-ink">
                {t.text}
              </p>
              {done.length ? (
                <div
                  className="ml-auto max-w-[85%] rounded-feature rounded-br-chip bg-primary px-4 py-2 text-body text-on-primary"
                  data-testid={`consultant-text-answered-${i}`}
                >
                  {done.map((x) => {
                    const k = replies?.[replyKey(x.caseId, "attend")]?.kind;
                    return (
                      <p key={x.caseId}>
                        {x.time}:{" "}
                        {k && k !== "files" && k !== "signed"
                          ? KIND_WORDS[k]
                          : ""}
                      </p>
                    );
                  })}
                </div>
              ) : null}
              {open.length ? (
                <Button
                  size="lg"
                  variant="secondary"
                  className="ml-auto print:hidden"
                  data-testid={`consultant-text-yes-${i}`}
                  onClick={() => {
                    for (const x of open)
                      reply(
                        "attend",
                        {
                          case: x.caseId,
                          consultant: c.name,
                          kind: "yes",
                          detail: "by text",
                        },
                        `YES sent for ${open.length === 1 ? "the hearing" : `${open.length} hearings`}`,
                      );
                  }}
                >
                  {done.length
                    ? `Reply YES for ${open.map((x) => x.time).join(" and ")}`
                    : "Reply YES"}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="text-small text-ink-2">
        Words in brackets are filled in before the text goes.
      </p>
    </section>
  );
}
