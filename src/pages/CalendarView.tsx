import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, MapPin, Clock, Calendar, FileText, LayoutList, LayoutGrid, Trash2, RefreshCw, Plus } from 'lucide-react';
import { getTodayInTz, getDayBoundsUTC } from '@/lib/timezone';
import { CalendarDayTimeline } from '@/components/CalendarDayTimeline';
import { TaskEditDialog } from '@/components/TaskEditDialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function formatTimeInTz(isoStr: string, tz: string, fmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }): string {
  return new Date(isoStr).toLocaleTimeString('en-US', { ...fmt, timeZone: tz });
}

function getDateInTz(isoStr: string, tz: string): string {
  return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: tz });
}

function formatDateInTz(isoStr: string, tz: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(isoStr).toLocaleDateString('en-US', { ...opts, timeZone: tz });
}

function dateToDayStr(date: Date, tz: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: tz });
}

interface CalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  dtstart: string;
  dtend: string | null;
  all_day: boolean;
  location: string | null;
  calendar_link_id: string;
}

interface CalendarLink { id: string; name: string; ics_url: string; }

export default function CalendarView() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'agenda' | 'grid'>('agenda');
  const [calLinks, setCalLinks] = useState<CalendarLink[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { profile } = useProfile();
  const tz = profile?.timezone || 'America/New_York';

  const viewStart = addDays(new Date(), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(viewStart, i));

  const fetchData = useCallback(() => {
    if (!user) return;
    supabase.from('tasks').select('*').eq('user_id', user.id).in('status', ['todo', 'in_progress']).then(({ data }) => {
      setTasks((data as Task[]) || []);
    });

    const weekStartStr = dateToDayStr(viewStart, tz);
    const weekEndStr = dateToDayStr(addDays(viewStart, 7), tz);
    const { start } = getDayBoundsUTC(tz, weekStartStr);
    const { end } = getDayBoundsUTC(tz, weekEndStr);

    supabase.from('calendar_events').select('*').eq('user_id', user.id)
      .gte('dtstart', start).lte('dtstart', end)
      .order('dtstart').then(({ data }) => {
        setEvents((data as CalendarEvent[]) || []);
      });
  }, [user, weekOffset, tz]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user) return;
    supabase.from('calendar_links').select('id, name, ics_url').eq('user_id', user.id).eq('enabled', true).then(({ data }) => {
      setCalLinks((data as CalendarLink[]) || []);
    });
  }, [user]);

  const syncCalendars = useCallback(async () => {
    if (!user || calLinks.length === 0) return;
    setSyncing(true);
    let synced = 0;
    for (const link of calLinks) {
      const { data, error } = await supabase.functions.invoke('sync-calendar', {
        body: { calendar_link_id: link.id, ics_url: link.ics_url, user_id: user.id },
      });
      if (error || data?.error) {
        toast.error(`Failed to sync "${link.name}"`);
      } else {
        synced += data.events_count ?? 0;
      }
    }
    toast.success(`Synced ${synced} events`);
    fetchData();
    setSyncing(false);
  }, [user, calLinks, fetchData]);

  const todayStr = getTodayInTz(tz);

  const getTasksForDay = (day: Date) => {
    const dayStr = dateToDayStr(day, tz);
    return tasks.filter((t) => {
      if (t.scheduled_date === dayStr) return true;
      if (t.due_date) {
        const dueDayStr = getDateInTz(t.due_date, tz);
        if (dueDayStr === dayStr) return true;
      }
      return false;
    });
  };

  const getEventsForDay = (day: Date) => {
    const dayStr = dateToDayStr(day, tz);
    return events.filter(e => getDateInTz(e.dtstart, tz) === dayStr);
  };

  const contextColor = (ctx: string) => {
    const map: Record<string, string> = {
      work: 'border-l-gigi-work bg-gigi-work/5',
      mba: 'border-l-gigi-mba bg-gigi-mba/5',
      personal: 'border-l-gigi-personal bg-gigi-personal/5',
      finance: 'border-l-gigi-finance bg-gigi-finance/5',
      health: 'border-l-gigi-health bg-gigi-health/5',
      legal: 'border-l-muted-foreground bg-secondary',
    };
    return map[ctx] || 'border-l-foreground/20 bg-secondary';
  };

  // Handle drag-and-drop time change
  const handleTaskTimeChange = useCallback(async (taskId: string, newTime: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, scheduled_time: newTime } : t));
    const { error } = await supabase.from('tasks').update({ scheduled_time: newTime }).eq('id', taskId);
    if (error) {
      toast.error('Failed to reschedule');
      fetchData();
    } else {
      toast.success(`Moved to ${newTime}`);
    }
  }, [fetchData]);

  // Handle task deletion
  const handleDeleteTask = useCallback(async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Deleted');
      setTasks(prev => prev.filter(t => t.id !== task.id));
    }
  }, []);

  const effectiveView = viewMode;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Calendar</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {format(viewStart, 'MMM d')} – {format(addDays(viewStart, 6), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {calLinks.length > 0 && (
            <Button
              variant="ghost" size="icon" className="h-8 w-8 mr-1"
              onClick={syncCalendars} disabled={syncing}
              title="Sync calendars"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            </Button>
          )}
          <div className="flex items-center bg-secondary rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setViewMode('agenda')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                effectiveView === 'agenda' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Timeline view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                effectiveView === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-[11px] h-8" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(weekOffset + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Agenda / Timeline View */}
      {effectiveView === 'agenda' ? (
        <div className="space-y-1">
          {days.map((day) => {
            const dayStr = dateToDayStr(day, tz);
            const dayTasks = getTasksForDay(day);
            const dayEvents = getEventsForDay(day);
            const isToday = dayStr === todayStr;
            const isEmpty = dayTasks.length === 0 && dayEvents.length === 0;

            return (
              <div key={dayStr} className={cn('rounded-xl border border-border overflow-hidden', isToday && 'ring-1 ring-accent/30')}>
                <div className={cn(
                  'flex items-center gap-3 px-4 py-3 border-b border-border/50',
                  isToday ? 'bg-accent/5' : 'bg-card'
                )}>
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0',
                    isToday ? 'bg-accent text-accent-foreground' : 'bg-secondary'
                  )}>
                    <span className="text-[9px] font-bold uppercase tracking-wider leading-none">{format(day, 'EEE')}</span>
                    <span className="text-[15px] font-semibold leading-none mt-0.5">{format(day, 'd')}</span>
                  </div>
                  <div>
                    <p className={cn('text-[13px] font-medium', isToday && 'text-accent')}>
                      {isToday ? 'Today' : format(day, 'EEEE')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{format(day, 'MMMM d, yyyy')}</p>
                  </div>
                  {!isEmpty && (
                    <div className="ml-auto flex items-center gap-1.5">
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                          {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                          {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className={cn('px-2 py-2', isEmpty && 'py-0')}>
                  <CalendarDayTimeline
                    dayStr={dayStr}
                    events={dayEvents}
                    tasks={dayTasks}
                    tz={tz}
                    isToday={isToday}
                    onEventClick={setSelectedEvent}
                    onTaskClick={setEditingTask}
                    onTaskTimeChange={handleTaskTimeChange}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden" style={{ minWidth: 560 }}>
          {days.map((day) => {
            const dayStr = dateToDayStr(day, tz);
            const dayTasks = getTasksForDay(day);
            const dayEvents = getEventsForDay(day);
            const isToday = dayStr === todayStr;
            return (
              <div key={dayStr} className="bg-background min-h-[240px]">
                <div className="text-center py-3 border-b border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{format(day, 'EEE')}</p>
                  <div className={cn(
                    'text-sm font-medium mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5',
                    isToday && 'bg-foreground text-background'
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="p-1.5 space-y-1">
                  {dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className="text-[11px] p-1.5 rounded border-l-2 border-l-accent bg-accent/5 cursor-pointer hover:bg-accent/10 transition-colors"
                      onClick={() => setSelectedEvent(e)}
                    >
                      <p className="truncate font-medium">{e.summary}</p>
                      {!e.all_day && (
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {formatTimeInTz(e.dtstart, tz)}
                          {e.dtend && ` – ${formatTimeInTz(e.dtend, tz)}`}
                        </p>
                      )}
                    </div>
                  ))}
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className={cn('text-[11px] p-1.5 rounded border-l-2 cursor-pointer hover:opacity-80 transition-opacity', contextColor(t.context))}
                      onClick={() => setEditingTask(t)}
                    >
                      <p className="truncate font-medium">{t.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* Empty state when no calendars connected */}
      {calLinks.length === 0 && events.length === 0 && (
        <div className="mt-12 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No calendars connected</p>
          <p className="text-[12px] text-muted-foreground/60 mt-1 mb-4">Add an ICS link to see your events here</p>
          <Button size="sm" variant="outline" className="text-[12px]" onClick={() => navigate('/settings')}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add calendar in Settings
          </Button>
        </div>
      )}

      {/* Calendar Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold pr-6">{selectedEvent?.summary}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm">
                    {selectedEvent.all_day
                      ? formatDateInTz(selectedEvent.dtstart, tz, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + ' · All day'
                      : formatDateInTz(selectedEvent.dtstart, tz, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  {!selectedEvent.all_day && (
                    <p className="text-sm text-muted-foreground">
                      {formatTimeInTz(selectedEvent.dtstart, tz, { hour: 'numeric', minute: '2-digit', hour12: true })}
                      {selectedEvent.dtend && ` – ${formatTimeInTz(selectedEvent.dtend, tz, { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                    </p>
                  )}
                </div>
              </div>

              {selectedEvent.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm break-all">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.description && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Synced from calendar</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Edit Dialog — full edit + delete */}
      <TaskEditDialog
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        onSaved={fetchData}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
