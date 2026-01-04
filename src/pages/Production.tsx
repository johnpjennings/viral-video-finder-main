import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { pb } from '@/integrations/pocketbase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, Calendar, Clapperboard, Image as ImageIcon } from 'lucide-react';


type VideoStatus = 'idea' | 'scripting' | 'in_process' | 'editing' | 'scheduled' | 'released';

interface VideoProduction {
  id: string;
  title: string;
  description: string | null;
  status: VideoStatus;
  scheduled_date: string | null;
  thumbnail_url: string | null;
}

const statusLabels: Record<VideoStatus, string> = {
  idea: 'Idea',
  scripting: 'Scripting',
  in_process: 'Shooting',
  editing: 'Editing',
  scheduled: 'Scheduled',
  released: 'Released',
};

const statusBadgeVariants: Record<VideoStatus, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> = {
  idea: 'warning',
  scripting: 'secondary',
  in_process: 'outline',
  editing: 'secondary',
  scheduled: 'default',
  released: 'success',
};

export default function Production() {
  const navigate = useNavigate();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['video-productions'],
    queryFn: async () => {
      const data = await pb.collection('video_productions').getFullList({
        sort: 'sort_order',
        fields: 'id,title,description,status,scheduled_date,thumbnail_url',
      });
      return data as VideoProduction[];
    },
  });

  return (
    <Layout>
      <div className="py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Video Production Suite</h1>
            <p className="text-muted-foreground mt-1">
              Open a video to manage ideas, scripts, shooting, editing, scheduling, and release analytics.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/overview')}>
            <Clapperboard className="h-4 w-4" />
            Open Overview Board
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No videos yet. Add a video idea in the overview board to get started.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg leading-snug">{video.title}</CardTitle>
                    <Badge variant={statusBadgeVariants[video.status]}>
                      {statusLabels[video.status]}
                    </Badge>
                  </div>
                  {video.scheduled_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Scheduled {new Date(video.scheduled_date).toLocaleDateString()}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {video.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{video.description}</p>
                  )}
                  <Button className="w-full gap-2" onClick={() => navigate(`/production/${video.id}`)}>
                    Open Suite
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
