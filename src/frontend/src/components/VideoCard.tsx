import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Copy, ListPlus, MoreVertical, Play } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import {
  type YouTubeVideoItem,
  formatSeconds,
  formatTimeAgo,
  formatViews,
  getThumbnail,
  getVideoId,
  parseDuration,
} from "../types/youtube";

interface VideoCardProps {
  video: YouTubeVideoItem;
  compact?: boolean;
  index?: number;
}

export function VideoCard({
  video,
  compact = false,
  index = 1,
}: VideoCardProps) {
  const { watchVideo, currentVideo, addToQueue } = useApp();
  const videoId = getVideoId(video);
  const thumb = getThumbnail(video);
  const isActive = currentVideo ? getVideoId(currentVideo) === videoId : false;
  const durationSecs = parseDuration(video.contentDetails?.duration);
  const durationStr = durationSecs > 0 ? formatSeconds(durationSecs) : null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://youtu.be/${videoId}`);
    toast.success("Link copied!");
  };

  if (compact) {
    return (
      <div
        className="flex gap-2 w-full group"
        data-ocid={`video.item.${index}`}
      >
        <button
          type="button"
          onClick={() => watchVideo(video)}
          className="flex gap-2 flex-1 text-left p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <div className="relative w-24 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
            {thumb && (
              <img
                src={thumb}
                alt={video.snippet.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
            {durationStr && (
              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1 py-0.5 rounded">
                {durationStr}
              </span>
            )}
            {isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug mb-0.5">
              {video.snippet.title}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {video.snippet.channelTitle}
            </p>
            {video.statistics?.viewCount && (
              <p className="text-xs text-muted-foreground">
                {formatViews(video.statistics.viewCount)}
              </p>
            )}
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground flex-shrink-0 self-center"
              data-ocid={`video.item.${index}.dropdown_menu`}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => addToQueue(video)}
              data-ocid={`video.item.${index}.queue.button`}
            >
              <ListPlus className="w-4 h-4 mr-2" /> Add to Queue
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCopyLink}
              data-ocid={`video.item.${index}.copy.button`}
            >
              <Copy className="w-4 h-4 mr-2" /> Copy Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="group w-full" data-ocid={`video.item.${index}`}>
      <div className="relative">
        <button
          type="button"
          onClick={() => watchVideo(video)}
          className="w-full text-left"
        >
          <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary mb-2">
            {thumb ? (
              <img
                src={thumb}
                alt={video.snippet.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {durationStr && (
              <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {durationStr}
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/60">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
            </div>
            {isActive && (
              <div
                className="absolute inset-0 rounded-xl border-2"
                style={{ borderColor: "var(--tube-accent)" }}
              />
            )}
          </div>
          <div className="px-0.5">
            <h3
              className={cn(
                "text-xs font-semibold text-foreground line-clamp-2 leading-snug mb-1",
                isActive && "",
              )}
              style={isActive ? { color: "var(--tube-accent)" } : {}}
            >
              {video.snippet.title}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {video.snippet.channelTitle}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              {video.statistics?.viewCount && (
                <span>{formatViews(video.statistics.viewCount)}</span>
              )}
              {video.statistics?.viewCount && video.snippet.publishedAt && (
                <span>·</span>
              )}
              {video.snippet.publishedAt && (
                <span>{formatTimeAgo(video.snippet.publishedAt)}</span>
              )}
            </div>
          </div>
        </button>
        {/* Context menu */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white"
                data-ocid={`video.item.${index}.dropdown_menu`}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => addToQueue(video)}
                data-ocid={`video.item.${index}.queue.button`}
              >
                <ListPlus className="w-4 h-4 mr-2" /> Add to Queue
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleCopyLink}
                data-ocid={`video.item.${index}.copy.button`}
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
