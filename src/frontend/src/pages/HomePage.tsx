import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { VideoCard } from "../components/VideoCard";
import { useApp } from "../context/AppContext";
import { invidiousTrending } from "../lib/invidious";
import type { YouTubeVideoItem } from "../types/youtube";

const CATEGORIES = [
  { label: "All", id: "" },
  { label: "Music", id: "Music" },
  { label: "Gaming", id: "Gaming" },
  { label: "News", id: "News" },
  { label: "Sports", id: "Sports" },
  { label: "Education", id: "Education" },
  { label: "Tech", id: "Technology" },
  { label: "Comedy", id: "Comedy" },
  { label: "Film", id: "Film" },
  { label: "Science", id: "Science" },
];

export function HomePage() {
  const { setPage: _setPage } = useApp();
  const [videos, setVideos] = useState<YouTubeVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryCount is an intentional re-fetch trigger
  useEffect(() => {
    setLoading(true);
    invidiousTrending(category || undefined)
      .then(setVideos)
      .finally(() => setLoading(false));
  }, [category, retryCount]);

  return (
    <div className="pb-4" data-ocid="home.section">
      {/* Category pills */}
      <div
        className="flex items-center gap-2 px-4 py-3 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id + cat.label}
            type="button"
            data-ocid="home.category.tab"
            onClick={() => setCategory(cat.id)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              category === cat.id
                ? { background: "var(--tube-accent)", color: "black" }
                : {
                    background: "oklch(0.18 0.005 260)",
                    color: "oklch(0.65 0.009 240)",
                  }
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp
            className="w-4 h-4"
            style={{ color: "var(--tube-accent)" }}
          />
          <h2 className="text-sm font-bold text-foreground">Trending Now</h2>
        </div>
        <button
          type="button"
          onClick={() => setRetryCount((c) => c + 1)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          disabled={loading}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-2 gap-3 px-4"
          data-ocid="home.loading_state"
        >
          {Array.from({ length: 10 }, (_, i) => `sk${i}`).map((k) => (
            <div key={k} className="space-y-2">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground text-sm"
          data-ocid="home.empty_state"
        >
          No videos found.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4" data-ocid="home.list">
          {videos.map((v, i) => (
            <VideoCard key={String(v.id)} video={v} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
