import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { VideoCard } from "../components/VideoCard";
import { useApp } from "../context/AppContext";
import { invidiousSearch } from "../lib/invidious";
import type { YouTubeVideoItem } from "../types/youtube";

const STORAGE_KEY = "tubeflow_recent_searches";

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveSearch(q: string) {
  const recent = getRecentSearches().filter((s) => s !== q);
  recent.unshift(q);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 8)));
}

function removeSearch(q: string) {
  const recent = getRecentSearches().filter((s) => s !== q);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
}

export function SearchPage() {
  const { searchQuery, setSearchQuery } = useApp();
  const [localInput, setLocalInput] = useState(searchQuery);
  const [videos, setVideos] = useState<YouTubeVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState("");
  const [recentSearches, setRecentSearches] =
    useState<string[]>(getRecentSearches);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const q = localInput.trim();
    if (!q || q === fetched) return;
    setLoading(true);
    setError(null);
    setFetched(q);
    setSearchQuery(q);
    saveSearch(q);
    setRecentSearches(getRecentSearches());
    invidiousSearch(q)
      .then(setVideos)
      .catch(() => setError("Search failed. Check your connection."))
      .finally(() => setLoading(false));
  }, [localInput, fetched, setSearchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = localInput.trim();
    if (!q) return;
    setFetched(""); // force re-fetch
  };

  const handlePickRecent = (q: string) => {
    setLocalInput(q);
    setFetched("");
    inputRef.current?.blur();
  };

  const handleRemoveRecent = (q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSearch(q);
    setRecentSearches(getRecentSearches());
  };

  const showRecents = !localInput.trim() && recentSearches.length > 0;

  return (
    <div className="flex flex-col h-full" data-ocid="search.section">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="px-4 pt-4 pb-3 flex-shrink-0">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
          style={{ background: "oklch(0.18 0.005 260)" }}
        >
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            data-ocid="search.search_input"
            type="text"
            placeholder="Search videos..."
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            className="flex-1 bg-transparent border-0 shadow-none text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 p-0 h-auto"
          />
          {localInput && (
            <button
              type="button"
              onClick={() => {
                setLocalInput("");
                setFetched("");
                setVideos([]);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="search.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Recent searches */}
        {showRecents && (
          <div className="mb-4" data-ocid="search.recent.list">
            <p className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-2">
              Recent
            </p>
            <div className="space-y-1">
              {recentSearches.map((q, i) => (
                <div
                  key={q}
                  data-ocid={`search.recent.item.${i + 1}`}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => handlePickRecent(q)}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors hover:bg-secondary"
                    style={{ background: "oklch(0.15 0.005 260)" }}
                  >
                    <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground truncate">{q}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveRecent(q, e)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!localInput.trim() && !showRecents && (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="search.empty_state"
          >
            <Search className="w-12 h-12 text-muted-foreground" />
            <p className="text-foreground font-semibold">Discover videos</p>
            <p className="text-sm text-muted-foreground text-center">
              Search any topic, creator, or keyword
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex flex-col items-center gap-3 py-8"
            data-ocid="search.error_state"
          >
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm text-foreground text-center">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFetched("")}
              data-ocid="search.retry.button"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            className="grid grid-cols-2 gap-3"
            data-ocid="search.loading_state"
          >
            {Array.from({ length: 10 }, (_, i) => `sk${i}`).map((k) => (
              <div key={k} className="space-y-2">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && !error && videos.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Results for{" "}
              <span
                className="font-semibold"
                style={{ color: "var(--tube-accent)" }}
              >
                "{localInput}"
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3" data-ocid="search.list">
              {videos.map((v, i) => (
                <VideoCard key={String(v.id)} video={v} index={i + 1} />
              ))}
            </div>
          </>
        )}

        {!loading && !error && fetched && videos.length === 0 && (
          <div
            className="text-center py-12 text-muted-foreground text-sm"
            data-ocid="search.empty_state"
          >
            No results for "{fetched}".
          </div>
        )}
      </div>
    </div>
  );
}
