import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { fetchStreamUrl } from "../lib/invidious";
import { type Page, type YouTubeVideoItem, getVideoId } from "../types/youtube";

export interface Bookmark {
  id: string;
  videoId: string;
  time: number;
  label: string;
}

function loadResumeMap(): Record<string, number> {
  try {
    return JSON.parse(
      localStorage.getItem("tubeflow_resume") ?? "{}",
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

interface AppContextValue {
  // navigation
  page: Page;
  setPage: (p: Page) => void;
  // settings
  accentColor: string;
  setAccentColor: (c: string) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (s: number) => void;
  // player
  currentVideo: YouTubeVideoItem | null;
  watchVideo: (v: YouTubeVideoItem) => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  streamLoading: boolean;
  streamError: boolean;
  retryStream: () => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  playerExpanded: boolean;
  setPlayerExpanded: (v: boolean) => void;
  // search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // history
  watchHistory: YouTubeVideoItem[];
  currentHistoryIndex: number;
  playNext: () => void;
  playPrev: () => void;
  // prefs
  preferencesLoaded: boolean;
  setPreferencesLoaded: (v: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  // loop
  loop: boolean;
  setLoop: (v: boolean) => void;
  // ab loop
  abLoop: { start: number; end: number } | null;
  setAbLoop: (v: { start: number; end: number } | null) => void;
  // bookmarks
  bookmarks: Bookmark[];
  addBookmark: (videoId: string, time: number, label: string) => void;
  removeBookmark: (id: string) => void;
  // queue
  queue: YouTubeVideoItem[];
  addToQueue: (v: YouTubeVideoItem) => void;
  removeFromQueue: (videoId: string) => void;
  // focus mode
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  // sleep timer
  sleepTimerMinutes: number | null;
  setSleepTimer: (minutes: number | null) => void;
  sleepTimerRemaining: number | null;
  // study timer
  studyTimerActive: boolean;
  studyTimerPhase: "study" | "break";
  studyTimerRemaining: number;
  studyTimerDuration: { study: number; breakTime: number };
  setStudyTimerDuration: (d: { study: number; breakTime: number }) => void;
  startStudyTimer: () => void;
  stopStudyTimer: () => void;
  // auto resume
  pendingResumeTime: React.MutableRefObject<number | null>;
  saveResumeTimestamp: (videoId: string, time: number) => void;
  getResumeTimestamp: (videoId: string) => number | null;
  // auto fullscreen
  autoFullscreen: boolean;
  setAutoFullscreen: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<Page>("home");
  const [accentColor, setAccentColorState] = useState("#19C37D");
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [currentVideo, setCurrentVideo] = useState<YouTubeVideoItem | null>(
    null,
  );
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [watchHistory, setWatchHistory] = useState<YouTubeVideoItem[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [volume, setVolumeState] = useState(80);
  const [loop, setLoop] = useState(false);
  const [abLoop, setAbLoop] = useState<{ start: number; end: number } | null>(
    null,
  );
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [queue, setQueue] = useState<YouTubeVideoItem[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [sleepTimerMinutes, setSleepTimerState] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(
    null,
  );
  const [studyTimerActive, setStudyTimerActive] = useState(false);
  const [studyTimerPhase, setStudyTimerPhase] = useState<"study" | "break">(
    "study",
  );
  const [studyTimerRemaining, setStudyTimerRemaining] = useState(0);
  const [studyTimerDuration, setStudyTimerDuration] = useState({
    study: 25,
    breakTime: 5,
  });
  const [autoFullscreen, setAutoFullscreenState] = useState(
    () => localStorage.getItem("tubeflow_autoFullscreen") === "true",
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studyTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const pendingResumeTime = useRef<number | null>(null);
  const autoResumeMapRef = useRef<Record<string, number>>(loadResumeMap());
  const currentVideoRef = useRef<YouTubeVideoItem | null>(null);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    document.documentElement.style.setProperty("--tube-accent", color);
  }, []);

  const setPlaybackSpeed = useCallback((s: number) => {
    setPlaybackSpeedState(s);
    if (audioRef.current) {
      audioRef.current.playbackRate = s;
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) {
      audioRef.current.volume = v / 100;
    }
  }, []);

  const setAutoFullscreen = useCallback((v: boolean) => {
    setAutoFullscreenState(v);
    localStorage.setItem("tubeflow_autoFullscreen", String(v));
  }, []);

  const saveResumeTimestamp = useCallback((videoId: string, time: number) => {
    autoResumeMapRef.current = { ...autoResumeMapRef.current, [videoId]: time };
    try {
      localStorage.setItem(
        "tubeflow_resume",
        JSON.stringify(autoResumeMapRef.current),
      );
    } catch (_) {}
  }, []);

  const getResumeTimestamp = useCallback((videoId: string): number | null => {
    const t = autoResumeMapRef.current[videoId];
    return t !== undefined ? t : null;
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--tube-accent", "#19C37D");
  }, []);

  // Media Session API
  // biome-ignore lint/correctness/useExhaustiveDependencies: isPlaying intentionally used
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentVideo) return;
    const thumb =
      currentVideo.snippet.thumbnails.high?.url ||
      currentVideo.snippet.thumbnails.medium?.url ||
      "";
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentVideo.snippet.title,
      artist: currentVideo.snippet.channelTitle,
      artwork: thumb
        ? [{ src: thumb, sizes: "480x360", type: "image/jpeg" }]
        : [],
    });
    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.duration || 0,
          audioRef.current.currentTime + 10,
        );
      }
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(
          0,
          audioRef.current.currentTime - 10,
        );
      }
    });
  }, [currentVideo, isPlaying]);

  // Sleep timer
  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerState(minutes);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if (minutes === null) {
      setSleepTimerRemaining(null);
      return;
    }
    setSleepTimerRemaining(minutes * 60);
    sleepTimerRef.current = setTimeout(
      () => {
        audioRef.current?.pause();
        setSleepTimerState(null);
        setSleepTimerRemaining(null);
      },
      minutes * 60 * 1000,
    );
  }, []);

  // Sleep timer countdown
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (sleepTimerRemaining === null) return;
    const id = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sleepTimerMinutes]);

  // Study timer logic
  const startStudyTimer = useCallback(() => {
    if (studyTimerIntervalRef.current)
      clearInterval(studyTimerIntervalRef.current);
    setStudyTimerActive(true);
    setStudyTimerPhase("study");
    setStudyTimerRemaining(studyTimerDuration.study * 60);
  }, [studyTimerDuration]);

  const stopStudyTimer = useCallback(() => {
    if (studyTimerIntervalRef.current)
      clearInterval(studyTimerIntervalRef.current);
    setStudyTimerActive(false);
    setStudyTimerRemaining(0);
  }, []);

  useEffect(() => {
    if (!studyTimerActive) {
      if (studyTimerIntervalRef.current)
        clearInterval(studyTimerIntervalRef.current);
      return;
    }
    studyTimerIntervalRef.current = setInterval(() => {
      setStudyTimerRemaining((prev) => {
        if (prev <= 1) {
          setStudyTimerPhase((phase) => {
            if (phase === "study") {
              audioRef.current?.pause();
              toast.success("Break time! 🎉 Take a 5-min breather.", {
                duration: 5000,
              });
              setStudyTimerRemaining(studyTimerDuration.breakTime * 60);
              return "break";
            }
            audioRef.current?.play().catch(() => {});
            toast.success("Back to focus! 📚", { duration: 3000 });
            setStudyTimerRemaining(studyTimerDuration.study * 60);
            return "study";
          });
          return studyTimerDuration.study * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (studyTimerIntervalRef.current)
        clearInterval(studyTimerIntervalRef.current);
    };
  }, [studyTimerActive, studyTimerDuration]);

  const loadStream = useCallback(
    async (video: YouTubeVideoItem) => {
      const vid = getVideoId(video);
      setStreamLoading(true);
      setStreamError(false);
      try {
        const url = await fetchStreamUrl(vid);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.playbackRate = playbackSpeed;
          audioRef.current.volume = volume / 100;
          audioRef.current.play().catch(() => {});
        }
        setStreamLoading(false);
      } catch {
        setStreamLoading(false);
        setStreamError(true);
      }
    },
    [playbackSpeed, volume],
  );

  const watchVideo = useCallback(
    (video: YouTubeVideoItem) => {
      const vid = getVideoId(video);
      const resumeTime = autoResumeMapRef.current[vid] ?? null;
      pendingResumeTime.current =
        resumeTime && resumeTime > 5 ? resumeTime : null;

      currentVideoRef.current = video;
      setCurrentVideo(video);
      setPage("watch");
      setPlayerExpanded(true);
      setWatchHistory((prev) => {
        const newHistory = [...prev, video];
        setCurrentHistoryIndex(newHistory.length - 1);
        return newHistory;
      });

      loadStream(video);
    },
    [loadStream],
  );

  const retryStream = useCallback(() => {
    if (currentVideoRef.current) {
      loadStream(currentVideoRef.current);
    }
  }, [loadStream]);

  const playNext = useCallback(() => {
    setCurrentHistoryIndex((idx) => {
      if (idx < watchHistory.length - 1) {
        const next = watchHistory[idx + 1];
        if (next) {
          currentVideoRef.current = next;
          setCurrentVideo(next);
          loadStream(next);
        }
        return idx + 1;
      }
      setQueue((q) => {
        if (q.length > 0) {
          const [next, ...rest] = q;
          if (next) {
            currentVideoRef.current = next;
            setCurrentVideo(next);
            setWatchHistory((h) => {
              const n = [...h, next];
              setCurrentHistoryIndex(n.length - 1);
              return n;
            });
            loadStream(next);
          }
          return rest;
        }
        return q;
      });
      return idx;
    });
  }, [watchHistory, loadStream]);

  const playPrev = useCallback(() => {
    setCurrentHistoryIndex((idx) => {
      if (idx > 0) {
        const prev = watchHistory[idx - 1];
        if (prev) {
          currentVideoRef.current = prev;
          setCurrentVideo(prev);
          loadStream(prev);
        }
        return idx - 1;
      }
      return idx;
    });
  }, [watchHistory, loadStream]);

  const addBookmark = useCallback(
    (videoId: string, time: number, label: string) => {
      setBookmarks((prev) => [
        ...prev,
        { id: `${Date.now()}`, videoId, time, label },
      ]);
    },
    [],
  );

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addToQueue = useCallback((v: YouTubeVideoItem) => {
    setQueue((prev) => {
      if (prev.find((x) => getVideoId(x) === getVideoId(v))) return prev;
      return [...prev, v];
    });
  }, []);

  const removeFromQueue = useCallback((videoId: string) => {
    setQueue((prev) => prev.filter((v) => getVideoId(v) !== videoId));
  }, []);

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
        accentColor,
        setAccentColor,
        playbackSpeed,
        setPlaybackSpeed,
        currentVideo,
        watchVideo,
        audioRef,
        streamLoading,
        streamError,
        retryStream,
        isPlaying,
        setIsPlaying,
        playerExpanded,
        setPlayerExpanded,
        searchQuery,
        setSearchQuery,
        watchHistory,
        currentHistoryIndex,
        playNext,
        playPrev,
        preferencesLoaded,
        setPreferencesLoaded,
        volume,
        setVolume,
        loop,
        setLoop,
        abLoop,
        setAbLoop,
        bookmarks,
        addBookmark,
        removeBookmark,
        queue,
        addToQueue,
        removeFromQueue,
        focusMode,
        setFocusMode,
        sleepTimerMinutes,
        setSleepTimer,
        sleepTimerRemaining,
        studyTimerActive,
        studyTimerPhase,
        studyTimerRemaining,
        studyTimerDuration,
        setStudyTimerDuration,
        startStudyTimer,
        stopStudyTimer,
        pendingResumeTime,
        saveResumeTimestamp,
        getResumeTimestamp,
        autoFullscreen,
        setAutoFullscreen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
