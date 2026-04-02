import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  Eye,
  Gauge,
  Headphones,
  ListEnd,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  SkipBack,
  SkipForward,
  ThumbsUp,
  Timer,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { formatSeconds, formatTimeAgo, formatViews } from "../types/youtube";

const DEFAULT_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_OPTIONS = [
  { label: "Off", value: null },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];
const ROTATION_OPTIONS = [0, 90, 180, 270] as const;
type Rotation = (typeof ROTATION_OPTIONS)[number];

interface Props {
  onClose: () => void;
}

export function ExpandedPlayer({ onClose }: Props) {
  const {
    currentVideo,
    playerRef,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrev,
    currentHistoryIndex,
    watchHistory,
    playbackSpeed,
    setPlaybackSpeed,
    volume,
    setVolume,
    loop,
    setLoop,
    abLoop,
    setAbLoop,
    bookmarks,
    addBookmark,
    removeBookmark,
    focusMode,
    setFocusMode,
    sleepTimerMinutes,
    setSleepTimer,
    sleepTimerRemaining,
    studyTimerActive,
    studyTimerPhase,
    studyTimerRemaining,
    startStudyTimer,
    stopStudyTimer,
    studyTimerDuration,
    setStudyTimerDuration,
  } = useApp();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showStudyTimer, setShowStudyTimer] = useState(false);
  const [availableSpeeds, setAvailableSpeeds] =
    useState<number[]>(DEFAULT_SPEEDS);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const ct = p.getCurrentTime();
        const dur = p.getDuration();
        if (Number.isFinite(ct) && ct >= 0 && !isDragging) setCurrentTime(ct);
        if (Number.isFinite(dur) && dur > 0) setDuration(dur);
        // Fetch available playback rates once player is ready
        try {
          const rates = p.getAvailablePlaybackRates?.();
          if (rates && rates.length > 0) {
            setAvailableSpeeds(rates);
          }
        } catch (_) {}
        // A-B loop check
        if (abLoop && Number.isFinite(ct) && ct >= abLoop.end) {
          p.seekTo(abLoop.start, true);
        }
        // Loop end check
        try {
          const state = p.getPlayerState();
          if (loop && state === window.YT?.PlayerState?.ENDED) {
            p.seekTo(0, true);
            p.playVideo();
          }
        } catch (_) {}
      } catch (_) {}
    }, 300);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playerRef, isDragging, abLoop, loop]);

  const handlePlayPause = () => {
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

  const handleSeek = (vals: number[]) => {
    const val = vals[0] ?? 0;
    playerRef.current?.seekTo(val, true);
    setCurrentTime(val);
  };

  const handleSeekRel = (delta: number) => {
    const p = playerRef.current;
    if (!p) return;
    const t = Math.max(0, Math.min(duration, currentTime + delta));
    p.seekTo(t, true);
    setCurrentTime(t);
  };

  const handleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isMuted) {
      p.unMute();
      setIsMuted(false);
    } else {
      p.mute();
      setIsMuted(true);
    }
  };

  const handleSetA = () => {
    const a = currentTime;
    setAbLoop(
      abLoop ? { ...abLoop, start: a } : { start: a, end: duration || a + 30 },
    );
    toast.success(`A-point set at ${formatSeconds(a)}`);
  };

  const handleSetB = () => {
    const b = currentTime;
    if (!abLoop) {
      setAbLoop({ start: 0, end: b });
    } else {
      setAbLoop({ ...abLoop, end: b });
    }
    toast.success(`B-point set at ${formatSeconds(b)}`);
  };

  const handleAddBookmark = () => {
    if (!currentVideo) return;
    const vid =
      typeof currentVideo.id === "string"
        ? currentVideo.id
        : currentVideo.id.videoId;
    addBookmark(vid, currentTime, formatSeconds(currentTime));
    toast.success(`Bookmark added at ${formatSeconds(currentTime)} 🔖`);
  };

  const handleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else {
      playerWrapperRef.current?.requestFullscreen().catch(() => {});
    }
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const currentVideoId = currentVideo
    ? typeof currentVideo.id === "string"
      ? currentVideo.id
      : currentVideo.id.videoId
    : "";
  const videoBookmarks = bookmarks.filter((b) => b.videoId === currentVideoId);

  const fmtTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Rotation style helpers
  const needsSwap = rotation === 90 || rotation === 270;
  const thumbnailUrl = currentVideo?.snippet?.thumbnails?.high?.url;

  if (!currentVideo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "oklch(0.09 0.006 260)",
        maxWidth: "430px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <button
          type="button"
          data-ocid="player.close_button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: "oklch(0.19 0.005 260)" }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground tracking-widest uppercase font-medium">
            Now Playing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Fullscreen button */}
          <button
            type="button"
            data-ocid="player.fullscreen.button"
            onClick={handleFullscreen}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{
              background: isFullscreen
                ? "var(--tube-accent)"
                : "oklch(0.19 0.005 260)",
            }}
          >
            {isFullscreen ? (
              <Minimize2
                className="w-4 h-4"
                style={{ color: isFullscreen ? "black" : undefined }}
              />
            ) : (
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {/* Study timer button */}
          <button
            type="button"
            data-ocid="player.study_timer.button"
            onClick={() => setShowStudyTimer((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-full relative"
            style={{
              background: studyTimerActive
                ? "var(--tube-accent)"
                : "oklch(0.19 0.005 260)",
            }}
          >
            <Timer
              className={cn(
                "w-4 h-4",
                studyTimerActive ? "text-black" : "text-muted-foreground",
              )}
            />
            {studyTimerActive && (
              <span className="study-timer-badge">
                {fmtTimer(studyTimerRemaining)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* YT Player embed with rotation */}
        <div
          className="w-full rounded-2xl overflow-hidden bg-black mb-3"
          style={{ aspectRatio: "16/9", position: "relative" }}
        >
          <div
            ref={playerWrapperRef}
            style={{
              width: "100%",
              height: "100%",
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.3s ease",
              transformOrigin: "center center",
              ...(needsSwap
                ? {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    translate: "-50% -50%",
                    width: "56.25%",
                    height: "177.78%",
                  }
                : {}),
            }}
          >
            <div id="yt-player" style={{ width: "100%", height: "100%" }} />
            {/* Audio mode overlay */}
            {audioMode && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: "oklch(0.09 0.006 260 / 0.97)" }}
              >
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="thumb"
                    className="w-24 h-24 rounded-xl object-cover opacity-60"
                  />
                )}
                <p className="text-xs text-muted-foreground px-4 text-center">
                  {currentVideo.snippet.channelTitle}
                </p>
                <p className="text-sm font-semibold text-foreground px-4 text-center line-clamp-2">
                  {currentVideo.snippet.title}
                </p>
                {/* Audio wave animation */}
                <div className="audio-wave">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className="audio-bar"
                      style={{ animationDelay: `${(i - 1) * 0.12}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rotation controls */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <RotateCw className="w-3 h-3" /> Rotate Video
          </p>
          <div className="flex items-center gap-2">
            {ROTATION_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                data-ocid="player.rotation.toggle"
                onClick={() => setRotation(r)}
                className={cn(
                  "flex-1 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  rotation === r
                    ? "text-black border-transparent"
                    : "text-muted-foreground border-border hover:text-foreground",
                )}
                style={
                  rotation === r
                    ? {
                        background: "var(--tube-accent)",
                        borderColor: "var(--tube-accent)",
                      }
                    : {}
                }
              >
                {r}°
              </button>
            ))}
          </div>
        </div>

        {/* Title + stats */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground leading-snug mb-1 line-clamp-2">
            {currentVideo.snippet.title}
          </h2>
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
              <span>{formatTimeAgo(currentVideo.snippet.publishedAt)}</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div
            className="relative w-full rounded-full cursor-pointer"
            style={{ height: "6px", background: "oklch(0.22 0.005 260)" }}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
          >
            {abLoop && duration > 0 && (
              <div
                className="absolute top-0 h-full opacity-30 rounded-full"
                style={{
                  left: `${(abLoop.start / duration) * 100}%`,
                  width: `${((abLoop.end - abLoop.start) / duration) * 100}%`,
                  background: "var(--tube-accent)",
                }}
              />
            )}
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${pct}%`, background: "var(--tube-accent)" }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full"
              style={{
                left: `${pct}%`,
                background: "var(--tube-accent)",
                boxShadow: "0 0 0 3px oklch(0.09 0.006 260)",
              }}
            />
            <Slider
              min={0}
              max={duration || 100}
              step={0.5}
              value={[currentTime]}
              onValueChange={handleSeek}
              className="absolute inset-0 opacity-0 h-full w-full cursor-pointer"
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatSeconds(currentTime)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatSeconds(duration)}
            </span>
          </div>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            data-ocid="player.pagination_prev"
            onClick={playPrev}
            disabled={currentHistoryIndex <= 0}
            className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleSeekRel(-10)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors relative"
            data-ocid="player.seek_back.button"
          >
            <SkipBack className="w-4 h-4" />
            <span
              className="text-[9px] font-bold absolute"
              style={{ bottom: "8px", right: "7px" }}
            >
              10
            </span>
          </button>
          <button
            type="button"
            data-ocid="player.toggle"
            onClick={handlePlayPause}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: "var(--tube-accent)" }}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-black text-black" />
            ) : (
              <Play className="w-6 h-6 fill-black text-black ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSeekRel(10)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors relative"
            data-ocid="player.seek_fwd.button"
          >
            <SkipForward className="w-4 h-4" />
            <span
              className="text-[9px] font-bold absolute"
              style={{ bottom: "8px", left: "7px" }}
            >
              10
            </span>
          </button>
          <button
            type="button"
            data-ocid="player.pagination_next"
            onClick={playNext}
            disabled={currentHistoryIndex >= watchHistory.length - 1}
            className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Speed pills */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Gauge className="w-3 h-3" /> Playback Speed
          </p>
          <div className="speed-scroll" data-ocid="player.speed.select">
            {availableSpeeds.map((s) => (
              <button
                key={s}
                type="button"
                data-ocid="player.speed.toggle"
                onClick={() => setPlaybackSpeed(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all border",
                  playbackSpeed === s
                    ? "text-black border-transparent"
                    : "text-muted-foreground border-border hover:text-foreground",
                )}
                style={
                  playbackSpeed === s
                    ? {
                        background: "var(--tube-accent)",
                        borderColor: "var(--tube-accent)",
                      }
                    : {}
                }
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume + Audio Mode row */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            data-ocid="player.volume.toggle"
            onClick={handleMute}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[isMuted ? 0 : volume]}
            onValueChange={(vals) => {
              setVolume(vals[0] ?? 80);
              if (isMuted && (vals[0] ?? 0) > 0) setIsMuted(false);
            }}
            className="flex-1"
            data-ocid="player.volume.input"
          />
          <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">
            {isMuted ? 0 : volume}%
          </span>
          {/* Audio mode toggle */}
          <button
            type="button"
            data-ocid="player.audiomode.toggle"
            onClick={() => setAudioMode((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all"
            style={{
              background: audioMode
                ? "var(--tube-accent)"
                : "oklch(0.19 0.005 260)",
            }}
            title="Audio Mode"
          >
            <Headphones
              className="w-4 h-4"
              style={{ color: audioMode ? "black" : undefined }}
            />
          </button>
        </div>

        {/* ── Student Tools ── */}
        <div
          className="rounded-2xl p-4 mb-4 space-y-4"
          style={{ background: "oklch(0.14 0.005 260)" }}
        >
          <p
            className="text-xs font-bold text-foreground tracking-widest uppercase"
            style={{ color: "var(--tube-accent)" }}
          >
            Student Tools
          </p>

          {/* Loop */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw
                className={cn("w-4 h-4", loop ? "" : "text-muted-foreground")}
                style={loop ? { color: "var(--tube-accent)" } : {}}
              />
              <span className="text-sm text-foreground">Loop Video</span>
              {loop && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  ON
                </Badge>
              )}
            </div>
            <Switch
              checked={loop}
              onCheckedChange={setLoop}
              data-ocid="player.loop.switch"
            />
          </div>

          {/* A-B Loop */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ListEnd className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">A-B Loop</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                data-ocid="player.abloop.a_button"
                onClick={handleSetA}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:border-accent"
                style={{
                  borderColor: abLoop
                    ? "var(--tube-accent)"
                    : "oklch(0.24 0.005 260)",
                  color: abLoop ? "var(--tube-accent)" : "oklch(0.6 0.009 240)",
                }}
              >
                Set A {abLoop ? `(${formatSeconds(abLoop.start)})` : ""}
              </button>
              <button
                type="button"
                data-ocid="player.abloop.b_button"
                onClick={handleSetB}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:border-accent"
                style={{
                  borderColor: abLoop
                    ? "var(--tube-accent)"
                    : "oklch(0.24 0.005 260)",
                  color: abLoop ? "var(--tube-accent)" : "oklch(0.6 0.009 240)",
                }}
              >
                Set B {abLoop ? `(${formatSeconds(abLoop.end)})` : ""}
              </button>
              {abLoop && (
                <button
                  type="button"
                  data-ocid="player.abloop.clear_button"
                  onClick={() => setAbLoop(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full"
                  style={{ background: "oklch(0.22 0.005 260)" }}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Bookmarks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Bookmarks</span>
              </div>
              <button
                type="button"
                data-ocid="player.bookmark.button"
                onClick={handleAddBookmark}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: "oklch(0.20 0.005 260)",
                  color: "var(--tube-accent)",
                }}
              >
                <BookmarkPlus className="w-3 h-3" /> Save
              </button>
            </div>
            {videoBookmarks.length > 0 ? (
              <div className="space-y-1.5">
                {videoBookmarks.map((bk, i) => (
                  <div
                    key={bk.id}
                    data-ocid={`player.bookmark.item.${i + 1}`}
                    className="flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        playerRef.current?.seekTo(bk.time, true);
                        setCurrentTime(bk.time);
                      }}
                      className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-colors hover:bg-secondary"
                      style={{ background: "oklch(0.18 0.005 260)" }}
                    >
                      <Bookmark
                        className="w-3 h-3 flex-shrink-0"
                        style={{ color: "var(--tube-accent)" }}
                      />
                      <span
                        className="tabular-nums font-semibold"
                        style={{ color: "var(--tube-accent)" }}
                      >
                        {bk.label}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-ocid={`player.bookmark.delete_button.${i + 1}`}
                      onClick={() => removeBookmark(bk.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No bookmarks yet. Tap Save to add one.
              </p>
            )}
          </div>

          {/* Focus Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye
                className={cn(
                  "w-4 h-4",
                  focusMode ? "" : "text-muted-foreground",
                )}
                style={focusMode ? { color: "var(--tube-accent)" } : {}}
              />
              <div>
                <p className="text-sm text-foreground">Focus Mode</p>
                <p className="text-xs text-muted-foreground">
                  Hides related videos
                </p>
              </div>
            </div>
            <Switch
              checked={focusMode}
              onCheckedChange={setFocusMode}
              data-ocid="player.focus.switch"
            />
          </div>

          {/* Sleep Timer */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Sleep Timer</span>
              {sleepTimerRemaining !== null && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {fmtTimer(sleepTimerRemaining)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {SLEEP_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  data-ocid="player.sleep.toggle"
                  onClick={() => setSleepTimer(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    sleepTimerMinutes === opt.value
                      ? "text-black border-transparent"
                      : "text-muted-foreground border-border hover:text-foreground",
                  )}
                  style={
                    sleepTimerMinutes === opt.value
                      ? {
                          background: "var(--tube-accent)",
                          borderColor: "var(--tube-accent)",
                        }
                      : {}
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Study Timer card */}
        {showStudyTimer && (
          <div
            className="rounded-2xl p-4 mb-4 space-y-3"
            style={{ background: "oklch(0.14 0.005 260)" }}
            data-ocid="player.study_timer.panel"
          >
            <div className="flex items-center justify-between">
              <p
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "var(--tube-accent)" }}
              >
                Pomodoro Timer
              </p>
              {studyTimerActive && (
                <Badge
                  className="text-xs"
                  style={{
                    background:
                      studyTimerPhase === "study"
                        ? "var(--tube-accent)"
                        : "oklch(0.6 0.18 260)",
                    color: "black",
                  }}
                >
                  {studyTimerPhase === "study" ? "Studying" : "Break"} —{" "}
                  {fmtTimer(studyTimerRemaining)}
                </Badge>
              )}
            </div>
            {!studyTimerActive && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    Study (min)
                  </p>
                  <div className="flex items-center gap-1">
                    {[15, 25, 45, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setStudyTimerDuration({
                            ...studyTimerDuration,
                            study: m,
                          })
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-semibold border",
                        )}
                        style={
                          studyTimerDuration.study === m
                            ? {
                                background: "var(--tube-accent)",
                                borderColor: "var(--tube-accent)",
                                color: "black",
                              }
                            : {
                                borderColor: "oklch(0.24 0.005 260)",
                                color: "oklch(0.6 0.009 240)",
                              }
                        }
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    Break (min)
                  </p>
                  <div className="flex items-center gap-1">
                    {[5, 10, 15].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setStudyTimerDuration({
                            ...studyTimerDuration,
                            breakTime: m,
                          })
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-semibold border",
                        )}
                        style={
                          studyTimerDuration.breakTime === m
                            ? {
                                background: "var(--tube-accent)",
                                borderColor: "var(--tube-accent)",
                                color: "black",
                              }
                            : {
                                borderColor: "oklch(0.24 0.005 260)",
                                color: "oklch(0.6 0.009 240)",
                              }
                        }
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {!studyTimerActive ? (
                <button
                  type="button"
                  data-ocid="player.study_timer.primary_button"
                  onClick={startStudyTimer}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-all"
                  style={{ background: "var(--tube-accent)" }}
                >
                  Start Pomodoro
                </button>
              ) : (
                <button
                  type="button"
                  data-ocid="player.study_timer.cancel_button"
                  onClick={stopStudyTimer}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-foreground border border-border transition-all hover:bg-secondary"
                >
                  Stop Timer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
