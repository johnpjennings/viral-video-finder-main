import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { pb } from '@/integrations/pocketbase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Sun, CalendarDays, CalendarRange, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

interface PlannerSubtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created: string;
}

interface PlannerTask {
  id: string;
  title: string;
  description: string | null;
  task_type: 'daily' | 'weekly' | 'monthly';
  due_date: string;
  completed: boolean;
  created: string;
}

export default function Planner() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Navigation state for each view
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['planner-tasks'],
    queryFn: async () => {
      const data = await pb.collection('planner_tasks').getFullList({
        sort: 'due_date',
      });
      return data as PlannerTask[];
    },
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ['planner-subtasks'],
    queryFn: async () => {
      const data = await pb.collection('planner_subtasks').getFullList();
      return data as PlannerSubtask[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (task: { title: string; description: string; task_type: string; due_date: string }) => {
      const payload: Record<string, any> = {
        title: task.title.trim(),
        task_type: task.task_type,
        due_date: task.due_date,
        completed: false,
      };
      const description = task.description?.trim();
      if (description) payload.description = description;
      await pb.collection('planner_tasks').create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      setNewTitle('');
      setNewDescription('');
      setDialogOpen(false);
      toast.success('Task added!');
    },
    onError: (error) => {
      const err = error as any;
      console.error('Planner task create error', {
        status: err?.status,
        message: err?.message,
        data: err?.data,
        response: err?.response,
      });
      console.error('Planner task create field errors', err?.data?.data);
      toast.error('Failed to add task');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await pb.collection('planner_tasks').update(id, { completed });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-tasks'] }),
    onError: () => toast.error('Failed to update task'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection('planner_tasks').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      toast.success('Task deleted!');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, title, due_date }: { id: string; title: string; due_date: string }) => {
      await pb.collection('planner_tasks').update(id, { title, due_date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      setEditingTask(null);
      toast.success('Task updated!');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async ({ task_id, title }: { task_id: string; title: string }) => {
      await pb.collection('planner_subtasks').create({ task_id, title, completed: false });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planner-subtasks'] });
      setNewSubtaskTitle(prev => ({ ...prev, [variables.task_id]: '' }));
    },
    onError: (error) => {
      const err = error as any;
      console.error('Planner subtask create error', {
        status: err?.status,
        message: err?.message,
        data: err?.data,
        response: err?.response,
      });
      console.error('Planner subtask create field errors', err?.data?.data);
      toast.error('Failed to add subtask');
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await pb.collection('planner_subtasks').update(id, { completed });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-subtasks'] }),
    onError: () => toast.error('Failed to update subtask'),
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection('planner_subtasks').delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-subtasks'] }),
    onError: () => toast.error('Failed to delete subtask'),
  });

  const weekEnd = endOfWeek(selectedWeekStart);
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const normalizeDateOnly = (value?: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    const datePart = trimmed.split(' ')[0];
    const isoDate = datePart.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
    const parsed = new Date(value);
    if (!isValid(parsed)) return '';
    return format(parsed, 'yyyy-MM-dd');
  };

  const parsePlannerDate = (value?: string | null) => {
    const normalized = normalizeDateOnly(value);
    if (!normalized) return null;
    return new Date(`${normalized}T00:00:00`);
  };

  const filteredTasks = useMemo(() => {
    const selectedDayKey = format(selectedDay, 'yyyy-MM-dd');
    return {
      daily: tasks.filter(
        (t) => t.task_type === 'daily' && normalizeDateOnly(t.due_date) === selectedDayKey,
      ),
      weekly: tasks.filter((t) => {
        if (t.task_type !== 'weekly') return false;
        const taskDate = parsePlannerDate(t.due_date);
        if (!taskDate) return false;
        return isWithinInterval(taskDate, { start: selectedWeekStart, end: weekEnd });
      }),
      monthly: tasks.filter((t) => {
        if (t.task_type !== 'monthly') return false;
        const taskDate = parsePlannerDate(t.due_date);
        if (!taskDate) return false;
        return isWithinInterval(taskDate, { start: monthStart, end: monthEnd });
      }),
    };
  }, [tasks, selectedDay, selectedWeekStart, weekEnd, monthStart, monthEnd]);

  const getSubtasksForTask = (taskId: string) => subtasks.filter(s => s.task_id === taskId);

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    if (!newDate) {
      toast.error('Please choose a due date.');
      return;
    }
    createMutation.mutate({
      title,
      description: newDescription,
      task_type: newType,
      due_date: newDate,
    });
  };

  const handleAddSubtask = (taskId: string) => {
    const title = newSubtaskTitle[taskId]?.trim();
    if (!title) return;
    addSubtaskMutation.mutate({ task_id: taskId, title });
  };

  const renderTaskList = (items: PlannerTask[], emptyText: string) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{emptyText}</p>
      ) : (
        items.map((task) => {
          const taskSubtasks = getSubtasksForTask(task.id);
          const isExpanded = expandedTasks.has(task.id);
          const completedCount = taskSubtasks.filter(s => s.completed).length;

          return (
            <div key={task.id} className={`rounded-lg border ${task.completed ? 'bg-muted/50' : 'bg-card'}`}>
              <div className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: task.id, completed: !!checked })}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={task.completed ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
                    {taskSubtasks.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({completedCount}/{taskSubtasks.length})
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  )}
                  {(() => {
                    const dueDate = parsePlannerDate(task.due_date);
                    return (
                      <p className="text-xs text-primary mt-1">
                        {dueDate ? `Due Date: ${format(dueDate, 'MMM d, yyyy')}` : 'Due Date: Unknown'}
                      </p>
                    );
                  })()}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => toggleExpanded(task.id)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setEditingTask(task)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(task.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pl-10 space-y-2">
                  {taskSubtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={(checked) => toggleSubtaskMutation.mutate({ id: subtask.id, completed: !!checked })}
                      />
                      <span className={`flex-1 ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {subtask.title}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add subtask..."
                      value={newSubtaskTitle[task.id] || ''}
                      onChange={(e) => setNewSubtaskTitle(prev => ({ ...prev, [task.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSubtask(task.id)}
                      disabled={!newSubtaskTitle[task.id]?.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <Layout>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Planner</h1>
              <p className="text-muted-foreground mt-1">Manage your daily, weekly, and monthly tasks</p>
            </div>
          </div>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">Loading...</div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                const nextTab = value as 'daily' | 'weekly' | 'monthly';
                setActiveTab(nextTab);
                setNewType(nextTab);
              }}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="daily" className="gap-2">
                  <Sun className="h-4 w-4" />
                  Daily ({filteredTasks.daily.length})
                </TabsTrigger>
                <TabsTrigger value="weekly" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Weekly ({filteredTasks.weekly.length})
                </TabsTrigger>
                <TabsTrigger value="monthly" className="gap-2">
                  <CalendarRange className="h-4 w-4" />
                  Monthly ({filteredTasks.monthly.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="h-5 w-5 text-amber-500" />
                        {format(selectedDay, 'EEEE, MMMM d')}
                      </div>
                    </CardTitle>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedDay(subDays(selectedDay, 1))}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedDay(new Date())}>
                          Today
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedDay(addDays(selectedDay, 1))}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <DialogTrigger asChild>
                        <Button className="gap-2" onClick={() => setNewType('daily')}>
                          <Plus className="h-4 w-4" />
                          Add Task
                        </Button>
                      </DialogTrigger>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {renderTaskList(filteredTasks.daily, 'No daily tasks for this day')}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="weekly">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-blue-500" />
                      {format(selectedWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                    </CardTitle>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedWeekStart(subWeeks(selectedWeekStart, 1))}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedWeekStart(startOfWeek(new Date()))}>
                          This Week
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedWeekStart(addWeeks(selectedWeekStart, 1))}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <DialogTrigger asChild>
                        <Button className="gap-2" onClick={() => setNewType('weekly')}>
                          <Plus className="h-4 w-4" />
                          Add Task
                        </Button>
                      </DialogTrigger>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {renderTaskList(filteredTasks.weekly, 'No weekly tasks for this week')}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="monthly">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarRange className="h-5 w-5 text-purple-500" />
                      {format(selectedMonth, 'MMMM yyyy')}
                    </CardTitle>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedMonth(new Date())}>
                          This Month
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <DialogTrigger asChild>
                        <Button className="gap-2" onClick={() => setNewType('monthly')}>
                          <Plus className="h-4 w-4" />
                          Add Task
                        </Button>
                      </DialogTrigger>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {renderTaskList(filteredTasks.monthly, 'No monthly tasks for this month')}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Planner Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Task title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Input
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4 items-center">
                <span className="text-sm font-medium text-muted-foreground">Due Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDate ? format(parsePlannerDate(newDate) ?? new Date(), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parsePlannerDate(newDate) ?? undefined}
                      onSelect={(date) => setNewDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleCreate} disabled={!newTitle.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Task'}
              </Button>
            </div>
          </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Task title"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editingTask.due_date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingTask.due_date
                      ? format(parsePlannerDate(editingTask.due_date) ?? new Date(), 'PPP')
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={parsePlannerDate(editingTask.due_date) ?? undefined}
                    onSelect={(date) =>
                      setEditingTask({
                        ...editingTask,
                        due_date: date ? format(date, 'yyyy-MM-dd') : '',
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button
                onClick={() => updateTaskMutation.mutate({
                  id: editingTask.id,
                  title: editingTask.title,
                  due_date: editingTask.due_date,
                })}
                disabled={!editingTask.title.trim() || updateTaskMutation.isPending}
              >
                {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
