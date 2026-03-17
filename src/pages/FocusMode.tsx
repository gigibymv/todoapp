import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function FocusMode() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('task');
  const [taskTitle, setTaskTitle] = useState('Focus Session');
  const [pomodoroDuration, setPomodoroDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (taskId) {
      supabase.from('tasks').select('title').eq('id', taskId).single().then(({ data }) => {
        if (data) setTaskTitle(data.title);
      });
    }
    supabase.from('profiles').select('pomodoro_duration').eq('user_id', user.id).single().then(({ data }) => {
      if (data?.pomodoro_duration) {
        setPomodoroDuration(data.pomodoro_duration);
        setTimeLeft(data.pomodoro_duration * 60);
      }
    });
  }, [user, taskId]);

  const startSession = useCallback(async () => {
    if (!user) return;
    startTimeRef.current = new Date().toISOString();
    const { data } = await supabase
      .from('focus_sessions')
      .insert({ user_id: user.id, task_id: taskId, started_at: startTimeRef.current })
      .select('id').single();
    if (data) setSessionId(data.id);
  }, [user, taskId]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            if (!isBreak) {
              setCompletedPomodoros((p) => p + 1);
              setIsBreak(true);
              setTimeLeft(5 * 60);
              toast.success('Done. Take a break.');
            } else {
              setIsBreak(false);
              setTimeLeft(pomodoroDuration * 60);
              toast('Ready for another round?');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isBreak, pomodoroDuration]);

  const toggleTimer = () => {
    if (!isRunning && !sessionId) startSession();
    setIsRunning(!isRunning);
  };

  const finishSession = async () => {
    clearInterval(intervalRef.current);
    if (sessionId && user) {
      const totalMinutes = startTimeRef.current
        ? Math.round((Date.now() - new Date(startTimeRef.current).getTime()) / 60000) : 0;
      await supabase.from('focus_sessions').update({
        ended_at: new Date().toISOString(),
        duration_minutes: totalMinutes,
        completed_pomodoros: completedPomodoros + (isRunning && !isBreak ? 1 : 0),
      }).eq('id', sessionId);
      if (taskId) {
        // Only update actual duration, don't auto-complete the task
        await supabase.from('tasks').update({
          actual_duration_min: totalMinutes,
        }).eq('id', taskId);
      }
    }
    toast.success('Session complete');
    navigate(-1);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = isBreak
    ? ((5 * 60 - timeLeft) / (5 * 60)) * 100
    : ((pomodoroDuration * 60 - timeLeft) / (pomodoroDuration * 60)) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
      <button onClick={() => navigate(-1)} className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors">
        <X className="h-4 w-4" />
      </button>

      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] mb-2">
        {isBreak ? 'Break' : 'Focusing'}
      </p>
      <h1 className="text-lg font-medium text-center mb-16 max-w-sm">{taskTitle}</h1>

      {/* Timer */}
      <div className="relative w-56 h-56 mb-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-light tabular-nums tracking-[-0.02em]">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Play/Pause */}
      <button
        onClick={toggleTimer}
        className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center mb-8 hover:opacity-80 transition-opacity"
      >
        {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </button>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="ghost" size="sm" className="text-[13px] text-muted-foreground" onClick={finishSession}>
          Done
        </Button>
        <Button
          variant="ghost" size="sm" className="text-[13px] text-muted-foreground"
          onClick={() => { setTimeLeft(pomodoroDuration * 60); setIsBreak(false); }}
        >
          <SkipForward className="h-3.5 w-3.5 mr-1" /> Reset
        </Button>
      </div>

      {/* Pomodoro count */}
      <p className="absolute bottom-8 text-[11px] text-muted-foreground/40">
        {completedPomodoros} pomodoro{completedPomodoros !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
