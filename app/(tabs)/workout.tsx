import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Screen,
  Card,
  Chip,
  T,
  Button,
  AvatarTile,
  BodyModel,
  EmberCard,
  ShelfCard,
  PressableScale,
  Reveal,
  TextField,
  Check,
  ChevronRight,
  DumbbellIcon,
  PlayIcon,
  pressScale,
  color,
  radius,
  space,
  type MuscleArea,
} from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import {
  listExercisesByMode,
  listWorkoutTemplates,
  listUserWorkouts,
  type ExerciseWithMedia,
  type WorkoutTemplateSummary,
  type UserWorkoutSummary,
} from "../../src/lib/content";
import { getInterruptedSession, type LocalSession } from "../../src/lib/session";
import { usePillars } from "../../src/lib/pillars";
import { posterUrl } from "../../src/lib/media";
import type { WorkoutMode } from "../../src/types/db";

const MODES: { mode: WorkoutMode; k: StringKey }[] = [
  { mode: "home", k: "mode_home" },
  { mode: "gym", k: "mode_gym" },
];
const MUSCLES: { area: MuscleArea; k: StringKey }[] = [
  { area: "chest", k: "area_chest" },
  { area: "back", k: "area_back" },
  { area: "shoulders", k: "area_shoulders" },
  { area: "arms", k: "area_arms" },
  { area: "core", k: "area_core" },
  { area: "legs", k: "area_legs" },
];
const LEVEL_KEY: Record<string, StringKey> = {
  beginner: "level_beginner",
  intermediate: "level_intermediate",
  advanced: "level_advanced",
};

/**
 * Workout tab, re-stacked (UI9 slice B — docs/specs/workout.md v3).
 *
 * "A gym has a front desk, not a card catalogue at the door." The screen opens
 * on action — an open session resumes with one tap, then today's workout as an
 * ember hero with the one gold Start — and folds browsing beneath it: the
 * templates and My Workouts share one horizontal shelf, the muscle figure hides
 * behind a filter row, and a search field answers whoever already knows the
 * exercise's name.
 *
 * Custom is gone as a mode: it was only ever the library plus a filter, and the
 * filter now lives in both modes. So area filtering is client-side over the
 * loaded mode list (the path home/gym already used) — empty selection = full
 * body, exactly as before. The fold changed the geometry, not the logic.
 */
export default function Workout() {
  const { t } = useI18n();
  const [mode, setMode] = useState<WorkoutMode>("home");
  // Multi-select muscle filter: empty = no filter = full body.
  const [areas, setAreas] = useState<MuscleArea[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ExerciseWithMedia[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [mine, setMine] = useState<UserWorkoutSummary[] | null | undefined>(undefined);
  // The mirror plus how old it was WHEN READ — the elapsed minutes are stamped
  // in the effect, never computed during render (an impure clock read there
  // makes the strip's label depend on which render it happened to land in).
  const [resume, setResume] = useState<{ session: LocalSession; agoMins: number } | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  // Today's done-state comes from the SAME day read that lights Home's rings —
  // context, not a new query.
  const { todayTypes } = usePillars();
  const doneToday = todayTypes.includes("workout");

  // Both of these are re-read on every focus, because coming back from a route
  // is exactly when they change: the mirror (finished → strip gone) and the
  // user's own workouts (just built one → it belongs on the shelf).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getInterruptedSession()
        .then((s) => {
          if (!alive) return;
          setResume(
            s ? { session: s, agoMins: Math.max(0, Math.round((Date.now() - s.started_at_ms) / 60000)) } : null,
          );
        })
        .catch(() => {
          if (alive) setResume(null);
        });
      // null = signed out (placeholder); undefined = still loading
      listUserWorkouts()
        .then((w) => {
          if (alive) setMine(w);
        })
        .catch(() => {
          if (alive) setMine(null);
        });
      return () => {
        alive = false;
      };
    }, []),
  );

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [tpl, ex] = await Promise.all([listWorkoutTemplates(mode), listExercisesByMode(mode)]);
      setTemplates(tpl);
      setItems(ex);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [mode]);

  const toggleArea = (a: MuscleArea) =>
    setAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  // Both filters are client-side over the one loaded list, and they compose:
  // muscle AND search.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((e) => {
      const byArea = areas.length === 0 || e.body_areas?.some((a) => areas.includes(a as MuscleArea));
      const byName =
        q === "" ||
        e.name_en.toLowerCase().includes(q) ||
        e.name_hi.toLowerCase().includes(q);
      return byArea && byName;
    });
  }, [items, areas, query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: load() flips to "loading" then immediately suspends on the fetch; the reset on mode change is a one-shot transition, not a cascading render.
    load();
  }, [load]);

  // The hero takes the mode's first template; the rest go to the shelf. Once
  // today's workout is logged the hero steps aside entirely and the shelf leads.
  const hero = doneToday ? null : (templates[0] ?? null);
  const shelfTemplates = hero ? templates.slice(1) : templates;

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm }}>
        <T variant="h1" style={{ flex: 1 }}>
          {t("tab_workout")}
        </T>
        <ModeToggle value={mode} onPick={setMode} />
      </View>

      {status === "loading" ? (
        <Center>
          <ActivityIndicator color={color.saffron} />
        </Center>
      ) : status === "error" ? (
        <Center>
          <T variant="body" tone="muted" style={{ textAlign: "center" }}>
            {t("workout_error")}
          </T>
          <Button k="retry" kind="ghost" onPress={load} />
        </Center>
      ) : (
        <ExerciseGrid
          items={shown}
          header={
            <View>
              {/* Action first: the session you left open, then today's workout. */}
              <ResumeStrip resume={resume} templates={templates} mine={mine} exercises={items} />
              {hero ? <TodayHero template={hero} /> : null}
              {doneToday ? <DoneNote /> : null}

              <WorkoutShelf templates={shelfTemplates} mine={mine} />

              <FilterRow
                areas={areas}
                open={filterOpen}
                onToggleOpen={() => setFilterOpen((v) => !v)}
                onToggle={toggleArea}
                onClear={() => setAreas([])}
              />

              <View style={{ marginTop: space.md }}>
                <TextField value={query} onChangeText={setQuery} placeholder={t("search_exercises")} />
              </View>

              {shown.length > 0 ? (
                <T variant="eyebrow" tone="gold" style={{ marginTop: space.lg, marginBottom: space.xs }}>
                  {t("all_exercises")}
                </T>
              ) : null}
            </View>
          }
        />
      )}
    </Screen>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>{children}</View>;
}

/** Home / Gym as one segmented control in the header row — the first scroll
 *  belongs to action, not to mode chips. */
function ModeToggle({ value, onPick }: { value: WorkoutMode; onPick: (m: WorkoutMode) => void }) {
  const { t } = useI18n();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: space.xs,
        padding: space.xs,
        borderRadius: radius.chip,
        borderWidth: 1,
        borderColor: color.line,
        backgroundColor: color.surface,
      }}
    >
      {MODES.map((m) => {
        const active = value === m.mode;
        return (
          <PressableScale key={m.mode} onPress={() => onPick(m.mode)} haptic="select" scaleTo={pressScale.button}>
            <View
              style={{
                paddingVertical: space.xs,
                paddingHorizontal: space.md,
                borderRadius: radius.chip,
                backgroundColor: active ? color.saffronWash : "transparent",
                borderWidth: 1,
                borderColor: active ? color.saffron : "transparent",
              }}
            >
              <T variant="caption" tone={active ? "saffron" : "muted"} style={active ? { fontWeight: "700" } : undefined}>
                {t(m.k)}
              </T>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

/**
 * The session left open, surfaced (plate 09). `session.ts` has mirrored every
 * set to disk since v2 for crash recovery — it just had no surface.
 *
 * What this catches: the player was left mid-workout while the app kept
 * running. After an app kill, `reconcile()` closes that session out at launch
 * and the mirror is empty — that training is already banked, so there is
 * nothing to continue. Hence "Continue", never "recovered".
 */
function ResumeStrip({
  resume,
  templates,
  mine,
  exercises,
}: {
  resume: { session: LocalSession; agoMins: number } | null;
  templates: WorkoutTemplateSummary[];
  mine: UserWorkoutSummary[] | null | undefined;
  exercises: ExerciseWithMedia[];
}) {
  const router = useRouter();
  const { t, loc } = useI18n();
  const ref = resume?.session.source_ref_id;
  if (!resume || !ref) return null; // nothing to route back into
  const session = resume.session;

  // Resolve the name from what is already loaded — a strip label is never worth
  // a query. Started in the other mode, or since unpublished? Say so plainly.
  const tpl = templates.find((x) => x.id === ref);
  const ex = exercises.find((x) => x.id === ref);
  const name =
    session.source === "template"
      ? tpl && loc(tpl.name_hi, tpl.name_en)
      : session.source === "custom"
        ? mine?.find((w) => w.id === ref)?.name
        : ex && loc(ex.name_hi, ex.name_en);

  const mins = resume.agoMins;
  const ago = mins < 60 ? `${mins} ${t("time_ago_m")}` : `${Math.round(mins / 60)} ${t("time_ago_h")}`;
  const meta = `${session.sets.length} ${t("sets_logged")} · ${ago}`;

  // Back into the same workout, by the source the mirror recorded.
  const params =
    session.source === "template"
      ? { template: ref }
      : session.source === "custom"
        ? { custom: ref }
        : { exercise: ref };

  return (
    <Card
      onPress={() => router.push({ pathname: "/workout/session", params })}
      style={{ marginTop: space.md, paddingVertical: space.md, borderColor: color.saffron }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={{ width: 3, alignSelf: "stretch", borderRadius: 3, backgroundColor: color.saffron }} />
        <View style={{ flex: 1 }}>
          <T variant="bodyBold" tone="saffron">
            {t("resume_workout")} — {name ?? t("resume_generic")}
          </T>
          <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {meta}
          </T>
        </View>
        <PlayIcon size={16} color={color.saffron} />
      </View>
    </Card>
  );
}

/** Today's workout — the mode's first template in the ember material, carrying
 *  the screen's one gold action. */
function TodayHero({ template }: { template: WorkoutTemplateSummary }) {
  const router = useRouter();
  const { t, loc } = useI18n();
  const meta = [
    template.est_minutes ? `${template.est_minutes} ${t("minutes_short")}` : null,
    `${template.exercise_count} ${t("exercises_word")}`,
    t(LEVEL_KEY[template.level]),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Reveal lift>
      <EmberCard watermark sheen style={{ marginTop: space.md }}>
        <T variant="eyebrow" tone="gold">
          {t("workout_today")}
        </T>
        <T variant="h2" style={{ marginTop: space.xs }}>
          {loc(template.name_hi, template.name_en)}
        </T>
        <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {meta}
        </T>
        <View style={{ flexDirection: "row", marginTop: space.md }}>
          <Button
            k="start_workout"
            onPress={() => router.push({ pathname: "/workout/session", params: { template: template.id } })}
          />
        </View>
      </EmberCard>
    </Reveal>
  );
}

/** Once today's workout is logged the hero steps aside for a quiet line. */
function DoneNote() {
  const { t } = useI18n();
  return (
    <Card style={{ marginTop: space.md, paddingVertical: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Check size={18} color={color.gold} />
        <T variant="bodyBold" tone="gold">
          {t("workout_done_today")}
        </T>
      </View>
    </Card>
  );
}

/**
 * One shelf for everything you can start: the mode's composed workouts, the
 * user's own, and the card that builds a new one. Three stacked text sections
 * became one swipeable row.
 */
function WorkoutShelf({
  templates,
  mine,
}: {
  templates: WorkoutTemplateSummary[];
  mine: UserWorkoutSummary[] | null | undefined;
}) {
  const router = useRouter();
  const { t, loc } = useI18n();

  return (
    <View style={{ marginTop: space.lg }}>
      <T variant="eyebrow" tone="gold" style={{ marginBottom: space.sm }}>
        {t("workouts_section")}
      </T>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingRight: space.md }}
      >
        {templates.map((tpl) => (
          <ShelfCard
            key={tpl.id}
            icon={<DumbbellIcon size={18} color={color.saffron} />}
            title={loc(tpl.name_hi, tpl.name_en)}
            meta={[
              tpl.est_minutes ? `${tpl.est_minutes} ${t("minutes_short")}` : null,
              `${tpl.exercise_count} ${t("exercises_word")}`,
              t(LEVEL_KEY[tpl.level]),
            ]
              .filter(Boolean)
              .join(" · ")}
            onPress={() => router.push(`/workout/template/${tpl.id}`)}
          />
        ))}

        {(mine ?? []).map((w) => (
          <ShelfCard
            key={w.id}
            icon={<DumbbellIcon size={18} color={color.gold} />}
            title={w.name}
            meta={`${w.exercise_count} ${t("exercises_word")}`}
            onPress={() => router.push(`/workout/my/${w.id}`)}
          />
        ))}

        {/* Signed out, the last card still OFFERS the feature rather than
            blocking the tab — the one place the app asks for an account. */}
        {mine === undefined ? null : mine === null ? (
          <ShelfCard
            icon={<ChevronRight size={18} color={color.saffron} />}
            title={t("my_workouts")}
            meta={t("my_workouts_signin")}
            onPress={() => router.push("/auth")}
          />
        ) : (
          <ShelfCard
            icon={<T variant="bodyBold" tone="saffron">+</T>}
            title={t("new_workout")}
            meta={t("new_workout_sub")}
            onPress={() => router.push("/workout/my/new")}
          />
        )}
      </ScrollView>
    </View>
  );
}

/**
 * The muscle filter, folded (plate 10). The two-figure `BodyModel` is the best
 * moment on this screen the first time and a toll-booth every time after, so it
 * lives behind this row: closed, it shows what is selected; open, it is the
 * unchanged figure + chips. Empty selection = full body.
 */
function FilterRow({
  areas,
  open,
  onToggleOpen,
  onToggle,
  onClear,
}: {
  areas: MuscleArea[];
  open: boolean;
  onToggleOpen: () => void;
  onToggle: (a: MuscleArea) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const selectedLabel =
    areas.length === 0
      ? t("muscle_clear")
      : MUSCLES.filter((m) => areas.includes(m.area))
          .map((m) => t(m.k))
          .join(" · ");

  return (
    <View style={{ marginTop: space.lg }}>
      <Card onPress={onToggleOpen} haptic="select" style={{ paddingVertical: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <T variant="bodyBold" style={{ flex: 1 }}>
            {t("filter_muscle")}
          </T>
          <T variant="caption" tone={areas.length ? "saffron" : "muted"} numberOfLines={1} style={{ maxWidth: 150 }}>
            {selectedLabel}
          </T>
          <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
            <ChevronRight size={18} color={color.muted} />
          </View>
        </View>
      </Card>

      {open ? (
        <Reveal>
          <View style={{ marginTop: space.md }}>
            <T variant="caption" tone="muted" style={{ marginBottom: space.md }}>
              {t("muscle_pick_hint")}
            </T>
            <BodyModel selected={areas} onToggle={onToggle} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md }}>
              <Chip label={t("muscle_clear")} active={areas.length === 0} onPress={onClear} />
              {MUSCLES.map((m) => (
                <Chip
                  key={m.area}
                  label={t(m.k)}
                  active={areas.includes(m.area)}
                  onPress={() => onToggle(m.area)}
                />
              ))}
            </View>
          </View>
        </Reveal>
      ) : null}
    </View>
  );
}

function ExerciseGrid({ items, header }: { items: ExerciseWithMedia[]; header: React.ReactElement }) {
  const { t, loc, locSub } = useI18n();
  const router = useRouter();

  return (
    <FlatList
      data={items}
      keyExtractor={(e) => e.id}
      numColumns={2}
      style={{ marginTop: space.xs }}
      columnWrapperStyle={{ gap: space.md }}
      contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={{ alignItems: "center", padding: space.xl }}>
          <T variant="body" tone="muted" style={{ textAlign: "center" }}>
            {t("workout_empty")}
          </T>
        </View>
      }
      renderItem={({ item }) => {
        const sub = locSub(item.name_hi, item.name_en);
        return (
          <Card onPress={() => router.push(`/workout/${item.id}`)} style={{ flex: 1, padding: space.sm }}>
            <AvatarTile
              aspectRatio={4 / 3}
              image={posterUrl(item.thumb?.playback_url, item.video?.playback_url)}
              playSize={30}
              silhouetteSize={62}
              glint={false}
            />
            <View style={{ paddingHorizontal: space.xs, paddingTop: space.sm, paddingBottom: space.xs }}>
              <T variant="bodyBold" numberOfLines={1}>
                {loc(item.name_hi, item.name_en)}
              </T>
              {sub ? (
                <T variant="caption" tone="muted" numberOfLines={1}>
                  {sub}
                </T>
              ) : null}
              <T variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {t(LEVEL_KEY[item.level])}
              </T>
            </View>
          </Card>
        );
      }}
    />
  );
}
