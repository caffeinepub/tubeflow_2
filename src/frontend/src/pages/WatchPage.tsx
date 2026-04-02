import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, Calendar, Eye, ThumbsUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { VideoCard } from "../components/VideoCard";
import { useApp } from "../context/AppContext";
import { invidiousSearch } from "../lib/invidious";
import {
  type YouTubeVideoItem,
  formatSeconds,
  formatTimeAgo,
  formatViews,
  getVideoId,
} from "../types/youtube";

export function WatchPage() {
  const {
    currentVideo,
    focusMode,
    bookmarks,
    removeBookmark,
    playerRef,
    setPlayerExpanded,
  } = useApp();
  const [related, setRelated] = useState<YouTubeVideoItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!currentVideo) return;
    setLoadingRelated(true);
    const vid = getVideoId(currentVideo);
    const query =
      currentVideo.snippet.channelTitle || currentVideo.snippet.title;
    invidiousSearch(query)
      .then((results) =>
        setRelated(results.filter((v) => getVideoId(v) !== vid).slice(0, 10)),
      )
      .catch(() => {})
      .finally(() => setLoadingRelated(false));
  }, [currentVideo]);

  if (!currentVideo) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        data-ocid="watch.empty_state"
      >
        <p className="text-muted-foreground text-sm">No video selected.</p>
      </div>
    );
  }

  const currentVideoId =
    typeof currentVideo.id === "string"
      ? currentVideo.id
      : currentVideo.id.videoId;
  const videoBookmarks = bookmarks.filter((b) => b.videoId === currentVideoId);

  return (
    <div className="px-4 pb-4" data-ocid="watch.section">
      {/* Tap to expand */}
      <button
        type="button"
        onClick={() => setPlayerExpanded(true)}
        className="w-full rounded-2xl overflow-hidden bg-black mb-4 relative"
        style={{ aspectRatio: "16/9" }}
        data-ocid="watch.player.button"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div
            className="px-4 py-2 rounded-full text-sm font-semibold text-black"
            style={{ background: "var(--tube-accent)" }}
          >
            Tap to open player
          </div>
        </div>
        {currentVideo.snippet.thumbnails.maxres?.url ||
        currentVideo.snippet.thumbnails.high?.url ? (
          <img
            src={
              currentVideo.snippet.thumbnails.maxres?.url ??
              currentVideo.snippet.thumbnails.high?.url
            }
            alt={currentVideo.snippet.title}
            className="w-full h-full object-cover opacity-40"
          />
        ) : null}
      </button>

      {/* Title */}
      <div className="mb-4">
        <h1 className="text-sm font-bold text-foreground leading-snug mb-2 line-clamp-3">
          {currentVideo.snippet.title}
        </h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span
            className="font-semibold"
            style={{ color: "var(--tube-accent)" }}
          >
            {currentVideo.snippet.channelTitle}
          </span>
          {currentVideo.statistics?.viewCount && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViews(currentVideo.statistics.viewCount)}
            </span>
          )}
          {currentVideo.statistics?.likeCount && (
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {formatViews(currentVideo.statistics.likeCount)}
            </span>
          )}
          {currentVideo.snippet.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatTimeAgo(currentVideo.snippet.publishedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Bookmarks */}
      {videoBookmarks.length > 0 && (
        <div
          className="mb-4 rounded-2xl p-3"
          style={{ background: "oklch(0.14 0.005 260)" }}
          data-ocid="watch.bookmarks.list"
        >
          <p
            className="text-xs font-bold tracking-widest uppercase mb-2"
            style={{ color: "var(--tube-accent)" }}
          >
            Bookmarks
          </p>
          <div className="flex flex-wrap gap-2">
            {videoBookmarks.map((bk, i) => (
              <div
                key={bk.id}
                className="flex items-center gap-1"
                data-ocid={`watch.bookmark.item.${i + 1}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    playerRef.current?.seekTo(bk.time, true);
                    setPlayerExpanded(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    background: "oklch(0.20 0.005 260)",
                    color: "var(--tube-accent)",
                  }}
                >
                  <Bookmark className="w-3 h-3" />
                  {formatSeconds(bk.time)}
                </button>
                <button
                  type="button"
                  onClick={() => removeBookmark(bk.id)}
                  className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  data-ocid={`watch.bookmark.delete_button.${i + 1}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {currentVideo.snippet.description && (
        <div
          className="rounded-2xl p-3 text-xs text-muted-foreground leading-relaxed mb-4"
          style={{ background: "oklch(0.14 0.005 260)" }}
        >
          <p className="line-clamp-4 whitespace-pre-line">
            {currentVideo.snippet.description}
          </p>
        </div>
      )}

      {/* Related videos */}
      {!focusMode && (
        <div data-ocid="watch.related.list">
          <h2 className="text-xs font-bold text-foreground mb-3 tracking-widest uppercase">
            More Videos
          </h2>
          {loadingRelated ? (
            <div className="space-y-2" data-ocid="watch.related.loading_state">
              {Array.from({ length: 4 }, (_, i) => `r${i}`).map((k) => (
                <div key={k} className="flex gap-2">
                  <Skeleton className="w-24 aspect-video rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {related.map((v, i) => (
                <VideoCard key={String(v.id)} video={v} compact index={i + 1} />
              ))}
              {related.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No related videos.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {focusMode && (
        <div className="text-center py-6" data-ocid="watch.focus.panel">
          <p className="text-xs text-muted-foreground">
            Focus mode active — related videos hidden.
          </p>
        </div>
      )}
    </div>
  );
}
