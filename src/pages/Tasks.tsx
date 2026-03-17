import { useEffect, useState, useCallback, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getTodayInTz, getDayBoundsUTC } from '@/lib/timezone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TaskCard } from '@/components/TaskCard';
import { TaskEditDialog } from '@/components/TaskEditDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Trash2, Archive, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { Task, TaskContext, TaskPriority } from '@/lib/types';
import { CONTEXT_LABELS, PRIORITY_LABELS, CONTEXTS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Only show "Urgent" filter (p1) instead of all priorities
const FILTERS = ['all', 'overdue', 'today', 'week', 'someday'] as const;
type TimeFilter = typeof FILTERS[number];

/** Add N days to a YYYY-MM-DD string */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function Tasks() {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [boards, setBoards] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [contextFilter, setContextFilter] = useState<TaskContext | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [rolledOver, setRolledOver] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAdding, setQuickAdding] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const tz = profile?.timezone || 'America/New_York';
  const today = getTodayInTz(tz);
  const tomorrow = addDays(today, 1);

  // Auto-rollover: push incomplete past tasks to today
  const rolloverTasks = useCallback(async () => {
    if (!user || rolledOver) return;
    setRolledOver(true);
    const { start } = getDayBoundsUTC(tz);
    // Find tasks with due_date before today that are not done/archived
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['todo', 'in_progress'])
      .lt('due_date', start)
      .not('due_date', 'is', null);
    
    if (overdueTasks && overdueTasks.length > 0) {
      const ids = overdueTasks.map((t: any) => t.id);
      const todayEnd = `${today}T23:59:00`;
      await supabase.from('tasks').update({ due_date: todayEnd }).in('id', ids);
      if (ids.length > 0) {
        toast.info(`${ids.length} overdue task${ids.length > 1 ? 's' : ''} moved to today`);
      }
    }
  }, [user, tz, today, rolledOver]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('tasks').select('*').eq('user_id', user.id)
      .in('status', ['todo', 'in_progress', 'done'])
      .order('priority', { ascending: true }).order('due_date', { ascending: true, nullsFirst: false });
    if (contextFilter) query = query.eq('context', contextFilter);
    if (priorityFilter) query = query.eq('priority', priorityFilter);
    if (search) query = query.ilike('title', `%${search}%`);
    if (timeFilter === 'overdue') query = query.lt('due_date', new Date().toISOString()).neq('status', 'done');
    if (timeFilter === 'today') {
      const { start, end } = getDayBoundsUTC(tz);
      query = query.lte('due_date', end).gte('due_date', start);
    }
    if (timeFilter === 'someday') query = query.is('due_date', null).is('scheduled_date', null);
    if (timeFilter === 'week') {
      const { start } = getDayBoundsUTC(tz);
      const endOfWeek = new Date(start);
      endOfWeek.setUTCDate(endOfWeek.getUTCDate() + (7 - endOfWeek.getUTCDay()));
      endOfWeek.setUTCHours(23, 59, 59, 999);
      query = query.gte('due_date', start).lte('due_date', endOfWeek.toISOString());
    }
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [user, contextFilter, priorityFilter, search, timeFilter, tz]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('id, name').eq('user_id', user.id);
    const map: Record<string, string> = {};
    (data || []).forEach((p: any) => { map[p.id] = p.name; });
    setProjects(map);
    const { data: boardData } = await supabase.from('project_boards').select('id, name').eq('user_id', user.id);
    const boardMap: Record<string, string> = {};
    (boardData || []).forEach((b: any) => { boardMap[b.id] = b.name; });
    setBoards(boardMap);
  }, [user]);

  const fetchArchived = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tasks').select('*').eq('user_id', user.id)
      .eq('status', 'archived')
      .order('updated_at', { ascending: false }).limit(50);
    if (error) toast.error(error.message);
    setArchivedTasks((data as Task[]) || []);
  }, [user]);

  useEffect(() => {
    rolloverTasks().then(() => fetchTasks());
    fetchProjects();
    fetchArchived();
  }, [rolloverTasks, fetchTasks, fetchProjects, fetchArchived]);

  // Refresh when a task is created via FAB/capture
  useEffect(() => {
    const handler = () => { fetchTasks(); fetchArchived(); };
    window.addEventListener('gigi:task-created', handler);
    return () => window.removeEventListener('gigi:task-created', handler);
  }, [fetchTasks, fetchArchived]);

  const handleArchive = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({ status: 'archived' }).eq('id', taskId);
    if (error) toast.error(error.message);
    else { fetchTasks(); fetchArchived(); toast.success('Archived'); }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) toast.error(error.message);
    else { fetchTasks(); fetchArchived(); toast.success('Deleted'); }
  };

  const handleQuickAdd = async () => {
    if (!user || !quickTitle.trim()) return;
    setQuickAdding(true);
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: quickTitle.trim(),
      status: 'todo',
      priority: 'p3',
      context: 'personal',
      energy_type: 'shallow',
    });
    if (error) toast.error(error.message);
    else { setQuickTitle(''); fetchTasks(); toast.success('Task added'); }
    setQuickAdding(false);
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase.from('tasks').delete().in('id', Array.from(selectedIds));
    if (error) toast.error(error.message);
    else { setSelectedIds(new Set()); fetchTasks(); toast.success(`Deleted ${selectedIds.size} tasks`); }
  };

  // Segment tasks by date — use scheduled_date first, then due_date
  const getTaskDate = (t: Task): string | null => {
    if (t.scheduled_date) return t.scheduled_date;
    if (!t.due_date) return null;
    return new Date(t.due_date).toLocaleDateString('en-CA', { timeZone: tz });
  };

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const isTaskToday = (t: Task) => getTaskDate(t) === today || t.brief_action === 'do';
  const todayTasks = activeTasks.filter(t => isTaskToday(t));
  const tomorrowTasks = activeTasks.filter(t => !isTaskToday(t) && getTaskDate(t) === tomorrow);
  const laterTasks = activeTasks.filter(t => {
    if (isTaskToday(t)) return false;
    const d = getTaskDate(t);
    return d !== null && d !== today && d !== tomorrow;
  });
  const undatedTasks = activeTasks.filter(t => !t.scheduled_date && !t.due_date && !t.brief_action);

  const activeCount = activeTasks.length;
  const completedCount = doneTasks.length;

  const renderSection = (title: string, sectionTasks: Task[], muted?: boolean) => {
    if (sectionTasks.length === 0) return null;
    return (
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.08em]',
            muted ? 'text-muted-foreground/60' : 'text-muted-foreground'
          )}>{title}</span>
          <span className="text-[11px] text-muted-foreground/40">{sectionTasks.length}</span>
        </div>
        <div className="space-y-px">
          {sectionTasks.map((t) => (
            <div key={t.id}>
              <TaskCard task={t} boardName={t.board_id ? boards[t.board_id] : undefined} onUpdate={fetchTasks} onEdit={(task) => setEditTask(task)} onArchive={handleArchive} onDelete={(id) => handleDelete(tasks.find(x => x.id === id)!)} />
              {t.project_id && projects[t.project_id] && (
                <div className="pl-10 -mt-1 mb-1">
                  <span className="text-[10px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">
                    📁 {projects[t.project_id]}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Tasks</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{activeCount} active · {completedCount} done</p>
        </div>
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={bulkDelete} className="text-xs h-8">
            <Trash2 className="h-3 w-3 mr-1" /> Delete {selectedIds.size}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-foreground/10 text-[13px]"
        />
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-6">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(timeFilter === f ? 'all' : f)}
              className={cn(
                'text-[11px] px-2.5 py-1 rounded-md capitalize transition-colors',
                timeFilter === f ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {CONTEXTS.map((c) => (
            <button
              key={c}
              onClick={() => setContextFilter(contextFilter === c ? null : c)}
              className={cn(
                'text-[11px] px-2 py-1 rounded-md transition-colors',
                contextFilter === c ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {CONTEXT_LABELS[c]}
            </button>
          ))}
          <span className="w-px h-4 bg-border self-center mx-1" />
          <button
            onClick={() => setPriorityFilter(priorityFilter === 'p1' ? null : 'p1')}
            className={cn(
              'text-[11px] px-2 py-1 rounded-md transition-colors',
              priorityFilter === 'p1' ? 'bg-destructive/15 text-destructive font-medium' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-accent inline-block" /> Urgent
          </button>
        </div>
      </div>

      {/* Quick add */}
      <div className="flex gap-2 mb-6">
        <Input
          ref={quickInputRef}
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          placeholder="Add a task…"
          className="h-10 bg-secondary border-0 text-[13px] flex-1"
          disabled={quickAdding}
        />
        <Button size="sm" className="h-10 px-3" onClick={handleQuickAdd} disabled={!quickTitle.trim() || quickAdding}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Segmented List */}
      {timeFilter === 'all' && !search ? (
        <>
          {renderSection('Today', todayTasks)}
          {renderSection('Tomorrow', tomorrowTasks)}
          {renderSection(laterTasks.length > 0 ? 'Later' : '', laterTasks)}
          {renderSection('Someday', undatedTasks, true)}
          {doneTasks.length > 0 && renderSection('Completed', doneTasks, true)}
        </>
      ) : (
        <div className="space-y-px">
          {tasks.map((t) => (
            <div key={t.id}>
              <TaskCard task={t} boardName={t.board_id ? boards[t.board_id] : undefined} onUpdate={fetchTasks} onEdit={(task) => setEditTask(task)} onArchive={handleArchive} onDelete={(id) => handleDelete(tasks.find(x => x.id === id)!)} />
              {t.project_id && projects[t.project_id] && (
                <div className="pl-10 -mt-1 mb-1">
                  <span className="text-[10px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">
                    📁 {projects[t.project_id]}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && [1,2,3,4].map((i) => <div key={i} className="h-12 rounded-lg bg-secondary animate-pulse" />)}
      {!loading && tasks.length === 0 && archivedTasks.length === 0 && (
        <p className="text-center py-16 text-sm text-muted-foreground">No tasks found.</p>
      )}

      {/* Archive section */}
      {archivedTasks.length > 0 && (
        <section className="mt-8 border-t border-border pt-4">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-2 mb-3 px-1 w-full text-left"
          >
            {showArchive ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <Archive className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Archive</span>
            <span className="text-[11px] text-muted-foreground">{archivedTasks.length}</span>
          </button>
          {showArchive && (
            <div className="space-y-0.5 opacity-50">
              {archivedTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-1.5 px-2">
                  <Archive className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-muted-foreground line-through truncate">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground/50">
                      {new Date(t.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {t.project_id && projects[t.project_id] ? ` · 📁 ${projects[t.project_id]}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.from('tasks').update({ status: 'todo', brief_action: null }).eq('id', t.id);
                      fetchTasks();
                      fetchArchived();
                      toast.success('Restored');
                    }}
                    className="text-[10px] text-accent hover:underline shrink-0"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <TaskEditDialog task={editTask} open={!!editTask} onOpenChange={(open) => !open && setEditTask(null)} onSaved={() => { fetchTasks(); fetchArchived(); }} onDelete={handleDelete} />
    </div>
  );
}