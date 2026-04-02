/**
 * Video search/trending via Piped API.
 * Races all instances in parallel using Promise.any().
 */
import type { YouTubeVideoItem } from "../types/youtube";

// Piped instances — race all in parallel
export const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://piped-api.garudalinux.org",
  "https://pipedapi.reallyaweso.me",
  "https://piped.adminforge.de",
  "https://api.piped.projectsegfau.lt",
  "https://piped.video",
  "https://pipedapi.coldmilk.com",
];

// Invidious instances — fallback for captions
const INVIDIOUS_INSTANCES = [
  "https://invidious.privacyredirect.com",
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.slipfox.xyz",
  "https://invidious.dhusch.de",
  "https://invidious.projectsegfau.lt",
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
  nextpage?: string | null;
}

interface PipedStreamsResponse {
  audioStreams: Array<{ url: string; quality?: string; bitrate?: number }>;
  videoStreams: Array<{ url: string; quality?: string }>;
  title?: string;
  description?: string;
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

export interface CaptionSegment {
  start: number;
  end: number;
  text: string;
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

function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
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

export interface SearchResult {
  items: YouTubeVideoItem[];
  nextpage: string | null;
}

export async function invidiousSearch(query: string): Promise<SearchResult> {
  const q = encodeURIComponent(query);
  return raceInstances(
    PIPED_INSTANCES,
    (base) => `${base}/search?q=${q}&filter=all`,
    (json) => {
      const data = json as PipedSearchResponse;
      const items = (data?.items ?? [])
        .filter((i) => i.type === "stream")
        .map(pipedItemToVideo)
        .filter((v): v is YouTubeVideoItem => v !== null);
      if (items.length === 0) return null;
      return { items, nextpage: data.nextpage ?? null };
    },
  );
}

/** Load the next page of search results using Piped's nextpage token */
export async function invidiousSearchPage(
  query: string,
  nextpage: string,
): Promise<SearchResult> {
  const q = encodeURIComponent(query);
  const np = encodeURIComponent(nextpage);
  try {
    return await raceInstances(
      PIPED_INSTANCES,
      (base) => `${base}/search?q=${q}&filter=all&nextpage=${np}`,
      (json) => {
        const data = json as PipedSearchResponse;
        const items = (data?.items ?? [])
          .filter((i) => i.type === "stream")
          .map(pipedItemToVideo)
          .filter((v): v is YouTubeVideoItem => v !== null);
        if (items.length === 0) return null;
        return { items, nextpage: data.nextpage ?? null };
      },
    );
  } catch {
    return { items: [], nextpage: null };
  }
}

/** Fetch audio stream URL for a video ID by racing all Piped instances */
export async function fetchStreamUrl(videoId: string): Promise<string> {
  const attempts = PIPED_INSTANCES.map((base) =>
    Promise.race([
      fetch(`${base}/streams/${videoId}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<PipedStreamsResponse>;
        })
        .then((data) => {
          const url = data?.audioStreams?.[0]?.url;
          if (!url) throw new Error("No audio stream");
          return url;
        }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000),
      ),
    ]),
  );
  return Promise.any(attempts);
}

export async function invidiousTrending(
  category?: string,
): Promise<YouTubeVideoItem[]> {
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

function parseVttTime(ts: string): number {
  const parts = ts.trim().split(":");
  if (parts.length === 3) {
    const h = Number.parseFloat(parts[0]);
    const m = Number.parseFloat(parts[1]);
    const s = Number.parseFloat(parts[2]);
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const m = Number.parseFloat(parts[0]);
    const s = Number.parseFloat(parts[1]);
    return m * 60 + s;
  }
  return 0;
}

/** Fetch caption timing gaps (silences) for a given video ID. */
export async function fetchCaptionGaps(
  videoId: string,
): Promise<Array<{ start: number; end: number }>> {
  try {
    let captionUrl: string | null = null;
    for (const base of INVIDIOUS_INSTANCES) {
      try {
        const res = await fetchWithTimeout(
          `${base}/api/v1/captions/${videoId}`,
          6000,
        );
        if (!res.ok) continue;
        const data = (await res.json()) as {
          captions: Array<{
            label: string;
            language_code: string;
            url: string;
          }>;
        };
        const caps = data?.captions ?? [];
        const eng =
          caps.find((c) => c.language_code.startsWith("en")) ?? caps[0];
        if (eng?.url) {
          captionUrl = eng.url.startsWith("http")
            ? eng.url
            : `${base}${eng.url}`;
          break;
        }
      } catch {}
    }

    if (!captionUrl) return [];

    const vttRes = await fetchWithTimeout(captionUrl, 8000);
    if (!vttRes.ok) return [];
    const vttText = await vttRes.text();

    const segments: Array<{ start: number; end: number }> = [];
    const lines = vttText.split("\n");
    for (const line of lines) {
      const match = line.match(
        /^(\d{2}:\d{2}:\d{2}[.,]\d+|\d{2}:\d{2}[.,]\d+)\s-->\s(\d{2}:\d{2}:\d{2}[.,]\d+|\d{2}:\d{2}[.,]\d+)/,
      );
      if (match) {
        const start = parseVttTime(match[1].replace(",", "."));
        const end = parseVttTime(match[2].replace(",", "."));
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
          segments.push({ start, end });
        }
      }
    }

    if (segments.length < 2) return [];

    const gaps: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const gapStart = segments[i].end;
      const gapEnd = segments[i + 1].start;
      if (gapEnd - gapStart > 3) {
        gaps.push({ start: gapStart, end: gapEnd });
      }
    }

    return gaps;
  } catch {
    return [];
  }
}
