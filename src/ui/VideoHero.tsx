/**
 * VideoHero — the real exercise-video surface. Plays an HLS (.m3u8) or MP4
 * stream via expo-video (ExoPlayer/AVPlayer under the hood) as a silent,
 * looping, CONTROL-LESS demo: it autoplays and never shows play/pause chrome
 * (owner ask 2026-08-10 — "the workout video doesn't need a video player, it
 * should just autoplay"). It falls back to the AvatarTile placeholder whenever
 * there is nothing real to play — a null URL, a seed/placeholder URL
 * (example.com), the web preview (HLS there needs hls.js; web is a verification
 * surface, not a shipping target) — AND, crucially, whenever a real stream
 * fails to load. A broken/expired/not-yet-encoded Bunny URL therefore degrades
 * to the premium placeholder, never a black rectangle. In __DEV__ the underlying
 * player error is surfaced on the tile so a "no video showing" report is
 * diagnosable on device instead of silent.
 *
 * The tile is layered: the AvatarTile sits underneath (shown while the stream
 * buffers, and left in place if it errors), and the VideoView fades in on top
 * only once the player reports `readyToPlay`. The surface is always mounted so
 * the player actually decodes; opacity — not conditional mounting — does the
 * reveal.
 *
 * Media stays behind this swappable seam per the standing rule — the app only
 * ever sees a URL string; where it is hosted (Bunny today) is not its concern.
 */
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";
import { AvatarTile } from "./MediaTile";
import { T } from "./Text";
import { useMotion } from "./motion";

/**
 * True only for a URL we can actually stream. Placeholder rows carry
 * example.com sentinels (supabase/seed.sql) and must show the tile, not a
 * broken player. Kept exported so screens can branch on it too if needed.
 */
export function isPlayableVideoUrl(url?: string | null): url is string {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (/(example\.com|localhost|127\.0\.0\.1|placeholder)/i.test(url)) return false;
  return true;
}

interface Props {
  url?: string | null;
  height?: number;
  /** Fill parent with an aspectRatio instead of a fixed height. */
  aspectRatio?: number;
  // ── AvatarTile fallback passthrough (so the empty state matches the slot) ──
  playSize?: number;
  silhouetteSize?: number;
  showBadge?: boolean;
  glint?: boolean;
  // ── player behaviour ──
  /** Auto-start on mount (a silent looping demo). Default true. */
  autoPlay?: boolean;
  loop?: boolean;
  /** Muted by default: a control-less exercise demo must not fight the app's
   *  ambient sound or the haptic feedback, and muted autoplay is the only kind
   *  that is guaranteed to start without a user gesture. */
  muted?: boolean;
}

export function VideoHero({
  url,
  height,
  aspectRatio,
  playSize,
  silhouetteSize,
  showBadge,
  glint,
  autoPlay = true,
  loop = true,
  muted = true,
}: Props) {
  const canPlay = Platform.OS !== "web" && isPlayableVideoUrl(url);

  const placeholder = (
    <AvatarTile
      height={height}
      aspectRatio={aspectRatio}
      playSize={playSize}
      silhouetteSize={silhouetteSize}
      showBadge={showBadge}
      glint={glint}
    />
  );

  if (!canPlay) return placeholder;

  // Key by URL so navigating to a different exercise builds a fresh player
  // instead of trying to reuse one bound to the old stream.
  return (
    <NativeVideo
      key={url}
      url={url}
      height={height}
      aspectRatio={aspectRatio}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      placeholder={placeholder}
    />
  );
}

function NativeVideo({
  url,
  height,
  aspectRatio,
  autoPlay,
  loop,
  muted,
  placeholder,
}: {
  url: string;
  height?: number;
  aspectRatio?: number;
  autoPlay: boolean;
  loop: boolean;
  muted: boolean;
  placeholder: React.ReactNode;
}) {
  const motion = useMotion();
  const player = useVideoPlayer(url, (p) => {
    p.loop = loop;
    p.muted = muted;
    if (autoPlay) p.play();
  });

  // 'loading' until the first frame is decodable; 'ready' reveals the video;
  // 'error' leaves the placeholder up (and, in dev, shows why).
  const [phase, setPhase] = useState<"loading" | "ready" | "error">(
    player.status === "readyToPlay" ? "ready" : "loading",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "error") {
        setErrMsg(error?.message ?? "playback error");
        setPhase("error");
      } else if (status === "readyToPlay") {
        setPhase("ready");
      }
      // 'loading'/'idle' keep the placeholder up without flipping out of 'ready'
    });
    return () => sub.remove();
  }, [player]);

  const reveal = useSharedValue(player.status === "readyToPlay" ? 1 : 0);
  useEffect(() => {
    if (phase === "ready") reveal.value = motion ? withTiming(1, { duration: 380 }) : 1;
    else reveal.value = 0;
  }, [phase, motion, reveal]);
  const videoStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));

  const box: ViewStyle = {
    height,
    aspectRatio,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#4a3416",
    backgroundColor: "#160E06",
    position: "relative",
  };

  return (
    <View style={box}>
      {/* placeholder base — visible while buffering, and left in place on error */}
      <View style={StyleSheet.absoluteFill}>{placeholder}</View>

      {/* the stream fades in on top once it can actually play */}
      {phase !== "error" ? (
        <Animated.View style={[StyleSheet.absoluteFill, videoStyle]}>
          <VideoView
            style={{ width: "100%", height: "100%" }}
            player={player}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
          />
        </Animated.View>
      ) : null}

      {/* Dev-only: make a failed real URL visible instead of a silent fallback. */}
      {__DEV__ && phase === "error" && errMsg ? (
        <View style={styles.err} pointerEvents="none">
          <T variant="caption" style={{ color: "#FFD9A8", fontSize: 10 }} numberOfLines={2}>
            video: {errMsg}
          </T>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  err: {
    position: "absolute",
    left: 6,
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});
