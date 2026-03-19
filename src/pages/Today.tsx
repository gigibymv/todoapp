import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { TaskCard } from '@/components/TaskCard';
import { TaskEditDialog } from '@/components/TaskEditDialog';
import { CalendarEventCard, type CalendarEventItem } from '@/components/CalendarEventCard';
import { ProgressRing } from '@/components/ProgressRing';
import { MoveMenu } from '@/components/MoveMenu';
import { InteractiveDayTimeline } from '@/components/InteractiveDayTimeline';
import { toast } from 'sonner';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getTodayInTz, getGreetingInTz, getDateStrInTz, getDayBoundsUTC } from '@/lib/timezone';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { MoreVertical, RefreshCw, CalendarDays } from 'lucide-react';

const BRIEFING_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-briefing`;

interface BriefingData {
  must_do: { task_id?: string; title: string; reason: string; time_block?: string }[];
  should_do: { task_id?: string; title: string; reason: string }[];
  skip: { task_id?: string; title: string; reason: string }[];
  prepare_tomorrow: { action: string }[];
  energy_sequence: { time: string; activity: string; type: 'deep' | 'shallow' | 'rest' }[];
  intention: string;
}

type BriefSection = 'do' | 'backlog' | 'skip';

export default function Today() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [boards, setBoards] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const tz = profile?.timezone || 'America/New_York';
  const todayStr = getTodayInTz(tz);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks').select('*').eq('user_id', user.id)
      .in('status', ['todo', 'in_progress', 'done'])
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(500);
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [user]);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    const { start, end } = getDayBoundsUTC(tz);
    const { data } = await supabase.from('calendar_events')
      .select('id, summary, dtstart, dtend, location, all_day, dismissed, completed_at, brief_action')
      .eq('user_id', user.id).eq('dismissed', false)
      .gte('dtstart', start).lte('dtstart', end)
      .order('dtstart', { ascending: true });
    setEvents((data as CalendarEventItem[]) || []);
  }, [user, tz]);

  // Daily reset: archive skip tasks, promote backlog→do
  const dailyReset = useCallback(async () => {
    if (!user) return;
    const today = getTodayInTz(tz);
    const resetKey = `dayflow-reset-${user.id}`;
    const lastReset = localStorage.getItem(resetKey);
    if (lastReset === today) return;

    const { data: skipTasks } = await supabase
      .from('tasks').select('id').eq('user_id', user.id)
      .eq('brief_action', 'skip').in('status', ['todo', 'in_progress']);
    if (skipTasks && skipTasks.length > 0) {
      await supabase.from('tasks')
        .update({ status: 'archived', brief_action: null })
        .in('id', skipTasks.map(t => t.id));
    }

    const { data: backlogTasks } = await supabase
      .from('tasks').select('id, scheduled_date').eq('user_id', user.id)
      .eq('brief_action', 'backlog').in('status', ['todo', 'in_progress']);
    if (backlogTasks && backlogTasks.length > 0) {
      await supabase.from('tasks')
        .update({ brief_action: 'do', scheduled_date: today })
        .in('id', backlogTasks.map(t => t.id));
    }

    await supabase.from('tasks')
      .update({ brief_action: null })
      .eq('user_id', user.id).eq('status', 'done')
      .not('brief_action', 'is', null);

    localStorage.setItem(resetKey, today);
  }, [user, tz]);

  const generateBriefing = async () => {
    if (!user) return;
    setBriefLoading(true);
    const { data: activeTasks } = await supabase
      .from('tasks').select('*').eq('user_id', user.id)
      .in('status', ['todo', 'in_progress'])
      .order('priority', { ascending: true }).limit(30);
    if (!activeTasks || activeTasks.length === 0) {
      setBriefing(null); setBriefLoading(false); return;
    }
    abortRef.current = new AbortController();
    try {
      const resp = await fetch(BRIEFING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ tasks: activeTasks || [], display_name: profile?.display_name || '', timezone: tz }),
        signal: abortRef.current.signal,
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); toast.error(err.error || 'Failed to generate briefing'); setBriefLoading(false); return; }
      const data = await resp.json();
      setBriefing(data);
      const today = getTodayInTz(tz);
      await supabase.from('briefings').upsert({ user_id: user.id, date: today, intention_text: data.intention || '', content_json: data }, { onConflict: 'user_id,date' });
      if (data.must_do || data.skip) {
        const doIds = (data.must_do || []).map((d: any) => d.task_id).filter(Boolean);
        const skipIds = (data.skip || []).map((s: any) => s.task_id).filter(Boolean);
        if (doIds.length) await supabase.from('tasks').update({ brief_action: 'do' }).in('id', doIds);
        if (skipIds.length) await supabase.from('tasks').update({ brief_action: 'skip' }).in('id', skipIds);
        fetchTasks();
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') { console.error(e); toast.error('Briefing generation failed'); }
    }
    setBriefLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    dailyReset().then(() => { fetchTasks(); });
    supabase.from('projects').select('id, name').eq('user_id', user.id).then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.name; });
      setProjects(map);
    });
    supabase.from('project_boards').select('id, name').eq('user_id', user.id).then(({ data }) => {
      const boardMap: Record<string, string> = {};
      (data || []).forEach((b: any) => { boardMap[b.id] = b.name; });
      setBoards(boardMap);
    });
    fetchEvents();
    const loadBrief = async () => {
      const today = getTodayInTz(tz);
      const { data } = await supabase.from('briefings').select('*')
        .eq('user_id', user.id).eq('date', today).maybeSingle();
      if (data?.content_json && (data.content_json as any).must_do) {
        setBriefing(data.content_json as unknown as BriefingData);
      }
    };
    loadBrief();
    return () => abortRef.current?.abort();
  }, [user, tz, dailyReset, fetchTasks, fetchEvents]);

  const handleArchive = async (taskId: string) => {
    await supabase.from('tasks').update({ status: 'archived' }).eq('id', taskId);
    fetchTasks();
    toast.success('Archived');
  };

  const moveItem = async (itemId: string, target: BriefSection, isEvent = false) => {
    if (isEvent) {
      setEvents(prev => prev.map(e => e.id === itemId ? { ...e, brief_action: target } : e));
      const { error } = await supabase.from('calendar_events').update({ brief_action: target }).eq('id', itemId);
      if (error) toast.error(error.message);
    } else {
      setTasks(prev => prev.map(t =>
        t.id === itemId ? { ...t, brief_action: target } as Task : t
      ));
      const { error } = await supabase.from('tasks').update({ brief_action: target }).eq('id', itemId);
      if (error) { toast.error(error.message); fetchTasks(); }
    }
  };

  const handleEventComplete = async (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    const newVal = ev?.completed_at ? null : new Date().toISOString();
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, completed_at: newVal } : e));
    await supabase.from('calendar_events').update({ completed_at: newVal }).eq('id', eventId);
  };

  const handleEventDismiss = async (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    await supabase.from('calendar_events').update({ dismissed: true }).eq('id', eventId);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const destSection = result.destination.droppableId as BriefSection;
    await moveItem(result.draggableId, destSection);
  };

  // Create task from timeline slot
  const handleCreateFromTimeline = async (title: string, scheduledTime: string, scheduledDate: string) => {
    if (!user) return;
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title,
      scheduled_time: scheduledTime,
      scheduled_date: scheduledDate,
      status: 'todo',
      priority: 'p3',
      context: 'personal',
      energy_type: 'shallow',
      brief_action: 'backlog',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Task created');
    fetchTasks();
  };

  const greeting = getGreetingInTz(tz);
  const displayName = profile?.display_name?.split(' ')[0] || '';
  const dateStr = getDateStrInTz(tz);

  const activeTasks = tasks.filter(t => t.status !== 'done');

  const isScheduledToday = (t: Task) => {
    if (t.scheduled_date === todayStr) return true;
    if (t.due_date) {
      const dueDay = new Date(t.due_date).toLocaleDateString('en-CA', { timeZone: tz });
      if (dueDay === todayStr) return true;
    }
    return false;
  };

  const doTasks = activeTasks.filter(t => t.brief_action === 'do' || (!t.brief_action && isScheduledToday(t)));
  const skipTasksList = activeTasks.filter(t => t.brief_action === 'skip');
  const otherTasks = activeTasks.filter(t => t.brief_action === 'backlog' || (!t.brief_action && !isScheduledToday(t)));

  // Filter calendar events into sections (default to 'do')
  const activeEvents = events.filter(e => !e.dismissed);
  const doEvents = activeEvents.filter(e => e.brief_action === 'do' || !e.brief_action);
  const skipEvents = activeEvents.filter(e => e.brief_action === 'skip');
  const backlogEvents = activeEvents.filter(e => e.brief_action === 'backlog');

  const doItemCount = doTasks.length + doEvents.length;
  const backlogItemCount = otherTasks.length + backlogEvents.length;
  const skipItemCount = skipTasksList.length + skipEvents.length;

  // Tasks with scheduled_time for the timeline
  const scheduledTasks = doTasks.filter(t => !!t.scheduled_time);

  // --- Render helpers ---
  const renderTaskItem = (t: Task, index: number, section: BriefSection) => {
    const taskContent = (
      <div className="relative flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <TaskCard
            task={t}
            boardName={t.board_id ? boards[t.board_id] : undefined}
            compact={section === 'skip'}
            onUpdate={fetchTasks}
            onArchive={handleArchive}
            onEdit={(task) => setEditingTask(task)}
          />
          {t.project_id && projects[t.project_id] && (
            <div className="pl-10 -mt-1 mb-1">
              <span className="text-[10px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">
                📁 {projects[t.project_id]}{t.board_id && boards[t.board_id] ? ` / ${boards[t.board_id]}` : ''}
              </span>
            </div>
          )}
        </div>
        {isMobile && (
          <MoveMenu currentSection={section} onMove={(target) => moveItem(t.id, target)}>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <MoreVertical className="h-4 w-4" />
            </button>
          </MoveMenu>
        )}
      </div>
    );

    // On mobile, skip drag-and-drop to prevent scroll issues
    if (isMobile) {
      return <div key={t.id}>{taskContent}</div>;
    }

    return (
      <Draggable key={t.id} draggableId={t.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn('relative', snapshot.isDragging && 'opacity-80 rotate-1 z-50')}
          >
            {taskContent}
          </div>
        )}
      </Draggable>
    );
  };

  const renderEventCard = (ev: CalendarEventItem, section: BriefSection) => (
    <div key={`ev-${ev.id}`} className="relative flex items-center gap-1">
      <div className="flex-1 min-w-0">
        <CalendarEventCard
          event={ev}
          tz={tz}
          compact={section === 'skip'}
          onComplete={handleEventComplete}
          onDismiss={handleEventDismiss}
        />
      </div>
      <MoveMenu currentSection={section} onMove={(target) => moveItem(ev.id, target, true)}>
        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <MoreVertical className="h-4 w-4" />
        </button>
      </MoveMenu>
    </div>
  );

  const renderSection = (
    sectionId: BriefSection,
    label: string,
    sectionTasks: Task[],
    sectionEvents: CalendarEventItem[],
    itemCount: number,
    opts?: { strikeLabel?: boolean; dimmed?: boolean; emptyText?: string }
  ) => {
    const header = (
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn(
          'text-[11px] font-semibold uppercase tracking-[0.08em]',
          opts?.strikeLabel ? 'text-muted-foreground/60 line-through' : sectionId === 'do' ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {label}
        </span>
        <span className={cn('text-[11px]', opts?.strikeLabel ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
          {itemCount}
        </span>
        {sectionId === 'do' && itemCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse-dot" />}
      </div>
    );

    // On mobile, render without Droppable to avoid scroll issues
    if (isMobile) {
      return (
        <section className={cn('rounded-xl transition-colors min-h-[60px] p-2 -m-2', opts?.dimmed && 'opacity-60')}>
          {header}
          <div className="space-y-0.5">
            {sectionEvents.map(ev => renderEventCard(ev, sectionId))}
            {sectionTasks.map((t, i) => renderTaskItem(t, i, sectionId))}
            {itemCount === 0 && !loading && (
              <p className={cn('text-[12px] py-3 px-3', opts?.dimmed ? 'text-muted-foreground/30' : 'text-muted-foreground')}>
                {opts?.emptyText || 'No items.'}
              </p>
            )}
          </div>
        </section>
      );
    }

    return (
      <Droppable droppableId={sectionId}>
        {(provided, snapshot) => (
          <section
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'rounded-xl transition-colors min-h-[60px] p-2 -m-2',
              snapshot.isDraggingOver && (sectionId === 'skip' ? 'bg-destructive/5' : 'bg-secondary/30'),
              opts?.dimmed && 'opacity-60'
            )}
          >
            {header}
            <div className="space-y-0.5">
              {sectionEvents.map(ev => renderEventCard(ev, sectionId))}
              {sectionTasks.map((t, i) => renderTaskItem(t, i, sectionId))}
              {provided.placeholder}
              {itemCount === 0 && !loading && (
                <p className={cn('text-[12px] py-3 px-3', opts?.dimmed ? 'text-muted-foreground/30' : 'text-muted-foreground')}>
                  {opts?.emptyText || 'No items.'}
                </p>
              )}
            </div>
          </section>
        )}
      </Droppable>
    );
  };

  const sections = (
    <>
      {renderSection('do', 'Do', doTasks, doEvents, doItemCount, { emptyText: 'No tasks for today. Enjoy the calm ☀️' })}
      {renderSection('backlog', 'Maybe', otherTasks, backlogEvents, backlogItemCount, { emptyText: 'No maybe items.' })}
      {renderSection('skip', 'Skip', skipTasksList, skipEvents, skipItemCount, { strikeLabel: true, dimmed: true, emptyText: 'Items here will be archived at end of day.' })}
    </>
  );

  // Progress stats
  const allTodayTasks = tasks.filter(t => isScheduledToday(t) || t.brief_action === 'do');
  const doneTodayCount = allTodayTasks.filter(t => t.status === 'done').length;
  const totalTodayCount = allTodayTasks.length;
  const remainingMin = allTodayTasks
    .filter(t => t.status !== 'done')
    .reduce((sum, t) => sum + (t.estimated_duration_min || 0), 0);
  const remainingLabel = remainingMin >= 60
    ? `${Math.floor(remainingMin / 60)}h ${remainingMin % 60 ? `${remainingMin % 60}m` : ''}`
    : remainingMin > 0 ? `${remainingMin}m` : '';

  // Timeline panel (desktop sidebar / mobile toggle)
  const timelinePanel = (
    <div className={cn(
      'rounded-xl border border-border bg-card p-4',
      isMobile ? 'mt-6' : 'sticky top-6'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Today's Timeline
        </span>
      </div>
      <InteractiveDayTimeline
        events={activeEvents}
        tasks={scheduledTasks}
        tz={tz}
        todayStr={todayStr}
        onCreateTask={handleCreateFromTimeline}
        onTaskClick={(task) => setEditingTask(task)}
      />
      <p className="text-[10px] text-muted-foreground/40 mt-3 text-center">
        Click an empty slot to add a task
      </p>
    </div>
  );

  return (
    <div className={cn('mx-auto', isMobile ? 'max-w-3xl' : 'max-w-6xl')}>
      {/* Header */}
      <div className="mb-8 animate-fade-in flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            {greeting}{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dateStr}
            {remainingLabel && (
              <span className="ml-2 text-[11px] text-muted-foreground/70">· ~{remainingLabel} left</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showCalendar ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
              title="Toggle timeline"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={generateBriefing}
            disabled={briefLoading}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
            title="Refresh briefing"
          >
            <RefreshCw className={cn('h-4 w-4', briefLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Desktop: side-by-side layout */}
      {!isMobile ? (
        <div className="flex gap-8">
          <div className="flex-1 min-w-0 space-y-8">
            <DragDropContext onDragEnd={handleDragEnd}>
              {sections}
            </DragDropContext>

            {briefing?.prepare_tomorrow && briefing.prepare_tomorrow.length > 0 && (
              <section className="border-t border-border pt-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">PREPARE FOR TOMORROW</h3>
                <div className="space-y-1.5">
                  {briefing.prepare_tomorrow.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <span className="w-1 h-1 rounded-full bg-foreground/30 mt-1.5 shrink-0" />
                      <p className="text-[12px] text-foreground/70">{p.action}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-secondary animate-pulse" />)}
              </div>
            )}
          </div>

          <div className="w-72 shrink-0">
            {timelinePanel}
          </div>
        </div>
      ) : (
        /* Mobile: stacked layout without drag-and-drop */
        <div className="space-y-8">
          {showCalendar && timelinePanel}

          {sections}

          {briefing?.prepare_tomorrow && briefing.prepare_tomorrow.length > 0 && (
            <section className="border-t border-border pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">PREPARE FOR TOMORROW</h3>
              <div className="space-y-1.5">
                {briefing.prepare_tomorrow.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="w-1 h-1 rounded-full bg-foreground/30 mt-1.5 shrink-0" />
                    <p className="text-[12px] text-foreground/70">{p.action}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-secondary animate-pulse" />)}
            </div>
          )}
        </div>
      )}

      <TaskEditDialog
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        onSaved={fetchTasks}
      />
    </div>
  );
}
