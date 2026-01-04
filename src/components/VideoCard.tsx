import type { MouseEvent } from 'react';
import { Video } from '@/types/video';
import { Badge } from '@/components/ui/badge';
import { Eye, ThumbsUp, MessageCircle, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatCompactNumber } from '@/lib/formatters';

interface VideoCardProps {
  video: Video;
  index: number;
  avgViews: number;
}

// Human-readable relative publish date.
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Convert ISO 8601 YouTube duration (PT#H#M#S) to clock time.
function parseDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

type PerformanceBadge = { label: string; variant: 'default' | 'secondary' | 'outline' } | null;

const cardBaseClassName =
  'group overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_40px_hsl(190_100%_50%_/_0.15)]';
const thumbnailLinkClassName = 'relative block aspect-video overflow-hidden';
const thumbnailImageClassName =
  'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105';
const durationBadgeClassName = 'absolute bottom-2 right-2 rounded bg-background/90 px-2 py-1 text-xs font-medium';
const hoverOverlayClassName =
  'absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20';
const hoverIconClassName =
  'h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100';
const contentClassName = 'p-4';
const titleClassName =
  'mb-3 line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary hover:underline';
const statsGridClassName = 'grid grid-cols-2 gap-3 text-sm';
const statsItemClassName = 'flex items-center gap-2 text-muted-foreground';
const performanceSectionClassName = 'mt-4 border-t border-border pt-4';
const performanceLabelClassName = 'text-xs text-muted-foreground';
const progressTrackClassName = 'mt-2 h-2 overflow-hidden rounded-full bg-secondary';
const progressFillBaseClassName = 'h-full rounded-full transition-all duration-500';
const performanceMetaClassName = 'mt-2 flex items-center justify-between text-xs text-muted-foreground';

export function VideoCard({ video, index, avgViews }: VideoCardProps) {
  const performanceMultiplier = avgViews > 0 ? video.views / avgViews : 1;
  const isViral = performanceMultiplier >= 3;
  const isOverperforming = performanceMultiplier >= 1.5;

  const getPerformanceBadge = (multiplier: number): PerformanceBadge => {
    if (multiplier >= 3) return { label: `${multiplier.toFixed(1)}x 🔥`, variant: 'default' };
    if (multiplier >= 2) return { label: `${multiplier.toFixed(1)}x ⚡`, variant: 'secondary' };
    if (multiplier >= 1.5) return { label: `${multiplier.toFixed(1)}x ↑`, variant: 'outline' };
    return null;
  };

  const badge = getPerformanceBadge(performanceMultiplier);
  const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
  const performanceBorderClassName = isViral
    ? 'border-primary/30 ring-2 ring-primary/50'
    : isOverperforming
      ? 'border-primary/20'
      : 'border-border';
  const performanceTextClassName = isViral
    ? 'text-primary'
    : isOverperforming
      ? 'text-success'
      : 'text-muted-foreground';
  const progressFillClassName = isViral
    ? 'bg-gradient-to-r from-primary to-cyan-400'
    : isOverperforming
      ? 'bg-success'
      : 'bg-muted-foreground';

  const handleOpenVideo = (e: MouseEvent<HTMLAnchorElement>) => {
    // Prevent the iframe from navigating (which can show "refused to connect" in preview).
    e.preventDefault();

    const opened = window.open(videoUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      void navigator.clipboard?.writeText(videoUrl);
      toast.info('Popup blocked in preview — video link copied.');
    }
  };

  return (
    <div
      className={`${cardBaseClassName} ${performanceBorderClassName}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Thumbnail */}
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleOpenVideo}
        className={thumbnailLinkClassName}
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          decoding="async"
          className={thumbnailImageClassName}
        />
        <div className={durationBadgeClassName}>
          {parseDuration(video.duration)}
        </div>

        {/* Performance Badge */}
        {badge && (
          <div className="absolute top-2 left-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        )}

        {/* Hover overlay */}
        <div className={hoverOverlayClassName}>
          <ExternalLink className={hoverIconClassName} />
        </div>
      </a>

      {/* Content */}
      <div className={contentClassName}>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenVideo}
        >
          <h3 className={titleClassName}>
            {video.title}
          </h3>
        </a>

        {/* Stats Grid */}
        <div className={statsGridClassName}>
          <div className={statsItemClassName}>
            <Eye className="h-4 w-4" />
            <span>{formatCompactNumber(video.views)}</span>
          </div>
          <div className={statsItemClassName}>
            <ThumbsUp className="h-4 w-4" />
            <span>{formatCompactNumber(video.likes)}</span>
          </div>
          <div className={statsItemClassName}>
            <MessageCircle className="h-4 w-4" />
            <span>{formatCompactNumber(video.comments)}</span>
          </div>
          <div className={statsItemClassName}>
            <Clock className="h-4 w-4" />
            <span>{formatDate(video.publishedAt)}</span>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className={performanceSectionClassName}>
          <div className="flex items-center justify-between">
            <span className={performanceLabelClassName}>Performance vs Average</span>
            <span className={`text-sm font-bold ${performanceTextClassName}`}>
              {performanceMultiplier.toFixed(1)}x
            </span>
          </div>
          <div className={progressTrackClassName}>
            <div
              className={`${progressFillBaseClassName} ${progressFillClassName}`}
              style={{ 
                width: `${Math.min(performanceMultiplier * 10, 100)}%` 
              }}
            />
          </div>
          <div className={performanceMetaClassName}>
            <span>{video.engagementRate}% engagement</span>
            <span>Avg: {formatCompactNumber(avgViews)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
