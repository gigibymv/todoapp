import { Calendar, Clock, MapPin, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface CalendarEventItem {
  id: string;
  summary: string | null;
  dtstart: string;
  dtend: string | null;
  location: string | null;
  all_day: boolean | null;
  dismissed?: boolean | null;
  completed_at?: string | null;
  brief_action?: string | null;
}

interface CalendarEventCardProps {
  event: CalendarEventItem;
  tz: string;
  compact?: boolean;
  onComplete?: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
}

export function CalendarEventCard({ event, tz, compact, onComplete, onDismiss }: CalendarEventCardProps) {
  const isDone = !!event.completed_at;

  const startTime = event.all_day
    ? 'All day'
    : new Date(event.dtstart).toLocaleTimeString('en-US', {
        timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
      });

  const endTime = event.dtend && !event.all_day
    ? new Date(event.dtend).toLocaleTimeString('en-US', {
        timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : null;

  return (
    <div className={cn(
      'group flex items-center gap-3 rounded-lg px-3 transition-colors hover:bg-secondary/60',
      compact ? 'py-1.5' : 'py-3',
      isDone && 'opacity-50',
    )}>
      <Checkbox
        checked={isDone}
        onCheckedChange={() => onComplete?.(event.id)}
        className="shrink-0 rounded-full h-4 w-4 border-muted-foreground/30"
      />
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-[13px] truncate',
          isDone && 'line-through text-muted-foreground',
        )}>
          {event.summary || 'Untitled event'}
        </p>
        {!compact && (
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {startTime}{endTime ? ` – ${endTime}` : ''}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" />
                <span className="truncate max-w-[120px]">{event.location}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
              <Calendar className="h-2.5 w-2.5" />
              Cal
            </span>
          </div>
        )}
      </div>
      {!compact && onDismiss && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(event.id); }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
