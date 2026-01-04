import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { pb, getFileUrl } from '@/integrations/pocketbase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUpRight, CheckCircle, Edit2, GripVertical, Image, Lightbulb, Plus, Trash2, Upload, Video } from 'lucide-react';
import { toast } from 'sonner';

type VideoStatus = 'idea' | 'scripting' | 'in_process' | 'editing' | 'scheduled' | 'released';

interface VideoProduction {
  id: string;
  title: string;
  description: string | null;
  status: VideoStatus;
  scheduled_date: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  created: string;
  updated: string;
  thumbnail?: string;
}

const columns: { id: VideoStatus; title: string; color: string }[] = [
  { id: 'idea', title: 'Ideas', color: 'bg-amber-500/20 border-amber-500/50' },
  { id: 'scripting', title: 'Scripting', color: 'bg-orange-500/20 border-orange-500/50' },
  { id: 'in_process', title: 'Shooting', color: 'bg-blue-500/20 border-blue-500/50' },
  { id: 'editing', title: 'Editing', color: 'bg-purple-500/20 border-purple-500/50' },
  { id: 'scheduled', title: 'Scheduled', color: 'bg-cyan-500/20 border-cyan-500/50' },
  { id: 'released', title: 'Released', color: 'bg-green-500/20 border-green-500/50' },
];

export default function Overview() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [newThumbnailPreview, setNewThumbnailPreview] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoProduction | null>(null);
  const [draggedVideo, setDraggedVideo] = useState<VideoProduction | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!newThumbnailFile) {
      setNewThumbnailPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(newThumbnailFile);
    setNewThumbnailPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [newThumbnailFile]);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['video-productions'],
    queryFn: async () => {
      try {
        const data = await pb.collection('video_productions').getFullList({
          sort: 'sort_order',
        });
        return data as VideoProduction[];
      } catch (error) {
        const err = error as any;
        console.error('VideoProduction list error', {
          status: err?.status,
          message: err?.message,
          data: err?.data,
          response: err?.response,
        });

        if (err?.status === 400) {
          console.warn('Retrying video_productions list without sort');
          const fallback = await pb.collection('video_productions').getFullList();
          return fallback as VideoProduction[];
        }

        throw error;
      }
    },
  });

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingVideo || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('thumbnail', file);

    setUploading(true);
    try {
      const updated = await pb
        .collection('video_productions')
        .update(editingVideo.id, formData);

      const publicUrl = getFileUrl(updated as any, (updated as any).thumbnail);

      if (publicUrl) {
        await pb.collection('video_productions').update(editingVideo.id, {
          thumbnail_url: publicUrl,
        });
        setEditingVideo({ ...editingVideo, thumbnail_url: publicUrl });
      }

      queryClient.invalidateQueries({ queryKey: ['video-productions'] });
      toast.success('Thumbnail uploaded!');
    } catch (error) {
      toast.error('Failed to upload thumbnail');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      const nextSortOrder = videos.length
        ? Math.max(...videos.map((video) => video.sort_order ?? 0)) + 1
        : 0;

      const basePayload = {
        title,
        description,
        status: 'idea',
        sort_order: nextSortOrder,
        scheduled_date: newScheduledDate || null,
      };

      try {
        if (newThumbnailFile) {
          const formData = new FormData();
          Object.entries(basePayload).forEach(([key, value]) => {
            formData.append(key, value ?? '');
          });
          formData.append('thumbnail', newThumbnailFile);

          const created = await pb.collection('video_productions').create(formData);
          const publicUrl = getFileUrl(created as any, (created as any).thumbnail);

          if (publicUrl) {
            await pb.collection('video_productions').update(created.id, {
              thumbnail_url: publicUrl,
            });
          }
          return;
        }

        await pb.collection('video_productions').create(basePayload);
      } catch (error) {
        const err = error as any;
        console.error('VideoProduction create error', {
          status: err?.status,
          message: err?.message,
          data: err?.data,
          response: err?.response,
        });

        if (err?.status === 400) {
          if (newThumbnailFile) {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description ?? '');
            formData.append('status', 'idea');
            if (newScheduledDate) {
              formData.append('scheduled_date', newScheduledDate);
            }
            formData.append('thumbnail', newThumbnailFile);

            const created = await pb.collection('video_productions').create(formData);
            const publicUrl = getFileUrl(created as any, (created as any).thumbnail);

            if (publicUrl) {
              await pb.collection('video_productions').update(created.id, {
                thumbnail_url: publicUrl,
              });
            }
            return;
          }

          await pb.collection('video_productions').create({
            title,
            description,
            status: 'idea',
            scheduled_date: newScheduledDate || null,
          });
          return;
        }

        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-productions'] });
      setNewTitle('');
      setNewDescription('');
      setNewScheduledDate('');
      setNewThumbnailFile(null);
      setNewThumbnailPreview(null);
      if (createFileInputRef.current) {
        createFileInputRef.current.value = '';
      }
      setDialogOpen(false);
      toast.success('Video idea added!');
    },
    onError: () => toast.error('Failed to add video'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VideoProduction> & { id: string }) => {
      await pb.collection('video_productions').update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-productions'] });
      setEditingVideo(null);
      toast.success('Video updated!');
    },
    onError: () => toast.error('Failed to update video'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection('video_productions').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-productions'] });
      toast.success('Video deleted!');
    },
    onError: () => toast.error('Failed to delete video'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number; status?: VideoStatus }[]) => {
      for (const update of updates) {
        await pb.collection('video_productions').update(update.id, {
          sort_order: update.sort_order,
          ...(update.status && { status: update.status }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-productions'] });
    },
    onError: () => toast.error('Failed to reorder videos'),
  });

  const handleDragStart = (e: React.DragEvent, video: VideoProduction) => {
    setDraggedVideo(video);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, videoId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (videoId) {
      setDropTargetId(videoId);
    }
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDropOnVideo = (e: React.DragEvent, targetVideo: VideoProduction) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedVideo || draggedVideo.id === targetVideo.id) {
      setDraggedVideo(null);
      setDropTargetId(null);
      return;
    }

    const targetStatus = targetVideo.status;
    const isCrossColumnMove = draggedVideo.status !== targetStatus;

    if (isCrossColumnMove) {
      const columnVideos = videos
        .filter((v) => v.status === targetStatus)
        .sort((a, b) => a.sort_order - b.sort_order);

      const targetIndex = columnVideos.findIndex((v) => v.id === targetVideo.id);
      const updates: { id: string; sort_order: number; status?: VideoStatus }[] = [];

      updates.push({ id: draggedVideo.id, sort_order: targetIndex, status: targetStatus });

      columnVideos.forEach((v, index) => {
        if (index >= targetIndex) {
          updates.push({ id: v.id, sort_order: index + 1 });
        }
      });

      reorderMutation.mutate(updates);
    } else {
      const columnVideos = videos
        .filter((v) => v.status === targetStatus)
        .sort((a, b) => a.sort_order - b.sort_order);

      const filteredVideos = columnVideos.filter((v) => v.id !== draggedVideo.id);
      const targetIndex = filteredVideos.findIndex((v) => v.id === targetVideo.id);

      filteredVideos.splice(targetIndex, 0, draggedVideo);

      const updates = filteredVideos.map((v, index) => ({
        id: v.id,
        sort_order: index,
      }));

      reorderMutation.mutate(updates);
    }

    setDraggedVideo(null);
    setDropTargetId(null);
  };

  const handleDropOnColumn = (e: React.DragEvent, status: VideoStatus) => {
    e.preventDefault();
    if (!draggedVideo || dropTargetId) return;

    if (draggedVideo.status === status) {
      setDraggedVideo(null);
      setDropTargetId(null);
      return;
    }

    const columnVideos = videos
      .filter((v) => v.status === status)
      .sort((a, b) => a.sort_order - b.sort_order);

    const updates: { id: string; sort_order: number; status?: VideoStatus }[] = [];

    updates.push({ id: draggedVideo.id, sort_order: 0, status });

    columnVideos.forEach((v, index) => {
      updates.push({ id: v.id, sort_order: index + 1 });
    });

    reorderMutation.mutate(updates);

    setDraggedVideo(null);
    setDropTargetId(null);
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle, description: newDescription });
  };

  const stats = {
    ideas: videos.filter((v) => v.status === 'idea').length,
    inProcess: videos.filter((v) => v.status === 'in_process').length,
    released: videos.filter((v) => v.status === 'released').length,
  };

  const statCards = [
    { title: 'Ideas', value: stats.ideas, icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Shooting', value: stats.inProcess, icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Released', value: stats.released, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <Layout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Video Production Overview</h1>
            <p className="text-muted-foreground mt-1">Track your video pipeline at a glance</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Video Idea
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Video Idea</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Thumbnail</label>
                  <div className="flex items-center gap-4">
                    <div className="w-32 aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                      {newThumbnailPreview ? (
                        <img src={newThumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={createFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewThumbnailFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => createFileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {newThumbnailFile ? 'Change' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </div>

                <Input
                  placeholder="Video title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <Input
                  type="date"
                  value={newScheduledDate}
                  onChange={(e) => setNewScheduledDate(e.target.value)}
                />
                <Button onClick={handleCreate} disabled={!newTitle.trim() || createMutation.isPending}>
                  {createMutation.isPending ? 'Adding...' : 'Add Video'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {statCards.map((stat) => (
                <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mb-10">
              <CardHeader>
                <CardTitle>Recent Videos</CardTitle>
              </CardHeader>
              <CardContent>
                {videos.length === 0 ? (
                  <p className="text-muted-foreground">No videos yet. Start by adding ideas below.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {videos.slice(0, 8).map((video) => (
                      <div key={video.id} className="group relative">
                        <div className="aspect-video rounded-lg bg-muted overflow-hidden">
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Video className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                          <span
                            className={`text-xs capitalize ${
                              video.status === 'idea'
                                ? 'text-amber-500'
                                : video.status === 'in_process'
                                ? 'text-blue-500'
                                : video.status === 'scheduled'
                                ? 'text-cyan-500'
                                : 'text-green-500'
                            }`}
                          >
                            {video.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Video Pipeline</h2>
                <p className="text-sm text-muted-foreground">Drag cards to update status and priority.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {columns.map((column) => {
                const columnVideos = videos
                  .filter((v) => v.status === column.id)
                  .sort((a, b) => a.sort_order - b.sort_order);

                return (
                  <div
                    key={column.id}
                    className={`rounded-xl border-2 border-dashed p-4 min-h-[400px] ${column.color}`}
                    onDragOver={(e) => handleDragOver(e)}
                    onDrop={(e) => handleDropOnColumn(e, column.id)}
                    onDragLeave={handleDragLeave}
                  >
                    <h3 className="font-semibold text-lg mb-4 text-foreground">{column.title}</h3>
                    <div className="space-y-3">
                      {columnVideos.map((video) => (
                        <Card
                          key={video.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, video)}
                          onDragOver={(e) => handleDragOver(e, video.id)}
                          onDrop={(e) => handleDropOnVideo(e, video)}
                          onDragLeave={handleDragLeave}
                          className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all bg-card overflow-hidden ${
                            dropTargetId === video.id ? 'ring-2 ring-primary ring-offset-2' : ''
                          } ${draggedVideo?.id === video.id ? 'opacity-50' : ''}`}
                        >
                          <div className="aspect-video bg-muted">
                            {video.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <GripVertical className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <CardHeader className="p-3 pb-1">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-medium line-clamp-1">{video.title}</CardTitle>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigate(`/production/${video.id}`);
                                  }}
                                >
                                  <ArrowUpRight className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setEditingVideo(video)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => deleteMutation.mutate(video.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {(video.description || video.scheduled_date) && (
                            <CardContent className="p-3 pt-0">
                              {video.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                              )}
                              {video.scheduled_date && (
                                <p className="text-xs text-primary mt-1">
                                  Scheduled: {new Date(video.scheduled_date).toLocaleDateString()}
                                </p>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Video</DialogTitle>
            </DialogHeader>
            {editingVideo && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Thumbnail</label>
                  <div className="flex items-center gap-4">
                    <div className="w-32 aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                      {editingVideo.thumbnail_url ? (
                        <img src={editingVideo.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </div>

                <Input
                  placeholder="Video title"
                  value={editingVideo.title}
                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                />
                <Textarea
                  placeholder="Description"
                  value={editingVideo.description || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                />
                <Input
                  type="date"
                  value={editingVideo.scheduled_date || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, scheduled_date: e.target.value })}
                />
                <Button
                  onClick={() =>
                    updateMutation.mutate({
                      id: editingVideo.id,
                      title: editingVideo.title,
                      description: editingVideo.description,
                      scheduled_date: editingVideo.scheduled_date,
                      thumbnail_url: editingVideo.thumbnail_url,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
