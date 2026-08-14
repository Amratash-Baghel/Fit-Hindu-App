/**
 * Global "stop sound" affordance. Floats top-right (clear of the status bar and
 * of the bottom FooterAction / tab bar) and appears on ANY screen whenever the
 * shared audio service is playing — the meditation setup/sounds screens have no
 * other stop control, so this guarantees a way out. Tapping hard-stops the
 * singleton; surfaces that track their own playing state (sleep) subscribe to
 * the same service to stay in sync.
 */
import React, { useSyncExternalStore } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space } from "./tokens";
import { T } from "./Text";
import { MuteIcon } from "./icons";
import { useI18n } from "../lib/i18n";
import { feedback } from "../lib/feedback";
import { isPlaying, stopAudio, subscribeAudio } from "../lib/audio";

export function AudioStopPill() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const playing = useSyncExternalStore(subscribeAudio, isPlaying);

  if (!playing) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + space.sm,
        right: space.lg,
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          feedback.press(); // a session control shouldn't stop the sound in silence
          stopAudio();
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: space.xs,
          paddingVertical: space.xs,
          paddingHorizontal: space.md,
          borderRadius: radius.chip,
          borderWidth: 1,
          borderColor: color.saffron,
          backgroundColor: "rgba(18,13,8,0.92)", // ink, slightly translucent — reads on light + night
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <MuteIcon size={16} color={color.saffron} />
        <T variant="caption" tone="saffron">
          {t("stop_sound")}
        </T>
      </Pressable>
    </View>
  );
}
