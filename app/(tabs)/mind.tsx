import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PillarTile, Reveal, B, T, pillar, space } from "../../src/ui";
import { LotusIcon, OmGlyph } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { countMeditationSounds } from "../../src/lib/content";
import { usePillars } from "../../src/lib/pillars";

/**
 * मन / Mind (docs/specs/redesign-bms.md) — Meditation today; Daily Gita
 * (shloka cards with meaning & wisdom) is the planned second door, shown as a
 * coming-soon teaser so the pillar's shape is already visible. The meditation
 * tile speaks (meta row): a live count of its published sounds, and carries a
 * tick once today's session is logged.
 */
export default function Mind() {
  const router = useRouter();
  const { t } = useI18n();
  const { todayTypes } = usePillars();
  const [sounds, setSounds] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void countMeditationSounds().then((n) => alive && setSounds(n));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Screen>
      <View style={{ paddingTop: space.sm, paddingBottom: space.sm }}>
        <B k="pillar_mind" variant="h1" noSub style={{ color: pillar.mind }} />
        <T variant="caption" tone="muted">
          {t("pillar_mind_sub")}
        </T>
      </View>
      <View style={{ gap: space.md }}>
        <Reveal lift delay={80}>
          <PillarTile
            titleK="tile_meditation"
            subK="tile_meditation_sub"
            icon={<LotusIcon size={28} color={pillar.mind} />}
            wash={pillar.mindWash}
            onPress={() => router.push("/(tabs)/meditation")}
            done={todayTypes.includes("meditation")}
            meta={[
              sounds != null ? { v: sounds, label: t("sounds_word") } : null,
              t("meta_guided"),
            ]}
          />
        </Reveal>
        <Reveal lift delay={180}>
          <PillarTile
            titleK="tile_gita"
            subK="tile_gita_sub"
            icon={<OmGlyph size={26} color={pillar.mind} />}
            wash={pillar.mindWash}
            soon
          />
        </Reveal>
      </View>
    </Screen>
  );
}
