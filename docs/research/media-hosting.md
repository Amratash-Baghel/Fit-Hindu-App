# Media Hosting for Bajrangvati (Video + Audio)

Researched July 2026. Assumptions: ~300 videos, avg 3 min = ~900 min stored; mobile HLS avg ~1.3 Mbps ≈ 0.011 GB/min. Usage: 30 min video/user/month → (a) 5k MAU = 150k min ≈ 1.65 TB/mo; (b) 50k MAU = 1.5M min ≈ 16.5 TB/mo.

## Cost comparison (monthly, video delivery + storage)

| Option | Pricing model | (a) 5k MAU | (b) 50k MAU |
|---|---|---|---|
| **Mux** | Encode $0.015/min (one-time), store $0.007/min/mo, deliver $0.00059/min ([pricing](https://www.mux.com/pricing), [docs](https://www.mux.com/docs/pricing/video)) | ~$95 | ~$890 |
| **Cloudflare Stream** | Store $5/1,000 min (prepaid), deliver $1/1,000 min; encoding free ([pricing](https://developers.cloudflare.com/stream/pricing/)) | ~$155 | ~$1,505 |
| **Bunny Stream** | Store $0.01/GB/mo, free 1080p encoding, delivery at CDN rates: Standard Asia ~$0.03/GB, Volume flat $0.005/GB ([Stream pricing](https://bunny.net/pricing/stream/), [CDN pricing](https://bunny.net/pricing/cdn/)) | ~$50 std / ~$9 vol | ~$500 std / ~$85 vol |
| **YouTube unlisted** | Free | $0 | $0 |
| **Self-host: Supabase Storage** | Pro $25 incl. 250 GB egress, then ~$0.09/GB | ~$150 | ~$1,490 |
| **Self-host: R2 + pre-encoded HLS** | R2 storage ~$0.015/GB/mo, **zero egress** ([community confirmation video-from-R2 is allowed](https://community.cloudflare.com/t/is-streaming-public-videos-from-r2-via-cloudflare-cdn-allowed/853060)) | ~$1–5 | ~$1–5 |

Audio adds little: 60-min AAC @64 kbps ≈ 28 MB; even 50k users × 60 min audio/mo ≈ 1.4 TB → ~$7/mo on Bunny Volume.

## India performance

- **Bunny Standard tier**: PoPs in India (part of 119-PoP network), well regarded for video in Asia ([network](https://bunny.net/network/)). Volume tier is a smaller 8-PoP network — verify India coverage before relying on it; Standard is the safe choice for Jio/Airtel ([tier difference](https://support.bunny.net/hc/en-us/articles/360000200331-What-is-the-difference-between-Standard-and-Volume-tier-zones)).
- **Cloudflare**: documented, ongoing problem — Jio (and some Airtel) traffic to non-Enterprise zones is routed to Singapore/Europe PoPs instead of BOM/DEL/MAA, causing high latency ([analysis](https://punits.dev/blog/cloudflare-latency-india/), [community thread](https://community.cloudflare.com/t/indian-users-on-jio-network-routed-to-sin-pop-instead-of-india/812542)). This affects both Stream and R2-fronted delivery on cheap plans. Material risk for our exact audience.
- **Mux**: uses multi-CDN (incl. Fastly/Akamai) with good India presence; generally solid, but you pay a premium for it.
- **YouTube**: best India delivery of anything (Google Global Cache inside Jio/Airtel networks).

## Expo / React Native integration

- All paid options serve standard **HLS**, played directly by [`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/) (ExoPlayer/AVPlayer under the hood) — effort is near-identical: point the player at the `.m3u8` URL. [`react-native-video`](https://www.npmjs.com/package/react-native-video) if we later need DRM/offline-HLS.
- Mux has RN-specific docs ([guide](https://www.mux.com/docs/frameworks/react-native-video-playback)); Bunny has an official Expo tutorial ([blog](https://bunny.net/blog/native-video-playback-with-bunny-stream-and-expo/)). Cloudflare: plain HLS URL, no RN docs needed.
- **YouTube in an app**: must use the iframe/`react-native-youtube-iframe` (WebView) — heavier, YouTube branding, ads possible on embedded videos ([policy](https://support.google.com/youtube/answer/132596)), API ToS forbids hiding ads/branding and background playback is Premium-only ([developer policies](https://developers.google.com/youtube/terms/developer-policies)). Background audio (meditation/sleep) is effectively impossible. Unlisted URLs are guessable/shareable, no signed access, no offline. **Rejected for a product app.**

## Signed URLs & offline downloads

- **Bunny**: token authentication on Stream URLs; **MP4 fallback** files can be enabled per library → download via `expo-file-system` for offline. Simple REST API.
- **Cloudflare Stream**: signed URLs supported; MP4 downloads feature exists per-video.
- **Mux**: signed playback tokens (JWT); offline via static renditions (billed as delivery).
- **Audio offline**: progressive MP3/AAC files download trivially with `expo-file-system.downloadAsync()` and play from disk with `expo-audio`. No streaming infra needed — object storage + CDN is fully sufficient for 5–60 min audio.

## Recommendation (v1)

**Video: Bunny Stream, Standard tier** — cheapest option with real India PoPs, free encoding, token-signed URLs, MP4 fallback for offline, and simple API. ~$50/mo at 5k MAU, ~$500/mo at 50k (test Volume tier from India devices; if acceptable, 50k drops to ~$85/mo). No re-architecting needed at 50k users.

**Audio: same Bunny account** — Bunny Storage + CDN, progressive AAC (~$1–10/mo even at 50k).

**Avoid**: YouTube (ToS/ads/background-audio blockers), Supabase Storage for video (egress cost, not video-optimized), Cloudflare anything (Jio routing risk on non-Enterprise plans).

**Migration path**: store only `video_id` + playback URL in Supabase; the app just plays HLS via `expo-video`. If Bunny quality/analytics fall short at scale, re-point URLs to Mux (re-ingest source files via Mux API) with zero app-side changes. Keep original masters in cold storage (R2/Backblaze) to make re-encoding on any future platform a batch job.
