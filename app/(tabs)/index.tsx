import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Card, Chip, B, T, color, space } from "../../src/ui";
import {
  DumbbellIcon,
  BowlIcon,
  LotusIcon,
  OmGlyph,
  MoonIcon,
  ChevronRight,
  DiyaIcon,
} from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import {
  getTodayDevotional,
  listGreetings,
  pickGreeting,
  type DevotionalToday,
  type Greeting,
} from "../../src/lib/content";
import { loadProfile } from "../../src/lib/profile";

/**
 * Daily Home — the habit surface (most polished screen in the app).
 * Greeting + deity-of-the-day + today's shloka + sankalp/streak + the day's
 * cards. Devotional content is live from the DB (scheduled row → weekday
 * fallback). Ticks/streak numbers light up once app auth ships.
 */
export default function Home() {
  const router = useRouter();
  const { t, loc, mode } = useI18n();
  const [dev, setDev] = useState<DevotionalToday | null>(null);
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getTodayDevotional()
      .then((d) => alive && setDev(d))
      .catch(() => alive && setDev({ deity: null, shloka: null }));
    // Greeting + name are chrome: either failing must leave Home usable, so
    // each falls back on its own rather than through a shared error state.
    listGreetings()
      .then((g) => alive && setGreetings(g))
      .catch(() => alive && setGreetings([]));
    loadProfile()
      .then((p) => alive && setName(p.displayName))
      .catch(() => alive && setName(null));
    return () => {
      alive = false;
    };
  }, []);

  // Deity-matched greeting → rotate the list → the i18n string if the content
  // team hasn't authored any greeting yet.
  const greeting = pickGreeting(greetings, dev?.deity?.id ?? null);
  const greetText = greeting ? loc(greeting.text_hi, greeting.text_en ?? greeting.text_hi) : t("greeting");
  const greetLine = name ? `${greetText}, ${name}` : greetText;

  const dateLine = new Intl.DateTimeFormat(mode === "english" ? "en-IN" : "hi-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <Screen>
      {/* greeting + deity of the day */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: space.sm }}>
        <View style={{ flex: 1 }}>
          <T variant="h1" numberOfLines={1}>
            {greetLine}
          </T>
          <T variant="caption" tone="muted">
            {dateLine}
          </T>
        </View>
        {dev?.deity ? <Chip label={loc(dev.deity.name_hi, dev.deity.name_en)} active /> : null}
      </View>

      {/* today's shloka — ember card with ॐ watermark (mockup) */}
      <View style={{ borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#4a3416" }}>
        <LinearGradient colors={["#241407", "#1C1510"]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}>
          <View style={{ padding: space.lg }}>
            <View style={{ position: "absolute", right: -6, top: -26, opacity: 0.08 }}>
              <OmGlyph size={86} color={color.gold} />
            </View>
            <T variant="eyebrow" tone="gold">
              {t("todays_shloka")}
            </T>
            {dev === null ? (
              <T variant="body" tone="muted" style={{ marginTop: space.sm }}>
                {t("loading")}
              </T>
            ) : dev.shloka ? (
              <>
                <T variant="body" style={{ color: color.goldHi, marginTop: space.sm, fontWeight: "600", lineHeight: 26 }}>
                  {dev.shloka.text_hi}
                </T>
                {mode !== "hindi" && dev.shloka.text_en ? (
                  <T variant="caption" tone="muted" style={{ marginTop: space.sm }}>
                    {dev.shloka.text_en}
                  </T>
                ) : null}
                {dev.shloka.source ? (
                  <T variant="caption" tone="muted" style={{ marginTop: 4, fontStyle: "italic" }}>
                    — {dev.shloka.source}
                  </T>
                ) : null}
              </>
            ) : (
              <T variant="body" tone="muted" style={{ marginTop: space.sm }}>
                ॐ
              </T>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* sankalp / streak */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <DiyaIcon size={30} />
          <View style={{ flex: 1 }}>
            <B k="sankalp_start" variant="bodyBold" noSub />
            <B k="sankalp_hint" variant="caption" tone="muted" noSub />
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <DiyaIcon size={22} dim />
            <DiyaIcon size={22} dim />
            <DiyaIcon size={22} dim />
          </View>
        </View>
      </Card>

      {/* today's cards */}
      <TodayCard
        icon={<DumbbellIcon color={color.saffron} />}
        titleHi="आज का व्यायाम"
        titleEn="Today's workout"
        onPress={() => router.push("/(tabs)/workout")}
      />
      <TodayCard
        icon={<BowlIcon color={color.gold} />}
        gold
        titleHi="आज का आहार"
        titleEn="Today's diet"
        soon={t("soon_badge")}
      />
      <TodayCard
        icon={<LotusIcon color={color.saffron} />}
        titleHi="ध्यान"
        titleEn="Meditation"
        onPress={() => router.push("/(tabs)/meditation")}
      />
      <TodayCard
        icon={<OmGlyph size={20} color={color.gold} />}
        gold
        titleHi="मंत्र जप"
        titleEn="Mantra jap"
        onPress={() => router.push("/(tabs)/jap")}
      />
      <TodayCard
        icon={<MoonIcon color={color.saffron} />}
        titleHi="नींद की ध्वनियाँ"
        titleEn="Sleep sounds"
        onPress={() => router.push("/(tabs)/sleep")}
      />
    </Screen>
  );
}

function TodayCard({
  icon,
  titleHi,
  titleEn,
  onPress,
  gold,
  soon,
}: {
  icon: React.ReactNode;
  titleHi: string;
  titleEn: string;
  onPress?: () => void;
  gold?: boolean;
  soon?: string;
}) {
  const { loc, locSub } = useI18n();
  const sub = locSub(titleHi, titleEn);
  return (
    <Card onPress={onPress} style={{ paddingVertical: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: gold ? "rgba(217,164,65,0.13)" : "rgba(240,118,30,0.13)",
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <T variant="bodyBold">{loc(titleHi, titleEn)}</T>
          {sub ? (
            <T variant="caption" tone="muted">
              {sub}
            </T>
          ) : null}
        </View>
        {soon ? <Chip label={soon} /> : onPress ? <ChevronRight /> : null}
      </View>
    </Card>
  );
}
