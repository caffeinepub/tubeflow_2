/**
 * Video search/trending via Piped API (primary) with Invidious fallback.
 * No static fallback — returns [] if all sources fail.
 */
import type { YouTubeVideoItem } from "../types/youtube";

// Piped instances — primary source
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.tokhmi.xyz",
  "https://piped-api.garudalinux.org",
  "https://api.piped.yt",
  "https://watchapi.whatever.social",
];

// Invidious instances — fallback
const INVIDIOUS_INSTANCES = [
  "https://invidious.privacyredirect.com",
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.slipfox.xyz",
  "https://invidious.dhusch.de",
  "https://vid.puffyan.us",
  "https://invidious.projectsegfau.lt",
  "https://invidious.io.lol",
];

interface PipedItem {
  type: string;
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  duration: number;
  views: number;
  uploadedDate?: string;
  shortDescription?: string;
}

interface PipedSearchResponse {
  items: PipedItem[];
}

interface InvidiousVideo {
  type?: string;
  videoId: string;
  title: string;
  author: string;
  videoThumbnails: Array<{ quality: string; url: string }>;
  viewCount?: number;
  published?: number;
  lengthSeconds?: number;
  description?: string;
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

function pipedItemToVideo(item: PipedItem): YouTubeVideoItem | null {
  try {
    const params = new URLSearchParams(item.url.split("?")[1] ?? "");
    const id = params.get("v");
    if (!id) return null;
    const ytThumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    return {
      id,
      snippet: {
        title: item.title,
        channelTitle: item.uploaderName,
        description: item.shortDescription ?? "",
        publishedAt: item.uploadedDate
          ? new Date(item.uploadedDate).toISOString()
          : new Date().toISOString(),
        thumbnails: {
          high: { url: item.thumbnail || ytThumb },
        },
      },
      statistics: { viewCount: String(item.views ?? 0) },
      contentDetails: { duration: toLengthISO(item.duration) },
    };
  } catch {
    return null;
  }
}

function invidiousVideoToItem(v: InvidiousVideo): YouTubeVideoItem {
  const ytThumb = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
  const thumbs = v.videoThumbnails ?? [];
  const getThumb = (q: string) => {
    const raw = thumbs.find((t) => t.quality === q)?.url;
    if (!raw) return undefined;
    if (raw.startsWith("http")) return { url: raw };
    if (raw.startsWith("//")) return { url: `https:${raw}` };
    return undefined;
  };
  return {
    id: v.videoId,
    snippet: {
      title: v.title,
      channelTitle: v.author,
      description: v.description ?? "",
      publishedAt: v.published
        ? new Date(v.published * 1000).toISOString()
        : new Date().toISOString(),
      thumbnails: {
        default: getThumb("default") ?? { url: ytThumb },
        medium: getThumb("medium") ?? { url: ytThumb },
        high: getThumb("high") ?? {
          url: `https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg`,
        },
        maxres: getThumb("maxres") ?? {
          url: `https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg`,
        },
      },
    },
    statistics: {
      viewCount: v.viewCount !== undefined ? String(v.viewCount) : undefined,
    },
    contentDetails: { duration: toLengthISO(v.lengthSeconds) },
  };
}

function fetchWithTimeout(url: string, timeoutMs = 9000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { signal: ctrl.signal })
    .then((r) => {
      clearTimeout(timer);
      return r;
    })
    .catch((e) => {
      clearTimeout(timer);
      throw e;
    });
}

async function raceInstances<T>(
  instances: string[],
  buildPath: (base: string) => string,
  parseResponse: (json: unknown) => T | null,
): Promise<T> {
  const attempts = instances.map((base) =>
    fetchWithTimeout(buildPath(base))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const result = parseResponse(json);
        if (!result) throw new Error("Empty or invalid response");
        return result;
      }),
  );
  return Promise.any(attempts);
}

export async function invidiousSearch(
  query: string,
): Promise<YouTubeVideoItem[]> {
  const q = encodeURIComponent(query);

  // Try Piped first
  try {
    return await raceInstances(
      PIPED_INSTANCES,
      (base) => `${base}/search?q=${q}&filter=videos`,
      (json) => {
        const data = json as PipedSearchResponse;
        const items = (data?.items ?? [])
          .filter((i) => i.type === "stream")
          .map(pipedItemToVideo)
          .filter((v): v is YouTubeVideoItem => v !== null);
        return items.length > 0 ? items : null;
      },
    );
  } catch {
    // Piped failed, try Invidious
  }

  try {
    return await raceInstances(
      INVIDIOUS_INSTANCES,
      (base) =>
        `${base}/api/v1/search?q=${q}&type=video&fields=videoId,title,author,videoThumbnails,viewCount,published,lengthSeconds`,
      (json) => {
        const data = json as InvidiousVideo[];
        const items = (Array.isArray(data) ? data : [])
          .filter((v) => v.videoId)
          .map(invidiousVideoToItem);
        return items.length > 0 ? items : null;
      },
    );
  } catch {
    return [];
  }
}

export async function invidiousTrending(
  category?: string,
): Promise<YouTubeVideoItem[]> {
  // Try Piped first
  try {
    return await raceInstances(
      PIPED_INSTANCES,
      (base) => `${base}/trending?region=US`,
      (json) => {
        const data = json as PipedItem[];
        const items = (Array.isArray(data) ? data : [])
          .filter((i) => i.type === "stream")
          .map(pipedItemToVideo)
          .filter((v): v is YouTubeVideoItem => v !== null);
        return items.length > 0 ? items : null;
      },
    );
  } catch {
    // fallthrough to Invidious
  }

  try {
    const cat = category ? `&type=${encodeURIComponent(category)}` : "";
    return await raceInstances(
      INVIDIOUS_INSTANCES,
      (base) =>
        `${base}/api/v1/trending?fields=videoId,title,author,videoThumbnails,viewCount,published,lengthSeconds${cat}`,
      (json) => {
        const data = json as InvidiousVideo[];
        const items = (Array.isArray(data) ? data : [])
          .filter((v) => v.videoId)
          .map(invidiousVideoToItem);
        return items.length > 0 ? items : null;
      },
    );
  } catch {
    return [];
  }
}
