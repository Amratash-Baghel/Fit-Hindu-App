/**
 * IconSlot — the embossed dark disc every module icon sits in (mockup
 * `.icslot`; redesign "one material language"). The same lit-from-above face
 * as the Home coins (`coin` tokens), scaled down to a rounded square, so a
 * tile's icon, a task chip's icon and a coin's centre all read as one metal-
 * and-ember material family.
 */
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { coin, color, pillar } from "./tokens";

interface Props {
  children: React.ReactNode;
  /** square edge in dp */
  size?: number;
  radius?: number;
  /** Material family. `soul` (default) is the warm ember metal used everywhere.
   *  `night` recasts the same slot in cool night steel for sleep surfaces
   *  (UI9 slice A) — tokens only, no other caller affected. */
  tone?: "soul" | "night";
}

export function IconSlot({ children, size = 54, radius = 15, tone = "soul" }: Props) {
  const night = tone === "night";
  return (
    <LinearGradient
      colors={night ? [color.nightSurface, color.night] : [coin.faceHi, coin.face]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: night ? pillar.mindWash : pillar.soulWash,
      }}
    >
      {children}
    </LinearGradient>
  );
}
