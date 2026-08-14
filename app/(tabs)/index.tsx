import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen, Card, Chip, Diya, EmberCard, GoldWash, IconSlot, T, AnimatedNumber, Reveal, ProgressBar, Shimmer, FlipCard, PressableScale, PillarCoin, CoinHalo, Purna, useCoinExpand, duration, useMotion, color, ember, pillar, radius, space, type PillarKey } from "../../src/ui";
import { feedback } from "../../src/lib/feedback";
import {
  DumbbellIcon,
  LotusIcon,
  OmGlyph,
  ChevronRight,
  SettingsIcon,
  BowlIcon,
  MalaIcon,
  MoonIcon,
} from "../../src/ui/icons";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { getTodayDevotional, type DevotionalToday } from "../../src/lib/content";
import { useAuth } from "../../src/lib/auth";
import { currentDaypart, istDayKey, type DaypartInfo } from "../../src/lib/daypart";
import { useStreak } from "../../src/lib/streak";
import { usePoints } from "../../src/lib/points";
import {
  usePillars,
  useWeekPillars,
  pillarComplete,
  pillarsCompleteCount,
  ringOrder,
  PILLAR_ORDER,
  type PillarProgress,
} from "../../src/lib/pillars";
import type { ActivityType, PointsSummary } from "../../src/types/db";

/**
 * The day's concrete practices (redesign — "name the next step"): one chip per
 * activity type, done-state from the SAME daily_activity read that feeds the
 * rings, each a deep link into its module. Types are the platform's own enum —
 * nothing product-specific is hardcoded; titles come from the i18n catalog.
 */
const STRIP_ITEMS: {
  type: ActivityType;
  pillar: PillarKey;
  titleK: StringKey;
  route: "/(tabs)/workout" | "/(tabs)/diet" | "/(tabs)/meditation" | "/(tabs)/jap" | "/(tabs)/sleep";
  icon: (c: string) => React.ReactNode;
}[] = [
  { type: "workout", pillar: "body", titleK: "tile_exercise", route: "/(tabs)/workout", icon: (c) => <DumbbellIcon size={18} color={c} /> },
  { type: "meal", pillar: "body", titleK: "tile_diet", route: "/(tabs)/diet", icon: (c) => <BowlIcon size={18} color={c} /> },
  { type: "meditation", pillar: "mind", titleK: "tile_meditation", route: "/(tabs)/meditation", icon: (c) => <LotusIcon size={18} color={c} /> },
  { type: "jap", pillar: "soul", titleK: "tile_jap", route: "/(tabs)/jap", icon: (c) => <MalaIcon size={18} color={c} /> },
  { type: "sleep_sound", pillar: "soul", titleK: "tile_sleep", route: "/(tabs)/sleep", icon: (c) => <MoonIcon size={18} color={c} /> },
];

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
  const { pillars, todayTypes, refresh: refreshPillars } = usePillars();
  // The daypart is re-read on every focus so crossing a boundary (e.g. into the
  // evening) re-washes Home and re-orders the rings — Home stays mounted as a
  // tab, so a mount-only read would go stale.
  const [dp, setDp] = useState<DaypartInfo>(currentDaypart);
  const [purnaVisible, setPurnaVisible] = useState(false);
  // The app-wide completion glow (mockup #goldwash) — fired over the whole
  // screen when an earned moment lands ON Home (the blessing reveal).
  const [washTick, setWashTick] = useState(0);

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
    <Screen wash={dp.wash} overlay={<GoldWash trigger={washTick} />}>
      {/* greeting + deity of the day */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: space.sm,
          paddingBottom: space.md,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(58,46,36,0.55)",
        }}
      >
        <View style={{ flex: 1 }}>
          <T variant="h1">{t(dp.greetingKey)}</T>
          <T variant="caption" tone="muted">
            {dateLine}
          </T>
        </View>
        {dev?.deity ? <Chip label={loc(dev.deity.name_hi, dev.deity.name_en)} active /> : null}
        <PressableScale
          accessibilityLabel={t("settings_title")}
          onPress={() => router.push("/settings")}
          scaleTo={0.9}
          hitSlop={10}
          style={{ padding: space.xs, marginLeft: space.sm }}
        >
          <SettingsIcon color={color.muted} />
        </PressableScale>
      </View>

      {/* the day's standing — the one number that says whether today is done.
          Guests see Begin-rings + the sign-in invitation instead. */}
      {!guest ? (
        <View style={{ alignItems: "center", marginTop: space.lg }}>
          <T variant="eyebrow" tone="gold">
            {t("today_saadhana")}
          </T>
          {complete >= PILLAR_ORDER.length ? (
            // the day is whole — the hero rests in a quiet gold until midnight
            // IST (the same boundary that resets the rings and Purna).
            <T variant="caption" tone="gold" style={{ marginTop: space.sm, fontWeight: "700" }}>
              {t("saadhana_settled")}
            </T>
          ) : (
            <SaadhanaCount n={complete} m={PILLAR_ORDER.length} />
          )}
        </View>
      ) : null}

      {/* the day's concrete practices — tap one, do it, come back to a lit ring */}
      {!guest ? <TaskStrip todayTypes={todayTypes} soulFirst={dp.soulFirst} /> : null}

      {/* the BMS hero — Body · Mind · Soul rings (docs/specs/redesign-bms.md).
          Each circle is the door to its pillar page; the ring is today's
          completion (e.g. mind 1/1 once meditation is logged). After sunset the
          order flips so Soul leads — the day turns inward (dp.soulFirst). No
          static backdrop behind the coins — it read as a frozen ripple sitting
          behind the live ambient ones CoinHalo already animates. */}
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

      {/* today's shloka — the ember material with ॐ watermark + sheen, lifting
          up out of the surface (mockup .lift — the 3D scroll grammar) */}
      <Reveal lift delay={140}>
      <EmberCard watermark sheen>
        <T variant="eyebrow" tone="gold">
          {t("todays_shloka")}
        </T>
        {dev === null ? (
          <T variant="body" tone="muted" style={{ marginTop: space.sm }}>
            {t("loading")}
          </T>
        ) : dev.shloka ? (
          <>
            {/* English-first (CLAUDE.md): the reading leads; the Devanagari
                stays present as the scripture source, secondary underneath —
                never dropped, never leading. Hindi mode keeps the scripture
                itself as the lead line since there is no English to read. */}
            <T
              style={{
                color: color.goldHi,
                marginTop: space.sm,
                fontWeight: "600",
                lineHeight: 26,
                fontSize: mode === "hindi" || !dev.shloka.text_en ? 16 : 15.5,
              }}
            >
              {mode === "hindi" || !dev.shloka.text_en ? dev.shloka.text_hi : dev.shloka.text_en}
            </T>
            {mode !== "hindi" && dev.shloka.text_en ? (
              <View
                style={{
                  marginTop: space.sm + 2,
                  paddingTop: space.sm,
                  borderTopWidth: 1,
                  borderTopColor: ember.line,
                }}
              >
                <T variant="caption" tone="muted" style={{ lineHeight: 22, opacity: 0.9 }}>
                  {dev.shloka.text_hi}
                </T>
              </View>
            ) : null}
            {dev.shloka.source ? (
              <T variant="caption" tone="muted" style={{ marginTop: space.sm - 2, fontStyle: "italic" }}>
                — {dev.shloka.source}
              </T>
            ) : null}
          </>
        ) : (
          <T variant="body" tone="muted" style={{ marginTop: space.sm }}>
            ॐ
          </T>
        )}
      </EmberCard>
      </Reveal>

      {/* sankalp / streak */}
      <StreakCard />

      {/* today's blessing — the gentle come-back-tomorrow reveal */}
      <DailyBlessing onReveal={() => setWashTick((n) => n + 1)} />

      {/* the week, reflected — practice mirrored, never asked about */}
      {!guest ? <MirrorCard /> : null}

      {/* the day made whole — fires once when all three pillars close */}
      <Purna visible={purnaVisible} onDismiss={dismissPurna} />
    </Screen>
  );
}

/**
 * The day's standing, hero-sized: the count is the number people check first,
 * so it reads bigger and bolder than the surrounding words — not just another
 * caption. Splits the localized template around the `{n}` token so English's
 * "{n} of {m} complete" and Hindi's reversed "{m} में से {n} पूर्ण" both land
 * their own words in the right place around the one number that gets the
 * hero treatment.
 */
function SaadhanaCount({ n, m }: { n: number; m: number }) {
  const { t } = useI18n();
  const [before, after] = t("saadhana_count").replace("{m}", String(m)).split("{n}");
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        flexWrap: "wrap",
        justifyContent: "center",
        marginTop: space.sm,
        gap: 6,
      }}
    >
      {before ? (
        <T variant="body" tone="soft" style={{ fontWeight: "600" }}>
          {before}
        </T>
      ) : null}
      <T variant="display" tone="gold" style={{ fontSize: 30, lineHeight: 34, fontWeight: "800" }}>
        {n}
      </T>
      {after ? (
        <T variant="body" tone="soft" style={{ fontWeight: "600" }}>
          {after}
        </T>
      ) : null}
    </View>
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
  const expand = useCoinExpand();
  const tint = pillar[k];
  const wash = pillar[`${k}Wash`];
  const nameKey = `pillar_${k}` as const;
  const subKey = `pillar_${k}_sub` as const;

  // The coins are the hero — sized to the phone, not a fixed dp (the approved
  // mockup's 158px coin + overhanging ring fills half the 390px frame).
  const { width } = useWindowDimensions();
  const size = Math.min(Math.round(width * 0.52), 200);

  // Tap = ONE smooth beat: the pillar-tinted light (CoinExpand) grows out of the
  // coin to take the screen, and the page lands underneath it at full cover.
  // (The old tap fired a CoinSplash ripple AND the expand at once — two
  // animations competing on the same frame was the "not smooth" the owner
  // flagged.) Immediate under reduce-motion/web (expand.fire collapses to the
  // navigation). The timer is only the fallback for a failed native measure.
  const coinRef = useRef<View>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (navTimer.current) clearTimeout(navTimer.current);
    },
    [],
  );
  const handlePress = () => {
    if (!motion || !expand) {
      onPress();
      return;
    }
    const node = coinRef.current;
    if (node) {
      node.measureInWindow((x, y, w, h) => {
        expand.fire({ x: x + w / 2, y: y + h / 2, pillar: k, onCovered: onPress });
      });
    } else {
      if (navTimer.current) clearTimeout(navTimer.current);
      navTimer.current = setTimeout(onPress, duration.base);
    }
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
        <View ref={coinRef} collapsable={false}>
          {/* the coin's living layer — ambient pillar-colored ripples behind,
              the tap splash above (mockup .ripples / .tapripple / .goldwash) */}
          <CoinHalo size={size} tint={tint} />
          <PillarCoin
            size={size}
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
          {/* a lit diya crowns a pillar that's fully done today */}
          {done ? (
            <View style={{ position: "absolute", top: 2, right: 10 }}>
              <Diya size={26} />
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
 * The task strip (redesign — "name the next step"): the rings say how much,
 * this says WHAT. One chip per practice, done-state from the same read as the
 * rings, each a door into its module. Order follows the daypart — evenings
 * bring Soul's practices forward, same as the ring stack.
 */
function TaskStrip({
  todayTypes,
  soulFirst,
}: {
  todayTypes: readonly ActivityType[];
  soulFirst: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const order = ringOrder(soulFirst);
  const items = [...STRIP_ITEMS].sort((a, b) => order.indexOf(a.pillar) - order.indexOf(b.pillar));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -space.lg }}
      contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.xs }}
    >
      {items.map((it) => {
        const done = todayTypes.includes(it.type);
        const tint = pillar[it.pillar];
        return (
          <PressableScale
            key={it.type}
            onPress={() => router.push(it.route)}
            scaleTo={0.96}
            accessibilityLabel={t(it.titleK)}
            style={{
              width: 126,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: done ? color.gold : color.line,
              backgroundColor: color.surface,
              padding: space.sm + 2,
              gap: space.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <IconSlot size={34} radius={11}>
                {it.icon(tint)}
              </IconSlot>
              {/* static in the strip — many small flames looping is perf the
                  budget spends on the prominent diyas instead */}
              {done ? <Diya size={16} animate={false} /> : null}
            </View>
            <View>
              <T variant="caption" style={{ fontWeight: "700", fontSize: 13 }}>
                {t(it.titleK)}
              </T>
              <T variant="caption" tone={done ? "gold" : "muted"} style={{ fontSize: 11 }}>
                {done ? t("pillar_complete") : t(`pillar_${it.pillar}` as StringKey)}
              </T>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/**
 * The week, reflected (redesign — "reflect, never ask"): a mirror of the
 * practice the user already chose, per pillar, over the last seven IST days.
 * Nothing here was asked — no deity question, no survey — it only reads what
 * was practised. Hidden until there is a week worth reflecting (guests and
 * brand-new users see nothing, never a wall of zeros).
 */
function MirrorCard() {
  const { t } = useI18n();
  const { week, refresh } = useWeekPillars();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!week || week.activeDays === 0) return null;
  const lead = PILLAR_ORDER.reduce((a, b) => (week.days[b] > week.days[a] ? b : a));

  return (
    <Reveal lift delay={380}>
    <EmberCard>
      <T variant="eyebrow" tone="gold">
        {t("mirror_title")}
      </T>
      <T variant="body" tone="soft" style={{ marginTop: space.sm }}>
        {t("mirror_lead").replace("{p}", t(`pillar_${lead}` as StringKey))}
      </T>
      <View style={{ flexDirection: "row", marginTop: space.md, gap: space.md }}>
        {PILLAR_ORDER.map((k) => (
          <View key={k} style={{ flex: 1, alignItems: "center", gap: 2 }}>
            <T variant="h2" style={{ color: pillar[k], fontVariant: ["tabular-nums"] }}>
              {week.days[k]}
              <T variant="caption" tone="muted">
                /7
              </T>
            </T>
            <T variant="caption" tone="muted" style={{ fontSize: 11 }}>
              {t(`pillar_${k}` as StringKey)}
            </T>
          </View>
        ))}
      </View>
      <T variant="caption" tone="muted" style={{ marginTop: space.md, fontStyle: "italic" }}>
        {t("mirror_footer")}
      </T>
    </EmberCard>
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
    // Progress off the tab bar, which is already full at five. It lifts in a
    // beat after the verse (mockup .lift stagger).
    <Reveal lift delay={220}>
    <Card onPress={() => router.push("/progress")}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Diya size={30} dim={!active} />
        <View style={{ flex: 1 }}>
          <T variant="bodyBold">{title}</T>
          {sub ? (
            <T variant="caption" tone="muted">
              {sub}
            </T>
          ) : null}
        </View>
        {active ? (
          <View style={{ alignItems: "flex-end" }}>
            <AnimatedNumber
              value={count}
              variant="display"
              tone="gold"
              style={{ fontWeight: "800", lineHeight: 34 }}
            />
            <T variant="caption" tone="muted" style={{ fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase" }}>
              {t("mypath_days_word")}
            </T>
          </View>
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
            {/* the seven-day row stays still — a wall of looping flames was part
                of the Home lag; the hero streak diya above carries the motion */}
            <Diya size={24} dim={i >= lit} animate={false} />
          </Reveal>
        ))}
      </View>
      <PointsRow points={points} />
    </Card>
    </Reveal>
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
function DailyBlessing({ onReveal }: { onReveal?: () => void }) {
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
    feedback.reveal(); // a once-a-day earned moment — the mockup's soft flutter + bell
    onReveal?.(); // the gold wash blooms over the whole screen (mockup goldwash)
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
    <LinearGradient colors={[...ember.gradient]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={face}>
      <Diya size={30} dim />
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
    <LinearGradient colors={[...ember.gradientLit]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={face}>
      <Diya size={30} />
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
    <Reveal lift delay={300}>
    <View
      style={{
        borderRadius: radius.card,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: ember.line,
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
    </Reveal>
  );
}

