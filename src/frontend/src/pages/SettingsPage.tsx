import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Gauge,
  Keyboard,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { usePreference, useSavePreference } from "../hooks/useQueries";

const ACCENT_PRESETS = [
  { label: "Green", value: "#19C37D" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Red", value: "#EF4444" },
  { label: "Orange", value: "#F97316" },
  { label: "Pink", value: "#EC4899" },
  { label: "Cyan", value: "#06B6D4" },
];
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SHORTCUTS = [
  { key: "Space", desc: "Play / Pause" },
  { key: "← / →", desc: "Seek -5s / +5s" },
  { key: "↑ / ↓", desc: "Volume +10 / -10" },
  { key: "L", desc: "Toggle Loop" },
  { key: "F", desc: "Toggle Focus Mode" },
  { key: "M", desc: "Mute / Unmute" },
  { key: "B", desc: "Bookmark current time" },
  { key: "[", desc: "Set A-B loop start" },
  { key: "]", desc: "Set A-B loop end" },
];

function SectionHeader({
  icon: Icon,
  title,
}: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4" style={{ color: "var(--tube-accent)" }} />
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
    </div>
  );
}

export function SettingsPage() {
  const {
    accentColor,
    setAccentColor,
    playbackSpeed,
    setPlaybackSpeed,
    setPreferencesLoaded,
    studyTimerDuration,
    setStudyTimerDuration,
    sleepTimerMinutes,
    setSleepTimer,
  } = useApp();
  const [localAccent, setLocalAccent] = useState(accentColor);
  const [localSpeed, setLocalSpeed] = useState(playbackSpeed);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: pref } = usePreference();
  const { mutateAsync: savePreference, isPending } = useSavePreference();

  useEffect(() => {
    setLocalAccent(accentColor);
  }, [accentColor]);
  useEffect(() => {
    setLocalSpeed(playbackSpeed);
  }, [playbackSpeed]);

  const handleSave = async () => {
    setAccentColor(localAccent);
    setPlaybackSpeed(localSpeed);
    setPreferencesLoaded(true);
    try {
      await savePreference({
        accentColor: localAccent,
        playbackSpeed: localSpeed,
        exists: !!pref,
      });
      toast.success("Settings saved!");
    } catch (_) {
      toast.error("Saved locally (backend error).");
    }
  };

  const handleRefresh = async () => {
    // Save first, then reload so all changes apply immediately
    setIsRefreshing(true);
    setAccentColor(localAccent);
    setPlaybackSpeed(localSpeed);
    setPreferencesLoaded(true);
    try {
      await savePreference({
        accentColor: localAccent,
        playbackSpeed: localSpeed,
        exists: !!pref,
      });
    } catch (_) {
      // ignore backend errors, still refresh
    }
    toast.success("Refreshing app...");
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="pb-8" data-ocid="settings.section">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-base font-bold text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          No API key needed — powered by Invidious
        </p>
      </div>

      <div className="px-4 space-y-8">
        {/* Accent */}
        <section>
          <SectionHeader icon={Palette} title="Accent Color" />
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                data-ocid="settings.accent.button"
                onClick={() => setLocalAccent(preset.value)}
                className="w-9 h-9 rounded-full transition-all hover:scale-110 relative flex-shrink-0"
                style={{ background: preset.value }}
              >
                {localAccent === preset.value && (
                  <CheckCircle2 className="w-4 h-4 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
            <input
              type="color"
              value={localAccent}
              onChange={(e) => setLocalAccent(e.target.value)}
              className="w-9 h-9 rounded-full cursor-pointer border border-border bg-transparent"
              data-ocid="settings.accent.input"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Preview:</span>
            <span
              className="text-xs font-semibold"
              style={{ color: localAccent }}
            >
              TubeFlow
            </span>
          </div>
        </section>

        <Separator />

        {/* Speed */}
        <section>
          <SectionHeader icon={Gauge} title="Default Playback Speed" />
          <div
            className="flex flex-wrap gap-2"
            data-ocid="settings.speed.select"
          >
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                data-ocid="settings.speed.toggle"
                onClick={() => setLocalSpeed(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                )}
                style={
                  localSpeed === s
                    ? {
                        background: "var(--tube-accent)",
                        borderColor: "var(--tube-accent)",
                        color: "black",
                      }
                    : {
                        borderColor: "oklch(0.22 0.005 260)",
                        color: "oklch(0.65 0.009 240)",
                      }
                }
              >
                {s}x
              </button>
            ))}
          </div>
        </section>

        <Separator />

        {/* Study Tools */}
        <section>
          <SectionHeader icon={BookOpen} title="Study Tools" />
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Default Study Duration
              </Label>
              <div className="flex gap-2 flex-wrap">
                {[15, 25, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-ocid="settings.study.duration.toggle"
                    onClick={() =>
                      setStudyTimerDuration({ ...studyTimerDuration, study: m })
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={
                      studyTimerDuration.study === m
                        ? {
                            background: "var(--tube-accent)",
                            borderColor: "var(--tube-accent)",
                            color: "black",
                          }
                        : {
                            borderColor: "oklch(0.22 0.005 260)",
                            color: "oklch(0.65 0.009 240)",
                          }
                    }
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Default Break Duration
              </Label>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15].map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-ocid="settings.break.duration.toggle"
                    onClick={() =>
                      setStudyTimerDuration({
                        ...studyTimerDuration,
                        breakTime: m,
                      })
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={
                      studyTimerDuration.breakTime === m
                        ? {
                            background: "var(--tube-accent)",
                            borderColor: "var(--tube-accent)",
                            color: "black",
                          }
                        : {
                            borderColor: "oklch(0.22 0.005 260)",
                            color: "oklch(0.65 0.009 240)",
                          }
                    }
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Default Sleep Timer
              </Label>
              <div className="flex gap-2 flex-wrap">
                {[null, 15, 30, 60].map((m) => (
                  <button
                    key={String(m)}
                    type="button"
                    data-ocid="settings.sleep.toggle"
                    onClick={() => setSleepTimer(m)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={
                      sleepTimerMinutes === m
                        ? {
                            background: "var(--tube-accent)",
                            borderColor: "var(--tube-accent)",
                            color: "black",
                          }
                        : {
                            borderColor: "oklch(0.22 0.005 260)",
                            color: "oklch(0.65 0.009 240)",
                          }
                    }
                  >
                    {m === null ? "Off" : `${m} min`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Keyboard Shortcuts */}
        <section data-ocid="settings.shortcuts.section">
          <SectionHeader icon={Keyboard} title="Keyboard Shortcuts" />
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "oklch(0.15 0.005 260)" }}
          >
            {SHORTCUTS.map((s, i) => (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between px-4 py-3 text-sm",
                  i < SHORTCUTS.length - 1 && "border-b border-border",
                )}
              >
                <span className="text-muted-foreground">{s.desc}</span>
                <kbd
                  className="px-2 py-0.5 rounded text-xs font-mono font-semibold"
                  style={{
                    background: "oklch(0.22 0.005 260)",
                    color: "var(--tube-accent)",
                  }}
                >
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Appearance note */}
        <section>
          <SectionHeader icon={Moon} title="Appearance" />
          <div
            className="rounded-2xl p-4"
            style={{ background: "oklch(0.15 0.005 260)" }}
          >
            <p className="text-xs text-muted-foreground">
              TubeFlow uses a dark theme optimised for extended video watching
              sessions. Change your accent color above to personalise the look.
            </p>
          </div>
        </section>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <Button
            data-ocid="settings.save.submit_button"
            onClick={handleSave}
            disabled={isPending || isRefreshing}
            className="w-full text-black font-bold py-3 rounded-2xl"
            style={{ background: "var(--tube-accent)" }}
          >
            {isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Settings
              </>
            )}
          </Button>

          <Button
            data-ocid="settings.refresh.button"
            onClick={handleRefresh}
            disabled={isPending || isRefreshing}
            variant="secondary"
            className="w-full font-bold py-3 rounded-2xl"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />{" "}
                Refreshing...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" /> Save &amp; Refresh App
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-2">
          © {new Date().getFullYear()}. Built with ❤ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
