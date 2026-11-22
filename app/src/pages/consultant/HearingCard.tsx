/**
 * HearingCard: one hearing as a consultant needs it: when, where, when to arrive, what to bring,
 * the files, anything to sign, and three answers (Yes, No, Can't make it).
 *
 * Adapted from the 21st.dev component "Event RSVP Card" by cnippet-dev,
 * https://21st.dev/r/cnippet-dev/v-card-19 (id 25369): the title with a small kind badge on the
 * right, the date, time and place as icon rows, and the answer as full-width buttons at the bottom.
 * Changes for Hearing Desk: our tokens and Button; the time is the headline; rows are 15 px with
 * the icon in muted ink; sections split by hairlines, not boxes; 44 px touch targets; no attendee
 * counts or coloured text.
 */

import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  ChevronDown,
  Clock,
  FileText,
  Info,
  MapPin,
  Package,
  PenLine,
  Undo2,
  X,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { downloadFile } from "@/lib/download";
import { dateLong } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ConsultantReplyKind } from "@/lib/store";
import {
  arriveBy,
  firmPhone,
  type CaseFile,
  type Consultant,
  type ConsultantHearing,
} from "./model";
import { KIND_WORDS, reply, undo, useReply } from "./answers";
import { SignaturePad } from "./SignaturePad";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Fact } from "@/components/ui/Fact";
import { IconButton } from "@/components/ui/IconButton";

function Row({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3">
      <span aria-hidden className="pt-1 text-muted [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-small text-ink-2">{label}</p>
        <div className="text-body text-ink">{children}</div>
      </div>
    </div>
  );
}

/** "Prepared: 2030-05-29" as "Prepared: Wednesday, May 29, 2030". */
const plainDates = (t: string): string => t.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (d) => dateLong(d) || d);

function FileLink({ f, testId }: { f: CaseFile; testId: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          data-testid={testId}
          className="inline-flex min-h-11 items-center gap-2 text-left text-body font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <FileText aria-hidden className="size-4 shrink-0" />
          {f.title}
          {f.current ? null : (
            <span className="font-normal text-muted">(older, do not use)</span>
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-scrim" />
        <Dialog.Content
          data-testid={`${testId}-dialog`}
          className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[85vh] flex-col gap-4 overflow-y-auto rounded-t-feature bg-surface p-4 shadow-e3 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-feature"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-section font-semibold text-ink">
                {f.title}
              </Dialog.Title>
              <Dialog.Description className="text-body text-ink-2">
                A simulated file link. In use, this opens the file from the
                firm’s storage.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close" size="lg" className="shrink-0">
                <X aria-hidden />
              </IconButton>
            </Dialog.Close>
          </div>
          <pre className="rounded-quote bg-sunken p-4 font-sans text-body whitespace-pre-wrap text-ink">
            {plainDates(f.text)}
          </pre>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => downloadFile(f.name, plainDates(f.text), "text/plain")}
            data-testid={`${testId}-download`}
          >
            Download (simulated)
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AnswerBar({ c, x }: { c: Consultant; x: ConsultantHearing }) {
  const r = useReply(x.caseId, "attend");
  const [asking, setAsking] = useState(false);
  const [other, setOther] = useState<string | null>(null);
  const base = `consultant-${x.caseId}`;
  const send = (kind: ConsultantReplyKind, detail?: string): void => {
    setAsking(false);
    setOther(null);
    reply(
      "attend",
      {
        case: x.caseId,
        consultant: c.name,
        kind,
        ...(detail ? { detail } : {}),
      },
      `${KIND_WORDS[kind]}: ${x.property.split(",")[0]}`,
    );
  };

  if (r && (r.kind === "yes" || r.kind === "no" || r.kind === "cannot")) {
    return (
      <div
        data-testid={`${base}-answered`}
        className="flex flex-wrap items-center justify-between gap-2"
      >
        <p
          className="flex min-w-0 flex-wrap items-center gap-2 text-body text-ink"
          role="status"
        >
          <span className="text-ink-2">You answered</span>
          <Badge tone={r.kind === "yes" ? "ok" : "neutral"} size="md">
            {KIND_WORDS[r.kind]}
            {r.kind === "cannot" && r.detail === "ill" ? " (ill)" : ""}
          </Badge>
        </p>
        {r.kind === "cannot" || r.kind === "no" ? (
          <p className="w-full text-body text-ink" data-testid={`${base}-released`}>
            You are released from <Fact kind="place">{x.property.split(",")[0]}</Fact>. The firm is finding a replacement
            {firmPhone() ? <>; call <Fact kind="person">{firmPhone()}</Fact> if urgent</> : null}.
          </p>
        ) : null}
        <Button
          size="lg"
          variant="ghost"
          icon={<Undo2 aria-hidden />}
          onClick={() => undo(x.caseId, "attend")}
          data-testid={`${base}-undo`}
        >
          Change answer
        </Button>
      </div>
    );
  }

  if (asking) {
    return (
      <div className="flex flex-col gap-2" data-testid={`${base}-reason`}>
        <p className="text-body font-medium text-ink">
          Why can’t you make it? The firm finds someone else.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => send("cannot", "ill")}
            data-testid={`${base}-reason-ill`}
          >
            I am ill
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setOther("")}
            data-testid={`${base}-reason-other`}
          >
            Something else
          </Button>
        </div>
        {other !== null ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`${base}-other-text`} className="text-body text-ink">
              What happened? (optional)
            </label>
            <textarea
              id={`${base}-other-text`}
              data-testid={`${base}-other-text`}
              value={other}
              onChange={(e) => setOther(e.target.value)}
              rows={2}
              className="rounded-control border border-border-strong bg-surface p-3 text-body text-ink"
            />
            <Button size="lg" variant="primary" onClick={() => send("cannot", other.trim() || "other")} data-testid={`${base}-other-send`}>
              Send to the firm
            </Button>
          </div>
        ) : null}
        <Button size="lg" variant="ghost" onClick={() => setAsking(false)}>
          Back
        </Button>
      </div>
    );
  }

  // A hearing they already said yes to only needs "still on" or "can't make it": a separate No
  // read as the same thing to the consultant tester. An open offer keeps all three answers.
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body font-medium text-ink">
        {x.saidYes
          ? "You said yes earlier. Is it still on?"
          : "Will you take this hearing?"}
      </p>
      <div
        role="group"
        aria-label={`Your answer for ${x.property}`}
        className={cn("grid gap-2", x.saidYes ? "grid-cols-2" : "grid-cols-3")}
      >
        <Button
          size="lg"
          variant={x.saidYes ? "secondary" : "primary"}
          icon={<Check aria-hidden />}
          onClick={() => send("yes")}
          data-testid={`${base}-yes`}
        >
          {x.saidYes ? "Yes, still on" : "Yes"}
        </Button>
        {x.saidYes ? null : (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => send("no")}
            data-testid={`${base}-no`}
          >
            No
          </Button>
        )}
        <Button
          size="lg"
          variant="secondary"
          onClick={() => setAsking(true)}
          data-testid={`${base}-cannot`}
        >
          Can’t make it
        </Button>
      </div>
    </div>
  );
}

function FilesBlock({ c, x }: { c: Consultant; x: ConsultantHearing }) {
  const r = useReply(x.caseId, "files");
  const base = `consultant-${x.caseId}-files`;
  const have = r?.kind === "files" || x.filesState === "current";
  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col">
        {x.files.map((f) => (
          <li key={f.name}>
            <FileLink f={f} testId={`${base}-${f.version ?? "x"}`} />
          </li>
        ))}
      </ul>
      {x.filesState === "old" && !r ? (
        <p className="text-body text-ink">
          Your links open version {x.filesYours}. Please use version{" "}
          {x.filesVersion}.
        </p>
      ) : null}
      {have ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-body text-ink-2">
            <Check aria-hidden className="size-4 text-dot-ok" />
            You have version {x.filesVersion}.
          </p>
          {r ? (
            <Button
              size="lg"
              variant="ghost"
              onClick={() => undo(x.caseId, "files")}
              data-testid={`${base}-undo`}
            >
              Undo
            </Button>
          ) : null}
        </div>
      ) : (
        <Button
          size="lg"
          variant="secondary"
          className="mt-1 self-start"
          onClick={() =>
            reply(
              "files",
              {
                case: x.caseId,
                consultant: c.name,
                kind: "files",
                detail: String(x.filesVersion ?? ""),
              },
              `Files version ${x.filesVersion}: received`,
            )
          }
          data-testid={`${base}-got`}
        >
          Tell the firm I have version {x.filesVersion}
        </Button>
      )}
    </div>
  );
}

function AgreementBlock({ c, x }: { c: Consultant; x: ConsultantHearing }) {
  const a = x.agreement!;
  const r = useReply(x.caseId, "sign");
  const base = `consultant-${x.caseId}-sign`;
  return (
    <section
      aria-label={`${a.kind} to sign`}
      data-testid={base}
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <div className="flex items-start gap-3">
        <PenLine aria-hidden className="mt-1 size-5 shrink-0 text-muted" />
        <div className="flex flex-col gap-1">
          <h4 className="text-section text-ink">
            {a.kind} to sign{a.homeowner ? ` for ${a.homeowner}` : ""}
          </h4>
          <p className="text-body text-ink-2">{a.why}</p>
          {a.earlier ? (
            <p className="text-body text-ink-2">{a.earlier}</p>
          ) : null}
        </div>
      </div>
      {r?.kind === "signed" ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2"
          data-testid={`${base}-done`}
        >
          <p
            role="status"
            className="flex items-center gap-2 text-body font-medium text-ink"
          >
            <Check aria-hidden className="size-4 text-dot-ok" />
            Signed {r.at.replace(/^\w+, /, "")}
          </p>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => undo(x.caseId, "sign")}
            data-testid={`${base}-undo`}
          >
            Undo
          </Button>
        </div>
      ) : (
        <SignaturePad
          name={c.name}
          testId={`${base}-pad`}
          onSign={(how) =>
            reply(
              "sign",
              {
                case: x.caseId,
                consultant: c.name,
                kind: "signed",
                detail: how,
              },
              `${a.kind} signed`,
            )
          }
        />
      )}
    </section>
  );
}

/**
 * The details of a hearing (where, when to arrive, what to bring, the files) fold under one
 * button, open on the first hearing only, so the page stays short and the answers stay in view
 * (critique v3: "Consultant view is long"). The disclosure follows "Collapsible (Radix UI)" by
 * edwinvakayil, https://21st.dev/r/edwinvakayil/collapsible: a trigger with aria-expanded and
 * aria-controls over a region; a native button does the job (the Radix package is not installed).
 * Printing shows every hearing in full.
 */
function Details({
  x,
  open: initial,
  children,
}: {
  x: ConsultantHearing;
  open: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initial);
  const id = useId();
  return (
    <div className="flex flex-col border-t border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        data-testid={`consultant-${x.caseId}-details`}
        className="flex min-h-12 items-center justify-between gap-3 rounded-control text-left text-body font-medium text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent print:hidden"
      >
        <span>
          {open ? "Hide the details" : "Where to go, what to bring, the files"}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-5 shrink-0 text-ink-2 transition-transform duration-[var(--dur-color)]",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id={id}
        className={cn(
          "flex-col gap-4 pb-1 lg:grid-cols-2 lg:gap-x-6",
          open ? "flex lg:grid" : "hidden print:flex",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function HearingCard({
  c,
  x,
  first = false,
}: {
  c: Consultant;
  x: ConsultantHearing;
  first?: boolean;
}) {
  const by = arriveBy(x);
  const filesReply = useReply(x.caseId, "files");
  // Open by default: the next hearing, and any hearing whose files are out of date (an action waits there).
  const openDetails = first || (x.filesState === "old" && !filesReply);
  return (
    <article
      id={`hearing-${x.caseId}`}
      data-testid={`consultant-hearing-${x.caseId}`}
      aria-labelledby={`h-${x.caseId}`}
      className="flex scroll-mt-20 flex-col gap-4 rounded-card border border-border bg-surface p-4"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-section text-ink tabular-nums">{x.time}</p>
          <h3 id={`h-${x.caseId}`} className="text-body font-semibold text-ink">
            {x.property}
          </h3>
          <p className="text-body text-ink-2">
            {x.place.title.replace(/^Video,\s*/i, "")}
            {by ? (
              <>
                . Be there by <Fact kind="deadline">{by}</Fact>
              </>
            ) : null}
          </p>
        </div>
        {x.formatOpen ? null : (
          <Badge plain size="sm" className="mt-1">
            {x.inPerson ? "In person" : "Video"}
          </Badge>
        )}
      </header>

      {x.notes.length ? (
        <div className="flex flex-col gap-3">
          {x.notes.map((n) => (
            <Row key={n} icon={<Info />} label="Note">
              <p>{n}</p>
            </Row>
          ))}
        </div>
      ) : null}

      <div className="print:hidden">
        <AnswerBar c={c} x={x} />
      </div>

      {x.agreement ? <AgreementBlock c={c} x={x} /> : null}

      <Details x={x} open={openDetails}>
        <Row icon={<MapPin />} label={x.inPerson ? "Where" : "How to join"}>
          <p className="font-medium">{x.place.title}</p>
          <p className="text-ink-2">{x.place.detail}</p>
        </Row>
        {x.arrival ? (
          <Row icon={<Clock />} label="When to arrive">
            <p>{x.arrival}</p>
            {/\btext (IN|ARRIVED)\b/.test(x.arrival) ? (
              <p className="text-ink-2">
                Send it as a reply to the firm’s text
                {firmPhone() ? `, or call ${firmPhone()}` : ""}.
              </p>
            ) : null}
            <p className="text-small text-ink-2">{x.timeZone}</p>
          </Row>
        ) : null}
        <Row icon={<Package />} label="What to bring">
          <p>{x.bring}</p>
          {x.bringWhat ? (
            <p className="text-ink-2">They hold the {x.bringWhat}.</p>
          ) : null}
        </Row>
        <Row icon={<FileText />} label="Files">
          <FilesBlock c={c} x={x} />
        </Row>
      </Details>
    </article>
  );
}
