type YouTubeSearchResponse = {
  channel: {
    id: string;
    name: string;
    thumbnail: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
  };
  videos: Array<{
    id: string;
    title: string;
    thumbnail: string;
    views: number;
    likes: number;
    comments: number;
    publishedAt: string;
    duration: string;
    engagementRate: number;
    performanceScore: number;
    channelId: string;
    channelName: string;
  }>;
  avgViews: number;
};

type TrendFinderParams = {
  topic: string;
  timeRange: "24h" | "7d" | "30d" | "90d" | "1y";
  maxResults: number;
  formatType: "all" | "shorts" | "longform";
  channelSize: "all" | "small" | "medium" | "large";
  scoreMode: "channel" | "topic";
};

type TrendFinderResponse = {
  videos: Array<{
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
    performanceScore: number;
    engagementRate: number;
  }>;
  avgViews: number;
};

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

function requireYouTubeKey() {
  if (!YOUTUBE_API_KEY) {
    throw new Error("VITE_YOUTUBE_API_KEY is not configured");
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data?.error) {
    const message = data?.error?.message || "YouTube API request failed";
    throw new Error(message);
  }
  return data;
}

function parseDuration(duration: string): { formatted: string; seconds: number } {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { formatted: "0:00", seconds: 0 };

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  const formatted = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return { formatted, seconds: totalSeconds };
}

function isVerticalThumbnail(thumbnails: any): boolean | null {
  if (!thumbnails || typeof thumbnails !== "object") return null;
  const order = ["maxres", "standard", "high", "medium", "default"];
  for (const key of order) {
    const thumb = thumbnails[key];
    if (thumb?.width && thumb?.height) {
      return thumb.height > thumb.width;
    }
  }
  return null;
}

function isShortsVideo(thumbnails: any, durationSeconds: number): boolean {
  const vertical = isVerticalThumbnail(thumbnails);
  if (vertical !== null) return vertical;
  // Fallback heuristic when dimensions are missing.
  return durationSeconds <= 180;
}


async function checkShortsRedirect(videoId: string): Promise<boolean | null> {
  try {
    const response = await fetch(`/api/shorts-check?id=${encodeURIComponent(videoId)}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data?.isShorts === "boolean") return data.isShorts;
    return null;
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}



function getDateFilter(timeRange: TrendFinderParams["timeRange"]) {
  const now = new Date();
  switch (timeRange) {
    case "24h":
      now.setDate(now.getDate() - 1);
      break;
    case "7d":
      now.setDate(now.getDate() - 7);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
    case "90d":
      now.setDate(now.getDate() - 90);
      break;
    case "1y":
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      now.setDate(now.getDate() - 7);
  }
  return now.toISOString();
}

function extractChannelId(input: string): string | null {
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    const channelIndex = parts.indexOf("channel");
    if (channelIndex >= 0 && parts[channelIndex + 1]) {
      return parts[channelIndex + 1];
    }
    if (parts[0]?.startsWith("@")) {
      return parts[0];
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveChannelId(channelInput: string): Promise<string> {
  const cleaned = channelInput.trim();
  const extracted = extractChannelId(cleaned);
  if (extracted) return extracted;

  if (cleaned.startsWith("UC")) return cleaned;

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(cleaned)}&key=${YOUTUBE_API_KEY}`;
  const searchData = await fetchJson(searchUrl);
  if (searchData.items?.length) {
    return searchData.items[0].snippet.channelId;
  }
  throw new Error("Channel not found");
}

export async function youtubeSearch(channelInput: string, maxResults = 50): Promise<YouTubeSearchResponse> {
  requireYouTubeKey();

  const channelId = await resolveChannelId(channelInput);
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
  const channelData = await fetchJson(channelUrl);
  const channel = channelData.items?.[0];
  if (!channel) throw new Error("Channel details not found");

  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error("Uploads playlist not available");

  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  const playlistData = await fetchJson(playlistUrl);
  const items = playlistData.items || [];

  const videoIds = items.map((item: any) => item.contentDetails?.videoId).filter(Boolean);
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds.join(",")}&key=${YOUTUBE_API_KEY}`;
  const videosData = videoIds.length ? await fetchJson(videosUrl) : { items: [] };

  const statsMap = new Map(
    (videosData.items || []).map((item: any) => [item.id, item])
  );

  const videos = items.map((item: any) => {
    const videoId = item.contentDetails?.videoId;
    const stats = statsMap.get(videoId)?.statistics || {};
    const contentDetails = statsMap.get(videoId)?.contentDetails || {};
    const views = parseInt(stats.viewCount || "0", 10);
    const likes = parseInt(stats.likeCount || "0", 10);
    const comments = parseInt(stats.commentCount || "0", 10);
    const durationInfo = parseDuration(contentDetails.duration || "PT0S");
    return {
      id: videoId,
      title: item.snippet?.title || "Untitled",
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
      views,
      likes,
      comments,
      publishedAt: item.snippet?.publishedAt || "",
      duration: durationInfo.formatted,
      engagementRate: views > 0 ? (likes + comments) / views : 0,
      performanceScore: 0,
      channelId: channelId,
      channelName: channel.snippet?.title || "",
    };
  });

  const avgViews = videos.length
    ? Math.round(videos.reduce((sum, v) => sum + v.views, 0) / videos.length)
    : 0;

  const enrichedVideos = videos.map((video) => ({
    ...video,
    performanceScore: avgViews > 0 ? video.views / avgViews : 0,
  }));

  return {
    channel: {
      id: channelId,
      name: channel.snippet?.title || "",
      thumbnail: channel.snippet?.thumbnails?.default?.url || "",
      subscriberCount: parseInt(channel.statistics?.subscriberCount || "0", 10),
      videoCount: parseInt(channel.statistics?.videoCount || "0", 10),
      viewCount: parseInt(channel.statistics?.viewCount || "0", 10),
    },
    videos: enrichedVideos,
    avgViews,
  };
}

export async function trendFinder(params: TrendFinderParams): Promise<TrendFinderResponse> {
  requireYouTubeKey();

  const publishedAfter = getDateFilter(params.timeRange);
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&publishedAfter=${encodeURIComponent(publishedAfter)}&q=${encodeURIComponent(params.topic)}&maxResults=${params.maxResults}&key=${YOUTUBE_API_KEY}`;
  const searchData = await fetchJson(searchUrl);
  const items = searchData.items || [];

  const videoIds = items.map((item: any) => item.id?.videoId).filter(Boolean);
  if (videoIds.length === 0) {
    return { videos: [], avgViews: 0 };
  }

  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds.join(",")}&key=${YOUTUBE_API_KEY}`;
  const videosData = await fetchJson(videosUrl);

  const channelIds = Array.from(
    new Set(videosData.items?.map((item: any) => item.snippet?.channelId).filter(Boolean))
  );

  const channelsUrl = channelIds.length
    ? `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelIds.join(",")}&key=${YOUTUBE_API_KEY}`
    : null;

  const channelData = channelsUrl ? await fetchJson(channelsUrl) : { items: [] };
  const channelStats = new Map(
    (channelData.items || []).map((item: any) => [item.id, item.statistics])
  );

  const topicAvgViews = Math.round(
    videosData.items.reduce((sum: number, item: any) => sum + parseInt(item.statistics?.viewCount || "0", 10), 0) /
      Math.max(videosData.items.length, 1)
  );

  const channelViewTotals = new Map<string, { total: number; count: number }>();
  videosData.items.forEach((item: any) => {
    const channelId = item.snippet?.channelId;
    if (!channelId) return;
    const entry = channelViewTotals.get(channelId) || { total: 0, count: 0 };
    entry.total += parseInt(item.statistics?.viewCount || "0", 10);
    entry.count += 1;
    channelViewTotals.set(channelId, entry);
  });

  let videos = videosData.items
    .map((item: any) => {
      const views = parseInt(item.statistics?.viewCount || "0", 10);
      const likes = parseInt(item.statistics?.likeCount || "0", 10);
      const comments = parseInt(item.statistics?.commentCount || "0", 10);
      const durationInfo = parseDuration(item.contentDetails?.duration || "PT0S");
      const channelId = item.snippet?.channelId || "";
      const channelStatsEntry = channelStats.get(channelId);
      const subscribers = channelStatsEntry ? parseInt(channelStatsEntry.subscriberCount || "0", 10) : undefined;
      const channelAvg = channelViewTotals.get(channelId);
      const avgForScore = params.scoreMode === "channel" && channelAvg?.count
        ? channelAvg.total / channelAvg.count
        : topicAvgViews;
      const performanceScore = avgForScore > 0 ? views / avgForScore : 0;
      return {
        id: item.id,
        title: item.snippet?.title || "Untitled",
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        channelName: item.snippet?.channelTitle || "",
        channelId,
        channelSubscribers: subscribers,
        views,
        likes,
        comments,
        publishedAt: item.snippet?.publishedAt || "",
        duration: durationInfo.formatted,
        durationSeconds: durationInfo.seconds,
        isVertical: isShortsVideo(item.snippet?.thumbnails, durationInfo.seconds),
        performanceScore,
        engagementRate: views > 0 ? (likes + comments) / views : 0,
      };
    })
    .filter((video) => {
      if (params.channelSize === "all") return true;
      if (typeof video.channelSubscribers !== "number") return false;
      if (params.channelSize === "large") return video.channelSubscribers > 100000;
      if (params.channelSize === "medium") return video.channelSubscribers >= 10000 && video.channelSubscribers <= 100000;
      if (params.channelSize === "small") return video.channelSubscribers < 10000;
      return true;
    });

  if (params.formatType !== "all") {
    videos = await mapWithConcurrency(videos, 6, async (video) => {
      const check = await checkShortsRedirect(video.id);
      if (typeof check === "boolean") {
        return { ...video, isVertical: check };
      }
      return video;
    });
    videos = videos.filter((video) => {
      if (params.formatType === "shorts" && !video.isVertical) return false;
      if (params.formatType === "longform" && video.isVertical) return false;
      return true;
    });
  }

  return { videos, avgViews: topicAvgViews };
}
