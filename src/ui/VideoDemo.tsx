/**
 * VideoDemo — self-contained looping demo tile (session player, compact
 * slots). Autoplays muted (exercise demos are silent by design), tap toggles
 * play/pause, gold play badge only while paused. For the full-bleed hero
 * with the overlay scroll sheet, the exercise detail screen drives its own
 * player — this component is the simple rounded-tile case.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { color, goldGradient } from "./tokens";
import { PlayIcon } from "./icons";
import type { VideoSource } from "../lib/media";

/**
 * Muted looping demo player + pause toggle. Accepts a null source (exercise
 * has no video) and simply stays idle — callers can render this hook
 * unconditionally.
 *
 * The setup-callback play() can race source attachment on web (the sync
 * re-pauses the element), so we also start on the readyToPlay status — unless
 * the USER paused, tracked in a ref the listener reads without resubscribing.
 * `playing` mirrors the real player state via playingChange, so a control
 * icon always matches what the video is actually doing.
 */
export function useDemoPlayer(source: VideoSource | null) {
  const [playing, setPlaying] = useState(false);
  const pausedByUser = useRef(false);
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true; // demos are silent; muted is also what allows web autoplay
    if (source) p.play();
  });

  useEffect(() => {
    if (!source) return;
    const startIfIdle = () => {
      if (!pausedByUser.current && !player.playing) player.play();
    };
    const statusSub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") startIfIdle();
    });
    const playSub = player.addListener("playingChange", ({ isPlaying }) => setPlaying(isPlaying));
    // the source may already be ready before we subscribed (warm cache) —
    // then no statusChange ever fires, so check once now
    if (player.status === "readyToPlay") startIfIdle();
    return () => {
      statusSub.remove();
      playSub.remove();
    };
  }, [player, source]);

  const toggle = useCallback(() => {
    if (!source) return;
    const nowPausing = player.playing;
    pausedByUser.current = nowPausing;
    if (nowPausing) player.pause();
    else player.play();
  }, [player, source]);

  return { player, playing, toggle };
}

interface Props {
  source: VideoSource;
  height?: number;
  aspectRatio?: number;
  playSize?: number;
}

export function VideoDemo({ source, height, aspectRatio, playSize = 48 }: Props) {
  const { player, playing, toggle } = useDemoPlayer(source);
  const paused = !playing;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={toggle}
      style={{
        height,
        aspectRatio,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#4a3416",
        backgroundColor: "#160E06",
      }}
    >
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        nativeControls={false}
      />
      {paused ? (
        <View
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: [{ translateX: -playSize / 2 }, { translateY: -playSize / 2 }],
            shadowColor: color.gold,
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={goldGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1.2 }}
            style={{
              width: playSize,
              height: playSize,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              paddingLeft: playSize * 0.06,
            }}
          >
            <PlayIcon size={playSize * 0.42} />
          </LinearGradient>
        </View>
      ) : null}
    </Pressable>
  );
}
