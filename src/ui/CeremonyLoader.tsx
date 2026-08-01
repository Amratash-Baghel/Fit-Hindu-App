/**
 * CeremonyLoader — the full-screen "something is being made for you" surface.
 * Spec: docs/specs/feature-sprint.md slice 5.
 *
 * Deliberately parameterised rather than plan-specific: it takes a list of
 * stage labels, the index of the stage currently in flight, a status, and its
 * outcome copy. The plan-ready ceremony is its first caller; workout-plan
 * generation is meant to be its second, with no change to this file.
 *
 * It reuses the splash's artwork (src/ui/ceremony/art.tsx) so the two read as
 * one product — same oxblood field, same gold ogee arch, same gada. The splash
 * animates those marks; this screen holds them still and animates only the
 * progress bar and a slow gold breath, because this screen can be on-screen for
 * an unbounded time on a slow connection and a looping composition would be
 * both distracting and a battery cost.
 *
 * Honesty contract (the reason the progress model looks the way it does):
 *  - `stageIndex` moves only when a real await starts. There are no timers here.
 *  - While working, the bar snaps up to each stage's honest floor
 *    (stageIndex + 1) / (stages.length + 1), then creeps slowly toward a soft
 *    ceiling just below the next stage — so it always looks alive, but can
 *    never reach 1: completion is a status, never a stage count or a timer.
 *  - It only completes to 1 when the caller reports a terminal status — the
 *    final stage cannot claim completion before the data has actually landed.
 *  - On `error` the bar freezes where it got to. It never rewinds and never
 *    completes.
 *
 * Performance: motion is Reanimated on the UI thread, and the bar animates
 * `scaleX` (a transform) rather than `width` (a layout prop re-measured every
 * frame) — the low-end-Android rule from the risk register.
 */
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { ceremony as c, progressBar, space } from "./tokens";
import { T } from "./Text";
import { useI18n, type StringKey } from "../lib/i18n";
import {
  ARCH_INNER,
  ARCH_OUTER,
  CEREMONY_VB,
  Emblem,
  FieldVignette,
  SidePanel,
} from "./ceremony/art";

const VB = `0 0 ${CEREMONY_VB.w} ${CEREMONY_VB.h}`;
/** Decorative layers never intercept touches. */
const noHit = { pointerEvents: "none" } as const;

/**
 * Reanimated does not drive animations under react-native-web in this setup —
 * a bare `withRepeat(withTiming(…))` on a plain View stays pinned to its initial
 * value, verified with an isolated probe. Left alone, the progress bar would sit
 * at scaleX(0) forever in the web build while the writes ran fine underneath.
 * So web takes the same path as reduce-motion: shared values are assigned
 * outright instead of tweened, which lands every state on its correct value.
 * Native — the shipping target — animates normally. Same precedent as
 * CeremonySplash's web branch for the stroke-dash reveal.
 */
const isWeb = Platform.OS === "web";

/**
 * `working` — a stage is in flight.
 * `success` — the thing was made.
 * `empty`   — the work finished but produced nothing (no rule matched). Not an
 *             error; the caller supplies its own copy and its own way onward.
 * `error`   — the work failed. Whatever the caller held is still held.
 */
export type CeremonyStatus = "working" | "success" | "empty" | "error";

interface Props {
  /** Stage labels, in the order the caller's real awaits fire. */
  stages: readonly StringKey[];
  /** Index into `stages` of the step now in flight. Ignored unless working. */
  stageIndex: number;
  status: CeremonyStatus;
  /** Headline + supporting line for the current status; the caller picks them. */
  titleKey: StringKey;
  bodyKey: StringKey;
  /** The way onward — Buttons. Every non-working status must supply one. */
  children?: React.ReactNode;
}

export function CeremonyLoader({
  stages,
  stageIndex,
  status,
  titleKey,
  bodyKey,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  // Defaults to "animate" and downgrades if the query says otherwise, rather
  // than starting null and waiting. Nothing on this screen may be gated on an
  // accessibility answer: `isReduceMotionEnabled()` is not guaranteed to settle
  // on every platform (it does not on react-native-web), and a version of this
  // that waited for it left the progress bar frozen at zero with the emblem
  // stuck dim — the screen looked hung while the writes were in fact running.
  // Worst case now is that a reduce-motion user sees one 420 ms tween before
  // the flag lands.
  const [reduceMotion, setReduceMotion] = useState(false);

  /** Skip tweens entirely: reduce-motion by choice, web by capability. */
  const instant = reduceMotion || isWeb;

  const working = status === "working";
  const done = status === "success" || status === "empty";
  const breathing = useRef(false);

  const fill = useSharedValue(0); // progress bar, 0..1
  const breath = useSharedValue(0); // slow gold breath on the emblem

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduceMotion(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // --- progress ---
  // Clamped so a caller that over-reports a stage cannot push the bar to full
  // while still working: completion is a status, never a stage count.
  const stepped = stages.length
    ? Math.min(stageIndex + 1, stages.length) / (stages.length + 1)
    : 0;
  const target = done ? 1 : stepped;

  useEffect(() => {
    if (status === "error") {
      cancelAnimation(fill); // freeze exactly where it stopped
      return;
    }
    if (instant) {
      fill.value = target; // web / reduce-motion: land on the honest value, no tween
      return;
    }
    if (done) {
      fill.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
      return;
    }
    // Working: snap up to the stage's honest floor, then keep CREEPING slowly
    // toward a soft ceiling so the bar never sits frozen at 0.8 on a slow
    // connection (the old "stalled" feel). The creep is a long ease-out that
    // asymptotes below the next stage — it can never reach 1; only a terminal
    // status may complete the bar.
    const floor = stepped;
    const ceiling = Math.min(0.92, floor + 0.12);
    fill.value = withSequence(
      withTiming(floor, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withTiming(ceiling, { duration: 6000, easing: Easing.out(Easing.quad) }),
    );
  }, [status, instant, done, stepped, target, fill]);

  // --- the slow gold breath, only while there is genuinely work in flight ---
  useEffect(() => {
    if (instant) {
      // Either it was on from the start, or the query has just come back and
      // a loop is already running — stop it and rest at full.
      if (breathing.current) breathing.current = false;
      cancelAnimation(breath);
      breath.value = 1;
      return;
    }
    if (working && !breathing.current) {
      breathing.current = true;
      breath.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else if (!working && breathing.current) {
      breathing.current = false;
      cancelAnimation(breath);
      // settle to full rather than snapping from wherever the loop was
      breath.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) });
    }
  }, [working, instant, breath]);

  // Stop the loop on unmount, or it keeps running against a detached view.
  useEffect(() => () => cancelAnimation(breath), [breath]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const emblemStyle = useAnimatedStyle(() => ({ opacity: 0.72 + breath.value * 0.28 }));

  // Under react-native-web the two styles above never re-evaluate after mount
  // (see `isWeb`), which would pin the bar at zero and the emblem at its dim
  // start. Layered last so they win, these plain styles come straight from the
  // props, so the web build still shows the true progress — just without the
  // tween. On native both are null and Reanimated is untouched.
  const webFill = isWeb ? { transform: [{ scaleX: target }] } : null;
  const webEmblem = isWeb ? { opacity: 1 } : null;

  const stageKey = working ? stages[Math.min(stageIndex, stages.length - 1)] : null;
  const pct = Math.round(target * 100);

  return (
    <View style={styles.root}>
      {/* the same field, panels and arch the splash uses — held still here */}
      <View style={[StyleSheet.absoluteFill, noHit]}>
        <FieldVignette />
      </View>
      <View style={[StyleSheet.absoluteFill, noHit, styles.panels]}>
        <SidePanel side="left" />
      </View>
      <View style={[StyleSheet.absoluteFill, noHit, styles.panels]}>
        <SidePanel side="right" />
      </View>

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
        ]}
      >
        <View style={styles.artSlot}>
          {/* Sized by `aspectRatio`, not by measuring: Yoga derives the width
              from whatever height is left over, so the composition shrinks to
              fit a short screen with no measure-then-render pass — and nothing
              can leave it stuck at zero if a layout event never arrives. */}
          <Animated.View style={[styles.artBox, noHit, emblemStyle, webEmblem]}>
            <Svg
              width="100%"
              height="100%"
              viewBox={VB}
              preserveAspectRatio="xMidYMid meet"
              style={StyleSheet.absoluteFill}
            >
              <Path d={ARCH_OUTER} stroke={c.gold} strokeWidth={2.4} fill="none" strokeLinecap="round" />
              <Path d={ARCH_INNER} stroke={c.goldHi} strokeWidth={1.3} fill="none" strokeLinecap="round" />
            </Svg>
            <Emblem />
          </Animated.View>
        </View>

        <View style={styles.copy}>
          <Line k={titleKey} variant="h1" color={c.goldHi} />
          <Line k={bodyKey} variant="body" color={c.cream} />
        </View>

        {/* The bar is hidden only on failure: a full gold bar under an error
            headline would be a lie, and a frozen part-filled one is just noise
            next to the retry. Success and empty both keep it, full — the work
            genuinely finished in both. */}
        {status !== "error" ? (
          <View
            style={styles.progressWrap}
            accessibilityRole="progressbar"
            accessibilityLabel={t("plan_progress_label")}
            accessibilityValue={{ min: 0, max: 100, now: pct }}
          >
            <View style={styles.track}>
              <Animated.View style={[styles.fill, fillStyle, webFill]} />
            </View>
            {stageKey ? (
              <T variant="caption" style={styles.stage}>
                {t(stageKey)}
              </T>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>{children}</View>
      </View>
    </View>
  );
}

/**
 * A catalog string on the ceremony field, in ceremony colours.
 *
 * Not `<B>`: that renders the mixed-mode English caption in `color.muted`, an
 * app-surface token picked against near-black ink. On oxblood it drops to about
 * 3.4:1 — fine on the dark app screens it was chosen for, too thin here. Same
 * strings, same mode rules, ceremony palette.
 */
function Line({
  k,
  variant,
  color,
}: {
  k: StringKey;
  variant: "h1" | "body";
  color: string;
}) {
  const { t, tSub } = useI18n();
  const sub = tSub(k);
  return (
    <View style={styles.line}>
      <T variant={variant} style={{ color, textAlign: "center" }}>
        {t(k)}
      </T>
      {sub ? (
        <T variant="caption" style={styles.lineSub}>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.field },
  // The panels sweep in on the splash; here they are simply seated, and dimmed
  // so the copy stays the brightest thing on the screen.
  panels: { opacity: 0.75 },
  content: { flex: 1, paddingHorizontal: space.lg },
  artSlot: { flex: 1, minHeight: 120, alignItems: "center", justifyContent: "center" },
  artBox: { flex: 1, aspectRatio: CEREMONY_VB.w / CEREMONY_VB.h, maxWidth: "100%" },
  copy: { gap: space.sm, paddingTop: space.lg },
  line: { alignItems: "center" },
  lineSub: { color: c.cream, opacity: 0.72, textAlign: "center" },
  progressWrap: { paddingTop: space.xl, gap: space.sm },
  track: {
    height: progressBar.height,
    borderRadius: progressBar.radius,
    overflow: "hidden",
    backgroundColor: c.fieldDeep,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.goldShade,
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.gold,
    borderRadius: progressBar.radius,
    // scaleX grows the bar from the left edge instead of its centre. A
    // transform, so it stays on the UI thread and never triggers layout.
    transformOrigin: "left",
  },
  stage: { color: c.cream, opacity: 0.8, textAlign: "center" },
  actions: { paddingTop: space.xl, gap: space.sm },
});
