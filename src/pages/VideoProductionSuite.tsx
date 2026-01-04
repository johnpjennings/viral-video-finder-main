import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import MDEditor from '@uiw/react-md-editor';
import { Layout } from '@/components/Layout';
import { pb, getFileUrl } from '@/integrations/pocketbase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar as CalendarIcon, FileText, History, Image as ImageIcon, Plus, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';


type VideoStatus = 'idea' | 'scripting' | 'in_process' | 'editing' | 'scheduled' | 'released';

interface VideoProduction {
  id: string;
  title: string;
  description: string | null;
  status: VideoStatus;
  scheduled_date: string | null;
  thumbnail_url: string | null;
  idea_notes?: string | null;
  shooting_notes?: string | null;
  filming_date?: string | null;
  scheduled_title?: string | null;
  scheduled_description?: string | null;
  scheduled_tags?: string | null;
  scheduled_thumbnail_a_url?: string | null;
  scheduled_thumbnail_b_url?: string | null;
  scheduled_thumbnail_c_url?: string | null;
}

interface Script {
  id: string;
  video_id: string;
  content: string;
  created: string;
  updated: string;
}

interface ScriptVersion {
  id: string;
  script_id: string;
  content: string;
  version_number: number;
  created: string;
}

interface ProductionTodo {
  id: string;
  video_id: string;
  task: string;
  completed: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  created: string;
}

interface EditingTodo {
  id: string;
  video_id: string;
  task: string;
  completed: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  created: string;
}

interface ProductionTodoSubtask {
  id: string;
  todo_id: string;
  title: string;
  completed: boolean;
}

interface EditingTodoSubtask {
  id: string;
  todo_id: string;
  title: string;
  completed: boolean;
}

interface EditingNote {
  id: string;
  video_id: string;
  content: string;
  created: string;
  updated: string;
}

interface ShotListItem {
  id: string;
  video_id: string;
  shot_number: string;
  shot_type?: string | null;
  shot_description: string;
  created: string;
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

const logPocketbaseError = (context: string, error: unknown) => {
  const err = error as any;
  const details = {
    status: err?.status,
    message: err?.message,
    data: err?.data,
    response: err?.response,
  };
  console.error(`${context} error`, err);
  console.error(`${context} details`, details);
  console.error(`${context} details (json)`, JSON.stringify(details, null, 2));
};

export default function VideoProductionSuite() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaNotes, setIdeaNotes] = useState('');
  const [ideaThumbnailUrl, setIdeaThumbnailUrl] = useState('');
  const [shootingNotes, setShootingNotes] = useState('');
  const [filmingDate, setFilmingDate] = useState('');
  const [newShotNumber, setNewShotNumber] = useState('');
  const [newShotType, setNewShotType] = useState('');
  const [newShotDescription, setNewShotDescription] = useState('');
  const [scheduledTitle, setScheduledTitle] = useState('');
  const [scheduledDescription, setScheduledDescription] = useState('');
  const [scheduledTags, setScheduledTags] = useState('');
  const [scheduledReleaseDate, setScheduledReleaseDate] = useState('');
  const [thumbnailA, setThumbnailA] = useState('');
  const [thumbnailB, setThumbnailB] = useState('');
  const [thumbnailC, setThumbnailC] = useState('');
  const [uploading, setUploading] = useState(false);

  const [scriptContent, setScriptContent] = useState('');
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const [newShootingTask, setNewShootingTask] = useState('');
  const [newEditingTask, setNewEditingTask] = useState('');
  const [activeProductionSubtaskTodoId, setActiveProductionSubtaskTodoId] = useState<string | null>(null);
  const [activeEditingSubtaskTodoId, setActiveEditingSubtaskTodoId] = useState<string | null>(null);
  const [productionSubtaskDrafts, setProductionSubtaskDrafts] = useState<Record<string, string>>({});
  const [editingSubtaskDrafts, setEditingSubtaskDrafts] = useState<Record<string, string>>({});
  const [editingNotesContent, setEditingNotesContent] = useState('');
  const [currentEditingNote, setCurrentEditingNote] = useState<EditingNote | null>(null);

  const { data: video, isLoading, isError } = useQuery({
    queryKey: ['video-production', videoId],
    queryFn: async () => {
      if (!videoId) return null;
      const data = await pb.collection('video_productions').getOne(videoId);
      return data as VideoProduction;
    },
    enabled: !!videoId,
  });

  const { data: script, refetch: refetchScript } = useQuery({
    queryKey: ['script', videoId],
    queryFn: async () => {
      if (!videoId) return null;
      try {
        const data = await pb
          .collection('scripts')
          .getFirstListItem(`video_id='${videoId}'`);
        return data as Script;
      } catch (error: any) {
        if (error?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!videoId,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['script-versions', currentScript?.id],
    queryFn: async () => {
      if (!currentScript?.id) return [];
      const data = await pb.collection('script_versions').getFullList({
        filter: `script_id='${currentScript.id}'`,
        sort: '-version_number',
      });
      return data as ScriptVersion[];
    },
    enabled: !!currentScript?.id,
  });

  const { data: shootingTodos = [] } = useQuery({
    queryKey: ['production-todos', videoId],
    queryFn: async () => {
      if (!videoId) return [];
      try {
        const data = await pb.collection('production_todos').getFullList({
          filter: `video_id='${videoId}'`,
          sort: 'created_at',
        });
        return data as ProductionTodo[];
      } catch (error) {
        logPocketbaseError('Production todo list', error);
        throw error;
      }
    },
    enabled: !!videoId,
  });

  const productionTodoIds = useMemo(() => shootingTodos.map((todo) => todo.id), [shootingTodos]);

  const { data: productionSubtasks = [] } = useQuery({
    queryKey: ['production-todo-subtasks', videoId, productionTodoIds],
    queryFn: async () => {
      if (!productionTodoIds.length) return [];
      try {
        const filter = productionTodoIds.map((id) => `todo_id='${id}'`).join(' || ');
        const data = await pb.collection('production_todo_subtasks').getFullList({ filter });
        return data as ProductionTodoSubtask[];
      } catch (error) {
        logPocketbaseError('Production subtask list', error);
        throw error;
      }
    },
    enabled: productionTodoIds.length > 0,
  });

  const { data: editingTodos = [] } = useQuery({
    queryKey: ['editing-todos', videoId],
    queryFn: async () => {
      if (!videoId) return [];
      try {
        const data = await pb.collection('editing_todos').getFullList({
          filter: `video_id='${videoId}'`,
          sort: 'created_at',
        });
        return data as EditingTodo[];
      } catch (error) {
        logPocketbaseError('Editing todo list', error);
        throw error;
      }
    },
    enabled: !!videoId,
  });

  const editingTodoIds = useMemo(() => editingTodos.map((todo) => todo.id), [editingTodos]);

  const { data: editingSubtasks = [] } = useQuery({
    queryKey: ['editing-todo-subtasks', videoId, editingTodoIds],
    queryFn: async () => {
      if (!editingTodoIds.length) return [];
      try {
        const filter = editingTodoIds.map((id) => `todo_id='${id}'`).join(' || ');
        const data = await pb.collection('editing_todo_subtasks').getFullList({ filter });
        return data as EditingTodoSubtask[];
      } catch (error) {
        logPocketbaseError('Editing subtask list', error);
        throw error;
      }
    },
    enabled: editingTodoIds.length > 0,
  });

  const productionSubtasksByTodo = useMemo(() => {
    const grouped: Record<string, ProductionTodoSubtask[]> = {};
    productionSubtasks.forEach((subtask) => {
      if (!grouped[subtask.todo_id]) grouped[subtask.todo_id] = [];
      grouped[subtask.todo_id].push(subtask);
    });
    return grouped;
  }, [productionSubtasks]);

  const editingSubtasksByTodo = useMemo(() => {
    const grouped: Record<string, EditingTodoSubtask[]> = {};
    editingSubtasks.forEach((subtask) => {
      if (!grouped[subtask.todo_id]) grouped[subtask.todo_id] = [];
      grouped[subtask.todo_id].push(subtask);
    });
    return grouped;
  }, [editingSubtasks]);

  const { data: editingNote } = useQuery({
    queryKey: ['editing-notes', videoId],
    queryFn: async () => {
      if (!videoId) return null;
      try {
        const data = await pb
          .collection('editing_notes')
          .getFirstListItem(`video_id='${videoId}'`);
        return data as EditingNote;
      } catch (error: any) {
        if (error?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!videoId,
  });

  const { data: shotListItems = [] } = useQuery({
    queryKey: ['shooting-shot-list', videoId],
    queryFn: async () => {
      if (!videoId) return [];
      const matchesVideoId = (item: ShotListItem) => {
        const record = item as any;
        const candidates = [
          record.video_id,
          record.video,
          record.videoId,
          record.video_production,
          record.videoProduction,
          record.production,
          record.production_id,
        ].filter(Boolean);
        return candidates.some((candidate) => {
          if (Array.isArray(candidate)) return candidate.includes(videoId);
          return candidate === videoId;
        });
      };
      try {
        const data = await pb.collection('shooting_shot_list_items').getFullList();
        return (data as ShotListItem[]).filter((item) => matchesVideoId(item));
      } catch (error) {
        logPocketbaseError('Shot list', error);
        throw error;
      }
    },
    enabled: !!videoId,
  });

  const sortedShotListItems = useMemo(() => {
    return [...shotListItems].sort((a, b) => {
      const aNum = Number.parseFloat(a.shot_number);
      const bNum = Number.parseFloat(b.shot_number);
      const aValid = Number.isFinite(aNum);
      const bValid = Number.isFinite(bNum);
      if (aValid && bValid) return aNum - bNum;
      if (aValid) return -1;
      if (bValid) return 1;
      return a.created.localeCompare(b.created);
    });
  }, [shotListItems]);

  const nextShotNumber = useMemo(() => {
    const numbers = shotListItems
      .map((item) => Number.parseFloat(item.shot_number))
      .filter((value) => Number.isFinite(value));
    if (numbers.length === 0) return 1;
    return Math.max(...numbers) + 1;
  }, [shotListItems]);

  const normalizeDateValue = (value?: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    const datePart = trimmed.split(' ')[0];
    const isoDate = datePart.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;

    const fallback = new Date(value);
    if (!isValid(fallback)) return '';
    return format(fallback, 'yyyy-MM-dd');
  };

  const parseLocalDate = (value: string) => {
    if (!value) return undefined;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return undefined;
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    if (!video) return;
    setIdeaTitle(video.title ?? '');
    setIdeaDescription(video.description ?? '');
    setIdeaNotes(video.idea_notes ?? '');
    setIdeaThumbnailUrl(video.thumbnail_url ?? '');
    setShootingNotes(video.shooting_notes ?? '');
    setFilmingDate(normalizeDateValue(video.filming_date));
    setScheduledTitle(video.scheduled_title ?? '');
    setScheduledDescription(video.scheduled_description ?? '');
    setScheduledTags(video.scheduled_tags ?? '');
    setScheduledReleaseDate(normalizeDateValue(video.scheduled_date));
    setThumbnailA(video.scheduled_thumbnail_a_url ?? '');
    setThumbnailB(video.scheduled_thumbnail_b_url ?? '');
    setThumbnailC(video.scheduled_thumbnail_c_url ?? '');
  }, [video]);

  useEffect(() => {
    if (script) {
      setCurrentScript(script);
      setScriptContent(script.content);
    } else {
      setCurrentScript(null);
      setScriptContent('');
    }
  }, [script]);

  useEffect(() => {
    if (editingNote) {
      setCurrentEditingNote(editingNote);
      setEditingNotesContent(editingNote.content);
    } else {
      setCurrentEditingNote(null);
      setEditingNotesContent('');
    }
  }, [editingNote]);

  const updateVideoMutation = useMutation({
    mutationFn: async (updates: Partial<VideoProduction>) => {
      if (!videoId) throw new Error('Missing video id');
      await pb.collection('video_productions').update(videoId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-production', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video-productions'] });
      toast.success('Video updated!');
    },
    onError: () => toast.error('Failed to update video'),
  });

  const createScriptMutation = useMutation({
    mutationFn: async () => {
      if (!videoId) return null;
      const data = await pb
        .collection('scripts')
        .create({ video_id: videoId, content: scriptContent });
      return data as Script;
    },
    onSuccess: (data) => {
      if (data) setCurrentScript(data);
      toast.success('Script created!');
      refetchScript();
    },
    onError: (error) => {
      const err = error as any;
      console.error('Script create error', {
        status: err?.status,
        message: err?.message,
        data: err?.data,
        response: err?.response,
      });
      toast.error('Failed to create script');
    },
  });

  const updateScriptMutation = useMutation({
    mutationFn: async () => {
      if (!currentScript) return;
      await pb.collection('scripts').update(currentScript.id, { content: scriptContent });
    },
    onSuccess: () => {
      toast.success('Script saved!');
      queryClient.invalidateQueries({ queryKey: ['script', videoId] });
    },
    onError: (error) => {
      const err = error as any;
      console.error('Script update error', {
        status: err?.status,
        message: err?.message,
        data: err?.data,
        response: err?.response,
      });
      toast.error('Failed to save script');
    },
  });

  const saveVersionMutation = useMutation({
    mutationFn: async () => {
      if (!currentScript) return;
      await pb.collection('scripts').update(currentScript.id, { content: scriptContent });
      const nextVersion = versions.length > 0 ? versions[0].version_number + 1 : 1;
      await pb.collection('script_versions').create({
        script_id: currentScript.id,
        content: scriptContent,
        version_number: nextVersion,
      });
    },
    onSuccess: () => {
      toast.success('Version saved!');
      queryClient.invalidateQueries({ queryKey: ['script-versions', currentScript?.id] });
      queryClient.invalidateQueries({ queryKey: ['script', videoId] });
    },
    onError: (error) => {
      const err = error as any;
      console.error('Script version save error', {
        status: err?.status,
        message: err?.message,
        data: err?.data,
        response: err?.response,
      });
      toast.error('Failed to save version');
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (version: ScriptVersion) => {
      if (!currentScript) return null;
      await pb.collection('scripts').update(currentScript.id, { content: version.content });
      return version.content;
    },
    onSuccess: (content) => {
      if (content) {
        setScriptContent(content);
        toast.success('Version restored!');
        setVersionsOpen(false);
        queryClient.invalidateQueries({ queryKey: ['script', videoId] });
      }
    },
    onError: () => toast.error('Failed to restore version'),
  });

  const addShootingTodoMutation = useMutation({
    mutationFn: async (task: string) => {
      if (!videoId) return;
      const timestamp = new Date().toISOString();
      await pb.collection('production_todos').create({
        video_id: videoId,
        task,
        completed: false,
        created_at: timestamp,
        updated_at: timestamp,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-todos', videoId] });
      setNewShootingTask('');
      toast.success('Task added!');
    },
    onError: (error) => {
      logPocketbaseError('Production todo create', error);
      toast.error('Failed to add task');
    },
  });

  const addProductionSubtaskMutation = useMutation({
    mutationFn: async ({ todoId, title }: { todoId: string; title: string }) => {
      await pb.collection('production_todo_subtasks').create({
        todo_id: todoId,
        title,
        completed: false,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production-todo-subtasks', videoId] });
      setProductionSubtaskDrafts((prev) => ({ ...prev, [variables.todoId]: '' }));
      setActiveProductionSubtaskTodoId(null);
      toast.success('Subtask added!');
    },
    onError: (error) => {
      logPocketbaseError('Production subtask create', error);
      toast.error('Failed to add subtask');
    },
  });

  const toggleShootingTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await pb.collection('production_todos').update(id, {
        completed,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-todos', videoId] });
    },
    onError: () => toast.error('Failed to update task'),
  });

  const toggleProductionSubtaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await pb.collection('production_todo_subtasks').update(id, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-todo-subtasks', videoId] });
    },
    onError: (error) => {
      logPocketbaseError('Production subtask update', error);
      toast.error('Failed to update subtask');
    },
  });

  const deleteShootingTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection('production_todos').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-todos', videoId] });
      toast.success('Task deleted!');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const deleteProductionSubtaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection('production_todo_subtasks').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-todo-subtasks', videoId] });
      toast.success('Subtask deleted!');
    },
    onError: (error) => {
      logPocketbaseError('Production subtask delete', error);
      toast.error('Failed to delete subtask');
    },
  });

  const addEditingTodoMutation = useMutation({
    mutationFn: async (task: string) => {
      if (!videoId) return;
      const timestamp = new Date().toISOString();
      await pb.collection('editing_todos').create({
        video_id: videoId,
        task,
        completed: false,
        created_at: timestamp,
        updated_at: timestamp,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editing-todos', videoId] });
      setNewEditingTask('');
      toast.success('Task added!');
    },
    onError: (error) => {
      logPocketbaseError('Editing todo create', error);
      toast.error('Failed to add task');
    },
  });

  const addEditingSubtaskMutation = useMutation({
    mutationFn: async ({ todoId, title }: { todoId: string; title: string }) => {
      await pb.collection('editing_todo_subtasks').create({
        todo_id: todoId,
        title,
        completed: false,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['editing-todo-subtasks', videoId] });
      setEditingSubtaskDrafts((prev) => ({ ...prev, [variables.todoId]: '' }));
      setActiveEditingSubtaskTodoId(null);
      toast.success('Subtask added!');
    },
    onError: (error) => {
      logPocketbaseError('Editing subtask create', error);
      toast.error('Failed to add subtask');
    },
  });

  const toggleEditingTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await pb.collection('editing_todos').update(id, {
        completed,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editing-todos', videoId] });
    },
    onError: () => toast.error('Failed to update task'),
  });

  const toggleEditingSubtaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await pb.collection('editing_todo_subtasks').update(id, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editing-todo-subtasks', videoId] });
    },
    onError: (error) => {
      logPocketbaseError('Editing subtask update', error);
      toast.error('Failed to update subtask');
    },
  });

  const deleteEditingTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection('editing_todos').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editing-todos', videoId] });
      toast.success('Task deleted!');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const deleteEditingSubtaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection('editing_todo_subtasks').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editing-todo-subtasks', videoId] });
      toast.success('Subtask deleted!');
    },
    onError: (error) => {
      logPocketbaseError('Editing subtask delete', error);
      toast.error('Failed to delete subtask');
    },
  });

  const saveEditingNotesMutation = useMutation({
    mutationFn: async () => {
      if (!videoId) return;
      if (currentEditingNote) {
        await pb.collection('editing_notes').update(currentEditingNote.id, { content: editingNotesContent });
      } else {
        const data = await pb
          .collection('editing_notes')
          .create({ video_id: videoId, content: editingNotesContent });
        setCurrentEditingNote(data as EditingNote);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editing-notes', videoId] });
      toast.success('Notes saved!');
    },
    onError: () => toast.error('Failed to save notes'),
  });

  const addShotListItemMutation = useMutation({
    mutationFn: async (payload: { shotNumber: string; shotType?: string; shotDescription: string }) => {
      if (!videoId) {
        throw new Error('Missing video id for shot list item.');
      }
      const created = await pb.collection('shooting_shot_list_items').create({
        video_id: videoId,
        shot_number: payload.shotNumber,
        shot_type: payload.shotType || null,
        shot_description: payload.shotDescription,
      });
      return created as ShotListItem;
    },
    onSuccess: (created) => {
      if (created) {
        queryClient.setQueryData<ShotListItem[]>(
          ['shooting-shot-list', videoId],
          (current) => [...(current ?? []), created],
        );
      }
      queryClient.invalidateQueries({ queryKey: ['shooting-shot-list', videoId] });
      setNewShotNumber('');
      setNewShotType('');
      setNewShotDescription('');
      toast.success('Shot added!');
    },
    onError: (error) => {
      logPocketbaseError('Shot list create', error);
      toast.error('Failed to add shot');
    },
  });

  const deleteShotListItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection('shooting_shot_list_items').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shooting-shot-list', videoId] });
      toast.success('Shot removed!');
    },
    onError: (error) => {
      logPocketbaseError('Shot list delete', error);
      toast.error('Failed to remove shot');
    },
  });

  const handleIdeaSave = () => {
    if (!ideaTitle.trim()) {
      toast.error('Please add a title before saving.');
      return;
    }
    updateVideoMutation.mutate({
      title: ideaTitle.trim(),
      description: ideaDescription.trim() || null,
      idea_notes: ideaNotes.trim() || null,
      thumbnail_url: ideaThumbnailUrl.trim() || null,
    });
  };

  const handleShootingSave = () => {
    updateVideoMutation.mutate({
      shooting_notes: shootingNotes.trim() || null,
      filming_date: filmingDate || null,
    });
  };

  const handleScheduledSave = () => {
    updateVideoMutation.mutate({
      scheduled_title: scheduledTitle.trim() || null,
      scheduled_description: scheduledDescription.trim() || null,
      scheduled_tags: scheduledTags.trim() || null,
      scheduled_date: scheduledReleaseDate || null,
      scheduled_thumbnail_a_url: thumbnailA.trim() || null,
      scheduled_thumbnail_b_url: thumbnailB.trim() || null,
      scheduled_thumbnail_c_url: thumbnailC.trim() || null,
    });
  };

  const handleIdeaThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoId || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('thumbnail', file);

    setUploading(true);
    try {
      const updated = await pb.collection('video_productions').update(videoId, formData);
      const publicUrl = getFileUrl(updated as any, (updated as any).thumbnail);

      if (publicUrl) {
        await pb.collection('video_productions').update(videoId, {
          thumbnail_url: publicUrl,
        });
        setIdeaThumbnailUrl(publicUrl);
      }

      queryClient.invalidateQueries({ queryKey: ['video-production', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video-productions'] });
      toast.success('Thumbnail uploaded!');
    } catch (error) {
      toast.error('Failed to upload thumbnail');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  if (!videoId) {
    return (
      <Layout>
        <div className="py-8 text-center text-muted-foreground">
          <p>Select a video to open the production suite.</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  if (isError || !video) {
    return (
      <Layout>
        <div className="py-8 text-center text-muted-foreground space-y-4">
          <p>Video not found.</p>
          <Button variant="outline" onClick={() => navigate('/production')}>
            Back to Suite
          </Button>
        </div>
      </Layout>
    );
  }

  const shootingCompleted = shootingTodos.filter((todo) => todo.completed).length;
  const shootingProgress = shootingTodos.length > 0 ? (shootingCompleted / shootingTodos.length) * 100 : 0;
  const editingCompleted = editingTodos.filter((todo) => todo.completed).length;
  const editingProgress = editingTodos.length > 0 ? (editingCompleted / editingTodos.length) * 100 : 0;
  const canAddShot = newShotDescription.trim().length > 0;

  const handleAddShot = () => {
    if (!canAddShot) {
      toast.error('Add a shot description before saving.');
      return;
    }
    const shotNumber = newShotNumber.trim() || String(nextShotNumber);
    addShotListItemMutation.mutate({
      shotNumber,
      shotType: newShotType.trim(),
      shotDescription: newShotDescription.trim(),
    });
  };

  return (
    <Layout>
      <div className="py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Button variant="ghost" className="gap-2 px-0" onClick={() => navigate('/production')}>
              <ArrowLeft className="h-4 w-4" />
              Back to Suite
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{video.title}</h1>
              <p className="text-muted-foreground">Manage every phase of this video in one place.</p>
            </div>
          </div>
          <Badge variant={statusBadgeVariants[video.status]} className="w-fit">
            {statusLabels[video.status]}
          </Badge>
        </div>

        <Tabs defaultValue="ideas" className="w-full">
          <TabsList className="w-full flex flex-wrap justify-start gap-1 h-auto">
            <TabsTrigger value="ideas">Ideas</TabsTrigger>
            <TabsTrigger value="scripting">Scripting</TabsTrigger>
            <TabsTrigger value="shooting">Shooting</TabsTrigger>
            <TabsTrigger value="editing">Editing</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>

          <TabsContent value="ideas">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Idea Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Video title"
                    value={ideaTitle}
                    onChange={(event) => setIdeaTitle(event.target.value)}
                  />
                  <Textarea
                    placeholder="Description"
                    value={ideaDescription}
                    onChange={(event) => setIdeaDescription(event.target.value)}
                    className="min-h-[140px]"
                  />
                  <Textarea
                    placeholder="Idea notes"
                    value={ideaNotes}
                    onChange={(event) => setIdeaNotes(event.target.value)}
                    className="min-h-[140px]"
                  />
                  <Input
                    placeholder="Thumbnail URL"
                    value={ideaThumbnailUrl}
                    onChange={(event) => setIdeaThumbnailUrl(event.target.value)}
                  />
                  <Button onClick={handleIdeaSave} disabled={updateVideoMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Idea
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thumbnail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-video rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                    {ideaThumbnailUrl ? (
                      <img src={ideaThumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIdeaThumbnailUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Thumbnail'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scripting">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Script Editor</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {currentScript && (
                    <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <History className="h-4 w-4" />
                          Versions ({versions.length})
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Script Versions</DialogTitle>
                        </DialogHeader>
                        {versions.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">
                            No saved versions yet. Click "Save Version" to create one.
                          </p>
                        ) : (
                          <div className="space-y-4 mt-4">
                            {versions.map((version) => (
                              <div key={version.id} className="border rounded-lg p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Version {version.version_number}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      {(() => {
                                        const createdAt = new Date(version.created);
                                        return isValid(createdAt)
                                          ? format(createdAt, 'MMM d, yyyy h:mm a')
                                          : 'Unknown date';
                                      })()}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => restoreVersionMutation.mutate(version)}
                                    >
                                      Restore
                                    </Button>
                                  </div>
                                </div>
                                <pre className="text-xs bg-muted p-3 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {version.content.slice(0, 500)}
                                  {version.content.length > 500 && '...'}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => saveVersionMutation.mutate()}
                    disabled={!currentScript || saveVersionMutation.isPending}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Save Version
                  </Button>
                  <Button
                    onClick={() => {
                      if (currentScript) {
                        updateScriptMutation.mutate();
                      } else {
                        createScriptMutation.mutate();
                      }
                    }}
                    disabled={updateScriptMutation.isPending || createScriptMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {currentScript ? 'Save Script' : 'Create Script'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div data-color-mode="dark">
                  <MDEditor
                    value={scriptContent}
                    onChange={(value) => setScriptContent(value || '')}
                    height={500}
                    preview="edit"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shooting">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Shooting Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Filming Date</label>
                    <Input
                      type="date"
                      value={filmingDate}
                      onChange={(event) => setFilmingDate(event.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <Textarea
                    placeholder="Location, shot list, gear notes, b-roll ideas..."
                    value={shootingNotes}
                    onChange={(event) => setShootingNotes(event.target.value)}
                    className="min-h-[220px]"
                  />
                  <Button onClick={handleShootingSave} disabled={updateVideoMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Shooting Notes
                  </Button>

                  <div className="border-t border-border/60 pt-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Shooting To-Do</h3>
                      {shootingTodos.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {shootingCompleted}/{shootingTodos.length} completed ({Math.round(shootingProgress)}%)
                        </span>
                      )}
                    </div>
                    {shootingTodos.length > 0 && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${shootingProgress}%` }}
                        />
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a shooting task..."
                          value={newShootingTask}
                          onChange={(event) => setNewShootingTask(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && newShootingTask.trim()) {
                              addShootingTodoMutation.mutate(newShootingTask.trim());
                            }
                          }}
                        />
                        <Button
                          onClick={() => addShootingTodoMutation.mutate(newShootingTask.trim())}
                          disabled={!newShootingTask.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {shootingTodos.length === 0 ? (
                        <p className="text-muted-foreground text-center py-6">
                          No shooting tasks yet. Add your first task above.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {shootingTodos.map((todo) => {
                            const subtasks = productionSubtasksByTodo[todo.id] ?? [];
                            const subtaskDraft = productionSubtaskDrafts[todo.id] ?? '';
                            return (
                              <div key={todo.id} className="space-y-2">
                                <div
                                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                                    todo.completed ? 'bg-muted/50' : 'bg-card'
                                  }`}
                                >
                                  <Checkbox
                                    checked={todo.completed}
                                    onCheckedChange={(checked) =>
                                      toggleShootingTodoMutation.mutate({ id: todo.id, completed: !!checked })
                                    }
                                  />
                                  <span
                                    className={`flex-1 ${
                                      todo.completed ? 'line-through text-muted-foreground' : ''
                                    }`}
                                  >
                                    {todo.task}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      setActiveProductionSubtaskTodoId((current) =>
                                        current === todo.id ? null : todo.id,
                                      )
                                    }
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => deleteShootingTodoMutation.mutate(todo.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                {subtasks.length > 0 && (
                                  <div className="ml-9 space-y-2">
                                    {subtasks.map((subtask) => (
                                      <div
                                        key={subtask.id}
                                        className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                                          subtask.completed ? 'bg-muted/50' : 'bg-background'
                                        }`}
                                      >
                                        <Checkbox
                                          checked={subtask.completed}
                                          onCheckedChange={(checked) =>
                                            toggleProductionSubtaskMutation.mutate({
                                              id: subtask.id,
                                              completed: !!checked,
                                            })
                                          }
                                        />
                                        <span
                                          className={`flex-1 text-sm ${
                                            subtask.completed ? 'line-through text-muted-foreground' : ''
                                          }`}
                                        >
                                          {subtask.title}
                                        </span>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7"
                                          onClick={() => setActiveProductionSubtaskTodoId(todo.id)}
                                          aria-label="Add subtask"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-destructive"
                                          onClick={() => deleteProductionSubtaskMutation.mutate(subtask.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {activeProductionSubtaskTodoId === todo.id && (
                                  <div className="ml-9 flex gap-2">
                                    <Input
                                      placeholder="Add a subtask..."
                                      value={subtaskDraft}
                                      onChange={(event) =>
                                        setProductionSubtaskDrafts((prev) => ({
                                          ...prev,
                                          [todo.id]: event.target.value,
                                        }))
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' && subtaskDraft.trim()) {
                                          addProductionSubtaskMutation.mutate({
                                            todoId: todo.id,
                                            title: subtaskDraft.trim(),
                                          });
                                        }
                                      }}
                                    />
                                    <Button
                                      onClick={() =>
                                        addProductionSubtaskMutation.mutate({
                                          todoId: todo.id,
                                          title: subtaskDraft.trim(),
                                        })
                                      }
                                      disabled={!subtaskDraft.trim()}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Shot List</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-2 md:grid-cols-[140px_200px_1fr_auto]">
                      <Input
                        placeholder={`Shot # (next ${nextShotNumber})`}
                        value={newShotNumber}
                        onChange={(event) => setNewShotNumber(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAddShot();
                          }
                        }}
                      />
                      <Input
                        placeholder="Shot type"
                        value={newShotType}
                        onChange={(event) => setNewShotType(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAddShot();
                          }
                        }}
                      />
                      <Input
                        placeholder="Shot description"
                        value={newShotDescription}
                        onChange={(event) => setNewShotDescription(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAddShot();
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddShot}
                        disabled={!canAddShot || addShotListItemMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shot #</TableHead>
                          <TableHead>Shot Type</TableHead>
                          <TableHead>Shot Description</TableHead>
                          <TableHead className="w-[80px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedShotListItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                              No shots yet. Add your first shot above.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedShotListItems.map((shot) => (
                            <TableRow key={shot.id}>
                              <TableCell className="font-medium">{shot.shot_number}</TableCell>
                              <TableCell>{shot.shot_type || '—'}</TableCell>
                              <TableCell className="min-w-[240px]">{shot.shot_description}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => deleteShotListItemMutation.mutate(shot.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="editing">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Editing To-Do</CardTitle>
                    {editingTodos.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {editingCompleted}/{editingTodos.length} completed ({Math.round(editingProgress)}%)
                      </span>
                    )}
                  </div>
                  {editingTodos.length > 0 && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${editingProgress}%` }}
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add an editing task..."
                        value={newEditingTask}
                        onChange={(event) => setNewEditingTask(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && newEditingTask.trim()) {
                            addEditingTodoMutation.mutate(newEditingTask.trim());
                          }
                        }}
                      />
                      <Button
                        onClick={() => addEditingTodoMutation.mutate(newEditingTask.trim())}
                        disabled={!newEditingTask.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {editingTodos.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No editing tasks yet. Add your first editing task above.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {editingTodos.map((todo) => {
                          const subtasks = editingSubtasksByTodo[todo.id] ?? [];
                          const subtaskDraft = editingSubtaskDrafts[todo.id] ?? '';
                          return (
                            <div key={todo.id} className="space-y-2">
                              <div
                                className={`flex items-center gap-3 p-3 rounded-lg border ${
                                  todo.completed ? 'bg-muted/50' : 'bg-card'
                                }`}
                              >
                                <Checkbox
                                  checked={todo.completed}
                                  onCheckedChange={(checked) =>
                                    toggleEditingTodoMutation.mutate({ id: todo.id, completed: !!checked })
                                  }
                                />
                                <span
                                  className={`flex-1 ${
                                    todo.completed ? 'line-through text-muted-foreground' : ''
                                  }`}
                                >
                                  {todo.task}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    setActiveEditingSubtaskTodoId((current) =>
                                      current === todo.id ? null : todo.id,
                                    )
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => deleteEditingTodoMutation.mutate(todo.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              {subtasks.length > 0 && (
                                <div className="ml-9 space-y-2">
                                  {subtasks.map((subtask) => (
                                    <div
                                      key={subtask.id}
                                      className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                                        subtask.completed ? 'bg-muted/50' : 'bg-background'
                                      }`}
                                    >
                                      <Checkbox
                                        checked={subtask.completed}
                                        onCheckedChange={(checked) =>
                                          toggleEditingSubtaskMutation.mutate({
                                            id: subtask.id,
                                            completed: !!checked,
                                          })
                                        }
                                      />
                                      <span
                                        className={`flex-1 text-sm ${
                                          subtask.completed ? 'line-through text-muted-foreground' : ''
                                        }`}
                                      >
                                        {subtask.title}
                                      </span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => setActiveEditingSubtaskTodoId(todo.id)}
                                        aria-label="Add subtask"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => deleteEditingSubtaskMutation.mutate(subtask.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {activeEditingSubtaskTodoId === todo.id && (
                                <div className="ml-9 flex gap-2">
                                  <Input
                                    placeholder="Add a subtask..."
                                    value={subtaskDraft}
                                    onChange={(event) =>
                                      setEditingSubtaskDrafts((prev) => ({
                                        ...prev,
                                        [todo.id]: event.target.value,
                                      }))
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' && subtaskDraft.trim()) {
                                        addEditingSubtaskMutation.mutate({
                                          todoId: todo.id,
                                          title: subtaskDraft.trim(),
                                        });
                                      }
                                    }}
                                  />
                                  <Button
                                    onClick={() =>
                                      addEditingSubtaskMutation.mutate({
                                        todoId: todo.id,
                                        title: subtaskDraft.trim(),
                                      })
                                    }
                                    disabled={!subtaskDraft.trim()}
                                  >
                                    Add
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Editing Notes
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => saveEditingNotesMutation.mutate()}
                    disabled={saveEditingNotesMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Color grading notes, audio fixes, timestamps for revisions..."
                    value={editingNotesContent}
                    onChange={(event) => setEditingNotesContent(event.target.value)}
                    className="min-h-[260px]"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scheduled">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Scheduled Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Scheduled title (defaults to idea title)"
                    value={scheduledTitle}
                    onChange={(event) => setScheduledTitle(event.target.value)}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Scheduled release date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !scheduledReleaseDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduledReleaseDate
                            ? format(parseLocalDate(scheduledReleaseDate) ?? new Date(), 'PPP')
                            : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={parseLocalDate(scheduledReleaseDate)}
                          onSelect={(date) => setScheduledReleaseDate(date ? format(date, 'yyyy-MM-dd') : '')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Textarea
                    placeholder="Scheduled description (defaults to idea description)"
                    value={scheduledDescription}
                    onChange={(event) => setScheduledDescription(event.target.value)}
                    className="min-h-[140px]"
                  />
                  <Input
                    placeholder="Tags (comma separated)"
                    value={scheduledTags}
                    onChange={(event) => setScheduledTags(event.target.value)}
                  />
                  <Button onClick={handleScheduledSave} disabled={updateVideoMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Scheduled Details
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thumbnails A/B/C</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Thumbnail A', value: thumbnailA, setter: setThumbnailA },
                    { label: 'Thumbnail B', value: thumbnailB, setter: setThumbnailB },
                    { label: 'Thumbnail C', value: thumbnailC, setter: setThumbnailC },
                  ].map((thumbnail) => (
                    <div key={thumbnail.label} className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{thumbnail.label}</p>
                      <div className="aspect-video rounded-md bg-muted overflow-hidden flex items-center justify-center">
                        {thumbnail.value ? (
                          <img src={thumbnail.value} alt={thumbnail.label} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <Input
                        placeholder="Paste thumbnail URL"
                        value={thumbnail.value}
                        onChange={(event) => thumbnail.setter(event.target.value)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}
