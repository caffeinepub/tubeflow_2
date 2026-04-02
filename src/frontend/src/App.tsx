import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Home, ListMusic, Search, Settings, ZapOff } from "lucide-react";
import { useEffect } from "react";
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
    audioRef,
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
    playNext,
    saveResumeTimestamp,
    pendingResumeTime,
  } = useApp();

  // Keyboard shortcuts
  // biome-ignore lint/correctness/useExhaustiveDependencies: setIsPlaying and playNext are stable refs, intentionally omitted
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const audio = audioRef.current;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (!audio) break;
          if (!audio.paused) {
            audio.pause();
          } else {
            audio.play().catch(() => {});
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (audio) audio.currentTime = Math.max(0, audio.currentTime - 5);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (audio)
            audio.currentTime = Math.min(
              audio.duration || 0,
              audio.currentTime + 5,
            );
          break;
        case "l":
        case "L":
          setLoop(!loop);
          toast(loop ? "Loop off" : "Loop on \uD83D\uDD01", { duration: 1500 });
          break;
        case "f":
        case "F":
          setFocusMode(!focusMode);
          toast(focusMode ? "Focus mode off" : "Focus mode on \uD83C\uDFAF", {
            duration: 1500,
          });
          break;
        case "m":
        case "M":
          if (audio) audio.muted = !audio.muted;
          break;
        case "b":
        case "B":
          if (currentVideo && audio) {
            const t = audio.currentTime;
            const vid = getVideoId(currentVideo);
            const m = Math.floor(t / 60);
            const s = Math.floor(t % 60);
            addBookmark(vid, t, `${m}:${s.toString().padStart(2, "0")}`);
            toast.success("Bookmark added \uD83D\uDD16", { duration: 1500 });
          }
          break;
        case "[":
          if (audio) {
            const a = audio.currentTime;
            setAbLoop(
              abLoop
                ? { ...abLoop, start: a }
                : { start: a, end: audio.duration || a + 30 },
            );
            toast("A-point set", { duration: 1500 });
          }
          break;
        case "]":
          if (audio) {
            const b = audio.currentTime;
            setAbLoop(abLoop ? { ...abLoop, end: b } : { start: 0, end: b });
            toast("B-point set", { duration: 1500 });
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    audioRef,
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
      {/* Hidden audio element — biome-ignore lint/a11y/useMediaCaption: audio is background music player, captions not applicable */}
      {/* biome-ignore lint/a11y/useMediaCaption: intentional */}
      <audio
        ref={audioRef}
        style={{ display: "none" }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (loop && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          } else {
            playNext();
          }
        }}
        onCanPlay={() => {
          const audio = audioRef.current;
          if (!audio) return;
          const resumeAt = pendingResumeTime.current;
          if (resumeAt && resumeAt > 5) {
            pendingResumeTime.current = null;
            audio.currentTime = resumeAt;
            const mins = Math.floor(resumeAt / 60);
            const secs = Math.floor(resumeAt % 60);
            toast(`Resumed from ${mins}:${secs.toString().padStart(2, "0")}`, {
              duration: 2500,
            });
          }
        }}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio || !currentVideo) return;
          const ct = audio.currentTime;
          if (ct > 5) {
            saveResumeTimestamp(getVideoId(currentVideo), ct);
          }
        }}
      />

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
