"use client";

/**
 * Inline preview for a just-uploaded / existing media URL — the
 * mistake-preventer: the team verifies the right file landed in the right
 * slot the moment it uploads. HLS via hls.js, else native <video>/<audio>/<img>.
 */
import { useEffect, useRef } from "react";

export function PreviewPlayer({ url, kind }: { url: string; kind: "video" | "audio" | "image" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isHls = url.includes(".m3u8");

  useEffect(() => {
    if (!isHls || !videoRef.current) return;
    const video = videoRef.current;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url; // Safari
      return;
    }
    let hls: { destroy: () => void } | undefined;
    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return;
      const instance = new Hls();
      instance.loadSource(url);
      instance.attachMedia(video);
      hls = instance;
    });
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [url, isHls]);

  if (kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="preview" className="max-h-48 rounded-lg border" style={{ borderColor: "var(--line)" }} />;
  }
  if (kind === "audio") {
    return <audio controls src={url} className="w-full" preload="metadata" />;
  }
  return (
    <video
      ref={videoRef}
      controls
      playsInline
      src={isHls ? undefined : url}
      className="max-h-56 w-full rounded-lg border bg-black"
      style={{ borderColor: "var(--line)" }}
      preload="metadata"
    />
  );
}
