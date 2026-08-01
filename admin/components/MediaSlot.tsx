"use client";

/**
 * The "placeholder you upload into". Shows the slot's current media with an
 * inline preview; offers (a) file upload → /api/upload → Bunny, and
 * (b) paste-URL fallback (provider 'external') that works before Bunny
 * credentials exist. Either path writes the media row AND the target row's
 * FK in one user action, then refreshes.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PreviewPlayer } from "./PreviewPlayer";

interface Props {
  label: string;
  kind: "video" | "audio" | "image";
  targetTable: string; // e.g. "exercises"
  targetColumn: string; // e.g. "video_media_id"
  targetId: string;
  currentUrl: string | null;
  title: string; // used as the Bunny video title
}

export function MediaSlot({ label, kind, targetTable, targetColumn, targetId, currentUrl, title }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteUrl, setPasteUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    if (kind === "video") return uploadVideoDirect(file);

    setBusy("Uploading…");
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("title", title);
    form.set("targetTable", targetTable);
    form.set("targetColumn", targetColumn);
    form.set("targetId", targetId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const body = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(body.error ?? "Upload failed");
      return;
    }
    router.refresh();
  }

  // Video uploads go straight from the browser to Bunny Stream via TUS —
  // Vercel's serverless functions cap request bodies at 4.5MB, which any
  // real demo video exceeds, so the binary can't be proxied through our own
  // API route the way audio/image are.
  async function uploadVideoDirect(file: File) {
    setBusy("Starting upload…");
    setError(null);

    const authRes = await fetch("/api/upload/video-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const auth = await authRes.json();
    if (!authRes.ok) {
      setBusy(null);
      setError(auth.error ?? "Could not start upload");
      return;
    }
    const { libraryId, guid, signature, expire, cdnHost } = auth as {
      libraryId: string;
      guid: string;
      signature: string;
      expire: number;
      cdnHost: string;
    };

    const { Upload } = await import("tus-js-client");
    const upload = new Upload(file, {
      endpoint: "https://video.bunnycdn.com/tusupload",
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expire),
        VideoId: guid,
        LibraryId: libraryId,
      },
      metadata: { filetype: file.type, title },
      onProgress(bytesUploaded, bytesTotal) {
        const pct = Math.round((bytesUploaded / bytesTotal) * 100);
        setBusy(`Uploading… ${pct}%`);
      },
      onError(err) {
        setBusy(null);
        setError(err.message ?? "Upload failed");
      },
      async onSuccess() {
        setBusy("Finishing…");
        const res = await fetch("/api/upload/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "video",
            externalId: guid,
            playbackUrl: `https://${cdnHost}/${guid}/playlist.m3u8`,
            targetTable,
            targetColumn,
            targetId,
          }),
        });
        const body = await res.json();
        setBusy(null);
        if (!res.ok) {
          setError(body.error ?? "Could not save the uploaded video");
          return;
        }
        router.refresh();
      },
    });
    upload.start();
  }

  async function saveExternalUrl() {
    if (!pasteUrl.trim()) return;
    setBusy("Saving URL…");
    setError(null);
    const supabase = supabaseBrowser();
    const { data: media, error: mediaErr } = await supabase
      .from("media")
      .insert({ kind, provider: "external", external_id: pasteUrl.trim(), playback_url: pasteUrl.trim() })
      .select()
      .single();
    if (mediaErr) {
      setBusy(null);
      setError(mediaErr.message);
      return;
    }
    const { error: fkErr } = await supabase
      .from(targetTable)
      .update({ [targetColumn]: media.id })
      .eq("id", targetId);
    setBusy(null);
    if (fkErr) {
      setError(fkErr.message);
      return;
    }
    setPasteUrl("");
    router.refresh();
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
          {label}
        </span>
        {currentUrl ? (
          <span className="text-xs" style={{ color: "var(--ok)" }}>✓ has {kind}</span>
        ) : (
          <span className="text-xs" style={{ color: "var(--muted)" }}>placeholder — nothing uploaded</span>
        )}
      </div>

      {currentUrl ? (
        <div className="mb-3">
          <PreviewPlayer url={currentUrl} kind={kind} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={kind === "video" ? "video/*" : kind === "audio" ? "audio/*" : "image/*"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
            e.target.value = "";
          }}
        />
        <button type="button" className="btn btn-gold" disabled={!!busy} onClick={() => fileRef.current?.click()}>
          {busy ?? (currentUrl ? `Replace ${kind}` : `Upload ${kind}`)}
        </button>
        <span className="text-xs" style={{ color: "var(--muted)" }}>or paste a URL:</span>
        <input
          className="field max-w-xs flex-1"
          placeholder={`https://… .${kind === "video" ? "m3u8/mp4" : kind === "audio" ? "mp3" : "png"}`}
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
        />
        <button type="button" className="btn btn-ghost" disabled={!!busy || !pasteUrl.trim()} onClick={saveExternalUrl}>
          Save URL
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm" style={{ color: "var(--danger)" }}>{error}</p>
      ) : null}
    </div>
  );
}
