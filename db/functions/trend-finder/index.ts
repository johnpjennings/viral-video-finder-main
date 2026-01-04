import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CACHE_TTL_HOURS = 24;

// Initialize Supabase client for caching
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Input validation schema
const TrendFinderSchema = z.object({
  topic: z.string().min(1).max(200).trim(),
  timeRange: z.enum(['24h', '7d', '30d', '90d', '1y']).default('7d'),
  maxResults: z.number().int().min(1).max(100).default(100),
  formatType: z.enum(['all', 'shorts', 'longform']).default('all'),
  channelSize: z.enum(['all', 'small', 'medium', 'large']).default('all'),
  scoreMode: z.enum(['channel', 'topic']).default('channel'),
});

// Verify session token
async function verifySession(req: Request): Promise<{ valid: boolean; error?: Response }> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  if (!token || token.length !== 64) {
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
  
  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, expires_at")
    .eq("token", token)
    .neq("user_agent", "failed_attempt")
    .maybeSingle();
  
  if (error || !session) {
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
  
  if (new Date(session.expires_at) < new Date()) {
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: "Session expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
  
  return { valid: true };
}

// Helper to generate cache key for trend searches
function getCacheKey(topic: string, timeRange: string, maxResults: number, formatType: string, channelSize: string, scoreMode: string): string {
  return `trend:${topic.toLowerCase()}:${timeRange}:${maxResults}:${formatType}:${channelSize}:${scoreMode}`;
}

// Get cached data if available and not expired
async function getCachedData(cacheKey: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;

    // Check if cache is expired
    if (new Date(data.expires_at) < new Date()) {
      console.log('Cache expired for:', cacheKey);
      return null;
    }

    console.log('Cache hit for:', cacheKey);
    return data.data;
  } catch (e) {
    console.log('Cache lookup error:', e);
    return null;
  }
}

// Store data in cache
async function setCacheData(cacheKey: string, cacheType: string, data: any): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    await supabase
      .from('api_cache')
      .upsert({
        cache_key: cacheKey,
        cache_type: cacheType,
        data: data,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      }, { onConflict: 'cache_key' });

    console.log('Cached data for:', cacheKey);
  } catch (e) {
    console.log('Cache write error:', e);
  }
}

// Cache for channel stats (in-memory during request, persisted to DB)
async function getCachedChannelStats(channelId: string): Promise<{ subscriberCount: number | undefined; avgViews: number | undefined } | null> {
  const cacheKey = `channel-stats:${channelId}`;
  const cached = await getCachedData(cacheKey);
  return cached;
}

async function setCachedChannelStats(channelId: string, stats: { subscriberCount: number | undefined; avgViews: number | undefined }): Promise<void> {
  const cacheKey = `channel-stats:${channelId}`;
  await setCacheData(cacheKey, 'channel-stats', stats);
}

interface TrendVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  channelId: string;
  channelSubscribers?: number;
  channelAvgViews?: number;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  isVertical: boolean;
  performanceScore: number;
  engagementRate: number;
}

function parseDuration(duration: string): { formatted: string; seconds: number } {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { formatted: '0:00', seconds: 0 };
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  
  let formatted: string;
  if (hours > 0) {
    formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return { formatted, seconds: totalSeconds };
}

function matchesChannelSize(subscribers: number | undefined, channelSize: string): boolean {
  if (channelSize === 'all') return true;
  if (typeof subscribers !== 'number') return false;
  if (channelSize === 'large') return subscribers > 100000;
  if (channelSize === 'medium') return subscribers >= 10000 && subscribers <= 100000;
  if (channelSize === 'small') return subscribers < 10000;
  return true;
}

// Check if a video is a YouTube Short by following redirects and checking final URL
async function checkIsShort(videoId: string): Promise<boolean> {
  try {
    const shortsUrl = `https://www.youtube.com/shorts/${videoId}`;
    const response = await fetch(shortsUrl, { 
      method: 'HEAD',
      redirect: 'follow'
    });
    
    const isShort = response.url.includes('/shorts/');
    return isShort;
  } catch (error) {
    console.log(`Error checking short status for ${videoId}:`, error);
    return false;
  }
}

function getDateFilter(timeRange: string): string {
  const now = new Date();
  switch (timeRange) {
    case '24h':
      now.setDate(now.getDate() - 1);
      break;
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
    case '90d':
      now.setDate(now.getDate() - 90);
      break;
    case '1y':
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      now.setDate(now.getDate() - 7);
  }
  return now.toISOString();
}

// Fetch recent videos from a playlist and calculate average views
async function getChannelAvgViews(playlistId: string, apiKey: string): Promise<number | undefined> {
  // Get up to 50 recent videos from the uploads playlist
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
  const playlistResponse = await fetch(playlistUrl);
  const playlistData = await playlistResponse.json();
  
  if (playlistData.error || !playlistData.items?.length) {
    console.log(`Could not get playlist items for ${playlistId}`);
    return undefined;
  }
  
  const videoIds = playlistData.items
    .map((item: any) => item.contentDetails?.videoId)
    .filter(Boolean);
  
  if (videoIds.length === 0) return undefined;
  
  // Get video statistics
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(',')}&key=${apiKey}`;
  const videosResponse = await fetch(videosUrl);
  const videosData = await videosResponse.json();
  
  if (videosData.error || !videosData.items?.length) {
    console.log(`Could not get video stats for playlist ${playlistId}`);
    return undefined;
  }
  
  const totalViews = videosData.items.reduce((sum: number, video: any) => {
    return sum + parseInt(video.statistics?.viewCount || '0', 10);
  }, 0);
  
  return Math.round(totalViews / videosData.items.length);
}

// Fetch channel stats (subscribers + avg views) with database caching
async function fetchChannelStats(
  channelIds: string[], 
  apiKey: string
): Promise<Map<string, { subscriberCount: number | undefined; avgViews: number | undefined }>> {
  const result = new Map<string, { subscriberCount: number | undefined; avgViews: number | undefined }>();
  const channelIdsToFetch: string[] = [];
  
  // Check database cache first
  for (const channelId of channelIds) {
    const cached = await getCachedChannelStats(channelId);
    if (cached) {
      result.set(channelId, cached);
      console.log(`DB cache hit for channel ${channelId}: avgViews=${cached.avgViews}, subs=${cached.subscriberCount}`);
    } else {
      channelIdsToFetch.push(channelId);
    }
  }
  
  if (channelIdsToFetch.length === 0) {
    return result;
  }
  
  console.log(`Fetching stats for ${channelIdsToFetch.length} channels from API...`);
  
  // Fetch channel basic info (subscribers + uploads playlist) in batches
  for (let i = 0; i < channelIdsToFetch.length; i += 50) {
    const batch = channelIdsToFetch.slice(i, i + 50);
    const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=${batch.join(',')}&key=${apiKey}`;
    const channelsResponse = await fetch(channelsUrl);
    const channelsData = await channelsResponse.json();
    
    if (channelsData.error) {
      console.error('YouTube API error fetching channels:', channelsData.error);
      continue;
    }
    
    // Process each channel - fetch their uploads and calculate avg views
    const channelPromises = (channelsData.items || []).map(async (channel: any) => {
      const channelId = channel.id;
      const subscriberCount = channel.statistics?.subscriberCount
        ? parseInt(channel.statistics.subscriberCount, 10)
        : undefined;
      
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      let avgViews: number | undefined = undefined;
      
      if (uploadsPlaylistId) {
        avgViews = await getChannelAvgViews(uploadsPlaylistId, apiKey);
        console.log(`Channel ${channelId}: avgViews=${avgViews}, subs=${subscriberCount}`);
      }
      
      const stats = { subscriberCount, avgViews };
      
      // Cache to database
      await setCachedChannelStats(channelId, stats);
      
      result.set(channelId, stats);
    });
    
    await Promise.all(channelPromises);
  }
  
  // Handle channels that weren't returned by the API
  for (const channelId of channelIdsToFetch) {
    if (!result.has(channelId)) {
      const stats = { subscriberCount: undefined, avgViews: undefined };
      await setCachedChannelStats(channelId, stats);
      result.set(channelId, stats);
    }
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify session
    const auth = await verifySession(req);
    if (!auth.valid) {
      return auth.error!;
    }

    // Parse and validate input
    const body = await req.json();
    const validation = TrendFinderSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { topic, timeRange, maxResults, formatType, channelSize, scoreMode } = validation.data;

    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    console.log(`Searching trends for topic: ${topic}, timeRange: ${timeRange}, scoreMode: ${scoreMode}`);
    
    // Check cache first
    const cacheKey = getCacheKey(topic, timeRange, maxResults, formatType, channelSize, scoreMode);
    const cachedResult = await getCachedData(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached trend data for:', topic);
      return new Response(JSON.stringify(cachedResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const publishedAfter = getDateFilter(timeRange);
    
    const maxPerPage = 50;
    const durationFilters = formatType === 'shorts'
      ? ['short']
      : formatType === 'longform'
        ? ['medium', 'long']
        : [null];

    const videoIdSet = new Set<string>();

    for (const duration of durationFilters) {
      let pageToken = '';
      let fetched = 0;

      while (videoIdSet.size < maxResults && fetched < maxResults) {
        const params = new URLSearchParams({
          part: 'snippet',
          q: topic,
          type: 'video',
          order: 'viewCount',
          publishedAfter,
          relevanceLanguage: 'en',
          maxResults: String(Math.min(maxPerPage, maxResults - fetched)),
          key: YOUTUBE_API_KEY,
        });

        if (pageToken) params.set('pageToken', pageToken);
        if (duration) params.set('videoDuration', duration);

        const searchUrl = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.error) {
          console.error('YouTube API error:', searchData.error);
          throw new Error(searchData.error.message || 'YouTube API error');
        }

        const items = searchData.items || [];
        for (const item of items) {
          if (item?.id?.videoId) {
            videoIdSet.add(item.id.videoId);
          }
        }

        fetched += items.length;
        pageToken = searchData.nextPageToken || '';
        if (!pageToken || items.length === 0) break;
      }
    }

    const videoIds = Array.from(videoIdSet).slice(0, maxResults);

    if (videoIds.length === 0) {
      const result = { videos: [], avgViews: 0 };
      await setCacheData(cacheKey, 'trend-search', result);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${videoIds.length} videos`);

    // Get video details in batches of 50 (YouTube API limit)
    const allDetailItems: any[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${batch.join(',')}&key=${YOUTUBE_API_KEY}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.error) {
        console.error('YouTube API error fetching details:', detailsData.error);
        throw new Error(detailsData.error.message || 'Failed to fetch video details');
      }

      if (detailsData.items) {
        allDetailItems.push(...detailsData.items);
      }
    }

    if (allDetailItems.length === 0) {
      throw new Error('Failed to fetch video details');
    }

    const detailsData = { items: allDetailItems };

    // Get unique channel IDs
    const channelIds: string[] = Array.from(
      new Set(detailsData.items.map((item: any) => item.snippet?.channelId).filter(Boolean))
    );

    // Fetch channel stats (subscribers + true average views) with caching
    const channelStatsMap = await fetchChannelStats(channelIds, YOUTUBE_API_KEY);

    // Filter by channel size
    let filteredItems = detailsData.items;
    if (channelSize !== 'all') {
      filteredItems = filteredItems.filter((item: any) => {
        const stats = channelStatsMap.get(item.snippet?.channelId);
        return matchesChannelSize(stats?.subscriberCount, channelSize);
      });
    }

    if (filteredItems.length === 0) {
      const result = { videos: [], avgViews: 0 };
      await setCacheData(cacheKey, 'trend-search', result);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate topic average views (from returned videos)
    const totalViews = filteredItems.reduce((sum: number, item: any) => {
      return sum + parseInt(item.statistics?.viewCount || '0', 10);
    }, 0);
    const topicAvgViews = Math.round(totalViews / filteredItems.length);

    // Check which videos are Shorts (in parallel for speed)
    let shortChecks: boolean[] = [];
    if (formatType === 'all') {
      console.log('Checking Short status for all videos...');
      shortChecks = await Promise.all(
        filteredItems.map((item: any) => checkIsShort(item.id))
      );
      console.log(`Short check complete`);
    } else {
      shortChecks = filteredItems.map(() => formatType === 'shorts');
    }

    // Process videos
    const videos: TrendVideo[] = filteredItems.map((item: any, index: number) => {
      const views = parseInt(item.statistics?.viewCount || '0', 10);
      const likes = parseInt(item.statistics?.likeCount || '0', 10);
      const comments = parseInt(item.statistics?.commentCount || '0', 10);
      
      const channelStats = channelStatsMap.get(item.snippet.channelId);
      const channelAvgViews = channelStats?.avgViews || 0;
      
      // Calculate performance score based on selected mode
      let performanceScore: number;
      if (scoreMode === 'topic') {
        performanceScore = topicAvgViews > 0 ? views / topicAvgViews : 1;
      } else {
        // Channel mode - use the channel's true historical average
        performanceScore = channelAvgViews > 0 ? views / channelAvgViews : 1;
      }
      
      const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;
      const { formatted, seconds } = parseDuration(item.contentDetails?.duration || 'PT0S');

      const isVertical = shortChecks[index];

      return {
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        channelName: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        channelSubscribers: channelStats?.subscriberCount,
        channelAvgViews: channelStats?.avgViews,
        views,
        likes,
        comments,
        publishedAt: item.snippet.publishedAt,
        duration: formatted,
        durationSeconds: seconds,
        isVertical,
        performanceScore,
        engagementRate,
      };
    });

    // Sort by performance score (overperforming videos first)
    videos.sort((a, b) => b.performanceScore - a.performanceScore);

    console.log(`Returning ${videos.length} trend videos`);

    const result = { videos, avgViews: topicAvgViews };
    
    // Cache the result
    await setCacheData(cacheKey, 'trend-search', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trend-finder function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
