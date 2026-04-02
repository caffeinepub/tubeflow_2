import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  GraduationCap,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
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

const STUDY_TOPICS = [
  { label: "\u{1F4D0} Math", query: "mathematics tutorial lecture" },
  { label: "\u269B\uFE0F Physics", query: "physics tutorial lecture" },
  { label: "\u{1F9EA} Chemistry", query: "chemistry tutorial lecture" },
  { label: "\u{1F9EC} Biology", query: "biology tutorial lecture" },
  { label: "\u{1F4BB} Coding", query: "programming tutorial for beginners" },
  { label: "\u{1F30D} Geography", query: "geography lesson tutorial" },
  { label: "\u{1F4D6} History", query: "history lesson documentary" },
  { label: "\u{1F4DD} English", query: "english grammar lesson tutorial" },
  { label: "\u{1F4CA} Economics", query: "economics tutorial lecture" },
  { label: "\u{1F3B5} Music", query: "music theory tutorial" },
  { label: "\u{1F3A8} Art", query: "art tutorial drawing painting" },
  { label: "\u{1F9E0} Psychology", query: "psychology lecture tutorial" },
];

export function HomePage() {
  const { setPage, setSearchQuery } = useApp();
  const [videos, setVideos] = useState<YouTubeVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryCount is an intentional re-fetch trigger
  useEffect(() => {
    setLoading(true);
    setError(null);
    invidiousTrending(category || undefined)
      .then(setVideos)
      .catch(() => setError("Failed to fetch trending. Check your connection."))
      .finally(() => setLoading(false));
  }, [category, retryCount]);

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 px-6"
        data-ocid="home.error_state"
      >
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-foreground font-medium text-center text-sm">
          {error}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRetryCount((c) => c + 1)}
          data-ocid="home.retry.button"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
        </Button>
      </div>
    );
  }

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

      {/* Study Topics section */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap
            className="w-4 h-4"
            style={{ color: "var(--tube-accent)" }}
          />
          <h2 className="text-sm font-bold text-foreground">Study Topics</h2>
        </div>
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {STUDY_TOPICS.map((topic) => (
            <button
              key={topic.query}
              type="button"
              data-ocid="home.study.tab"
              onClick={() => {
                setSearchQuery(topic.query);
                setPage("search");
              }}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-90"
              style={{
                background: "oklch(0.16 0.008 280)",
                color: "oklch(0.75 0.012 280)",
              }}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-center gap-2 px-4 mb-3">
        <TrendingUp
          className="w-4 h-4"
          style={{ color: "var(--tube-accent)" }}
        />
        <h2 className="text-sm font-bold text-foreground">Trending Now</h2>
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
