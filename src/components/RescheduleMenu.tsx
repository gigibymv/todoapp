import { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, ArrowRight, Moon, Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getTodayInTz } from '@/lib/timezone';
import { addDays, nextMonday, format } from 'date-fns';

interface RescheduleMenuProps {
  taskId: string;
  tz: string;
  onRescheduled?: () => void;
  children: ReactNode;
}

export function RescheduleMenu({ taskId, tz, onRescheduled, children }: RescheduleMenuProps) {
  const today = new Date();

  const options = [
    {
      label: 'Tomorrow',
      icon: Sun,
      date: format(addDays(today, 1), 'yyyy-MM-dd'),
      subtitle: format(addDays(today, 1), 'EEE, MMM d'),
    },
    {
      label: 'Next Monday',
      icon: ArrowRight,
      date: format(nextMonday(today), 'yyyy-MM-dd'),
      subtitle: format(nextMonday(today), 'EEE, MMM d'),
    },
    {
      label: 'Next Week',
      icon: CalendarDays,
      date: format(addDays(today, 7), 'yyyy-MM-dd'),
      subtitle: format(addDays(today, 7), 'EEE, MMM d'),
    },
    {
      label: 'Someday',
      icon: Moon,
      date: null, // clear scheduled_date
      subtitle: 'No specific date',
    },
  ];

  const handleReschedule = async (date: string | null) => {
    const update: Record<string, any> = {
      scheduled_date: date,
      brief_action: date ? 'do' : 'backlog',
    };
    const { error } = await supabase.from('tasks').update(update).eq('id', taskId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(date ? `Moved to ${format(new Date(date + 'T12:00:00'), 'EEE, MMM d')}` : 'Moved to Someday');
      onRescheduled?.();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end" side="bottom">
        <div className="space-y-0.5">
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={() => handleReschedule(opt.date)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-secondary transition-colors"
            >
              <opt.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] font-medium">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
