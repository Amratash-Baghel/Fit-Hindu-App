/**
 * Purna — the once-a-day "all three pillars done" moment (redesign,
 * docs/specs/redesign-bms.md "the day made whole"). When Body, Mind and Soul
 * have all closed for the day, Home raises this over everything: the three
 * pillar rings drawn together into one interlocked trinity, ॐ at the centre,
 * a warm gold bloom behind. Tap anywhere to continue.
 *
 * It celebrates the ROUTINE — body·mind·soul done — never worship, and is never
 * a paywall or a points-farm (compliance fence-line). A quiet earned beat, like
 * the blessing; the caller shows it once per IST day and remembers the rest.
 *
 * A Modal so it floats above the tab bar too. reduce-motion / web get the
 * static composition (Reveal no-ops there); the fade is the Modal's own.
 */
import React from "react";
import { Modal, Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { color, pillar, scrim, space } from "./tokens";
import { T } from "./Text";
import { Reveal } from "./Reveal";
import { useI18n } from "../lib/i18n";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function Purna({ visible, onDismiss }: Props) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t("purna_title")}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: space.xl,
          backgroundColor: scrim,
        }}
      >
        <Reveal distance={10}>
          <View style={{ alignItems: "center" }}>
            {/* the warm bloom behind the mark */}
            <View
              style={{
                position: "absolute",
                width: 260,
                height: 260,
                borderRadius: 130,
                top: -46,
                backgroundColor: pillar.soulWash,
              }}
            />
            <View style={{ width: 210, height: 210, alignItems: "center", justifyContent: "center" }}>
              <Svg width={210} height={210} viewBox="0 0 210 210">
                <Circle cx={105} cy={105} r={97} fill="none" stroke={color.gold} strokeWidth={2.4} opacity={0.85} />
                <Circle cx={85} cy={90} r={38} fill="none" stroke={pillar.body} strokeWidth={3.4} opacity={0.92} />
                <Circle cx={125} cy={90} r={38} fill="none" stroke={pillar.mind} strokeWidth={3.4} opacity={0.92} />
                <Circle cx={105} cy={122} r={38} fill="none" stroke={pillar.soul} strokeWidth={3.4} opacity={0.95} />
              </Svg>
              <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
                <T style={{ fontSize: 34, fontWeight: "700", color: color.goldHi }}>ॐ</T>
              </View>
            </View>

            <T variant="h1" tone="gold" style={{ marginTop: space.lg, textAlign: "center" }}>
              {t("purna_title")}
            </T>
            <T variant="body" tone="soft" style={{ marginTop: space.xs, textAlign: "center" }}>
              {t("purna_body")}
            </T>
            <T variant="caption" tone="muted" style={{ marginTop: space.xl }}>
              {t("purna_tap")}
            </T>
          </View>
        </Reveal>
      </Pressable>
    </Modal>
  );
}
