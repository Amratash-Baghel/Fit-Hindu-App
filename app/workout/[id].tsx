import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Card, T, Button, AvatarTile, ChevronRight, PlayIcon, color, space } from "../../src/ui";
import { useDemoPlayer } from "../../src/ui/VideoDemo";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { getExercise, type ExerciseWithMedia } from "../../src/lib/content";
import { videoSource, posterUrl } from "../../src/lib/media";

const LEVEL_KEY: Record<string, StringKey> = {
  beginner: "level_beginner",
  intermediate: "level_intermediate",
  advanced: "level_advanced",
};

/** How far the content sheet overlaps the hero (its corner radius). */
const SHEET_RADIUS = 28;

/** Loader: owns fetch + loading/error. The loaded view is a separate
 *  component so its hooks (incl. the video player) run with a known exercise
 *  and a stable video source — no conditional hooks, no source swapping. */
export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const [ex, setEx] = useState<ExerciseWithMedia | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getExercise(String(id));
        if (alive) {
          setEx(data);
          setStatus("ok");
        }
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.saffron} />
        </View>
      </Screen>
    );
  }

  if (status === "error" || !ex) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl }}>
          <T variant="body" tone="muted" style={{ textAlign: "center" }}>
            {t("workout_error")}
          </T>
          <Button k="retry" kind="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return <LoadedExercise ex={ex} />;
}

/**
 * The loaded screen: a full-bleed video hero pinned behind a content sheet
 * that scrolls up OVER it (owner direction 2026-07-16). The demo autoplays
 * muted on a loop. Play/pause is a floating control (a sibling of the scroll
 * view, like the back button) rather than a tap on the video — RN-web can't
 * reliably pass a tap through the scroll layer to a view pinned behind it, so
 * an overlaid control is both correct and more discoverable. Exercises with
 * no video fall back to the uploaded thumbnail, then the avatar placeholder.
 */
function LoadedExercise({ ex }: { ex: ExerciseWithMedia }) {
  const { t, loc, locSub } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();

  const source = videoSource(ex.video?.playback_url);
  const poster = posterUrl(ex.thumb?.playback_url, ex.video?.playback_url);
  const { player, playing, toggle } = useDemoPlayer(source);

  const heroH = Math.round(winH * 0.44);

  const nameSub = locSub(ex.name_hi, ex.name_en);
  const instructions = loc(ex.instructions_hi ?? "", ex.instructions_en ?? "");
  const stats: { k: StringKey; v: string }[] = [];
  if (ex.default_sets != null) stats.push({ k: "sets", v: String(ex.default_sets) });
  if (ex.default_reps != null) stats.push({ k: "reps", v: `×${ex.default_reps}` });
  if (ex.default_duration_seconds != null) stats.push({ k: "hold", v: fmt(ex.default_duration_seconds) });
  stats.push({ k: "rest", v: fmt(ex.default_rest_seconds) });

  return (
    <View style={{ flex: 1, backgroundColor: color.ink }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* hero — pinned behind; the sheet scrolls over it */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: heroH }}>
        {source ? (
          <VideoView
            player={player}
            style={{ width: "100%", height: "100%", backgroundColor: "#160E06" }}
            contentFit="cover"
            nativeControls={false}
          />
        ) : poster ? (
          <Image source={{ uri: poster }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
        ) : (
          <AvatarTile bare silhouetteSize={130} playSize={0} />
        )}
        {/* top scrim so the back button reads on any frame */}
        <LinearGradient
          colors={["rgba(15,11,7,0.55)", "rgba(15,11,7,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 96 }}
          pointerEvents="none"
        />
      </View>

      {/* floating back */}
      <RoundControl top={insets.top + space.sm} left={space.lg} onPress={() => router.back()}>
        <View style={{ transform: [{ rotate: "180deg" }] }}>
          <ChevronRight size={18} color={color.cream} />
        </View>
      </RoundControl>

      {/* floating play/pause — only when there's a real video */}
      {source ? (
        <RoundControl top={insets.top + space.sm} right={space.lg} onPress={toggle} large>
          {playing ? <PauseGlyph /> : <View style={{ marginLeft: 2 }}><PlayIcon size={16} color={color.cream} /></View>}
        </RoundControl>
      ) : null}

      {/* content sheet — scrolls over the hero */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* transparent spacer so the sheet starts below the hero, overlapping
            by SHEET_RADIUS; the hero shows through it (no background here) */}
        <View style={{ height: heroH - SHEET_RADIUS }} pointerEvents="none" />

        <View
          style={{
            flexGrow: 1,
            backgroundColor: color.ink,
            borderTopLeftRadius: SHEET_RADIUS,
            borderTopRightRadius: SHEET_RADIUS,
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: insets.bottom + space.lg,
          }}
        >
          {/* drag handle */}
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 999,
              backgroundColor: color.line,
              marginBottom: space.md,
            }}
          />

          <T variant="h1">{loc(ex.name_hi, ex.name_en)}</T>
          <T variant="caption" tone="muted">
            {nameSub ? `${nameSub} · ` : ""}
            {t(LEVEL_KEY[ex.level])}
          </T>

          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
            {stats.map((s) => (
              <Card key={s.k} style={{ flex: 1, alignItems: "center", padding: space.md }}>
                <T variant="h2" tone="saffron">
                  {s.v}
                </T>
                <T variant="caption" tone="muted">
                  {t(s.k)}
                </T>
              </Card>
            ))}
          </View>

          {instructions ? (
            <View style={{ marginTop: space.lg }}>
              <T variant="eyebrow" tone="gold" style={{ marginBottom: space.sm }}>
                {t("instructions")}
              </T>
              <T variant="body" tone="soft">
                {instructions}
              </T>
            </View>
          ) : null}

          <View style={{ flex: 1 }} />

          <View style={{ marginTop: space.xl, gap: space.sm }}>
            <Button
              k="start_workout"
              onPress={() => router.push({ pathname: "/workout/session", params: { exercise: String(ex.id) } })}
            />
            <T variant="caption" tone="muted" style={{ textAlign: "center" }}>
              {t("workout_safety")}
            </T>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Floating circular control over the hero (back, play/pause). zIndex keeps
 *  it above the scroll layer so it stays tappable on web and native. */
function RoundControl({
  top,
  left,
  right,
  large,
  onPress,
  children,
}: {
  top: number;
  left?: number;
  right?: number;
  large?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const d = large ? 44 : 38;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        position: "absolute",
        top,
        left,
        right,
        zIndex: 20,
        width: d,
        height: d,
        borderRadius: 999,
        backgroundColor: "rgba(15,11,7,0.55)",
        borderWidth: 1,
        borderColor: "rgba(246,237,221,0.15)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Pressable>
  );
}

/** Two-bar pause glyph (no pause icon in the set). */
function PauseGlyph() {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      <View style={{ width: 4, height: 15, borderRadius: 1, backgroundColor: color.cream }} />
      <View style={{ width: 4, height: 15, borderRadius: 1, backgroundColor: color.cream }} />
    </View>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}
