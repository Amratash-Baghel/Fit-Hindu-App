import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PillarTile, B, T, pillar, space } from "../../src/ui";
import { MalaIcon, MoonIcon, OmGlyph, BellIcon } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { countMantras, countSleepSounds } from "../../src/lib/content";

/**
 * आत्मा / Soul (docs/specs/redesign-bms.md) — Mantra Jap and Sleep sounds
 * today; Mantra Ucharan and the Bhajan Alarm are the planned additions,
 * teased small beneath the two live doors. Both live tiles speak (meta rows):
 * live counts of published mantras and sleep sounds.
 */
export default function Soul() {
  const router = useRouter();
  const { t } = useI18n();
  const [mantras, setMantras] = useState<number | null>(null);
  const [sounds, setSounds] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void countMantras().then((n) => alive && setMantras(n));
    void countSleepSounds().then((n) => alive && setSounds(n));
    return () => {
      alive = false;
    };
  }, []);

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
          meta={[mantras != null ? `${mantras} ${t("mantras_word")}` : null, t("meta_mala")]}
          style={{ flex: 1 }}
        />
        <PillarTile
          titleK="tile_sleep"
          subK="tile_sleep_sub"
          icon={<MoonIcon size={28} color={pillar.soul} />}
          wash={pillar.soulWash}
          onPress={() => router.push("/(tabs)/sleep")}
          meta={[sounds != null ? `${sounds} ${t("sounds_word")}` : null, t("meta_sleep_timer")]}
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
