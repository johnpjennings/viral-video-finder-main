import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { pb } from '@/integrations/pocketbase/client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Video, ListTodo, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isValid } from 'date-fns';

interface VideoProduction {
  id: string;
  title: string;
  description: string | null;
  status: 'idea' | 'scripting' | 'in_process' | 'editing' | 'scheduled' | 'released';
  scheduled_date: string | null;
  created: string;
}

interface PlannerTask {
  id: string;
  title: string;
  task_type: 'daily' | 'weekly' | 'monthly';
  due_date: string;
  completed: boolean;
}

export default function ContentCalendar() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedVideo, setDraggedVideo] = useState<VideoProduction | null>(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['video-productions'],
    queryFn: async () => {
      const data = await pb.collection('video_productions').getFullList({
        sort: 'sort_order',
      });
      return data as VideoProduction[];
    },
  });

  const { data: plannerTasks = [] } = useQuery({
    queryKey: ['planner-tasks'],
    queryFn: async () => {
      const data = await pb.collection('planner_tasks').getFullList({
        sort: 'due_date',
      });
      return data as PlannerTask[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, scheduled_date }: { id: string; scheduled_date: string | null }) => {
      await pb.collection('video_productions').update(id, { scheduled_date });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['video-productions'] });
      queryClient.invalidateQueries({ queryKey: ['video-production', variables.id] });
      toast.success(variables.scheduled_date ? 'Video scheduled!' : 'Video unscheduled!');
    },
    onError: () => toast.error('Failed to update video'),
  });

  const handleUnschedule = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    updateMutation.mutate({ id: videoId, scheduled_date: null });
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = monthStart.getDay();
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const scheduledVideos = useMemo(() => 
    videos.filter(
      (v) => v.scheduled_date || v.status === 'in_process' || v.status === 'scheduled' || v.status === 'released'
    ), 
    [videos]
  );

  const unscheduledVideos = useMemo(
    () => videos.filter((v) => !v.scheduled_date && v.status !== 'released'),
    [videos],
  );

  const normalizeDateKey = (value: string) => {
    if (!value) return null;
    const trimmed = value.trim();
    const datePart = trimmed.split(' ')[0];
    const isoDate = datePart.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;

    const fallback = new Date(value);
    if (!isValid(fallback)) return null;
    return format(fallback, 'yyyy-MM-dd');
  };

  const getVideosForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return scheduledVideos.filter((video) => {
      if (!video.scheduled_date) return false;
      const storedKey = normalizeDateKey(video.scheduled_date);
      return storedKey === dateKey;
    });
  };

  const getTasksForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return plannerTasks.filter((task) => {
      const storedKey = normalizeDateKey(task.due_date);
      return storedKey === dateKey;
    });
  };

  const handleDragStart = (video: VideoProduction) => {
    setDraggedVideo(video);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (date: Date) => {
    if (draggedVideo) {
      updateMutation.mutate({
        id: draggedVideo.id,
        scheduled_date: format(date, 'yyyy-MM-dd'),
      });
    }
    setDraggedVideo(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idea': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'scripting': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'in_process': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'editing': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'scheduled': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
      case 'released': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-muted';
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
      case 'weekly': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'monthly': return 'bg-purple-500/20 text-purple-600 dark:text-purple-400';
      default: return 'bg-muted';
    }
  };

  return (
    <Layout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Content Calendar</h1>
            <p className="text-muted-foreground mt-1">Drag videos onto dates to schedule releases</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Unscheduled Videos Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card rounded-xl border border-border p-4">
              <h2 className="font-semibold mb-4 text-foreground">Unscheduled Videos</h2>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : unscheduledVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No videos to schedule</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {unscheduledVideos.map((video) => (
                    <div
                      key={video.id}
                      draggable
                      onDragStart={() => handleDragStart(video)}
                      className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${getStatusColor(video.status)}`}
                    >
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium truncate">{video.title}</span>
                      </div>
                      <span className="text-xs capitalize mt-1 block opacity-75">
                        {video.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {paddedDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="min-h-[120px] bg-muted/20" />;
                  }

                  const dayVideos = getVideosForDate(day);
                  const dayTasks = getTasksForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  const totalItems = dayVideos.length + dayTasks.length;

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[120px] border-b border-r border-border p-2 ${
                        !isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''
                      } ${isTodayDate ? 'bg-primary/5' : ''}`}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(day)}
                    >
                      <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {/* Show videos */}
                        {dayVideos.slice(0, 2).map((video) => (
                          <div
                            key={video.id}
                            draggable
                            onDragStart={() => handleDragStart(video)}
                            className={`text-xs p-1.5 rounded cursor-grab truncate flex items-center gap-1 group ${getStatusColor(video.status)}`}
                          >
                            <Video className="h-3 w-3 shrink-0" />
                            <span className="truncate flex-1">{video.title}</span>
                            <button
                              onClick={(e) => handleUnschedule(e, video.id)}
                              className="opacity-0 group-hover:opacity-100 hover:bg-background/50 rounded p-0.5 transition-opacity"
                              title="Unschedule video"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {/* Show planner tasks */}
                        {dayTasks.slice(0, 2 - Math.min(dayVideos.length, 2)).map((task) => (
                          <div
                            key={task.id}
                            className={`text-xs p-1.5 rounded truncate flex items-center gap-1 ${getTaskTypeColor(task.task_type)} ${task.completed ? 'line-through opacity-50' : ''}`}
                          >
                            <ListTodo className="h-3 w-3 shrink-0" />
                            <span className="truncate">{task.title}</span>
                          </div>
                        ))}
                        {totalItems > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{totalItems - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
