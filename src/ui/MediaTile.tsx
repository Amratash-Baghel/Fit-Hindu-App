/**
 * AvatarTile — the video surface on the workout screens.
 *
 * Two states in one component:
 *  - `image` given → render that thumbnail (real Bunny/CDN media uploaded via
 *    the admin panel), with the gold play badge overlaid so it still reads as
 *    a tappable video.
 *  - no `image` → the premium empty-slot placeholder from the mockup (ember
 *    gradient, avatar silhouette, "Our Avatar" badge).
 *
 * The play badge is the "this is a video demo" affordance in both states;
 * actual HLS playback on tap is a separate, still-pending piece (see
 * docs/whats-left.md — needs a native video library + resolving Bunny Stream
 * auth). The thumbnail is how uploaded content becomes visible today.
 */
import React, { useState } from "react";
import { Image, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color, goldGradient } from "./tokens";
import { T } from "./Text";
import { AvatarSilhouette, PlayIcon } from "./icons";
import { useI18n } from "../lib/i18n";
import { imageHeaders } from "../lib/media";

interface Props {
  height?: number;
  /** fill parent with aspectRatio instead of fixed height */
  aspectRatio?: number;
  /** thumbnail/poster URL; when set, shown instead of the placeholder */
  image?: string | null;
  playSize?: number;
  silhouetteSize?: number;
  showBadge?: boolean;
  /** full-bleed: no rounded corners / border (hero usage) */
  bare?: boolean;
}

export function AvatarTile({
  height,
  aspectRatio,
  image,
  playSize = 48,
  silhouetteSize = 96,
  showBadge = true,
  bare = false,
}: Props) {
  const { t } = useI18n();
  // A failed load (offline, revoked media) degrades to the placeholder
  // rather than an empty dark tile.
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = !!image && !imageFailed;
  return (
    <View
      style={{
        height,
        aspectRatio,
        borderRadius: bare ? 0 : 16,
        overflow: "hidden",
        borderWidth: bare ? 0 : 1,
        borderColor: "#4a3416",
        flex: height || aspectRatio ? undefined : 1,
      }}
    >
      {hasImage ? (
        <Image
          source={{ uri: image!, headers: imageHeaders(image) }}
          resizeMode="cover"
          style={{ width: "100%", height: "100%" }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <LinearGradient
          colors={["#2E1A08", "#160E06"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1 }}
        >
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
        </LinearGradient>
      )}

      {/* gold play badge — overlaid in both states */}
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
    </View>
  );
}
