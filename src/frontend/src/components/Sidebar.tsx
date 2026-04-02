import { cn } from "@/lib/utils";
import { Home, Search, Settings, Tv2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { Page } from "../types/youtube";

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { page, setPage } = useApp();

  return (
    <aside
      className="flex flex-col w-56 flex-shrink-0 border-r border-border"
      style={{ background: "oklch(0.16 0.004 250)" }}
    >
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--tube-accent)" }}
        >
          <Tv2 className="w-4 h-4 text-black" />
        </div>
        <span className="text-foreground font-bold text-lg tracking-tight">
          TubeFlow
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = page === id || (page === "watch" && id === "home");
          return (
            <button
              key={id}
              type="button"
              data-ocid={`nav.${id}.link`}
              onClick={() => setPage(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? ""
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
              style={
                isActive
                  ? {
                      background: "oklch(0.21 0.004 250)",
                      color: "var(--tube-accent)",
                    }
                  : {}
              }
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={isActive ? { color: "var(--tube-accent)" } : {}}
              />
              <span style={isActive ? { color: "white" } : {}}>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️{" "}
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
    </aside>
  );
}
