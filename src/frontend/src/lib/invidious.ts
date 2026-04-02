/**
 * Invidious API client with automatic fallback across 3 public instances.
 * Maps Invidious response format to the existing YouTubeVideoItem shape
 * so the rest of the app needs no changes.
 */
import type { YouTubeVideoItem } from "../types/youtube";

const INSTANCES = [
  "https://invidious.privacyredirect.com",
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
];

interface InvidiousVideo {
  type?: string;
  videoId: string;
  title: string;
  author: string;
  authorId?: string;
  videoThumbnails: Array<{
    quality: string;
    url: string;
    width?: number;
    height?: number;
  }>;
  viewCount?: number;
  published?: number;
  publishedText?: string;
  lengthSeconds?: number;
  description?: string;
}

function thumbUrl(
  thumbnails: InvidiousVideo["videoThumbnails"],
  quality: string,
): string | undefined {
  return thumbnails.find((t) => t.quality === quality)?.url;
}

function toISO(published?: number): string {
  if (!published) return new Date().toISOString();
  return new Date(published * 1000).toISOString();
}

function toLengthISO(seconds?: number): string {
  if (!seconds) return "PT0S";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  let iso = "PT";
  if (h) iso += `${h}H`;
  if (m) iso += `${m}M`;
  if (s) iso += `${s}S`;
  return iso;
}

function mapVideo(v: InvidiousVideo): YouTubeVideoItem {
  const thumbs = v.videoThumbnails ?? [];
  return {
    id: v.videoId,
    snippet: {
      title: v.title,
      channelTitle: v.author,
      description: v.description ?? "",
      publishedAt: toISO(v.published),
      thumbnails: {
        default: thumbUrl(thumbs, "default")
          ? { url: thumbUrl(thumbs, "default")! }
          : undefined,
        medium: thumbUrl(thumbs, "medium")
          ? { url: thumbUrl(thumbs, "medium")! }
          : undefined,
        high: thumbUrl(thumbs, "high")
          ? { url: thumbUrl(thumbs, "high")! }
          : undefined,
        maxres: thumbUrl(thumbs, "maxres")
          ? { url: thumbUrl(thumbs, "maxres")! }
          : undefined,
      },
    },
    statistics: {
      viewCount: v.viewCount !== undefined ? String(v.viewCount) : undefined,
    },
    contentDetails: {
      duration: toLengthISO(v.lengthSeconds),
    },
  };
}

async function fetchWithFallback<T>(path: string): Promise<T> {
  let lastError: Error = new Error("All instances failed");
  for (const instance of INSTANCES) {
    try {
      const res = await fetch(`${instance}${path}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError;
}

export async function invidiousSearch(
  query: string,
): Promise<YouTubeVideoItem[]> {
  const data = await fetchWithFallback<InvidiousVideo[]>(
    `/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,videoThumbnails,viewCount,published,lengthSeconds`,
  );
  return data.filter((v) => v.videoId).map(mapVideo);
}

export async function invidiousTrending(
  category?: string,
): Promise<YouTubeVideoItem[]> {
  const cat = category ? `&type=${encodeURIComponent(category)}` : "";
  const data = await fetchWithFallback<InvidiousVideo[]>(
    `/api/v1/trending?fields=videoId,title,author,videoThumbnails,viewCount,published,lengthSeconds${cat}`,
  );
  return data.filter((v) => v.videoId).map(mapVideo);
}
