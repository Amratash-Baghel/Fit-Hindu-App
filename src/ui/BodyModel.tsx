/**
 * BodyModel — the multi-select muscle filter (docs/specs/redesign-bms.md
 * phase 0), inspired by the bajrangvati.in web selector: a front + back human
 * figure whose muscle groups are tappable. Selected groups light up saffron
 * and act as an exercise filter (union of areas).
 *
 * Regions map 1:1 onto the existing `BodyArea` enum — the model is a nicer
 * face on the same filter the chip row used, not a new taxonomy. Geometry is
 * simplified muscle blocks (our own drawing; to be aligned with the web
 * team's SVG once shared). The screen should render labelled toggle chips
 * alongside — they are the accessible tap targets; the figure is the delight.
 */
import React from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, Rect } from "react-native-svg";
import { B } from "./Text";
import { color, space } from "./tokens";
import { feedback } from "../lib/feedback";
import type { BodyArea } from "../types/db";

/** The selectable groups (full_body is "no filter", not a region). */
export type MuscleArea = Exclude<BodyArea, "full_body">;

interface Props {
  selected: MuscleArea[];
  onToggle: (area: MuscleArea) => void;
  /** rendered height of each figure (width follows the 120:250 aspect) */
  height?: number;
}

const VB_W = 120;
const VB_H = 250;

const FILL_IDLE = color.surface2;
const STROKE_IDLE = color.line;
const FILL_ON = "rgba(240,118,30,0.55)";
const STROKE_ON = color.saffron;

export function BodyModel({ selected, onToggle, height = 240 }: Props) {
  const width = (height * VB_W) / VB_H;
  const on = (a: MuscleArea) => selected.includes(a);
  const paint = (a: MuscleArea) => ({
    fill: on(a) ? FILL_ON : FILL_IDLE,
    stroke: on(a) ? STROKE_ON : STROKE_IDLE,
    strokeWidth: 1.4,
    // the figure is the headline filter surface — a muscle tap should tick like
    // the chip row beside it does, not toggle in silence.
    onPress: () => {
      feedback.select();
      onToggle(a);
    },
  });

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-evenly", alignItems: "flex-start" }}>
      {/* FRONT */}
      <View style={{ alignItems: "center", gap: space.xs }}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          {/* fillers — the body parts that are not filters */}
          <Circle cx={60} cy={18} r={12} fill={FILL_IDLE} stroke={STROKE_IDLE} />
          <Rect x={54} y={29} width={12} height={11} rx={3} fill={FILL_IDLE} />
          <Rect x={42} y={46} width={36} height={80} rx={10} fill={FILL_IDLE} />
          <Rect x={44} y={124} width={32} height={17} rx={7} fill={FILL_IDLE} />
          <Circle cx={22} cy={138} r={5} fill={FILL_IDLE} />
          <Circle cx={98} cy={138} r={5} fill={FILL_IDLE} />
          <Rect x={41} y={233} width={17} height={8} rx={3} fill={FILL_IDLE} />
          <Rect x={62} y={233} width={17} height={8} rx={3} fill={FILL_IDLE} />

          {/* shoulders */}
          <Ellipse cx={29} cy={52} rx={12} ry={9} {...paint("shoulders")} />
          <Ellipse cx={91} cy={52} rx={12} ry={9} {...paint("shoulders")} />
          {/* chest — two pecs */}
          <Rect x={43} y={47} width={16.5} height={28} rx={7} {...paint("chest")} />
          <Rect x={60.5} y={47} width={16.5} height={28} rx={7} {...paint("chest")} />
          {/* arms */}
          <Rect x={15} y={58} width={13} height={72} rx={6.5} {...paint("arms")} />
          <Rect x={92} y={58} width={13} height={72} rx={6.5} {...paint("arms")} />
          {/* core */}
          <Rect x={46} y={79} width={28} height={43} rx={9} {...paint("core")} />
          {/* legs */}
          <Rect x={42} y={144} width={17} height={87} rx={7.5} {...paint("legs")} />
          <Rect x={61} y={144} width={17} height={87} rx={7.5} {...paint("legs")} />
        </Svg>
        <B k="model_front" variant="caption" tone="muted" noSub />
      </View>

      {/* BACK */}
      <View style={{ alignItems: "center", gap: space.xs }}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Circle cx={60} cy={18} r={12} fill={FILL_IDLE} stroke={STROKE_IDLE} />
          <Rect x={54} y={29} width={12} height={11} rx={3} fill={FILL_IDLE} />
          <Circle cx={22} cy={138} r={5} fill={FILL_IDLE} />
          <Circle cx={98} cy={138} r={5} fill={FILL_IDLE} />
          <Rect x={41} y={233} width={17} height={8} rx={3} fill={FILL_IDLE} />
          <Rect x={62} y={233} width={17} height={8} rx={3} fill={FILL_IDLE} />

          {/* shoulders */}
          <Ellipse cx={29} cy={52} rx={12} ry={9} {...paint("shoulders")} />
          <Ellipse cx={91} cy={52} rx={12} ry={9} {...paint("shoulders")} />
          {/* back — traps/lats + lower back */}
          <Rect x={42} y={46} width={36} height={62} rx={10} {...paint("back")} />
          <Rect x={46} y={110} width={28} height={15} rx={6} {...paint("back")} />
          {/* arms */}
          <Rect x={15} y={58} width={13} height={72} rx={6.5} {...paint("arms")} />
          <Rect x={92} y={58} width={13} height={72} rx={6.5} {...paint("arms")} />
          {/* legs — glutes + hamstrings/calves */}
          <Rect x={44} y={127} width={32} height={18} rx={8} {...paint("legs")} />
          <Rect x={42} y={148} width={17} height={83} rx={7.5} {...paint("legs")} />
          <Rect x={61} y={148} width={17} height={83} rx={7.5} {...paint("legs")} />
        </Svg>
        <B k="model_back" variant="caption" tone="muted" noSub />
      </View>
    </View>
  );
}
