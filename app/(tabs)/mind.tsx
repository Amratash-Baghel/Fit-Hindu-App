import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PillarTile, B, T, pillar, space } from "../../src/ui";
import { LotusIcon, OmGlyph } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";

/**
 * मन / Mind (docs/specs/redesign-bms.md) — Meditation today; Daily Gita
 * (shloka cards with meaning & wisdom) is the planned second door, shown as a
 * coming-soon teaser so the pillar's shape is already visible.
 */
export default function Mind() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Screen scroll={false}>
      <View style={{ paddingTop: space.sm, paddingBottom: space.sm }}>
        <B k="pillar_mind" variant="h1" noSub style={{ color: pillar.mind }} />
        <T variant="caption" tone="muted">
          {t("pillar_mind_sub")}
        </T>
      </View>
      <View style={{ flex: 1, gap: space.md }}>
        <PillarTile
          titleK="tile_meditation"
          subK="tile_meditation_sub"
          icon={<LotusIcon size={28} color={pillar.mind} />}
          wash={pillar.mindWash}
          onPress={() => router.push("/(tabs)/meditation")}
          style={{ flex: 1 }}
        />
        <PillarTile
          titleK="tile_gita"
          subK="tile_gita_sub"
          icon={<OmGlyph size={26} color={pillar.mind} />}
          wash={pillar.mindWash}
          soon
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}
