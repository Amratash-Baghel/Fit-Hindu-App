import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PillarTile, B, T, pillar, space } from "../../src/ui";
import { DumbbellIcon, BowlIcon } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { countExercises } from "../../src/lib/content";

/**
 * तन / Body (docs/specs/redesign-bms.md) — two big tiles filling the page:
 * Exercise and Diet. Fixed layout (no scroll): the two doors ARE the page.
 * The Exercise tile speaks (meta row): a live published-exercise count.
 */
export default function Body() {
  const router = useRouter();
  const { t } = useI18n();
  const [exercises, setExercises] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void countExercises().then((n) => alive && setExercises(n));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Screen scroll={false}>
      <View style={{ paddingTop: space.sm, paddingBottom: space.sm }}>
        <B k="pillar_body" variant="h1" noSub style={{ color: pillar.body }} />
        <T variant="caption" tone="muted">
          {t("pillar_body_sub")}
        </T>
      </View>
      <View style={{ flex: 1, gap: space.md }}>
        <PillarTile
          titleK="tile_exercise"
          subK="tile_exercise_sub"
          icon={<DumbbellIcon size={28} color={pillar.body} />}
          wash={pillar.bodyWash}
          onPress={() => router.push("/(tabs)/workout")}
          meta={[exercises != null ? `${exercises} ${t("exercises_word")}` : null, t("meta_home_gym")]}
          style={{ flex: 1 }}
        />
        <PillarTile
          titleK="tile_diet"
          subK="tile_diet_sub"
          icon={<BowlIcon size={28} color={pillar.body} />}
          wash={pillar.bodyWash}
          onPress={() => router.push("/(tabs)/diet")}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}
