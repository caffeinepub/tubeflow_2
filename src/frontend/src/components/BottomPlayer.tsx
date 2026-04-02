import { cn } from "@/lib/utils";
import { Pause, Play, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { getThumbnail } from "../types/youtube";

export function BottomPlayer() {
  const {
    currentVideo,
    playerRef,
    isPlaying,
    setIsPlaying,
    playNext,
    setPlayerExpanded,
  } = useApp();
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const ct = p.getCurrentTime();
        const dur = p.getDuration();
        if (Number.isFinite(ct) && dur > 0) setProgress((ct / dur) * 100);
      } catch (_) {}
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playerRef]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) {
      p.pauseVideo();
      setIsPlaying(false);
    } else {
      p.playVideo();
      setIsPlaying(true);
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    playNext();
  };

  if (!currentVideo) return null;
  const thumb = getThumbnail(currentVideo);

  return (
    <button
      type="button"
      data-ocid="player.panel"
      onClick={() => setPlayerExpanded(true)}
      className="flex-shrink-0 w-full text-left"
      style={{ background: "oklch(0.14 0.005 260)" }}
    >
      {/* Progress bar */}
      <div
        className="w-full h-[2px]"
        style={{ background: "oklch(0.22 0.005 260)" }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "var(--tube-accent)" }}
        />
      </div>
      {/* Content */}
      <div className={cn("flex items-center gap-3 px-4", "h-16")}>
        {thumb && (
          <img
            src={thumb}
            alt=""
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {currentVideo.snippet.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {currentVideo.snippet.channelTitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="player.toggle"
            onClick={handlePlayPause}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--tube-accent)" }}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black text-black" />
            ) : (
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            )}
          </button>
          <button
            type="button"
            data-ocid="player.pagination_next"
            onClick={handleSkip}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </button>
  );
}
