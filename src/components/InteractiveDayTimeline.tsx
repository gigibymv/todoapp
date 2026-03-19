import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { nowMinutesInTz } from '@/lib/timezone';
import { MapPin, Calendar } from 'lucide-react';
import type { Task } from '@/lib/types';
import type { CalendarEventItem } from '@/components/CalendarEventCard';

const PX_PER_MIN = 1.0;
const MIN_BLOCK_H = 32;
const HOUR_START = 6;
const HOUR_END = 23;

function minsToLabel(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12} ${ampm}`;
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getTimeInTz(isoStr: string, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date(isoStr));
  const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  return (h === 24 ? 0 : h) * 60 + m;
}

function contextBorder(ctx?: string) {
  if (!ctx) return 'border-l-muted-foreground/30';
  const map: Record<string, string> = {
    work: 'border-l-gigi-work',
    school: 'border-l-gigi-school',
    personal: 'border-l-gigi-personal',
    admin: 'border-l-gigi-admin',
  };
  return map[ctx] || 'border-l-muted-foreground/30';
}

interface InteractiveDayTimelineProps {
  events: CalendarEventItem[];
  tasks: Task[];
  tz: string;
  todayStr: string;
  onCreateTask: (title: string, scheduledTime: string, scheduledDate: string) => void;
  onTaskClick?: (task: Task) => void;
}

interface TimeBlock {
  id: string;
  type: 'event' | 'task';
  label: string;
  startMin: number;
  endMin: number;
  location?: string | null;
  context?: string;
  priority?: string;
  isDone?: boolean;
}

export function InteractiveDayTimeline({
  events, tasks, tz, todayStr, onCreateTask, onTaskClick,
}: InteractiveDayTimelineProps) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const nowMin = nowMinutesInTz(tz);

  // Build blocks
  const blocks: TimeBlock[] = [];

  events.forEach(ev => {
    if (ev.all_day) return; // all-day shown separately
    const startMin = getTimeInTz(ev.dtstart, tz);
    let endMin = startMin + 30;
    if (ev.dtend) {
      endMin = getTimeInTz(ev.dtend, tz);
      if (endMin <= startMin) endMin = startMin + 30;
    }
    blocks.push({
      id: ev.id, type: 'event', label: ev.summary || 'Untitled',
      startMin, endMin, location: ev.location, isDone: !!ev.completed_at,
    });
  });

  tasks.forEach(t => {
    const dur = t.estimated_duration_min || 30;
    let startMin = HOUR_START * 60;
    if (t.scheduled_time) {
      const [h, m] = t.scheduled_time.split(':').map(Number);
      startMin = h * 60 + m;
    }
    blocks.push({
      id: t.id, type: 'task', label: t.title,
      startMin, endMin: startMin + dur,
      context: t.context, priority: t.priority,
      isDone: t.status === 'done',
    });
  });

  blocks.sort((a, b) => a.startMin - b.startMin);

  // Calculate range
  const allMins = blocks.map(b => [b.startMin, b.endMin]).flat();
  if (nowMin >= 0) allMins.push(nowMin);
  
  let rangeStart = Math.max(HOUR_START * 60, Math.floor((Math.min(...allMins, nowMin) / 60) - 1) * 60);
  let rangeEnd = Math.min(HOUR_END * 60, Math.ceil((Math.max(...allMins, nowMin + 60) / 60) + 1) * 60);
  if (rangeEnd - rangeStart < 360) rangeEnd = Math.min(HOUR_END * 60, rangeStart + 360);
  if (allMins.length <= 1) { rangeStart = 7 * 60; rangeEnd = 21 * 60; }

  const totalHeight = (rangeEnd - rangeStart) * PX_PER_MIN;
  const getTop = (min: number) => Math.max(0, (min - rangeStart) * PX_PER_MIN);
  const getHeight = (s: number, e: number) =>
    Math.max(MIN_BLOCK_H, (Math.min(e, rangeEnd) - Math.max(s, rangeStart)) * PX_PER_MIN);

  // Hour markers
  const hours: number[] = [];
  for (let h = Math.floor(rangeStart / 60); h <= Math.ceil(rangeEnd / 60); h++) {
    if (h * 60 >= rangeStart && h * 60 <= rangeEnd) hours.push(h * 60);
  }

  // All-day events
  const allDayEvents = events.filter(e => e.all_day);

  const handleSlotClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const clickedMin = Math.floor(y / PX_PER_MIN) + rangeStart;
    // Snap to nearest 15min
    const snapped = Math.round(clickedMin / 15) * 15;
    // Check if clicking on a block area
    const onBlock = blocks.some(b => snapped >= b.startMin && snapped < b.endMin);
    if (onBlock) return;
    setActiveSlot(snapped);
    setInputValue('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [rangeStart, blocks]);

  const handleSubmit = () => {
    if (!inputValue.trim() || activeSlot === null) return;
    onCreateTask(inputValue.trim(), minsToTime(activeSlot), todayStr);
    setInputValue('');
    setActiveSlot(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') { setActiveSlot(null); setInputValue(''); }
  };

  return (
    <div className="relative select-none">
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="mb-2 space-y-1">
          {allDayEvents.map(ev => (
            <div
              key={ev.id}
              className="text-[11px] px-2.5 py-1.5 rounded-md bg-accent/8 border border-accent/15 text-foreground/80"
            >
              <span className="font-medium">{ev.summary || 'Untitled'}</span>
              <span className="text-muted-foreground ml-1.5 text-[9px]">All day</span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div
        className="relative cursor-pointer"
        style={{ height: totalHeight }}
        onClick={handleSlotClick}
      >
        {/* Hour lines */}
        {hours.map(hMin => (
          <div
            key={hMin}
            className="absolute left-0 right-0 flex items-start pointer-events-none"
            style={{ top: getTop(hMin) }}
          >
            <span className="text-[9px] font-mono text-muted-foreground/40 w-10 shrink-0 -mt-1.5 select-none">
              {minsToLabel(hMin)}
            </span>
            <div className="flex-1 border-t border-border/30" />
          </div>
        ))}

        {/* Now indicator */}
        {nowMin >= rangeStart && nowMin <= rangeEnd && (
          <div
            className="absolute left-8 right-0 z-30 flex items-center pointer-events-none"
            style={{ top: getTop(nowMin) }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-destructive -ml-0.5 shrink-0" />
            <div className="flex-1 border-t border-destructive/60" />
          </div>
        )}

        {/* Blocks */}
        {blocks.filter(b => b.endMin > rangeStart && b.startMin < rangeEnd).map(block => {
          const top = getTop(block.startMin);
          const height = getHeight(block.startMin, block.endMin);
          const isEvent = block.type === 'event';
          const isPast = block.endMin < nowMin;

          return (
            <div
              key={block.id}
              className={cn(
                'absolute left-10 right-0 rounded-md border-l-2 px-2 py-1 text-[11px] overflow-hidden transition-all',
                isEvent
                  ? 'border-l-accent bg-accent/8 hover:bg-accent/12'
                  : cn(contextBorder(block.context), 'bg-secondary/40 hover:bg-secondary/60'),
                isPast && 'opacity-40',
                block.isDone && 'line-through opacity-40',
              )}
              style={{ top, height: Math.max(height, MIN_BLOCK_H) }}
              onClick={(e) => {
                e.stopPropagation();
                if (block.type === 'task') {
                  const task = tasks.find(t => t.id === block.id);
                  if (task) onTaskClick?.(task);
                }
              }}
            >
              <p className="truncate font-medium text-foreground/80">{block.label}</p>
              {block.location && height > 40 && (
                <p className="text-[9px] text-muted-foreground/50 flex items-center gap-0.5 truncate">
                  <MapPin className="h-2 w-2 shrink-0" />{block.location}
                </p>
              )}
              {isEvent && (
                <span className="text-[8px] text-muted-foreground/40 flex items-center gap-0.5">
                  <Calendar className="h-2 w-2" />Cal
                </span>
              )}
            </div>
          );
        })}

        {/* Active slot input */}
        {activeSlot !== null && (
          <div
            className="absolute left-10 right-0 z-40"
            style={{ top: getTop(activeSlot) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 bg-background border border-accent/40 rounded-md px-2 py-1.5 shadow-md">
              <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                {minsToLabel(activeSlot)}
              </span>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (!inputValue.trim()) setActiveSlot(null); }}
                placeholder="Type task name, press Enter"
                className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/40 min-w-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
