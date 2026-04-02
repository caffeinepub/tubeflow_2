import { Button } from "@/components/ui/button";
import { GripVertical, ListMusic, Play, Trash2 } from "lucide-react";
import { VideoCard } from "../components/VideoCard";
import { useApp } from "../context/AppContext";
import { getVideoId } from "../types/youtube";

export function QueuePage() {
  const { queue, removeFromQueue, watchVideo } = useApp();

  const handlePlayAll = () => {
    if (queue.length === 0) return;
    watchVideo(queue[0]!);
  };

  return (
    <div className="flex flex-col h-full" data-ocid="queue.section">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ListMusic
            className="w-4 h-4"
            style={{ color: "var(--tube-accent)" }}
          />
          <h1 className="text-sm font-bold text-foreground">Up Next</h1>
          {queue.length > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--tube-accent)", color: "black" }}
            >
              {queue.length}
            </span>
          )}
        </div>
        {queue.length > 0 && (
          <Button
            size="sm"
            onClick={handlePlayAll}
            className="text-black font-semibold text-xs px-3 h-8"
            style={{ background: "var(--tube-accent)" }}
            data-ocid="queue.play_all.button"
          >
            <Play className="w-3 h-3 mr-1" /> Play All
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {queue.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            data-ocid="queue.empty_state"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.18 0.005 260)" }}
            >
              <ListMusic className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">
                Queue is empty
              </p>
              <p className="text-xs text-muted-foreground">
                Tap the ⋮ menu on any video to add it here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1" data-ocid="queue.list">
            {queue.map((video, i) => (
              <div
                key={getVideoId(video)}
                className="flex items-center gap-1"
                data-ocid={`queue.item.${i + 1}`}
              >
                <div className="text-muted-foreground flex-shrink-0">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <VideoCard video={video} compact index={i + 1} />
                </div>
                <button
                  type="button"
                  data-ocid={`queue.delete_button.${i + 1}`}
                  onClick={() => removeFromQueue(getVideoId(video))}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive flex-shrink-0 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
