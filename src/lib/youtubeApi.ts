import { pb } from "@/integrations/pocketbase/client";

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

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${pb.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || "YouTube API request failed";
    throw new Error(message);
  }
  return data as T;
}

export async function youtubeSearch(channelInput: string, maxResults = 50): Promise<YouTubeSearchResponse> {
  return postJson<YouTubeSearchResponse>("/api/youtube/channel-search", {
    channelInput,
    maxResults,
  });
}

export async function trendFinder(params: TrendFinderParams): Promise<TrendFinderResponse> {
  return postJson<TrendFinderResponse>("/api/youtube/trend-finder", params as Record<string, unknown>);
}
