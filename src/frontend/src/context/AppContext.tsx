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
import {
  type Page,
  type YTPlayer,
  type YouTubeVideoItem,
  getVideoId,
} from "../types/youtube";

export interface Bookmark {
  id: string;
  videoId: string;
  time: number;
  label: string;
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
  playerRef: React.MutableRefObject<YTPlayer | null>;
  isYTReady: boolean;
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<Page>("home");
  const [accentColor, setAccentColorState] = useState("#19C37D");
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [currentVideo, setCurrentVideo] = useState<YouTubeVideoItem | null>(
    null,
  );
  const [isYTReady, setIsYTReady] = useState(false);
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
  const playerRef = useRef<YTPlayer | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studyTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    document.documentElement.style.setProperty("--tube-accent", color);
  }, []);

  const setPlaybackSpeed = useCallback((s: number) => {
    setPlaybackSpeedState(s);
    try {
      playerRef.current?.setPlaybackRate(s);
    } catch (_) {}
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    try {
      playerRef.current?.setVolume(v);
    } catch (_) {}
  }, []);

  // YT IFrame API
  useEffect(() => {
    if (window.YT?.Player) {
      setIsYTReady(true);
      return;
    }
    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => setIsYTReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--tube-accent", "#19C37D");
  }, []);

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
        try {
          playerRef.current?.pauseVideo();
        } catch (_) {}
        setSleepTimerState(null);
        setSleepTimerRemaining(null);
      },
      minutes * 60 * 1000,
    );
  }, []);

  // Sleep timer countdown
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - runs when timer is set
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
              try {
                playerRef.current?.pauseVideo();
              } catch (_) {}
              toast.success("Break time! 🎉 Take a 5-min breather.", {
                duration: 5000,
              });
              setStudyTimerRemaining(studyTimerDuration.breakTime * 60);
              return "break";
            }
            try {
              playerRef.current?.playVideo();
            } catch (_) {}
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

  const watchVideo = useCallback((video: YouTubeVideoItem) => {
    setCurrentVideo(video);
    setPage("watch");
    setPlayerExpanded(true);
    setWatchHistory((prev) => {
      const newHistory = [...prev, video];
      setCurrentHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, []);

  const playNext = useCallback(() => {
    setCurrentHistoryIndex((idx) => {
      if (idx < watchHistory.length - 1) {
        const next = watchHistory[idx + 1];
        if (next) {
          setCurrentVideo(next);
          try {
            playerRef.current?.loadVideoById(getVideoId(next));
          } catch (_) {}
        }
        return idx + 1;
      }
      setQueue((q) => {
        if (q.length > 0) {
          const [next, ...rest] = q;
          if (next) {
            setCurrentVideo(next);
            setWatchHistory((h) => {
              const n = [...h, next];
              setCurrentHistoryIndex(n.length - 1);
              return n;
            });
            try {
              playerRef.current?.loadVideoById(getVideoId(next));
            } catch (_) {}
          }
          return rest;
        }
        return q;
      });
      return idx;
    });
  }, [watchHistory]);

  const playPrev = useCallback(() => {
    setCurrentHistoryIndex((idx) => {
      if (idx > 0) {
        const prev = watchHistory[idx - 1];
        if (prev) {
          setCurrentVideo(prev);
          try {
            playerRef.current?.loadVideoById(getVideoId(prev));
          } catch (_) {}
        }
        return idx - 1;
      }
      return idx;
    });
  }, [watchHistory]);

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
        playerRef,
        isYTReady,
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
