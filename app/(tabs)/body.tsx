import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PillarTile, B, T, pillar, space } from "../../src/ui";
import { DumbbellIcon, BowlIcon } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { countExercises } from "../../src/lib/content";
import { usePillars } from "../../src/lib/pillars";

/**
 * तन / Body (docs/specs/redesign-bms.md) — two doors: Exercise and Diet, each
 * sized to its own content (a stretched tile with no meta row used to leave
 * the door mostly empty) and carrying a tick once today's practice is logged.
 * The Exercise tile speaks (meta row): a live published-exercise count.
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
        <PillarTile
          titleK="tile_exercise"
          subK="tile_exercise_sub"
          icon={<DumbbellIcon size={28} color={pillar.body} />}
          wash={pillar.bodyWash}
          onPress={() => router.push("/(tabs)/workout")}
          done={todayTypes.includes("workout")}
          meta={[exercises != null ? `${exercises} ${t("exercises_word")}` : null, t("meta_home_gym")]}
        />
        <PillarTile
          titleK="tile_diet"
          subK="tile_diet_sub"
          icon={<BowlIcon size={28} color={pillar.body} />}
          wash={pillar.bodyWash}
          onPress={() => router.push("/(tabs)/diet")}
          done={todayTypes.includes("meal")}
        />
      </View>
    </Screen>
  );
}
