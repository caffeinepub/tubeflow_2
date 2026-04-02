export interface YTPlayerConfig {
  height?: string | number;
  width?: string | number;
  videoId?: string;
  playerVars?: {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    playsinline?: 0 | 1;
    origin?: string;
  };
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTStateChangeEvent) => void;
    onError?: (event: YTErrorEvent) => void;
  };
}
export interface YTPlayerEvent {
  target: YTPlayer;
}
export interface YTStateChangeEvent {
  target: YTPlayer;
  data: number;
}
export interface YTErrorEvent {
  target: YTPlayer;
  data: number;
}
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  loadVideoById(videoId: string): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getAvailablePlaybackRates(): number[];
  destroy(): void;
}
declare global {
  interface Window {
    YT: {
      Player: new (
        element: string | HTMLElement,
        config: YTPlayerConfig,
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}
export interface YouTubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}
export interface YouTubeSnippet {
  title: string;
  channelTitle: string;
  description: string;
  thumbnails: {
    default?: YouTubeThumbnail;
    medium?: YouTubeThumbnail;
    high?: YouTubeThumbnail;
    maxres?: YouTubeThumbnail;
  };
  publishedAt: string;
  channelId?: string;
}
export interface YouTubeVideoItem {
  id: string | { videoId: string; kind?: string };
  snippet: YouTubeSnippet;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: { duration?: string };
}
export interface YouTubeAPIResponse {
  items: YouTubeVideoItem[];
  error?: {
    message: string;
    code: number;
    errors?: Array<{ reason: string; message: string }>;
  };
  nextPageToken?: string;
}
export type Page = "home" | "search" | "watch" | "settings" | "queue";
export function getVideoId(video: YouTubeVideoItem): string {
  if (typeof video.id === "string") return video.id;
  return video.id.videoId ?? "";
}
export function getThumbnail(video: YouTubeVideoItem): string {
  const t = video.snippet.thumbnails;
  return t.maxres?.url ?? t.high?.url ?? t.medium?.url ?? t.default?.url ?? "";
}
export function formatViews(count?: string): string {
  if (!count) return "";
  const n = Number.parseInt(count, 10);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}
export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 365) return `${Math.floor(days / 365)}y ago`;
  if (days >= 30) return `${Math.floor(days / 30)}mo ago`;
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `${hours}h ago`;
  return "just now";
}
export function parseDuration(iso?: string): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}
export function formatSeconds(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
