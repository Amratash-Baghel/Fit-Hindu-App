import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PillarTile, Reveal, B, T, pillar, space } from "../../src/ui";
import { DumbbellIcon, BowlIcon } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { countExercises } from "../../src/lib/content";
import { usePillars } from "../../src/lib/pillars";

/**
 * तन / Body (docs/specs/redesign-bms.md) — two doors: Exercise and Diet, each
 * sized to its own content and carrying a tick once today's practice is
 * logged. Tiles speak (v2 mockup meta rows): live gold-set numbers from
 * content data, and each door lifts up out of the surface in turn (the
 * mockup's .lift stagger).
 */
export default function Body() {
  const router = useRouter();
  const { t } = useI18n();
  const { todayTypes } = usePillars();
  const [exercises, setExercises] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void countExercises().then((n) => alive && setExercises(n));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Screen>
      <View style={{ paddingTop: space.sm, paddingBottom: space.sm }}>
        <B k="pillar_body" variant="h1" noSub style={{ color: pillar.body }} />
        <T variant="caption" tone="muted">
          {t("pillar_body_sub")}
        </T>
      </View>
      <View style={{ gap: space.md }}>
        <Reveal lift delay={80}>
          <PillarTile
            titleK="tile_exercise"
            subK="tile_exercise_sub"
            icon={<DumbbellIcon size={28} color={pillar.body} />}
            wash={pillar.bodyWash}
            onPress={() => router.push("/(tabs)/workout")}
            done={todayTypes.includes("workout")}
            meta={[
              exercises != null ? { v: exercises, label: t("exercises_word") } : null,
              t("meta_home_gym"),
            ]}
          />
        </Reveal>
        <Reveal lift delay={180}>
          <PillarTile
            titleK="tile_diet"
            subK="tile_diet_sub"
            icon={<BowlIcon size={28} color={pillar.body} />}
            wash={pillar.bodyWash}
            onPress={() => router.push("/(tabs)/diet")}
            done={todayTypes.includes("meal")}
          />
        </Reveal>
      </View>
    </Screen>
  );
}
