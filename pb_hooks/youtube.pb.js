routerAdd("POST", "/api/youtube/channel-search", (e) => {
  const apiKey = $os.getenv("YOUTUBE_API_KEY");
  if (!apiKey) return e.json(500, { error: "YOUTUBE_API_KEY is not configured" });

  const fetchJson = (url) => {
    const response = $http.send({
      url,
      method: "GET",
      headers: {
        "User-Agent": "PocketBase",
        Accept: "application/json",
      },
    });

    const data = response.json;
    if (response.statusCode < 200 || response.statusCode >= 300 || data?.error) {
      const message = data?.error?.message || "YouTube API request failed";
      throw new Error(message);
    }
    return data;
  };

  const parseDuration = (duration) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return { formatted: "0:00", seconds: 0 };

    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    const formatted =
      hours > 0
        ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        : `${minutes}:${seconds.toString().padStart(2, "0")}`;

    return { formatted, seconds: totalSeconds };
  };

  const extractChannelId = (input) => {
    if (typeof URL === "function") {
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

    const trimmed = input.trim();
    const channelMatch = trimmed.match(/youtube\.com\/channel\/([^/?#]+)/i);
    if (channelMatch?.[1]) return channelMatch[1];
    const handleMatch = trimmed.match(/youtube\.com\/(@[^/?#]+)/i);
    if (handleMatch?.[1]) return handleMatch[1];
    return null;
  };

  const resolveChannelId = (channelInput) => {
    const cleaned = channelInput.trim();
    const extracted = extractChannelId(cleaned);
    if (extracted) return extracted;

    if (cleaned.startsWith("UC")) return cleaned;

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
      cleaned
    )}&key=${apiKey}`;
    const searchData = fetchJson(searchUrl);
    if (searchData.items?.length) {
      return searchData.items[0].snippet.channelId;
    }
    throw new Error("Channel not found");
  };

  try {
    const body = e.requestInfo().body || {};
    const channelInput = typeof body.channelInput === "string" ? body.channelInput : "";
    const maxResultsRaw = Number(body.maxResults);
    const maxResults = Number.isFinite(maxResultsRaw) ? maxResultsRaw : 50;
    const clampedResults = Math.max(1, Math.min(50, maxResults));

    if (!channelInput.trim()) {
      return e.json(400, { error: "channelInput is required" });
    }

    const channelId = resolveChannelId(channelInput);
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`;
    const channelData = fetchJson(channelUrl);
    const channel = channelData.items?.[0];
    if (!channel) throw new Error("Channel details not found");

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) throw new Error("Uploads playlist not available");

    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${clampedResults}&key=${apiKey}`;
    const playlistData = fetchJson(playlistUrl);
    const items = playlistData.items || [];

    const videoIds = items.map((item) => item.contentDetails?.videoId).filter(Boolean);
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds.join(
      ","
    )}&key=${apiKey}`;
    const videosData = videoIds.length ? fetchJson(videosUrl) : { items: [] };

    const statsMap = new Map((videosData.items || []).map((item) => [item.id, item]));

    const videos = items.map((item) => {
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
        thumbnail:
          item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
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

    return e.json(200, {
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search channel";
    return e.json(500, { error: message });
  }
});

const shortsCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

routerAdd("POST", "/api/shorts-check", (e) => {
  try {
    const body = e.requestInfo().body || {};
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return e.json(400, { error: "Missing id" });
    const checkShortsVideo = (shortsId) => {
      const cacheKey = "__shortsCache";
      const root = typeof globalThis !== "undefined" ? globalThis : this;
      if (!root[cacheKey]) {
        root[cacheKey] = new Map();
      }
      const cache = root[cacheKey];
      const now = Date.now();
      const cached = cache.get(shortsId);
      if (cached && cached.expiresAt > now) {
        return { id: shortsId, isShorts: cached.isShorts, cached: true };
      }

      const url = `https://www.youtube.com/shorts/${shortsId}`;
      let response = $http.send({
        url,
        method: "HEAD",
        headers: {
          "User-Agent": "PocketBase",
          Accept: "*/*",
        },
        followRedirects: false,
      });

      if (response.statusCode === 405) {
        response = $http.send({
          url,
          method: "GET",
          headers: {
            "User-Agent": "PocketBase",
            Accept: "*/*",
          },
          followRedirects: false,
        });
      }

      const status = response.statusCode || 0;
      const location = response.headers?.location || "";
      const isShorts =
        status === 200
          ? true
          : [301, 302, 303, 307, 308].includes(status)
          ? location.includes("/shorts/")
          : false;

      cache.set(shortsId, { isShorts, expiresAt: now + shortsCacheTtlMs });

      return { id: shortsId, isShorts, cached: false, status, location };
    };

    const result = checkShortsVideo(id);
    return e.json(200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check shorts";
    return e.json(500, { error: message });
  }
});

routerAdd("POST", "/api/shorts-check-batch", (e) => {
  try {
    const body = e.requestInfo().body || {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) return e.json(400, { error: "Missing ids" });

    const checkShortsVideo = (shortsId) => {
      const cacheKey = "__shortsCache";
      const root = typeof globalThis !== "undefined" ? globalThis : this;
      if (!root[cacheKey]) {
        root[cacheKey] = new Map();
      }
      const cache = root[cacheKey];
      const now = Date.now();
      const cached = cache.get(shortsId);
      if (cached && cached.expiresAt > now) {
        return { id: shortsId, isShorts: cached.isShorts, cached: true };
      }

      const url = `https://www.youtube.com/shorts/${shortsId}`;
      let response = $http.send({
        url,
        method: "HEAD",
        headers: {
          "User-Agent": "PocketBase",
          Accept: "*/*",
        },
        followRedirects: false,
      });

      if (response.statusCode === 405) {
        response = $http.send({
          url,
          method: "GET",
          headers: {
            "User-Agent": "PocketBase",
            Accept: "*/*",
          },
          followRedirects: false,
        });
      }

      const status = response.statusCode || 0;
      const location = response.headers?.location || "";
      const isShorts =
        status === 200
          ? true
          : [301, 302, 303, 307, 308].includes(status)
          ? location.includes("/shorts/")
          : false;

      cache.set(shortsId, { isShorts, expiresAt: now + shortsCacheTtlMs });

      return { id: shortsId, isShorts, cached: false, status, location };
    };

    const unique = Array.from(new Set(ids)).slice(0, 50);
    const results = unique.map((id) => checkShortsVideo(id));
    const map = Object.fromEntries(results.map((item) => [item.id, item.isShorts]));

    return e.json(200, { results: map });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check shorts";
    return e.json(500, { error: message });
  }
});

routerAdd("POST", "/api/youtube/trend-finder", (e) => {
  const apiKey = $os.getenv("YOUTUBE_API_KEY");
  if (!apiKey) return e.json(500, { error: "YOUTUBE_API_KEY is not configured" });

  const fetchJson = (url) => {
    const response = $http.send({
      url,
      method: "GET",
      headers: {
        "User-Agent": "PocketBase",
        Accept: "application/json",
      },
    });

    const data = response.json;
    if (response.statusCode < 200 || response.statusCode >= 300 || data?.error) {
      const message = data?.error?.message || "YouTube API request failed";
      throw new Error(message);
    }
    return data;
  };

  const parseDuration = (duration) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return { formatted: "0:00", seconds: 0 };

    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    const formatted =
      hours > 0
        ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        : `${minutes}:${seconds.toString().padStart(2, "0")}`;

    return { formatted, seconds: totalSeconds };
  };

  const isVerticalThumbnail = (thumbnails) => {
    if (!thumbnails || typeof thumbnails !== "object") return null;
    const order = ["maxres", "standard", "high", "medium", "default"];
    for (const key of order) {
      const thumb = thumbnails[key];
      if (thumb?.width && thumb?.height) {
        return thumb.height > thumb.width;
      }
    }
    return null;
  };

  const isShortsVideo = (thumbnails, durationSeconds) => {
    const vertical = isVerticalThumbnail(thumbnails);
    if (vertical !== null) return vertical;
    return durationSeconds <= 180;
  };

  const getDateFilter = (timeRange) => {
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
  };

  try {
    const body = e.requestInfo().body || {};
    const topic = typeof body.topic === "string" ? body.topic : "";
    const timeRange = ["24h", "7d", "30d", "90d", "1y"].includes(body.timeRange) ? body.timeRange : "7d";
    const maxResultsRaw = Number(body.maxResults);
    const maxResults = Number.isFinite(maxResultsRaw) ? maxResultsRaw : 50;
    const formatType = ["all", "shorts", "longform"].includes(body.formatType) ? body.formatType : "all";
    const channelSize = ["all", "small", "medium", "large"].includes(body.channelSize) ? body.channelSize : "all";
    const scoreMode = ["channel", "topic"].includes(body.scoreMode) ? body.scoreMode : "topic";
    const clampedResults = Math.max(1, Math.min(50, maxResults));

    if (!topic.trim()) {
      return e.json(400, { error: "topic is required" });
    }

    const publishedAfter = getDateFilter(timeRange);
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&publishedAfter=${encodeURIComponent(
      publishedAfter
    )}&q=${encodeURIComponent(topic)}&maxResults=${clampedResults}&key=${apiKey}`;
    const searchData = fetchJson(searchUrl);
    const items = searchData.items || [];

    const videoIds = items.map((item) => item.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) {
      return e.json(200, { videos: [], avgViews: 0 });
    }

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds.join(
      ","
    )}&key=${apiKey}`;
    const videosData = fetchJson(videosUrl);

    const channelIds = Array.from(
      new Set(videosData.items?.map((item) => item.snippet?.channelId).filter(Boolean))
    );

    const channelsUrl = channelIds.length
      ? `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelIds.join(
          ","
        )}&key=${apiKey}`
      : null;

    const channelData = channelsUrl ? fetchJson(channelsUrl) : { items: [] };
    const channelStats = new Map((channelData.items || []).map((item) => [item.id, item.statistics]));

    const topicAvgViews = Math.round(
      videosData.items.reduce(
        (sum, item) => sum + parseInt(item.statistics?.viewCount || "0", 10),
        0
      ) / Math.max(videosData.items.length, 1)
    );

    const channelViewTotals = new Map();
    videosData.items.forEach((item) => {
      const channelId = item.snippet?.channelId;
      if (!channelId) return;
      const entry = channelViewTotals.get(channelId) || { total: 0, count: 0 };
      entry.total += parseInt(item.statistics?.viewCount || "0", 10);
      entry.count += 1;
      channelViewTotals.set(channelId, entry);
    });

    let videos = videosData.items
      .map((item) => {
        const views = parseInt(item.statistics?.viewCount || "0", 10);
        const likes = parseInt(item.statistics?.likeCount || "0", 10);
        const comments = parseInt(item.statistics?.commentCount || "0", 10);
        const durationInfo = parseDuration(item.contentDetails?.duration || "PT0S");
        const channelId = item.snippet?.channelId || "";
        const channelStatsEntry = channelStats.get(channelId);
        const subscribers = channelStatsEntry
          ? parseInt(channelStatsEntry.subscriberCount || "0", 10)
          : undefined;
        const channelAvg = channelViewTotals.get(channelId);
        const avgForScore =
          scoreMode === "channel" && channelAvg?.count ? channelAvg.total / channelAvg.count : topicAvgViews;
        const performanceScore = avgForScore > 0 ? views / avgForScore : 0;
        const isVertical = isShortsVideo(item.snippet?.thumbnails, durationInfo.seconds);
        return {
          id: item.id,
          title: item.snippet?.title || "Untitled",
          thumbnail:
            item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
          channelName: item.snippet?.channelTitle || "",
          channelId,
          channelSubscribers: subscribers,
          views,
          likes,
          comments,
          publishedAt: item.snippet?.publishedAt || "",
          duration: durationInfo.formatted,
          durationSeconds: durationInfo.seconds,
          isVertical,
          performanceScore,
          engagementRate: views > 0 ? (likes + comments) / views : 0,
        };
      })
      .filter((video) => {
        if (channelSize === "all") return true;
        if (typeof video.channelSubscribers !== "number") return false;
        if (channelSize === "large") return video.channelSubscribers > 100000;
        if (channelSize === "medium")
          return video.channelSubscribers >= 10000 && video.channelSubscribers <= 100000;
        if (channelSize === "small") return video.channelSubscribers < 10000;
        return true;
      });

    if (formatType === "shorts") {
      videos = videos.filter((video) => video.isVertical);
    } else if (formatType === "longform") {
      videos = videos.filter((video) => !video.isVertical);
    }

    return e.json(200, { videos, avgViews: topicAvgViews });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to find trends";
    return e.json(500, { error: message });
  }
});
