import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PillarTile, B, T, pillar, space } from "../../src/ui";
import { MalaIcon, MoonIcon, OmGlyph, BellIcon } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";

/**
 * आत्मा / Soul (docs/specs/redesign-bms.md) — Mantra Jap and Sleep sounds
 * today; Mantra Ucharan and the Bhajan Alarm are the planned additions,
 * teased small beneath the two live doors.
 */
export default function Soul() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Screen scroll={false}>
      <View style={{ paddingTop: space.sm, paddingBottom: space.sm }}>
        <B k="pillar_soul" variant="h1" noSub style={{ color: pillar.soul }} />
        <T variant="caption" tone="muted">
          {t("pillar_soul_sub")}
        </T>
      </View>
      <View style={{ flex: 1, gap: space.md }}>
        <PillarTile
          titleK="tile_jap"
          subK="tile_jap_sub"
          icon={<MalaIcon size={28} color={pillar.soul} />}
          wash={pillar.soulWash}
          onPress={() => router.push("/(tabs)/jap")}
          style={{ flex: 1 }}
        />
        <PillarTile
          titleK="tile_sleep"
          subK="tile_sleep_sub"
          icon={<MoonIcon size={28} color={pillar.soul} />}
          wash={pillar.soulWash}
          onPress={() => router.push("/(tabs)/sleep")}
          style={{ flex: 1 }}
        />
        <View style={{ flexDirection: "row", gap: space.md }}>
          <PillarTile
            titleK="tile_ucharan"
            icon={<OmGlyph size={22} color={pillar.soul} />}
            wash={pillar.soulWash}
            soon
            style={{ flex: 1 }}
          />
          <PillarTile
            titleK="tile_alarm"
            icon={<BellIcon size={22} color={pillar.soul} />}
            wash={pillar.soulWash}
            soon
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Screen>
  );
}
