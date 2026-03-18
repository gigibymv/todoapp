import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { nowMinutesInTz } from '@/lib/timezone';
import { MapPin } from 'lucide-react';
import type { Task } from '@/lib/types';

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

interface TimeBlock {
  id: string;
  type: 'event' | 'task';
  label: string;
  startMin: number;
  endMin: number;
  isAllDay: boolean;
  location?: string | null;
  context?: string;
  priority?: string;
  raw?: CalendarEvent | Task;
}

interface CalendarDayTimelineProps {
  dayStr: string;
  events: CalendarEvent[];
  tasks: Task[];
  tz: string;
  isToday: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  onTaskClick?: (task: Task) => void;
  onTaskTimeChange?: (taskId: string, newTime: string) => void;
}

const PX_PER_MIN = 1.6;
const MIN_BLOCK_H = 52;
const HOUR_START = 6;
const HOUR_END = 23;
const SNAP_MIN = 15; // snap to 15-minute increments

function getTimeInTz(isoStr: string, tz: string): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date(isoStr));
  const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  return { hours: h === 24 ? 0 : h, minutes: m };
}

function minsToLabel(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function minsToTimeStr(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function contextStyles(ctx?: string) {
  const map: Record<string, { border: string; bg: string; hover: string }> = {
    work: { border: 'border-l-gigi-work', bg: 'bg-gigi-work/25', hover: 'hover:bg-gigi-work/32' },
    mba: { border: 'border-l-gigi-mba', bg: 'bg-gigi-mba/25', hover: 'hover:bg-gigi-mba/32' },
    personal: { border: 'border-l-gigi-personal', bg: 'bg-gigi-personal/25', hover: 'hover:bg-gigi-personal/32' },
    finance: { border: 'border-l-gigi-finance', bg: 'bg-gigi-finance/25', hover: 'hover:bg-gigi-finance/32' },
    health: { border: 'border-l-gigi-health', bg: 'bg-gigi-health/25', hover: 'hover:bg-gigi-health/32' },
  };
  const fallback = { border: 'border-l-primary/30', bg: 'bg-primary/10', hover: 'hover:bg-primary/15' };
  return ctx ? map[ctx] || fallback : fallback;
}

export function CalendarDayTimeline({
  dayStr, events, tasks, tz, isToday, onEventClick, onTaskClick, onTaskTimeChange,
}: CalendarDayTimelineProps) {
  const nowMin = isToday ? nowMinutesInTz(tz) : -1;
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [dragOffsetMin, setDragOffsetMin] = useState(0);
  const dragStartY = useRef(0);
  const dragStartMin = useRef(0);
  const hasDragged = useRef(false);

  // Build time blocks
  const allDayItems: TimeBlock[] = [];
  const timedBlocks: TimeBlock[] = [];

  events.forEach(ev => {
    if (ev.all_day) {
      allDayItems.push({
        id: ev.id, type: 'event', label: ev.summary || 'Untitled',
        startMin: 0, endMin: 0, isAllDay: true, location: ev.location, raw: ev,
      });
      return;
    }
    const s = getTimeInTz(ev.dtstart, tz);
    const startMin = s.hours * 60 + s.minutes;
    let endMin = startMin + 30;
    if (ev.dtend) {
      const e = getTimeInTz(ev.dtend, tz);
      endMin = e.hours * 60 + e.minutes;
      if (endMin <= startMin) endMin = startMin + 30;
    }
    timedBlocks.push({
      id: ev.id, type: 'event', label: ev.summary || 'Untitled',
      startMin, endMin, isAllDay: false, location: ev.location, raw: ev,
    });
  });

  tasks.forEach(t => {
    const dur = t.estimated_duration_min || 30;
    let startMin = HOUR_START * 60;
    if (t.scheduled_time) {
      const [h, m] = t.scheduled_time.split(':').map(Number);
      startMin = h * 60 + m;
    } else if (t.due_date) {
      const s = getTimeInTz(t.due_date, tz);
      startMin = s.hours * 60 + s.minutes;
      if (startMin === 0) startMin = HOUR_START * 60;
    }
    timedBlocks.push({
      id: t.id, type: 'task', label: t.title,
      startMin, endMin: startMin + dur, isAllDay: false,
      context: t.context, priority: t.priority, raw: t,
    });
  });

  timedBlocks.sort((a, b) => a.startMin - b.startMin);

  const visibleBlocks = timedBlocks.filter(b => b.endMin > HOUR_START * 60 && b.startMin < HOUR_END * 60);

  let rangeStart = HOUR_START * 60;
  let rangeEnd = HOUR_END * 60;

  if (visibleBlocks.length > 0) {
    const earliest = Math.min(...visibleBlocks.map(b => b.startMin));
    const latest = Math.max(...visibleBlocks.map(b => b.endMin));
    rangeStart = Math.max(HOUR_START * 60, Math.floor(earliest / 60 - 1) * 60);
    rangeEnd = Math.min(HOUR_END * 60, Math.ceil(latest / 60 + 1) * 60);
    if (rangeEnd - rangeStart < 180) rangeEnd = rangeStart + 180;
  } else {
    rangeStart = 9 * 60;
    rangeEnd = 17 * 60;
  }

  if (isToday && nowMin >= 0) {
    if (nowMin < rangeStart) rangeStart = Math.floor(nowMin / 60) * 60;
    if (nowMin > rangeEnd) rangeEnd = Math.ceil(nowMin / 60 + 1) * 60;
  }

  const hours = [];
  for (let h = Math.floor(rangeStart / 60); h <= Math.ceil(rangeEnd / 60); h++) {
    if (h * 60 >= rangeStart && h * 60 <= rangeEnd) hours.push(h * 60);
  }

  const totalHeight = (rangeEnd - rangeStart) * PX_PER_MIN;

  const getTop = (min: number) => Math.max(0, (min - rangeStart) * PX_PER_MIN);
  const getHeight = (startMin: number, endMin: number) =>
    Math.max(MIN_BLOCK_H, (Math.min(endMin, rangeEnd) - Math.max(startMin, rangeStart)) * PX_PER_MIN);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent, block: TimeBlock) => {
    if (block.type !== 'task') return;
    e.preventDefault(); // prevent browser scroll from competing with drag
    dragStartY.current = e.clientY;
    dragStartMin.current = block.startMin;
    hasDragged.current = false;
    draggingIdRef.current = block.id; // Bug A: set ref synchronously before React re-render
    setDraggingId(block.id);
    setDragOffsetMin(0);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); // Bug C: capture on currentTarget
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingIdRef.current) return; // Bug A: read ref, not stale state
    const dy = e.clientY - dragStartY.current;
    if (Math.abs(dy) > 5) hasDragged.current = true;
    const deltaMin = Math.round(dy / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
    setDragOffsetMin(deltaMin);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!draggingIdRef.current) return; // Bug A: read ref
    if (hasDragged.current && dragOffsetMin !== 0) {
      const newStartMin = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - 15, dragStartMin.current + dragOffsetMin));
      const newTime = minsToTimeStr(newStartMin);
      onTaskTimeChange?.(draggingIdRef.current, newTime);
    }
    draggingIdRef.current = null; // Bug A: clear ref
    setDraggingId(null);
    setDragOffsetMin(0);
  }, [dragOffsetMin, onTaskTimeChange]);

  if (allDayItems.length === 0 && visibleBlocks.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-[12px] text-muted-foreground/50">No events or tasks</p>
      </div>
    );
  }

  return (
    <div>
      {/* All-day events */}
      {allDayItems.length > 0 && (
        <div className="mb-2 space-y-1">
          {allDayItems.map(item => (
            <div
              key={item.id}
              className="text-[12px] px-3 py-2 rounded-lg bg-accent/15 border border-accent/20 text-foreground/80 cursor-pointer hover:bg-accent/20 transition-colors"
              onClick={() => item.raw && onEventClick?.(item.raw as CalendarEvent)}
            >
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground ml-2 text-[10px]">All day</span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height: totalHeight }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Hour lines */}
        {hours.map(hMin => (
          <div
            key={hMin}
            className="absolute left-0 right-0 flex items-start"
            style={{ top: getTop(hMin) }}
          >
            <span className="text-[9px] font-mono text-muted-foreground/40 w-12 shrink-0 -mt-1.5 select-none">
              {minsToLabel(hMin)}
            </span>
            <div className="flex-1 border-t border-border/40" />
          </div>
        ))}

        {/* Now indicator */}
        {isToday && nowMin >= rangeStart && nowMin <= rangeEnd && (
          <div
            className="absolute left-10 right-0 z-30 flex items-center"
            style={{ top: getTop(nowMin) }}
          >
            <div className="w-2 h-2 rounded-full bg-destructive -ml-1 shrink-0" />
            <div className="flex-1 border-t-2 border-destructive" />
          </div>
        )}

        {/* Event & task blocks */}
        {visibleBlocks.map(block => {
          const isDragging = draggingId === block.id;
          const effectiveStartMin = isDragging ? dragStartMin.current + dragOffsetMin : block.startMin;
          const duration = block.endMin - block.startMin;
          const effectiveEndMin = effectiveStartMin + duration;
          
          const top = getTop(effectiveStartMin);
          const height = getHeight(effectiveStartMin, effectiveEndMin);
          const isEvent = block.type === 'event';
          const isPast = isToday && block.endMin < nowMin;
          const isTask = block.type === 'task';

          return (
            <div
              key={block.id}
              className={cn(
                'absolute left-12 right-1 rounded-lg border-l-[3px] px-3 py-1.5',
                isDragging ? 'transition-none' : 'transition-all', // Bug B: no transition lag while dragging
                isEvent
                  ? 'border-l-accent bg-accent/30 hover:bg-accent/38 cursor-pointer'
                  : cn(contextStyles(block.context).border, contextStyles(block.context).bg, contextStyles(block.context).hover, 'ring-1 ring-inset ring-current/5'),
                isPast && 'opacity-40',
                isTask && 'cursor-grab active:cursor-grabbing touch-none',
                isDragging && 'z-40 shadow-lg ring-2 ring-accent/40 opacity-90',
              )}
              style={{ top, height, minHeight: MIN_BLOCK_H }}
              onPointerDown={(e) => isTask ? handlePointerDown(e, block) : undefined}
              onClick={() => {
                if (hasDragged.current) return;
                if (isEvent) onEventClick?.(block.raw as CalendarEvent);
                else onTaskClick?.(block.raw as Task);
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-[12px] font-medium text-foreground/85 truncate">{block.label}</p>
                <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums shrink-0 ml-auto">
                  {isDragging
                    ? `${minsToLabel(effectiveStartMin)}–${minsToLabel(effectiveEndMin)}`
                    : `${minsToLabel(block.startMin)}–${minsToLabel(block.endMin)}`
                  }
                </span>
              </div>
              {block.location && height > 44 && (
                <p className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 mt-0.5 truncate">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />{block.location}
                </p>
              )}
              {block.type === 'task' && block.priority === 'p1' && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-accent mt-0.5 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />Urgent
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
