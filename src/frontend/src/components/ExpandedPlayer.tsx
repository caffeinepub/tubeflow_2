import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  Eye,
  Gauge,
  Headphones,
  ListEnd,
  Loader2,
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
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { fetchCaptionGaps } from "../lib/invidious";
import { formatSeconds, formatTimeAgo, formatViews } from "../types/youtube";

const QUICK_SPEEDS = [1, 1.5, 2, 3, 4];
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
    audioRef,
    streamLoading,
    streamError,
    retryStream,
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
    autoFullscreen,
    saveResumeTimestamp,
  } = useApp();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showStudyTimer, setShowStudyTimer] = useState(false);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const [silenceSkip, setSilenceSkip] = useState(false);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const silenceGapsRef = useRef<Array<{ start: number; end: number }>>([]);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastVideoIdRef = useRef<string>("");

  const currentVideoId = currentVideo
    ? typeof currentVideo.id === "string"
      ? currentVideo.id
      : currentVideo.id.videoId
    : "";

  // Reset per-video state when video changes
  useEffect(() => {
    if (currentVideoId && currentVideoId !== lastVideoIdRef.current) {
      lastVideoIdRef.current = currentVideoId;
      silenceGapsRef.current = [];
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentVideoId]);

  // Sync currentTime and duration from audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!isDragging) setCurrentTime(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      // A-B loop check
      if (
        abLoop &&
        Number.isFinite(audio.currentTime) &&
        audio.currentTime >= abLoop.end
      ) {
        audio.currentTime = abLoop.start;
      }
    };

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [audioRef, isDragging, abLoop]);

  // Save timestamp every 5 seconds while playing
  useEffect(() => {
    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    if (!isPlaying || !currentVideoId) return;
    saveIntervalRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 5) {
        saveResumeTimestamp(currentVideoId, audio.currentTime);
      }
    }, 5000);
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [isPlaying, currentVideoId, audioRef, saveResumeTimestamp]);

  // Silence skip: fetch gaps when toggled on
  useEffect(() => {
    if (!silenceSkip || !currentVideoId) return;
    silenceGapsRef.current = [];
    fetchCaptionGaps(currentVideoId).then((gaps) => {
      silenceGapsRef.current = gaps;
    });
  }, [silenceSkip, currentVideoId]);

  // Silence skip polling
  useEffect(() => {
    if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
    if (!silenceSkip) return;
    silenceIntervalRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const ct = audio.currentTime;
      for (const gap of silenceGapsRef.current) {
        if (ct >= gap.start - 0.5 && ct < gap.end) {
          audio.currentTime = gap.end + 0.5;
          break;
        }
      }
    }, 800);
    return () => {
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
    };
  }, [silenceSkip, audioRef]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
      if (autoFullscreen) {
        playerWrapperRef.current?.requestFullscreen?.().catch(() => {});
      }
    }
  };

  const handleSeek = (vals: number[]) => {
    const val = vals[0] ?? 0;
    if (audioRef.current) audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const handleSeekRel = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Math.max(0, Math.min(duration, currentTime + delta));
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const handleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
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

  const handleSetSpeed = (s: number) => {
    setPlaybackSpeed(s);
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const videoBookmarks = bookmarks.filter((b) => b.videoId === currentVideoId);

  const fmtTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const thumbnailUrl =
    currentVideo?.snippet?.thumbnails?.maxres?.url ||
    currentVideo?.snippet?.thumbnails?.high?.url ||
    currentVideo?.snippet?.thumbnails?.medium?.url ||
    "";

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
              <Minimize2 className="w-4 h-4" style={{ color: "black" }} />
            ) : (
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
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
        {/* Album art / thumbnail area */}
        <div
          ref={playerWrapperRef}
          className="w-full rounded-2xl overflow-hidden bg-black mb-3 relative"
          style={{ aspectRatio: "16/9" }}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={currentVideo.snippet.title}
              className="w-full h-full object-cover"
              style={{
                filter: isPlaying ? "none" : "brightness(0.6)",
                transform: `rotate(${rotation}deg)`,
                transition: "transform 0.3s ease, filter 0.3s ease",
              }}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.15 0.01 260) 0%, oklch(0.20 0.015 290) 100%)",
              }}
            />
          )}

          {/* Audio mode overlay or equalizer */}
          {(isPlaying || audioMode) && (
            <div
              className="absolute inset-0 flex items-end justify-center pb-4"
              style={{
                background:
                  isPlaying && !audioMode
                    ? "oklch(0.09 0.006 260 / 0.3)"
                    : "oklch(0.09 0.006 260 / 0.75)",
              }}
            >
              {audioMode && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
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
                </div>
              )}
              {/* Equalizer bars */}
              <div className="audio-wave">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="audio-bar"
                    style={{
                      animationDelay: `${(i - 1) * 0.12}s`,
                      animationPlayState: isPlaying ? "running" : "paused",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stream loading overlay */}
          {streamLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "oklch(0.09 0.006 260 / 0.85)" }}
              data-ocid="player.loading_state"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: "var(--tube-accent)" }}
                />
                <p className="text-xs text-muted-foreground">
                  Loading audio...
                </p>
              </div>
            </div>
          )}

          {/* Stream error overlay */}
          {streamError && !streamLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "oklch(0.09 0.006 260 / 0.92)" }}
              data-ocid="player.error_state"
            >
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <AlertCircle
                  className="w-8 h-8"
                  style={{ color: "oklch(0.65 0.18 25)" }}
                />
                <p className="text-sm text-foreground font-semibold">
                  Could not connect
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your internet or try again.
                </p>
                <button
                  type="button"
                  data-ocid="player.retry.button"
                  onClick={retryStream}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-black"
                  style={{ background: "var(--tube-accent)" }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rotation controls */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <RotateCw className="w-3 h-3" /> Rotate
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
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Gauge className="w-3 h-3" /> Playback Speed
            </p>
            <button
              type="button"
              data-ocid="player.silence_skip.toggle"
              onClick={() => setSilenceSkip((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
              style={{
                background: silenceSkip
                  ? "var(--tube-accent)"
                  : "oklch(0.19 0.005 260)",
                borderColor: silenceSkip
                  ? "var(--tube-accent)"
                  : "oklch(0.24 0.005 260)",
                color: silenceSkip ? "black" : "oklch(0.6 0.009 240)",
              }}
              title="Skip Silence (uses captions)"
            >
              <Zap className="w-3 h-3" />
              Skip Silence
            </button>
          </div>
          <div className="speed-scroll" data-ocid="player.speed.select">
            {QUICK_SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                data-ocid="player.speed.toggle"
                onClick={() => handleSetSpeed(s)}
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

        {/* Student Tools */}
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
                        if (audioRef.current) {
                          audioRef.current.currentTime = bk.time;
                        }
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
