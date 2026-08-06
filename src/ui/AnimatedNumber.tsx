/**
 * AnimatedNumber — counts from its previous value to the new one with a short
 * ease-out tween (docs/specs/ui-polish.md slice D). Used for the completion
 * stat rows, the streak count, and the Fit-Points total, so a number that
 * changes lands with a little momentum instead of snapping.
 *
 * JS-thread on purpose: these fire ONCE on a discrete event (a screen focus, a
 * finished session) and run for well under a second, so the cost is a handful of
 * frames — and, unlike Reanimated, requestAnimationFrame drives identically on
 * web, so the count-up is actually verifiable in the preview. Honours
 * reduce-motion / web-inert by snapping (the gate is shared with the rest of the
 * motion layer). Renders through <T> so type + tone stay in the design system.
 */
import React, { useEffect, useRef, useState } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { T } from "./Text";
import { duration as dur, useMotion } from "./motion";

type Variant = React.ComponentProps<typeof T>["variant"];
type Tone = React.ComponentProps<typeof T>["tone"];

interface Props {
  value: number;
  /** Where the count starts on first mount — 0 so a fresh stat counts UP into
   *  view (the completion "wow"). After mount it tweens from the last value. */
  from?: number;
  /** Tween length (ms). */
  duration?: number;
  /** Format the (possibly fractional, mid-tween) value into the shown string. */
  format?: (n: number) => string;
  variant?: Variant;
  tone?: Tone;
  style?: StyleProp<TextStyle>;
}

const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);

export function AnimatedNumber({
  value,
  from = 0,
  duration = dur.count,
  format = (n) => String(Math.round(n)),
  variant,
  tone,
  style,
}: Props) {
  const enabled = useMotion();
  const [display, setDisplay] = useState(from);
  // The latest painted value, so a re-trigger mid-flight continues from where
  // the number visually is rather than snapping back to the previous origin
  // (code-review finding). Written only inside the effect / rAF (never during
  // render), and read at the start of each new tween.
  const displayRef = useRef(from);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const to = value;
    const start = displayRef.current;
    if (!enabled || start === to) {
      displayRef.current = to;
      setDisplay(to);
      return;
    }
    let t0 = 0;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const k = Math.min(1, (ts - t0) / duration);
      const v = start + (to - start) * easeOutCubic(k);
      displayRef.current = v;
      setDisplay(v);
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, enabled, duration]);

  return (
    <T variant={variant} tone={tone} style={style}>
      {format(display)}
    </T>
  );
}
