import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Task, TaskContext } from '@/lib/types';
import { Archive, Clock, Pencil, X, MapPin, Check, CalendarDays, RotateCcw } from 'lucide-react';
import { RescheduleMenu } from '@/components/RescheduleMenu';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  boardName?: string;
  onUpdate?: () => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onArchive?: (taskId: string) => void;
}

const SWIPE_THRESHOLD = 80;

export function TaskCard({ task, compact, boardName, onUpdate, onDelete, onEdit, onArchive }: TaskCardProps) {
  const { profile } = useProfile();
  const tz = profile?.timezone || 'America/New_York';
  const [swiped, setSwiped] = useState<'left' | null>(null);
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe right background (complete) opacity
  const rightBg = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  // Swipe left background (actions) opacity
  const leftBg = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleComplete = async () => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null })
      .eq('id', task.id);
    if (error) toast.error(error.message);
    else onUpdate?.();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this task?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); onDelete?.(task.id); onUpdate?.(); }
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive?.(task.id);
  };

  const handleDragEnd = async (_: any, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      // Swipe right → complete
      await handleComplete();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      setSwiped('left');
    }
  };

  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const isDueToday = task.due_date && new Date(task.due_date).toLocaleDateString('en-CA', { timeZone: tz }) === today;

  const dueLabel = task.due_date
    ? isDueToday
      ? new Date(task.due_date).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true })
      : new Date(task.due_date).toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && task.status !== 'archived';
  const isArchived = task.status === 'archived';

  // If swiped left, show action tray
  if (swiped === 'left') {
    return (
      <div className={cn('flex items-center gap-1 rounded-lg px-2', compact ? 'py-1.5' : 'py-2.5')}>
        <p className="text-[12px] truncate flex-1 text-muted-foreground">{task.title}</p>
        <div className="flex items-center gap-1 shrink-0">
            <RescheduleMenu taskId={task.id} tz={tz} onRescheduled={() => { setSwiped(null); onUpdate?.(); }}>
              <button
                className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                title="Reschedule"
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </button>
            </RescheduleMenu>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); setSwiped(null); onEdit(task); }}
                className="p-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onArchive && (
              <button
                onClick={(e) => { handleArchive(e); setSwiped(null); }}
                className="p-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                title="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
          <button
            onClick={(e) => { handleDelete(e); setSwiped(null); }}
            className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            title="Delete"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setSwiped(null)}
            className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Cancel"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg">
      {/* Swipe right background — green complete */}
      <motion.div
        className="absolute inset-0 bg-gigi-health/15 flex items-center pl-4 rounded-lg"
        style={{ opacity: rightBg }}
      >
        <Check className="h-5 w-5 text-gigi-health" />
        <span className="text-[11px] font-medium text-gigi-health ml-1.5">Done</span>
      </motion.div>

      {/* Swipe left background — actions */}
      <motion.div
        className="absolute inset-0 bg-secondary/80 flex items-center justify-end pr-4 rounded-lg"
        style={{ opacity: leftBg }}
      >
        <span className="text-[11px] text-muted-foreground">Actions</span>
      </motion.div>

      {/* Draggable card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 transition-colors bg-background relative z-10',
          compact ? 'py-1.5' : 'py-3',
          isArchived && 'opacity-50',
          'cursor-grab active:cursor-grabbing touch-pan-y',
        )}
        whileTap={{ cursor: 'grabbing' }}
      >
        <Checkbox
          checked={task.status === 'done' || task.status === 'archived'}
          onCheckedChange={handleComplete}
          className="shrink-0 rounded-full h-4 w-4 border-muted-foreground/30"
        />
        <div className="flex-1 min-w-0" onClick={() => onEdit?.(task)}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', contextDot(task.context))} />
            <p className={cn('text-[13px] truncate', (task.status === 'done' || isArchived) && 'line-through text-muted-foreground')}>
              {task.title}
            </p>
          </div>
          {!compact && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {task.priority === 'p1' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />Urgent
                </span>
              )}
              {dueLabel && (
                <span className={cn('text-[11px] flex items-center gap-0.5', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                  <Clock className="h-2.5 w-2.5" />{dueLabel}
                </span>
              )}
              {task.estimated_duration_min && (
                <span className="text-[11px] text-muted-foreground">
                  ~{task.estimated_duration_min >= 60 ? `${Math.round(task.estimated_duration_min / 60)}h` : `${task.estimated_duration_min}m`}
                </span>
              )}
              {task.location && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />{task.location}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Desktop hover actions still available */}
        {!compact && !isArchived && (
          <div className="opacity-0 group-hover:opacity-100 hidden md:flex items-center gap-0.5 transition-opacity">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {onArchive && (
              <button
                onClick={handleArchive}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                title="Archive"
              >
                <Archive className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
              title="Delete"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function contextDot(ctx: TaskContext) {
  const map: Record<TaskContext, string> = {
    work: 'bg-gigi-work',
    mba: 'bg-gigi-mba',
    personal: 'bg-gigi-personal',
    finance: 'bg-gigi-finance',
    health: 'bg-gigi-health',
    legal: 'bg-muted-foreground',
  };
  return map[ctx] || 'bg-muted-foreground';
}
