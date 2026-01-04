import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
const SearchSchema = z.object({
  channelInput: z.string().min(1).max(200).trim(),
  maxResults: z.number().int().min(1).max(50).default(50),
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

// Helper to generate cache key
function getCacheKey(channelInput: string, maxResults: number): string {
  return `channel:${channelInput.toLowerCase()}:${maxResults}`;
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

serve(async (req) => {
  // Handle CORS preflight requests
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
    const validation = SearchSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { channelInput, maxResults } = validation.data;
    console.log('Received request for channel:', channelInput);

    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    // Check cache first
    const cacheKey = getCacheKey(channelInput, maxResults);
    const cachedResult = await getCachedData(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached data for channel:', channelInput);
      return new Response(JSON.stringify(cachedResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First, resolve channel ID from handle, username, or ID
    let channelId = channelInput;
    
    // Check if it's a handle (@username) or custom URL
    if (channelInput.startsWith('@')) {
      // Search for channel by handle
      const handleSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelInput)}&key=${YOUTUBE_API_KEY}`;
      console.log('Searching for channel by handle');
      
      const handleRes = await fetch(handleSearchUrl);
      const handleData = await handleRes.json();
      
      if (handleData.error) {
        console.error('YouTube API error:', handleData.error);
        throw new Error(handleData.error.message || 'Failed to search channel');
      }
      
      if (handleData.items && handleData.items.length > 0) {
        channelId = handleData.items[0].snippet.channelId;
        console.log('Found channel ID from handle:', channelId);
      } else {
        throw new Error('Channel not found');
      }
    } else if (!channelInput.startsWith('UC')) {
      // Try to find channel by username/custom URL
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelInput)}&key=${YOUTUBE_API_KEY}`;
      console.log('Searching for channel by name');
      
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      
      if (searchData.error) {
        console.error('YouTube API error:', searchData.error);
        throw new Error(searchData.error.message || 'Failed to search channel');
      }
      
      if (searchData.items && searchData.items.length > 0) {
        channelId = searchData.items[0].snippet.channelId;
        console.log('Found channel ID from search:', channelId);
      } else {
        throw new Error('Channel not found');
      }
    }

    // Get channel details
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    console.log('Fetching channel details for:', channelId);
    
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();

    if (channelData.error) {
      console.error('YouTube API error:', channelData.error);
      throw new Error(channelData.error.message || 'Failed to fetch channel');
    }

    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found');
    }

    const channelInfo = channelData.items[0];
    
    // Get channel's uploads playlist
    const uploadsPlaylistId = channelInfo.contentDetails?.relatedPlaylists?.uploads || 
      `UU${channelId.substring(2)}`; // Convert UC... to UU...
    
    // Fetch videos from uploads playlist
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    console.log('Fetching videos from playlist:', uploadsPlaylistId);
    
    const playlistRes = await fetch(playlistUrl);
    const playlistData = await playlistRes.json();

    if (playlistData.error) {
      console.error('YouTube API error:', playlistData.error);
      throw new Error(playlistData.error.message || 'Failed to fetch videos');
    }

    const videoIds = playlistData.items?.map((item: any) => item.contentDetails.videoId).join(',') || '';
    
    if (!videoIds) {
      const result = {
        channel: {
          id: channelId,
          name: channelInfo.snippet.title,
          thumbnail: channelInfo.snippet.thumbnails?.default?.url || '',
          subscriberCount: parseInt(channelInfo.statistics?.subscriberCount || '0'),
          videoCount: parseInt(channelInfo.statistics?.videoCount || '0'),
          viewCount: parseInt(channelInfo.statistics?.viewCount || '0'),
        },
        videos: [],
      };
      
      // Cache even empty results
      await setCacheData(cacheKey, 'youtube-channel', result);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get detailed video statistics
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    console.log('Fetching video details for', videoIds.split(',').length, 'videos');
    
    const videosRes = await fetch(videosUrl);
    const videosData = await videosRes.json();

    if (videosData.error) {
      console.error('YouTube API error:', videosData.error);
      throw new Error(videosData.error.message || 'Failed to fetch video details');
    }

    // Calculate average views to determine "overperforming" videos
    const videos = videosData.items || [];
    const totalViews = videos.reduce((sum: number, v: any) => sum + parseInt(v.statistics?.viewCount || '0'), 0);
    const avgViews = videos.length > 0 ? totalViews / videos.length : 0;

    const formattedVideos = videos.map((video: any) => {
      const views = parseInt(video.statistics?.viewCount || '0');
      const likes = parseInt(video.statistics?.likeCount || '0');
      const comments = parseInt(video.statistics?.commentCount || '0');
      const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;
      const performanceScore = avgViews > 0 ? (views / avgViews) * 100 : 100;

      return {
        id: video.id,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails?.maxres?.url || 
                   video.snippet.thumbnails?.high?.url || 
                   video.snippet.thumbnails?.medium?.url || '',
        publishedAt: video.snippet.publishedAt,
        views,
        likes,
        comments,
        engagementRate: Math.round(engagementRate * 100) / 100,
        performanceScore: Math.round(performanceScore),
        duration: video.contentDetails?.duration || '',
        channelId,
        channelName: channelInfo.snippet.title,
      };
    });

    console.log('Successfully processed', formattedVideos.length, 'videos');

    const result = {
      channel: {
        id: channelId,
        name: channelInfo.snippet.title,
        thumbnail: channelInfo.snippet.thumbnails?.default?.url || '',
        subscriberCount: parseInt(channelInfo.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channelInfo.statistics?.videoCount || '0'),
        viewCount: parseInt(channelInfo.statistics?.viewCount || '0'),
      },
      videos: formattedVideos,
      avgViews: Math.round(avgViews),
    };

    // Cache the result
    await setCacheData(cacheKey, 'youtube-channel', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in youtube-search function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching YouTube data';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
