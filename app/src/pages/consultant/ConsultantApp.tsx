/**
 * The consultant view: what a consultant opens from the link in their text or email. It has no
 * coordinator sidebar. #/consultant lists the six consultants (for the demo); #/consultant/<id>
 * is one consultant's page. Phone first (390 px); at 1440 px the text-message view sits beside
 * the hearings.
 */

import {
  ArrowLeft,
  ChevronRight,
  Moon,
  Phone,
  Printer,
  Sun,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/Toast";
import { sheetToday } from "@/lib/data";
import { dateLong, dateShort, plural } from "@/lib/format";
import { useMedia } from "@/lib/media";
import { matchPath, useLocation } from "@/lib/router";
import { useSession, replyKey } from "@/lib/store";
import { toggleTheme, useTheme } from "@/lib/theme";
import {
  byDay,
  comingFor,
  consultantById,
  consultants,
  firmPhone,
  pastFor,
  splitWeek,
  type Consultant,
} from "./model";
import { Button } from "@/components/ui/Button";
import { Fact } from "@/components/ui/Fact";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { HearingCard } from "./HearingCard";
import { TextPreview } from "./TextPreview";

const WIDE = "(min-width: 1024px)";

function TopBar({ back }: { back?: boolean }) {
  const { resolved } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 lg:px-8">
        <nav aria-label="Consultant pages" className="flex min-w-0 items-center gap-2">
          {back ? (
            <a
              href="#/consultant"
              aria-label="All consultants"
              className="-ml-2 grid size-12 place-items-center rounded-control text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              data-testid="consultant-back"
            >
              <ArrowLeft aria-hidden className="size-5" />
            </a>
          ) : null}
          <span className="truncate text-body font-semibold text-ink">
            Hearing Desk
          </span>
        </nav>
        <div className="flex items-center gap-1">
          <span className="hidden text-small text-muted sm:inline">
            Example week, nothing is sent
          </span>
          <IconButton
            size="lg"
            onClick={toggleTheme}
            label={resolved === "dark" ? "Use light mode" : "Use dark mode"}
            data-testid="theme-toggle"
          >
            {resolved === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
          </IconButton>
        </div>
      </div>
    </header>
  );
}

/** The one rule a consultant must know, with the firm's number. */
function RuleLine() {
  const phone = firmPhone();
  return (
    <div
      data-testid="consultant-rule"
      className="flex flex-col gap-2 rounded-card bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-start"
    >
      <p className="text-body text-ink">
        <span className="block">
          If you cannot make a hearing, tell the firm, not the county office.
        </span>
        <span className="block">Only the office can change a date.</span>
      </p>
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="inline-flex min-h-12 shrink-0 items-center gap-2 text-body font-medium text-accent hover:underline"
          data-testid="consultant-call"
        >
          <Phone aria-hidden className="size-4" />
          Call the firm, {phone}
        </a>
      ) : null}
    </div>
  );
}

function Picker() {
  const list = consultants();
  const replies = useSession((s) => s.consultantReplies);
  return (
    <main
      id="main"
      className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8"
      data-testid="page-consultant-picker"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-title text-ink">Consultant pages</h1>
        <p className="text-body text-ink-2">
          Each consultant opens their own page from their text or email.
        </p>
      </div>
      <ul
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        aria-label="Consultants"
      >
        {list.map((c) => {
          const coming = comingFor(c);
          const waiting = coming.filter(
            (x) => !replies?.[replyKey(x.caseId, "attend")],
          ).length;
          return (
            <li key={c.slug}>
              <a
                href={`#/consultant/${c.slug}`}
                data-testid={`consultant-pick-${c.slug}`}
                className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="min-w-0">
                  <p className="text-section text-ink">{c.name}</p>
                  <p className="text-body text-ink-2">
                    {plural(coming.length, "coming hearing")}
                    {coming[0] ? `, first ${dateShort(coming[0].date)}` : ""}
                  </p>
                  <p className="text-body text-ink-2">
                    {waiting ? `${waiting} to answer` : "All answered"}
                  </p>
                </div>
                <ChevronRight
                  aria-hidden
                  className="size-5 shrink-0 text-muted"
                />
              </a>
            </li>
          );
        })}
      </ul>
      <p className="text-body text-ink-2">
        <a href="#/" className="font-medium text-accent hover:underline">
          Back to the coordinator’s desk
        </a>
      </p>
    </main>
  );
}

function DayList({
  c,
  title,
  list,
  testId,
  firstCase,
  action,
}: {
  c: Consultant;
  title: string;
  list: ReturnType<typeof comingFor>;
  testId: string;
  firstCase?: string;
  action?: ReactNode;
}) {
  if (list.length === 0) return null;
  return (
    <section
      aria-labelledby={`${testId}-h`}
      data-testid={testId}
      className="flex flex-col gap-4"
    >
      <div className="flex min-h-12 items-center justify-between gap-3">
        <h2 id={`${testId}-h`} className="text-section text-ink">
          {title}
        </h2>
        {action}
      </div>
      {byDay(list).map((d) => (
        <div key={d.date} className="flex flex-col gap-3">
          <h3 className="text-body font-semibold text-ink-2">{d.label}</h3>
          {d.items.map((x) => (
            <HearingCard
              key={x.caseId}
              c={c}
              x={x}
              first={x.caseId === firstCase}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

/** The coming hearings in one short list for the wide right column: when, where, and whether an answer is still needed. */
function Glance({ list }: { list: ReturnType<typeof comingFor> }) {
  const replies = useSession((s) => s.consultantReplies);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="consultant-glance-h" className="rounded-card border border-border bg-surface px-4 py-3" data-testid="consultant-glance">
      <h2 id="consultant-glance-h" className="text-body font-semibold text-ink">Your coming hearings</h2>
      <ul className="mt-2 flex flex-col divide-y divide-border">
        {list.map((x) => {
          const answered = !!replies?.[replyKey(x.caseId, "attend")];
          return (
            <li key={x.caseId} className="flex flex-col gap-1 py-2 text-body">
              <button
                type="button"
                className="self-start text-left font-medium text-ink underline-offset-2 hover:underline"
                onClick={() => document.getElementById(`hearing-${x.caseId}`)?.scrollIntoView({ block: "start" })}
              >
                {dateShort(x.date)}, {x.time}
              </button>
              <span className="text-ink-2">{x.property}</span>
              <span className="text-small text-ink-2">{answered ? "You answered" : "Your answer is needed"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Earlier({ c }: { c: Consultant }) {
  const past = pastFor(c);
  if (past.length === 0) return null;
  return (
    <details
      className="rounded-card border border-border bg-surface px-4 py-2"
      data-testid="consultant-earlier"
    >
      <summary className="flex min-h-12 cursor-pointer items-center text-body font-medium text-ink">
        Earlier hearings ({past.length})
      </summary>
      <ul className="mt-2 flex flex-col divide-y divide-border">
        {past.map((p) => (
          <li key={p.caseId} className="py-3 text-body">
            <p className="text-ink">
              {dateShort(p.date)}, {p.time}: {p.property}
            </p>
            <p className="text-ink-2">
              {p.result ? `Result: ${p.result}` : "Result not recorded yet"}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ConsultantPage({ c }: { c: Consultant }) {
  const coming = comingFor(c);
  const { week, later } = splitWeek(coming);
  const wide = useMedia(WIDE);
  const [view, setView] = useState<"page" | "text">("page");
  const replies = useSession((s) => s.consultantReplies);
  const toAnswer = coming.filter(
    (x) => !replies?.[replyKey(x.caseId, "attend")],
  ).length;
  const accepted = coming.filter((x) => x.saidYes).length;

  useEffect(() => {
    document.title = `${c.name}: hearings`;
  }, [c.name]);

  const header = (
    <div className="flex flex-col gap-1">
      <h1 className="text-title text-ink">{c.name}</h1>
      <p className="text-body text-ink-2" data-testid="consultant-summary">
        <Fact kind="count">{plural(coming.length, "coming hearing")}</Fact>
        {accepted && accepted === coming.length ? ", all accepted" : accepted ? `, ${accepted} accepted` : ""}.{" "}
        {toAnswer ? (
          toAnswer === accepted && accepted === coming.length ? (
            "Please reconfirm each one below."
          ) : (
            <>
              <Fact kind="count">{String(toAnswer)}</Fact>{" "}
              {toAnswer === 1 ? "needs" : "need"} your answer below.
            </>
          )
        ) : (
          "You answered every one."
        )}{" "}
        <span className="block text-small text-muted">As of {dateLong(sheetToday())}.</span>
      </p>
    </div>
  );

  const hearingsCol = (
    <div
      className="flex min-w-0 flex-col gap-8"
      data-testid="consultant-agenda"
    >
      <DayList
        c={c}
        title="Next 7 days"
        list={week}
        testId="consultant-week"
        firstCase={coming[0]?.caseId}
        action={
          <Button
            size="lg"
            variant="ghost"
            icon={<Printer aria-hidden />}
            onClick={() => window.print()}
            className="-mr-2 print:hidden"
            data-testid="consultant-print-week"
          >
            Print
          </Button>
        }
      />
      <DayList
        c={c}
        title="Later"
        list={later}
        testId="consultant-later"
        firstCase={week.length ? undefined : coming[0]?.caseId}
      />
      {coming.length === 0 ? (
        <p className="text-body text-ink-2">
          No coming hearings. The firm will text or email you with the next
          offer.
        </p>
      ) : null}
      {wide ? null : <Earlier c={c} />}
    </div>
  );

  return (
    <main
      id="main"
      className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-6 lg:px-8 lg:py-8"
      data-testid="page-consultant"
      data-consultant={c.slug}
    >
      {wide ? (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            {header}
            {hearingsCol}
          </div>
          <aside
            aria-label="The firm’s rule and messages"
            className="sticky top-20 flex flex-col gap-6"
          >
            <RuleLine />
            <TextPreview c={c} list={coming} print={false} />
            <Glance list={coming} />
            <Earlier c={c} />
          </aside>
        </div>
      ) : (
        <>
          {header}
          <RuleLine />
          <SegmentedControl
            label="Show"
            value={view}
            onValueChange={setView}
            fullWidth
            className="print:hidden [&>button]:h-11 [&>button]:text-body"
            options={[
              {
                value: "page",
                label: "My hearings",
                testId: "consultant-view-page",
              },
              {
                value: "text",
                label: "As a text message",
                testId: "consultant-view-text",
              },
            ]}
          />
          {view === "page" ? hearingsCol : <TextPreview c={c} list={coming} />}
        </>
      )}
    </main>
  );
}

function NotFound({ id }: { id: string }) {
  return (
    <main
      id="main"
      className="mx-auto flex max-w-[640px] flex-col gap-3 px-4 py-10"
    >
      <h1 className="text-title text-ink">
        This link does not open a consultant page
      </h1>
      <p className="text-body text-ink-2">
        No consultant matches “{id}”. Ask the firm for a new link, or pick a
        name from the list.
      </p>
      <a
        href="#/consultant"
        className="text-body font-medium text-accent hover:underline"
      >
        All consultants
      </a>
    </main>
  );
}

/** True when the route belongs to the consultant view, so App renders it without the coordinator shell. */
export function isConsultantPath(path: string): boolean {
  return path === "/consultant" || path.startsWith("/consultant/");
}

export function ConsultantApp() {
  const loc = useLocation();
  const params = matchPath("/consultant/:id", loc.path);
  const c = params?.id ? consultantById(params.id) : undefined;
  useEffect(() => {
    if (!params) document.title = "Consultant pages";
  }, [params]);
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <TopBar back={Boolean(params)} />
      {params?.id ? (
        c ? (
          <ConsultantPage c={c} />
        ) : (
          <NotFound id={params.id} />
        )
      ) : (
        <Picker />
      )}
      <Toaster className="left-4" placement="top-on-phone" />
    </div>
  );
}
