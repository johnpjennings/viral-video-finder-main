import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '@/components/SearchBar';
import { Hero } from '@/components/Hero';
import { ChannelHeader } from '@/components/ChannelHeader';
import { VideoCard } from '@/components/VideoCard';
import { SortFilter } from '@/components/SortFilter';
import { StatsOverview } from '@/components/StatsOverview';
import { Layout } from '@/components/Layout';
import { SortOption, Video, Channel } from '@/types/video';
import { youtubeSearch } from '@/lib/youtubeApi';
import { toast } from 'sonner';

const ChannelAnalyzer = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('performance');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [avgViews, setAvgViews] = useState(0);
  const channelParam = searchParams.get('channel') ?? '';
  const lastAutoSearchedRef = useRef<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const response = await youtubeSearch(query, 50);
      setChannel(response.channel);
      setVideos(response.videos);
      setAvgViews(response.avgViews);
      setHasSearched(true);
      toast.success(`Found ${response.videos.length} videos from ${response.channel.name}`);
    } catch (err) {
      console.error('Search error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to search channel');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-search if channel is provided in URL
  useEffect(() => {
    if (!channelParam) return;
    if (lastAutoSearchedRef.current === channelParam) return;

    lastAutoSearchedRef.current = channelParam;
    handleSearch(channelParam);
  }, [channelParam, handleSearch]);

  const sortedVideos = useMemo(() => {
    const videosCopy = [...videos];
    
    switch (sortBy) {
      case 'performance':
        return videosCopy.sort((a, b) => b.performanceScore - a.performanceScore);
      case 'views':
        return videosCopy.sort((a, b) => b.views - a.views);
      case 'recent':
        return videosCopy.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      case 'engagement':
        return videosCopy.sort((a, b) => b.engagementRate - a.engagementRate);
      default:
        return videosCopy;
    }
  }, [sortBy, videos]);

  return (
    <Layout>
      {!hasSearched ? (
        <>
          <Hero />
          <SearchBar onSearch={handleSearch} isLoading={isLoading} initialQuery={channelParam} />
          
          <p className="text-center text-sm text-muted-foreground mt-6">
            Enter a YouTube channel name, handle (@username), or channel URL
          </p>
        </>
      ) : (
        <div className="py-8 space-y-8">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} initialQuery={channelParam} />
          
          {channel && <ChannelHeader channel={channel} avgViews={avgViews} />}
          
          <StatsOverview videos={videos} avgViews={avgViews} />
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-foreground">
              {videos.length} Videos Analyzed
            </h3>
            <SortFilter currentSort={sortBy} onSortChange={setSortBy} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedVideos.map((video, index) => (
              <VideoCard key={video.id} video={video} index={index} avgViews={avgViews} />
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ChannelAnalyzer;
