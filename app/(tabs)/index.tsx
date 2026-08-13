import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen, Card, Chip, T, AnimatedNumber, Reveal, ProgressBar, Shimmer, FlipCard, PressableScale, PillarCoin, CoinHalo, CoinSplash, Purna, duration, useMotion, color, pillar, radius, space, type PillarKey } from "../../src/ui";
import { feedback } from "../../src/lib/feedback";
import {
  DumbbellIcon,
  LotusIcon,
  OmGlyph,
  ChevronRight,
  DiyaIcon,
  SettingsIcon,
} from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { getTodayDevotional, type DevotionalToday } from "../../src/lib/content";
import { useAuth } from "../../src/lib/auth";
import { currentDaypart, istDayKey, type DaypartInfo } from "../../src/lib/daypart";
import { useStreak } from "../../src/lib/streak";
import { usePoints } from "../../src/lib/points";
import {
  usePillars,
  pillarComplete,
  pillarsCompleteCount,
  ringOrder,
  PILLAR_ORDER,
  type PillarProgress,
} from "../../src/lib/pillars";
import type { PointsSummary } from "../../src/types/db";

/** Icon for each pillar's ring centre, tinted to the pillar. */
const PILLAR_ICON: Record<PillarKey, (c: string) => React.ReactNode> = {
  body: (c) => <DumbbellIcon size={26} color={c} />,
  mind: (c) => <LotusIcon size={26} color={c} />,
  soul: (c) => <OmGlyph size={24} color={c} />,
};

/** Each ring is the door to its pillar page. Literal routes keep expo-router's
 *  typed-routes happy (a template string would not narrow). */
const PILLAR_ROUTE = {
  body: "/(tabs)/body",
  mind: "/(tabs)/mind",
  soul: "/(tabs)/soul",
} as const;

/** Purna is shown once per IST day, persisted like the blessing. */
const PURNA_STORAGE = "fithindu.purna.shown";

/**
 * Daily Home — the habit surface (most polished screen in the app).
 * Greeting + deity-of-the-day + today's shloka + sankalp/streak + the day's
 * cards. Devotional content is live from the DB (scheduled row → weekday
 * fallback). Ticks/streak numbers light up once app auth ships.
 */
export default function Home() {
  const router = useRouter();
  const { t, loc, mode } = useI18n();
  const { session } = useAuth();
  const guest = !session;
  const [dev, setDev] = useState<DevotionalToday | null>(null);
  const { pillars, refresh: refreshPillars } = usePillars();
  // The daypart is re-read on every focus so crossing a boundary (e.g. into the
  // evening) re-washes Home and re-orders the rings — Home stays mounted as a
  // tab, so a mount-only read would go stale.
  const [dp, setDp] = useState<DaypartInfo>(currentDaypart);
  const [purnaVisible, setPurnaVisible] = useState(false);

  // An activity finished inside a module lights its ring the moment the user
  // lands back on Home; the daypart re-reads at the same time.
  useFocusEffect(
    useCallback(() => {
      refreshPillars();
      setDp(currentDaypart());
    }, [refreshPillars]),
  );

  const complete = pillarsCompleteCount(pillars);

  // Purna — the once-a-day "all three pillars done" moment. Fires when the third
  // pillar closes, shown once per IST day (persisted like the blessing) so it is
  // an event, not a nag. Guests can't complete a ring, so it never fires for them.
  useEffect(() => {
    if (guest || complete < 3) return;
    let alive = true;
    AsyncStorage.getItem(PURNA_STORAGE)
      .then((v) => {
        if (alive && v !== istDayKey()) setPurnaVisible(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [guest, complete]);

  const dismissPurna = () => {
    setPurnaVisible(false);
    void AsyncStorage.setItem(PURNA_STORAGE, istDayKey()).catch(() => {});
  };

  useEffect(() => {
    let alive = true;
    getTodayDevotional()
      .then((d) => alive && setDev(d))
      .catch(() => alive && setDev({ deity: null, shloka: null }));
    return () => {
      alive = false;
    };
  }, []);

  // ICU formatter construction is expensive on Hermes — rebuild only when the
  // locale or the IST day changes, not on every render. Formatting the IST-noon
  // instant of today's IST date (rather than `now`) makes the memo key exact:
  // the line updates the first render after IST midnight, never mid-day.
  const dayStamp = istDayKey();
  const dateLine = useMemo(
    () =>
      new Intl.DateTimeFormat(mode === "english" ? "en-IN" : "hi-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Asia/Kolkata",
      }).format(new Date(`${dayStamp}T12:00:00+05:30`)),
    [mode, dayStamp],
  );

  return (
    <Screen wash={dp.wash}>
      {/* greeting + deity of the day */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: space.sm }}>
        <View style={{ flex: 1 }}>
          <T variant="h1">{t(dp.greetingKey)}</T>
          <T variant="caption" tone="muted">
            {dateLine}
          </T>
        </View>
        {dev?.deity ? <Chip label={loc(dev.deity.name_hi, dev.deity.name_en)} active /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings_title")}
          onPress={() => router.push("/settings")}
          hitSlop={10}
          style={{ padding: space.xs, marginLeft: space.sm }}
        >
          <SettingsIcon color={color.muted} />
        </Pressable>
      </View>

      {/* the day's standing — the one number that says whether today is done.
          Guests see Begin-rings + the sign-in invitation instead. */}
      {!guest ? (
        <View style={{ alignItems: "center", marginTop: space.xs }}>
          <T variant="eyebrow" tone="gold">
            {t("today_saadhana")}
          </T>
          <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {t("saadhana_count")
              .replace("{n}", String(complete))
              .replace("{m}", String(PILLAR_ORDER.length))}
          </T>
        </View>
      ) : null}

      {/* the BMS hero — Body · Mind · Soul rings (docs/specs/redesign-bms.md).
          Each circle is the door to its pillar page; the ring is today's
          completion (e.g. mind 1/1 once meditation is logged). After sunset the
          order flips so Soul leads — the day turns inward (dp.soulFirst). */}
      <View style={{ alignItems: "center", gap: space.xl, paddingVertical: space.md }}>
        {ringOrder(dp.soulFirst).map((k, i) => (
          <PillarRing
            key={k}
            k={k}
            icon={PILLAR_ICON[k](pillar[k])}
            progress={pillars[k]}
            done={pillarComplete(pillars[k])}
            guest={guest}
            delay={i * 90}
            onPress={() => router.push(PILLAR_ROUTE[k])}
          />
        ))}
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
        {/* a slow, faint gold sheen so the day's hero card feels alive */}
        <Shimmer mode="sheen" tint={color.goldHi} peak={0.09} />
      </View>

      {/* sankalp / streak */}
      <StreakCard />

      {/* today's blessing — the gentle come-back-tomorrow reveal */}
      <DailyBlessing />

      {/* the day made whole — fires once when all three pillars close */}
      <Purna visible={purnaVisible} onDismiss={dismissPurna} />
    </Screen>
  );
}

/**
 * One BMS circle: the pillar's ring (today's completion), its icon and count
 * at the centre, the pillar name beneath. The whole thing is one tap target
 * into the pillar page.
 */
function PillarRing({
  k,
  icon,
  progress,
  onPress,
  delay,
  done,
  guest,
}: {
  k: PillarKey;
  icon: React.ReactNode;
  progress: PillarProgress;
  onPress: () => void;
  delay: number;
  /** every one of this pillar's activities is logged today */
  done: boolean;
  /** no session — the ring is an invitation, not a count */
  guest: boolean;
}) {
  const { t } = useI18n();
  const motion = useMotion();
  const tint = pillar[k];
  const wash = pillar[`${k}Wash`];
  const nameKey = `pillar_${k}` as const;
  const subKey = `pillar_${k}_sub` as const;

  // Tap = the mockup's splash: pillar ripple + gold wash open first, the page
  // follows one beat later so the moment reads. Immediate under reduce-motion/
  // web. The timer is cleared on unmount so a fast tab-away never double-fires.
  const [splash, setSplash] = useState(0);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (navTimer.current) clearTimeout(navTimer.current);
    },
    [],
  );
  const handlePress = () => {
    if (!motion) {
      onPress();
      return;
    }
    setSplash((n) => n + 1);
    if (navTimer.current) clearTimeout(navTimer.current);
    navTimer.current = setTimeout(onPress, duration.base);
  };

  return (
    <Reveal delay={delay}>
      <PressableScale
        onPress={handlePress}
        scaleTo={0.97}
        accessibilityLabel={
          guest
            ? `${t(nameKey)} — ${t("ring_begin")}`
            : `${t(nameKey)} — ${t("pillar_done")
                .replace("{n}", String(progress.done))
                .replace("{m}", String(progress.total))}`
        }
        style={{ alignItems: "center" }}
      >
        <View>
          {/* the coin's living layer — ambient pillar-colored ripples behind,
              the tap splash above (mockup .ripples / .tapripple / .goldwash) */}
          <CoinHalo size={168} tint={tint} />
          <PillarCoin
            size={168}
            progress={guest ? 0 : progress.total ? progress.done / progress.total : 0}
            tint={tint}
            track={wash}
          >
            <View style={{ alignItems: "center" }}>
              {icon}
              {guest ? (
                <T variant="h2" style={{ marginTop: 4, color: tint }}>
                  {t("ring_begin")}
                </T>
              ) : (
                <T variant="h1" style={{ marginTop: 2 }}>
                  {progress.done}
                  <T variant="h2" tone="muted">
                    /{progress.total}
                  </T>
                </T>
              )}
            </View>
          </PillarCoin>
          <CoinSplash size={168} tint={tint} trigger={splash} />
          {/* a lit diya crowns a pillar that's fully done today */}
          {done ? (
            <View style={{ position: "absolute", top: 2, right: 10 }}>
              <DiyaIcon size={26} />
            </View>
          ) : null}
        </View>
        <View style={{ alignItems: "center", marginTop: space.sm }}>
          <T variant="h2" style={{ color: tint }}>
            {t(nameKey)}
          </T>
          <T variant="caption" tone={done ? "gold" : "muted"}>
            {done ? t("pillar_complete") : t(subKey)}
          </T>
        </View>
      </PressableScale>
    </Reveal>
  );
}

/**
 * Sankalp / streak card — live from streak_state() (migration 0012), which
 * computes the streak server-side in IST with the one-freeze-per-week rule.
 * Framing stays gentle: a broken streak reads as an invitation to begin again,
 * never as loss (docs/specs/tracking-streaks.md — "no streak-loss guilt").
 *
 * Guests (streak === null) see the invitation, which is also the pitch to sign
 * in. Diyas count the sankalp in the design's own metaphor; the row shows a
 * week of seven, and the headline number carries the true count past seven.
 */
const WEEK_DIYAS = 7;

function StreakCard() {
  const router = useRouter();
  const { t } = useI18n();
  const { streak, loading, refresh } = useStreak();
  const { points, refresh: refreshPoints } = usePoints();

  // An activity logged elsewhere (workout, meditation) should be reflected the
  // moment the user lands back on Home — re-read on focus, not just on mount.
  // A refresh keeps the previous streak visible (loading stays false), so only
  // the very first signed-in read shows the resting state below. Points read
  // from the same activity_log, so they refresh on the same focus.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshPoints();
    }, [refresh, refreshPoints]),
  );

  const count = streak?.current_streak ?? 0;
  const active = count > 0;
  const lit = Math.min(count, WEEK_DIYAS);

  // While a signed-in user's first read is in flight, streak is still null —
  // show a neutral resting line, never the "start your sankalp" invitation, so
  // an established streak-holder is not briefly told to begin again on a slow
  // network (matches the no-streak-loss-guilt framing).
  let title: string;
  let sub: string | null;
  if (loading) {
    title = t("loading");
    sub = null;
  } else if (!active) {
    title = t("sankalp_start");
    sub = t("sankalp_hint");
  } else {
    title = t("sankalp_days").replace("{n}", String(count));
    if (streak?.at_risk) sub = t("sankalp_at_risk");
    else if ((streak?.freezes_used ?? 0) > 0) sub = t("sankalp_freeze_saved");
    else sub = t("sankalp_longest").replace("{n}", String(streak?.longest_streak ?? count));
  }

  return (
    // The sankalp card is the way into the full progress screen (slice 6) —
    // "my streak" and "how far I've come" are the same question, and it keeps
    // Progress off the tab bar, which is already full at five.
    <Card onPress={() => router.push("/progress")}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <DiyaIcon size={30} dim={!active} />
        <View style={{ flex: 1 }}>
          <T variant="bodyBold">{title}</T>
          {sub ? (
            <T variant="caption" tone="muted">
              {sub}
            </T>
          ) : null}
        </View>
        {active ? (
          <AnimatedNumber value={count} variant="display" tone="gold" style={{ fontWeight: "800" }} />
        ) : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: space.md,
        }}
      >
        {Array.from({ length: WEEK_DIYAS }).map((_, i) => (
          // a lit-up-in-sequence stagger when Home first appears; a fade-pop
          // (distance 0), never a rise, so the diya row reads as igniting.
          <Reveal key={i} delay={i * 70} distance={0}>
            <DiyaIcon size={24} dim={i >= lit} />
          </Reveal>
        ))}
      </View>
      <PointsRow points={points} />
    </Card>
  );
}

/**
 * Fit Points line inside the sankalp card (slice 5). Shown only to a signed-in
 * user whose read has landed (points != null) — a guest already sees the
 * sign-in invitation above, so a zero here would be noise. Points come from the
 * same activity_log as the streak, so the two never disagree about who is in.
 */
function PointsRow({ points }: { points: PointsSummary | null }) {
  const { t } = useI18n();
  if (!points) return null;

  const daysToNext =
    points.next_milestone_day != null
      ? Math.max(0, points.next_milestone_day - points.current_streak)
      : null;
  const nextLine =
    daysToNext != null && points.next_milestone_bonus != null
      ? t(daysToNext === 1 ? "points_next_milestone_one" : "points_next_milestone")
          .replace("{d}", String(daysToNext))
          .replace("{b}", String(points.next_milestone_bonus))
      : t("points_milestone_max");

  return (
    <View style={{ marginTop: space.md, borderTopWidth: 1, borderTopColor: color.line, paddingTop: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <T variant="caption" tone="muted">
            {t("points_label")}
          </T>
          <AnimatedNumber value={points.total_points} variant="bodyBold" tone="gold" />
        </View>
        {points.today_points > 0 ? (
          <T variant="caption" tone="saffron">
            {t("points_today").replace("{n}", String(points.today_points))}
          </T>
        ) : null}
      </View>
      {/* momentum toward the next milestone — the bar the "{d} more days" line
          describes, made visible (gold: this is the sankalp's own reward track). */}
      {points.next_milestone_day != null ? (
        <ProgressBar
          value={points.current_streak}
          max={points.next_milestone_day}
          tone="gold"
          animated
          style={{ marginTop: space.sm }}
        />
      ) : null}
      <T variant="caption" tone="muted" style={{ marginTop: 4 }}>
        {nextLine}
      </T>
    </View>
  );
}

const BLESSING_KEYS = [
  "blessing_1",
  "blessing_2",
  "blessing_3",
  "blessing_4",
  "blessing_5",
  "blessing_6",
  "blessing_7",
] as const;
const BLESSING_STORAGE = "fithindu.blessing.revealed";

/**
 * Daily blessing (docs/specs/ui-polish.md slice E) — a once-per-IST-day
 * tap-to-reveal well-wish; the gentle come-back-tomorrow loop. The blessing
 * itself is the reward (no fabricated points the client can't honestly source),
 * it is never gated (a blessing is worship-adjacent), and the day's line is
 * picked deterministically from the IST date so it's stable all day. The
 * revealed state is persisted per IST day, so returning to Home shows it opened.
 */
function DailyBlessing() {
  const { t } = useI18n();
  const [todayKey, setTodayKey] = useState(istDayKey);
  // null = still reading the persisted state; don't flash the closed face first.
  const [revealed, setRevealed] = useState<boolean | null>(null);

  // Re-evaluate the IST day + persisted state on every focus, so returning to
  // Home after the midnight boundary shows the new day's blessing (Home stays
  // mounted as a tab, so a one-time mount read would go stale — review finding).
  useFocusEffect(
    useCallback(() => {
      const key = istDayKey();
      setTodayKey(key);
      let alive = true;
      AsyncStorage.getItem(BLESSING_STORAGE)
        .then((v) => alive && setRevealed(v === key))
        .catch(() => alive && setRevealed(false));
      return () => {
        alive = false;
      };
    }, []),
  );

  const blessingKey = useMemo(() => {
    let h = 0;
    for (let i = 0; i < todayKey.length; i++) h = (h + todayKey.charCodeAt(i)) % 100000;
    return BLESSING_KEYS[h % BLESSING_KEYS.length];
  }, [todayKey]);

  const reveal = () => {
    setRevealed(true);
    void AsyncStorage.setItem(BLESSING_STORAGE, todayKey).catch(() => {});
    feedback.success(); // a once-a-day earned moment — a small warm chime
  };

  if (revealed === null) return null;

  // The two faces of the flip. Each carries its own ember gradient so the whole
  // tile turns over (owner ask 2026-08-08: reveal is a FLIP, not a fade-swap).
  const face = {
    padding: space.lg,
    minHeight: 96,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: space.md,
  };
  const front = (
    <LinearGradient colors={["#241407", "#1C1510"]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={face}>
      <DiyaIcon size={30} dim />
      <View style={{ flex: 1 }}>
        <T variant="eyebrow" tone="gold">
          {t("daily_blessing_title")}
        </T>
        <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {t("daily_blessing_tap")}
        </T>
      </View>
      <ChevronRight />
    </LinearGradient>
  );
  const back = (
    <LinearGradient colors={["#2A1808", "#1C1510"]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={face}>
      <DiyaIcon size={30} />
      <View style={{ flex: 1 }}>
        <T variant="bodyBold" style={{ color: color.goldHi }}>
          {t(blessingKey)}
        </T>
        <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {t("daily_blessing_footer")}
        </T>
      </View>
    </LinearGradient>
  );

  return (
    <View
      style={{
        borderRadius: radius.card,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#4a3416",
        backgroundColor: color.surface, // shows on-brand at the flip's edge-on instant
      }}
    >
      <FlipCard
        front={front}
        back={back}
        flipped={revealed}
        onPress={reveal}
        accessibilityLabel={t("daily_blessing_title")}
      />
      {/* faint sheen so the blessing card reads as something special */}
      <Shimmer mode="sheen" tint={color.goldHi} peak={0.1} />
    </View>
  );
}

