import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Home, ListMusic, Search, Settings, ZapOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { BottomPlayer } from "./components/BottomPlayer";
import { ExpandedPlayer } from "./components/ExpandedPlayer";
import { AppProvider, useApp } from "./context/AppContext";
import { usePreference } from "./hooks/useQueries";
import { HomePage } from "./pages/HomePage";
import { QueuePage } from "./pages/QueuePage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WatchPage } from "./pages/WatchPage";
import { getVideoId } from "./types/youtube";

function YouTubeManager() {
  const {
    currentVideo,
    isYTReady,
    playerRef,
    setIsPlaying,
    playbackSpeed,
    volume,
    loop,
    playNext,
  } = useApp();
  const lastVideoId = useRef<string | null>(null);
  const playerCreated = useRef(false);

  useEffect(() => {
    if (!isYTReady || !currentVideo) return;
    const videoId = getVideoId(currentVideo);
    if (!videoId) return;

    if (!playerCreated.current) {
      playerCreated.current = true;
      lastVideoId.current = videoId;
      try {
        playerRef.current = new window.YT.Player("yt-player", {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              e.target.setPlaybackRate(playbackSpeed);
              e.target.setVolume(volume);
              setIsPlaying(true);
            },
            onStateChange: (e) => {
              const playing = e.data === window.YT.PlayerState.PLAYING;
              setIsPlaying(playing);
              if (e.data === window.YT.PlayerState.ENDED) {
                if (loop) {
                  try {
                    playerRef.current?.seekTo(0, true);
                    playerRef.current?.playVideo();
                  } catch (_) {}
                } else {
                  playNext();
                }
              }
            },
          },
        });
      } catch (_) {
        playerCreated.current = false;
      }
    } else if (videoId !== lastVideoId.current) {
      lastVideoId.current = videoId;
      try {
        playerRef.current?.loadVideoById(videoId);
        playerRef.current?.setPlaybackRate(playbackSpeed);
        setIsPlaying(true);
      } catch (_) {}
    }
  }, [
    isYTReady,
    currentVideo,
    playerRef,
    setIsPlaying,
    playbackSpeed,
    volume,
    loop,
    playNext,
  ]);

  return null;
}

function PreferenceLoader() {
  const { setAccentColor, setPlaybackSpeed, setPreferencesLoaded } = useApp();
  const { data: pref, isSuccess } = usePreference();

  useEffect(() => {
    if (isSuccess) {
      if (pref) {
        if (pref.accentColor) setAccentColor(pref.accentColor);
        if (pref.playbackSpeed) setPlaybackSpeed(pref.playbackSpeed);
      }
      setPreferencesLoaded(true);
    }
  }, [pref, isSuccess, setAccentColor, setPlaybackSpeed, setPreferencesLoaded]);

  return null;
}

const NAV_ITEMS = [
  { id: "home" as const, icon: Home, label: "Home" },
  { id: "search" as const, icon: Search, label: "Search" },
  { id: "queue" as const, icon: ListMusic, label: "Queue" },
  { id: "settings" as const, icon: Settings, label: "Settings" },
];

function AppShell() {
  const {
    page,
    setPage,
    currentVideo,
    playerRef,
    setIsPlaying,
    addBookmark,
    loop,
    setLoop,
    focusMode,
    setFocusMode,
    setAbLoop,
    abLoop,
    playerExpanded,
    setPlayerExpanded,
  } = useApp();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const p = playerRef.current;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (!p) break;
          try {
            const state = p.getPlayerState();
            if (state === window.YT?.PlayerState?.PLAYING) {
              p.pauseVideo();
              setIsPlaying(false);
            } else {
              p.playVideo();
              setIsPlaying(true);
            }
          } catch (_) {}
          break;
        case "ArrowLeft":
          e.preventDefault();
          try {
            p?.seekTo(Math.max(0, p.getCurrentTime() - 5), true);
          } catch (_) {}
          break;
        case "ArrowRight":
          e.preventDefault();
          try {
            p?.seekTo(p.getCurrentTime() + 5, true);
          } catch (_) {}
          break;
        case "ArrowUp":
          e.preventDefault();
          try {
            const v = Math.min(100, p?.getVolume() ?? 0 + 10);
            p?.setVolume(v);
          } catch (_) {}
          break;
        case "ArrowDown":
          e.preventDefault();
          try {
            const v = Math.max(0, p?.getVolume() ?? 100 - 10);
            p?.setVolume(v);
          } catch (_) {}
          break;
        case "l":
        case "L":
          setLoop(!loop);
          toast(loop ? "Loop off" : "Loop on 🔁", { duration: 1500 });
          break;
        case "f":
        case "F":
          setFocusMode(!focusMode);
          toast(focusMode ? "Focus mode off" : "Focus mode on 🎯", {
            duration: 1500,
          });
          break;
        case "m":
        case "M":
          try {
            if (p?.isMuted()) p.unMute();
            else p?.mute();
          } catch (_) {}
          break;
        case "b":
        case "B":
          if (currentVideo && p) {
            const t = p.getCurrentTime();
            const vid =
              typeof currentVideo.id === "string"
                ? currentVideo.id
                : currentVideo.id.videoId;
            const m = Math.floor(t / 60);
            const s = Math.floor(t % 60);
            addBookmark(vid, t, `${m}:${s.toString().padStart(2, "0")}`);
            toast.success("Bookmark added 🔖", { duration: 1500 });
          }
          break;
        case "[":
          if (p) {
            const a = p.getCurrentTime();
            setAbLoop(
              abLoop
                ? { ...abLoop, start: a }
                : { start: a, end: p.getDuration() || a + 30 },
            );
            toast("A-point set", { duration: 1500 });
          }
          break;
        case "]":
          if (p) {
            const b = p.getCurrentTime();
            setAbLoop(abLoop ? { ...abLoop, end: b } : { start: 0, end: b });
            toast("B-point set", { duration: 1500 });
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    playerRef,
    setIsPlaying,
    loop,
    setLoop,
    focusMode,
    setFocusMode,
    currentVideo,
    addBookmark,
    abLoop,
    setAbLoop,
  ]);

  return (
    <>
      {/* Outer dark gradient bg */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.07 0.008 260) 0%, oklch(0.10 0.005 290) 100%)",
        }}
      />

      {/* Mobile shell */}
      <div className="mobile-shell">
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 flex-shrink-0 border-b border-border"
          style={{
            height: "56px",
            background: "oklch(0.12 0.005 260 / 0.95)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--tube-accent)" }}
            >
              <ZapOff className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-base font-bold text-foreground tracking-tight">
              TubeFlow
            </span>
          </div>
          <div className="flex items-center gap-1">
            {currentVideo && (
              <button
                type="button"
                onClick={() => setPlayerExpanded(true)}
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{
                  background: "oklch(0.19 0.005 260)",
                  color: "var(--tube-accent)",
                }}
                data-ocid="header.player.button"
              >
                Now Playing
              </button>
            )}
          </div>
        </header>

        {/* Pages */}
        <main className="flex-1 min-h-0 overflow-hidden relative">
          <div
            style={{ display: page === "home" ? "block" : "none" }}
            className="h-full overflow-y-auto page-enter"
            data-ocid="home.page"
          >
            <HomePage />
          </div>
          <div
            style={{ display: page === "search" ? "block" : "none" }}
            className="h-full overflow-y-auto"
            data-ocid="search.page"
          >
            <SearchPage />
          </div>
          <div
            style={{ display: page === "watch" ? "flex" : "none" }}
            className="flex-col h-full overflow-y-auto"
            data-ocid="watch.page"
          >
            <WatchPage />
          </div>
          <div
            style={{ display: page === "queue" ? "block" : "none" }}
            className="h-full overflow-y-auto"
            data-ocid="queue.page"
          >
            <QueuePage />
          </div>
          <div
            style={{ display: page === "settings" ? "block" : "none" }}
            className="h-full overflow-y-auto"
            data-ocid="settings.page"
          >
            <SettingsPage />
          </div>
        </main>

        {/* Mini player bar */}
        {currentVideo && !playerExpanded && <BottomPlayer />}

        {/* Bottom nav */}
        <nav
          className="flex-shrink-0 flex items-stretch border-t border-border bottom-nav"
          style={{
            height: "60px",
            background: "oklch(0.11 0.005 260 / 0.96)",
            backdropFilter: "blur(16px)",
          }}
          data-ocid="nav.panel"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-ocid={`nav.${item.id}.link`}
                onClick={() => setPage(item.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 transition-all",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon
                  className="w-5 h-5"
                  style={isActive ? { color: "var(--tube-accent)" } : {}}
                />
                <span
                  className="text-[10px] font-semibold"
                  style={isActive ? { color: "var(--tube-accent)" } : {}}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Expanded player overlay */}
      {currentVideo && (
        <div
          className={cn(
            "fixed inset-0 z-50 transition-transform duration-300 ease-in-out",
            playerExpanded ? "translate-y-0" : "translate-y-full",
          )}
          style={{ maxWidth: "430px", margin: "0 auto" }}
        >
          <ExpandedPlayer onClose={() => setPlayerExpanded(false)} />
        </div>
      )}

      <YouTubeManager />
      <PreferenceLoader />
      <Toaster position="top-center" />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
