import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Loader2,
  TrendingUp,
  Clock,
  Eye,
  ThumbsUp,
  MessageSquare,
  ExternalLink,
  Film,
  Smartphone,
  Users,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trendFinder } from "@/lib/youtubeApi";
import { toast } from "sonner";
import { formatCompactNumber } from "@/lib/formatters";

interface TrendVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  channelId: string;
  channelSubscribers?: number;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  isVertical: boolean;
  shortsChecked?: boolean;
  performanceScore: number;
  engagementRate: number;
}

const timeRanges = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
];

const formatTypes = [
  { value: "all", label: "All Videos", icon: null },
  { value: "shorts", label: "Shorts Only", icon: Smartphone },
  { value: "longform", label: "Longform Only", icon: Film },
];

const channelSizes = [
  { value: "all", label: "All Channels" },
  { value: "large", label: "Large Channels (>100k)" },
  { value: "medium", label: "Medium Channels (10k-100k)" },
  { value: "small", label: "Small Channels (<10k)" },
];

const scoreModes = [
  { value: "channel", label: "Channel Average" },
  { value: "topic", label: "Topic Average" },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function getPerformanceBadge(score: number): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
} {
  if (score >= 3) return { label: `${score.toFixed(1)}x 🔥`, variant: "default" };
  if (score >= 2) return { label: `${score.toFixed(1)}x ⚡`, variant: "secondary" };
  if (score >= 1.5) return { label: `${score.toFixed(1)}x ↑`, variant: "outline" };
  return { label: `${score.toFixed(1)}x`, variant: "outline" };
}

function matchesChannelSize(subscribers: number | undefined, channelSize: string): boolean {
  if (channelSize === "all") return true;
  if (typeof subscribers !== "number") return false;
  if (channelSize === "large") return subscribers > 100000;
  if (channelSize === "medium") return subscribers >= 10000 && subscribers <= 100000;
  if (channelSize === "small") return subscribers < 10000;
  return true;
}

const TrendFinder = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [timeRange, setTimeRange] = useState("7d");
  const [formatType, setFormatType] = useState("all");
  const [channelSize, setChannelSize] = useState("all");
  const [scoreMode, setScoreMode] = useState("channel");
  const [isSearching, setIsSearching] = useState(false);
  const [videos, setVideos] = useState<TrendVideo[]>([]);
  const [avgViews, setAvgViews] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const lastCheckedKeyRef = useRef<string>("");

  const shortsCacheKey = "shorts_status_cache_v1";
  const shortsCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

  const readShortsCache = () => {
    try {
      const raw = localStorage.getItem(shortsCacheKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeShortsCache = (cache: Record<string, { v: boolean; t: number }>) => {
    try {
      localStorage.setItem(shortsCacheKey, JSON.stringify(cache));
    } catch {
      // Ignore storage errors.
    }
  };

  const handleSearch = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsSearching(true);
    try {
      const data = await trendFinder({
        topic: topic.trim(),
        timeRange: timeRange as any,
        maxResults: 100,
        formatType: formatType as any,
        channelSize: channelSize as any,
        scoreMode: scoreMode as any,
      });

      const incomingVideos = data.videos;
      setVideos(incomingVideos);
      setAvgViews(data.avgViews);
      setHasSearched(true);

      const ids = incomingVideos.map((video) => video.id);
      const key = ids.join(',');
      lastCheckedKeyRef.current = key;
      void runShortsBatch(ids);
      toast.success(`Found ${data.videos.length} trending videos`);
    } catch (err) {
      console.error("Search error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to find trends");
    } finally {
      setIsSearching(false);
    }
  };

  const videoIds = useMemo(() => videos.map((video) => video.id), [videos]);
  const videoIdsKey = useMemo(() => videoIds.join(","), [videoIds]);


  const runShortsBatch = async (ids: string[]) => {
    if (ids.length == 0) return;
    try {
      const response = await fetch('/api/shorts-check-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.results) return;

      const cache = readShortsCache();
      const updated = { ...cache };
      Object.entries(data.results).forEach(([id, flag]) => {
        if (typeof flag === 'boolean') {
          updated[id] = { v: flag, t: Date.now() };
        }
      });
      writeShortsCache(updated);

      setVideos((prev) =>
        prev.map((video) => {
          const flag = data.results[video.id];
          if (typeof flag !== 'boolean') return video;
          return { ...video, isVertical: flag, shortsChecked: true };
        })
      );
    } catch {
      // Ignore batch errors; fallback to heuristic results.
    }
  };

  const openYouTubeVideo = (videoId: string) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const opened = window.open(url, "_blank", "noopener,noreferrer");

    // In the editor preview, popups can be blocked; copy the link as fallback.
    if (!opened) {
      void navigator.clipboard?.writeText(url);
      toast.info("Popup blocked in preview — video link copied.");
    }
  };

  // Filter videos by format type and channel size
  const filteredVideos = useMemo(() => {
    let result = videos;
    if (formatType === "shorts") result = result.filter((v) => v.shortsChecked ? v.isVertical : true);
    if (formatType === "longform") result = result.filter((v) => v.shortsChecked ? !v.isVertical : true);
    if (channelSize !== "all") {
      result = result.filter((v) => matchesChannelSize(v.channelSubscribers, channelSize));
    }
    return result;
  }, [videos, formatType, channelSize]);

  useEffect(() => {
    if (videoIds.length === 0) return;
    const key = videoIdsKey;
    if (lastCheckedKeyRef.current === key) return;

    const now = Date.now();
    const cache = readShortsCache();
    const missing: string[] = [];

    setVideos((prev) =>
      prev.map((video) => {
        const cached = cache[video.id];
        if (cached && now - cached.t < shortsCacheTtlMs) {
          return { ...video, isVertical: cached.v, shortsChecked: true };
        }
        missing.push(video.id);
        return { ...video, shortsChecked: false };
      })
    );

    lastCheckedKeyRef.current = key;
    void runShortsBatch(missing);
  }, [videoIdsKey]);

  const overperformingVideos = filteredVideos.filter((v) => v.performanceScore >= 1.5);

  return (
    <Layout>
      <div className="py-16">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Trend Finder</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Find Overperforming Videos</h1>
          {formatType !== "all" && videos.some((v) => !v.shortsChecked) && (
            <p className="text-xs text-muted-foreground">Verifying Shorts vs Longform…</p>
          )}
          <p className="text-muted-foreground">Enter a topic to discover videos that are outperforming the average</p>
        </div>

        <Card className="glass-card mb-8 max-w-3xl mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <Input
                placeholder="Enter a topic (e.g., 'AI tutorials', 'cooking tips')..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full text-lg py-6"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-full sm:w-44">
                    <Clock className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={formatType} onValueChange={setFormatType}>
                  <SelectTrigger className="w-full sm:w-44">
                    <Film className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formatTypes.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={channelSize} onValueChange={setChannelSize}>
                  <SelectTrigger className="w-full sm:w-52">
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelSizes.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={scoreMode} onValueChange={setScoreMode}>
                  <SelectTrigger className="w-full sm:w-48">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scoreModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} disabled={isSearching} size="lg" className="px-8">
                  {isSearching ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Find Trends
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasSearched && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Summary */}
            <div className="flex items-center justify-between flex-wrap gap-4 max-w-6xl mx-auto">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {overperformingVideos.length} Overperforming Videos
                </h2>
                <p className="text-sm text-muted-foreground">
                  {scoreMode === "topic"
                    ? `Topic average views: ${formatCompactNumber(avgViews)}`
                    : `Average views across returned videos: ${formatCompactNumber(avgViews)}`}
                </p>
              </div>
              <Badge variant="secondary" className="text-sm">
                {timeRanges.find((r) => r.value === timeRange)?.label}
              </Badge>
            </div>

            {/* Video Grid */}
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {filteredVideos.map((video) => {
                  const badge = getPerformanceBadge(video.performanceScore);
                  const isOverperforming = video.performanceScore >= 1.5;

                  return (
                    <Card
                      key={video.id}
                      className={`glass-card overflow-hidden group hover:scale-[1.02] transition-transform ${
                        isOverperforming ? "ring-2 ring-primary/50" : ""
                      }`}
                    >
                      <div className="relative aspect-video">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {video.duration}
                        </div>
                        <div className="absolute top-2 left-2">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => openYouTubeVideo(video.id)}
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
                          aria-label={`Open YouTube video: ${video.title}`}
                        >
                          <ExternalLink className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium text-foreground line-clamp-2 mb-2 text-sm">{video.title}</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/?channel=${encodeURIComponent(video.channelId)}`);
                            }}
                            className="hover:text-primary hover:underline transition-colors text-left"
                          >
                            {video.channelName}
                          </button>
                          {typeof video.channelSubscribers === "number"
                            ? ` • ${formatCompactNumber(video.channelSubscribers)} subs`
                            : ""}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatCompactNumber(video.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {formatCompactNumber(video.likes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {formatCompactNumber(video.comments)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{formatDate(video.publishedAt)}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>No videos found for this topic in the selected time range</p>
              </div>
            )}
          </div>
        )}

        {!hasSearched && !isSearching && (
          <div className="text-center py-12 text-muted-foreground max-w-2xl mx-auto">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>Enter a topic to discover overperforming videos</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TrendFinder;
