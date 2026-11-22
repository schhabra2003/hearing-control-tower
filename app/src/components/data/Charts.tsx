/**
 * Compact charts on Recharts: ChartFrame and LineRunChart (lines with an optional low to high band).
 * Bar and histogram variants are left out: no page needs them.
 *
 * Adapted from uvain, "Charts & KPI Cards" (Layro System), https://21st.dev/uvain/revenue-charts-kpi
 * Kept: one y-axis, thin marks, hairline grid, text never in the series colour, a legend from two
 * series up, a tooltip on every chart and a visually hidden data table under it. Changed: colours
 * come from our tokens by name (so status keeps its meaning), no gradient area fill, axis text at
 * 13 px in ink-2, a title row with one SourceChip, axis titles, typed rows, data-testid passed through.
 */
import { useId, type ReactNode } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import { cn } from '@/lib/cn';

/* ---------------------------------------------------------------- colour -- */

/** Series colours by meaning. Status colours only for status; accent and muted for comparisons. */
export type ChartColor = 'accent' | 'muted' | 'neutral' | 'ok' | 'warn' | 'danger' | 'packet' | 'simulated';

const CSS: Record<ChartColor, string> = {
  accent: 'var(--accent)',
  muted: 'var(--muted)',
  neutral: 'var(--border-strong)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  packet: 'var(--packet)',
  simulated: 'var(--simulated)',
};

export const chartColor = (c: ChartColor): string => CSS[c];

export interface ChartSeries<K extends string = string> {
  key: K;
  label: string;
  color: ChartColor;
}

export type Row = Record<string, string | number | null>;
type Format = (v: number) => string;

const defaultFormat: Format = (v) => v.toLocaleString('en-US');
const TICK = { fill: 'var(--ink-2)', fontSize: 13 };
const AXIS_TITLE = { fill: 'var(--ink-2)', fontSize: 13 };

/* ----------------------------------------------------------------- frame -- */

export interface ChartFrameProps {
  /** Six words or fewer. Also the figure's accessible name. */
  title: string;
  /** Right side of the title row: usually one SourceChip. */
  chip?: ReactNode;
  /** Legend entries; shown from two series up. */
  legend?: { label: string; color: ChartColor }[];
  /** A short line under the legend, for example "Line: middle. Band: low to high." */
  note?: ReactNode;
  children: ReactNode;
  testId?: string;
  className?: string;
}

export function ChartFrame({ title, chip, legend, note, children, testId, className }: ChartFrameProps) {
  return (
    <figure data-testid={testId} className={cn('m-0 flex flex-col gap-3 rounded-card bg-surface p-4 shadow-e1', className)}>
      <figcaption className="flex flex-col gap-2">
        <span className="flex items-center justify-between gap-3">
          <span className="text-h3 text-ink">{title}</span>
          {chip}
        </span>
        {legend && legend.length > 1 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-hidden>
            {legend.map((l) => (
              <li key={l.label} className="flex items-center gap-2 text-small text-ink-2">
                <span className="h-2.5 w-2.5 rounded-chip" style={{ background: CSS[l.color] }} />
                {l.label}
              </li>
            ))}
          </ul>
        ) : null}
        {note ? <span className="text-small text-ink-2">{note}</span> : null}
      </figcaption>
      {children}
    </figure>
  );
}

/* --------------------------------------------------------------- helpers -- */

function TooltipBox({
  title,
  lines,
}: {
  title: ReactNode;
  lines: { label: string; color: ChartColor; value: string }[];
}) {
  return (
    <div className="min-w-[180px] rounded-control bg-surface px-3 py-2 text-small text-ink shadow-e2">
      <p className="mb-2 font-semibold">{title}</p>
      <ul className="grid gap-1">
        {lines.map((l) => (
          <li key={l.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-ink-2">
              <span className="h-2.5 w-2.5 rounded-chip" style={{ background: CSS[l.color] }} />
              {l.label}
            </span>
            <span className="font-medium tabular-nums">{l.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HiddenTable({
  caption,
  rows,
  xKey,
  xLabel,
  series,
  format,
  xFormat,
}: {
  caption: string;
  rows: Row[];
  xKey: string;
  xLabel: string;
  series: ChartSeries[];
  format: Format;
  xFormat?: (v: string | number) => string;
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{xLabel}</th>
          {series.map((s) => (
            <th key={s.key} scope="col">
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const x = r[xKey] ?? '';
          return (
            <tr key={String(x)}>
              <th scope="row">{xFormat ? xFormat(x) : String(x)}</th>
              {series.map((s) => {
                const v = r[s.key];
                return <td key={s.key}>{typeof v === 'number' ? format(v) : ''}</td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface CartesianProps<T extends Row> {
  data: T[];
  xKey: keyof T & string;
  /** Name of the x values, for the axis title and the hidden table's first column. */
  xLabel: string;
  yLabel?: string;
  series: ChartSeries<keyof T & string>[];
  format?: Format;
  /** Formats the value axis ticks; defaults to `format`. Use whole numbers when the values have decimals. */
  tickFormat?: Format;
  xFormat?: (v: string | number) => string;
  height?: number;
  /** One or two sentences that say what the chart shows, read before the hidden table. */
  description: string;
  className?: string;
}

/* ----------------------------------------------------------------- lines -- */

export interface LineSeries<K extends string = string> extends ChartSeries<K> {
  /** Keys of the low and high values; draws a 14 percent band behind the line. */
  band?: [K, K];
}

export interface LineRunChartProps<T extends Row> extends Omit<CartesianProps<T>, 'series'> {
  series: LineSeries<keyof T & string>[];
  /** Show a dot at each run; on by default because runs are discrete. */
  dots?: boolean;
}

export function LineRunChart<T extends Row>({
  data,
  xKey,
  xLabel,
  yLabel,
  series,
  format = defaultFormat,
  tickFormat,
  xFormat,
  height = 260,
  description,
  dots = true,
  className,
}: LineRunChartProps<T>) {
  const id = useId().replace(/:/g, '');
  // Recharts draws a band from a [low, high] pair in one key.
  const x: string = xKey;
  const rows = data.map((r) => {
    const out: Record<string, unknown> = { ...r };
    for (const s of series) if (s.band) out[`${id}-${s.key}`] = [r[s.band[0]], r[s.band[1]]];
    return out;
  });
  const tooltip = (p: TooltipContentProps<TooltipValueType, string | number>) => {
    if (!p.active || !p.payload?.length) return null;
    const row = p.payload[0]?.payload as T | undefined;
    if (!row) return null;
    const x = row[xKey] ?? '';
    return (
      <TooltipBox
        title={`${xFormat ? xFormat(x) : String(x)} ${xLabel.toLowerCase()}`}
        lines={series.map((s) => {
          const v = format(Number(row[s.key] ?? 0));
          const range = s.band ? ` (${format(Number(row[s.band[0]] ?? 0))} to ${format(Number(row[s.band[1]] ?? 0))})` : '';
          return { label: s.label, color: s.color, value: `${v}${range}` };
        })}
      />
    );
  };
  return (
    <div className={cn('flex flex-col', className)}>
      <div role="img" aria-label={description} style={{ height }}>
        <div aria-hidden className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 20, left: 4 }} accessibilityLayer={false}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey={x}
                tick={TICK}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-strong)' }}
                tickMargin={6}
                tickFormatter={xFormat}
                label={{ value: xLabel, position: 'insideBottom', offset: -14, ...AXIS_TITLE }}
              />
              <YAxis
                tick={TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={tickFormat ?? format}
                width={yLabel ? 56 : 40}
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', offset: 8, ...AXIS_TITLE } : undefined}
              />
              {series.map((s) =>
                s.band ? (
                  <Area key={`band-${s.key}`} dataKey={`${id}-${s.key}`} stroke="none" fill={CSS[s.color]} fillOpacity={0.14} isAnimationActive={false} activeDot={false} />
                ) : null,
              )}
              {series.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key as string}
                  name={s.label}
                  stroke={CSS[s.color]}
                  strokeWidth={2}
                  dot={dots ? { r: 3.5, fill: CSS[s.color], stroke: 'var(--surface)', strokeWidth: 2 } : false}
                  activeDot={{ r: 5, fill: CSS[s.color], stroke: 'var(--surface)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
              <Tooltip cursor={{ stroke: 'var(--border-strong)' }} content={tooltip} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <HiddenTable caption={description} rows={data} xKey={xKey} xLabel={xLabel} series={series} format={format} xFormat={xFormat} />
    </div>
  );
}
