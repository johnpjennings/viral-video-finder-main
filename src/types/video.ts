export interface Video {
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
}

export interface Channel {
  id: string;
  name: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export type SortOption = 'views' | 'performance' | 'recent' | 'engagement';
