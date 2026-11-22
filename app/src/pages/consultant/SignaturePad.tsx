/**
 * SignaturePad: sign with a finger, a stylus or a mouse, or type your name instead.
 *
 * Adapted from two 21st.dev components:
 * - "Signature Pad" by kuratlielia, https://21st.dev/r/kuratlielia/signature-pad (id 35053): pointer
 *   capture so a stroke keeps drawing when the finger leaves the pad, strokes kept in pad units so
 *   they scale with the pad, each stroke drawn as one smooth path through the midpoints of its
 *   samples, and a clear action.
 * - "Signature Pad" by uvain, https://21st.dev/r/uvain/signature-pad (id 26945): more than one way
 *   to sign the same document (draw or type), both giving the same result.
 * Changes for Hearing Desk: no pressure model, ink colours, replay or export (a consultant only
 * needs to sign once); ink is var(--ink) so it follows the theme; a typed name is the keyboard and
 * screen reader route; touch-action none on the pad only; 44 px controls.
 */

import { useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

const W = 600;
const H = 200;
type Pt = [number, number];

function pathOf(points: Pt[]): string {
  if (points.length === 0) return "";
  const [x0, y0] = points[0]!;
  if (points.length === 1) return `M${x0} ${y0} l0.1 0`;
  let d = `M${x0} ${y0}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x, y] = points[i]!;
    const [nx, ny] = points[i + 1]!;
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const [lx, ly] = points[points.length - 1]!;
  return `${d} L${lx} ${ly}`;
}

export interface SignaturePadProps {
  /** The signer's name, the default for the typed route. */
  name: string;
  /** Called with how they signed: "drawn" or the typed name. */
  onSign: (how: string) => void;
  testId: string;
}

export function SignaturePad({ name, onSign, testId }: SignaturePadProps) {
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const drawing = useRef(false);
  const svg = useRef<SVGSVGElement>(null);

  const at = (e: PointerEvent<SVGSVGElement>): Pt => {
    const r = svg.current!.getBoundingClientRect();
    return [
      Math.round(((e.clientX - r.left) / r.width) * W),
      Math.round(((e.clientY - r.top) / r.height) * H),
    ];
  };
  const down = (e: PointerEvent<SVGSVGElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    setStrokes((s) => [...s, [at(e)]]);
  };
  const move = (e: PointerEvent<SVGSVGElement>): void => {
    if (!drawing.current) return;
    const p = at(e);
    setStrokes((s) => [...s.slice(0, -1), [...(s[s.length - 1] ?? []), p]]);
  };
  const up = (): void => {
    drawing.current = false;
  };

  const ready =
    mode === "draw"
      ? strokes.some((s) => s.length > 2)
      : typed.trim().length > 1;

  return (
    <div data-testid={testId} className="flex flex-col gap-3">
      <SegmentedControl
        label="How to sign"
        value={mode}
        onValueChange={setMode}
        fullWidth
        className="[&>button]:h-11 [&>button]:text-body"
        options={[
          { value: "draw", label: "Draw", testId: `${testId}-draw` },
          { value: "type", label: "Type my name", testId: `${testId}-type` },
        ]}
      />

      {mode === "draw" ? (
        <div className="relative">
          <svg
            ref={svg}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={
              strokes.length
                ? "Your signature"
                : "Signature area: draw with your finger"
            }
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            className="block h-36 w-full cursor-crosshair touch-none rounded-quote border border-border-control bg-surface"
          >
            <line
              x1={24}
              x2={W - 24}
              y1={H - 44}
              y2={H - 44}
              stroke="var(--border-strong)"
              strokeDasharray="6 6"
              strokeWidth={1.5}
            />
            {strokes.map((s, i) => (
              <path
                key={i}
                d={pathOf(s)}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
          {strokes.length === 0 ? (
            <p className="pointer-events-none absolute inset-x-0 top-6 text-center text-body text-muted">
              Sign here with your finger
            </p>
          ) : null}
        </div>
      ) : (
        <Field label="Your full name">
          <TextInput
            data-testid={`${testId}-name`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={name}
            autoComplete="name"
            className="h-12"
          />
        </Field>
      )}

      <div className="flex gap-2">
        {mode === "draw" ? (
          <Button
            size="lg"
            variant="ghost"
            disabled={strokes.length === 0}
            onClick={() => setStrokes([])}
            data-testid={`${testId}-clear`}
          >
            Clear
          </Button>
        ) : null}
        <Button
          size="lg"
          variant="primary"
          className="flex-1"
          disabled={!ready}
          onClick={() => onSign(mode === "draw" ? "drawn" : typed.trim())}
          data-testid={`${testId}-submit`}
        >
          Sign
        </Button>
      </div>
    </div>
  );
}
