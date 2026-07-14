/**
 * AvatarTile — the premium video-placeholder surface from the mockup:
 * ember gradient, avatar silhouette anchored to the bottom, "Our Avatar"
 * badge, gold play badge. Used by the workout grid, exercise hero, and the
 * meditation demo slot. When a real video/thumbnail exists the parent
 * renders that instead — this is the empty-slot state.
 */
import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, goldGradient, space } from "./tokens";
import { T } from "./Text";
import { AvatarSilhouette, PlayIcon } from "./icons";
import { useI18n } from "../lib/i18n";

interface Props {
  height?: number;
  /** fill parent with aspectRatio instead of fixed height */
  aspectRatio?: number;
  playSize?: number;
  silhouetteSize?: number;
  showBadge?: boolean;
}

export function AvatarTile({ height, aspectRatio, playSize = 48, silhouetteSize = 96, showBadge = true }: Props) {
  const { t } = useI18n();
  return (
    <View
      style={{
        height,
        aspectRatio,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#4a3416",
      }}
    >
      <LinearGradient colors={["#2E1A08", "#160E06"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <AvatarSilhouette size={silhouetteSize} />
        </View>

        {showBadge ? (
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: "rgba(15,11,7,0.65)",
              borderWidth: 1,
              borderColor: "#4a3416",
            }}
          >
            <T variant="eyebrow" tone="gold" style={{ fontSize: 9, letterSpacing: 1.2 }}>
              {t("our_avatar")}
            </T>
          </View>
        ) : null}

        {/* gold play badge */}
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
      </LinearGradient>
    </View>
  );
}
