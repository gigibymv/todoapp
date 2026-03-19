import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, FolderKanban, X, Folder, Plus, MapPin, Clock, CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import type { AITaskParse, TaskContext, TaskPriority, EnergyType } from '@/lib/types';
import { CONTEXT_LABELS, PRIORITY_LABELS, ENERGY_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getTodayInTz, zonedToUTC } from '@/lib/timezone';

interface Project { id: string; name: string; icon: string | null; color: string | null; }
interface Board { id: string; name: string; project_id: string; }

interface CaptureFormProps {
  onSaved?: () => void;
  autoFocus?: boolean;
  /** If true, renders inline (top bar). If false, renders for dialog use. */
  inline?: boolean;
}

function CaptureForm({ onSaved, autoFocus = true, inline = true }: CaptureFormProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const tz = profile?.timezone || 'America/New_York';
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<AITaskParse | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [recentProjectIds, setRecentProjectIds] = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [boardSearch, setBoardSearch] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const boardPickerRef = useRef<HTMLDivElement>(null);

  type BriefSection = 'do' | 'backlog' | 'skip';
  const [section, setSection] = useState<BriefSection>('do');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  useEffect(() => {
    if (!user) return;
    supabase.from('projects').select('id, name, icon, color').eq('user_id', user.id).eq('status', 'active').order('name').then(({ data }) => {
      setProjects((data as Project[]) || []);
    });
    const stored = localStorage.getItem(`gigi-recent-projects-${user.id}`);
    if (stored) setRecentProjectIds(JSON.parse(stored));
  }, [user]);

  useEffect(() => {
    if (!selectedProject || !user) { setBoards([]); setSelectedBoard(null); return; }
    supabase.from('project_boards').select('id, name, project_id')
      .eq('project_id', selectedProject.id).eq('user_id', user.id).order('sort_order')
      .then(({ data }) => {
        const b = (data as Board[]) || [];
        setBoards(b);
        if (b.length > 0 && !selectedBoard) setShowBoardPicker(true);
      });
  }, [selectedProject, user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowProjectPicker(false);
      if (boardPickerRef.current && !boardPickerRef.current.contains(e.target as Node)) {
        setShowBoardPicker(false);
        setCreatingBoard(false);
        setNewBoardName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const trackRecent = (projectId: string) => {
    if (!user) return;
    const updated = [projectId, ...recentProjectIds.filter(id => id !== projectId)].slice(0, 5);
    setRecentProjectIds(updated);
    localStorage.setItem(`gigi-recent-projects-${user.id}`, JSON.stringify(updated));
  };

  useEffect(() => {
    if (parsed?.project_name && !selectedProject && projects.length > 0) {
      const match = projects.find(p => p.name.toLowerCase().includes(parsed.project_name!.toLowerCase()));
      if (match) setSelectedProject(match);
    }
  }, [parsed, projects, selectedProject]);

  const parseTask = useCallback(async (input: string) => {
    if (input.trim().length < 3) { setParsed(null); return; }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-task', { body: { text: input, timezone: tz } });
      if (error) throw error;
      setParsed(data as AITaskParse);
    } catch { /* silent */ } finally { setParsing(false); }
  }, []);

  const handleChange = (value: string) => {
    setText(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => parseTask(value), 400);
  };

  const createProject = async () => {
    if (!newProjectName.trim() || !user) return;
    setCreatingProject(true);
    const { data, error } = await supabase.from('projects').insert({ user_id: user.id, name: newProjectName.trim() }).select().single();
    if (error) { toast.error(error.message); setCreatingProject(false); return; }
    const newProj = data as Project;
    setProjects(prev => [...prev, newProj]);
    setSelectedProject(newProj);
    setShowProjectPicker(false);
    setNewProjectName('');
    setProjectSearch('');
    setCreatingProject(false);
    trackRecent(newProj.id);
    toast.success(`Created "${newProj.name}"`);
  };

  const createBoard = async () => {
    if (!newBoardName.trim() || !selectedProject || !user) return;
    setCreatingBoard(true);
    const { data, error } = await supabase.from('project_boards').insert({
      user_id: user.id, project_id: selectedProject.id, name: newBoardName.trim(), sort_order: boards.length,
    }).select().single();
    if (error) { toast.error(error.message); setCreatingBoard(false); return; }
    const newBoard = data as Board;
    setBoards(prev => [...prev, newBoard]);
    setSelectedBoard(newBoard);
    setShowBoardPicker(false);
    setNewBoardName('');
    setCreatingBoard(false);
    toast.success(`Created "${newBoard.name}"`);
  };

  const handleSubmit = async () => {
    if (!text.trim() || !user) return;
    setSaving(true);
    const taskData = parsed || { title: text.trim(), context: 'personal' as TaskContext, priority: 'p3' as TaskPriority, energy_type: 'shallow' as EnergyType };
    
    // Compute dates
    const today = getTodayInTz(tz);
    const effectiveDate = scheduledDate || today;

    // If user picked a scheduled time, build a proper due_date in the user's timezone
    let finalDueDate = taskData.due_date || null;
    if (scheduledTime) {
      finalDueDate = zonedToUTC(effectiveDate, `${scheduledTime}:00`, tz).toISOString();
    } else if (scheduledDate) {
      // Date picked but no time — set due_date to end of that day in user's timezone
      finalDueDate = zonedToUTC(scheduledDate, '23:59:59', tz).toISOString();
    }
    
    try {
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: taskData.title || text.trim(),
        context: taskData.context,
        priority: taskData.priority,
        energy_type: taskData.energy_type,
        due_date: finalDueDate,
        estimated_duration_min: taskData.estimated_duration_min || null,
        recurrence_rule: taskData.recurrence_rule || null,
        project_id: selectedProject?.id || null,
        board_id: selectedBoard?.id || null,
        brief_action: section === 'backlog' ? null : section,
        location: taskData.location || null,
        scheduled_date: (scheduledTime || scheduledDate) ? effectiveDate : null,
        scheduled_time: scheduledTime || null,
      });
      if (error) throw error;
      if (selectedProject) trackRecent(selectedProject.id);
      toast.success('Captured');
      window.dispatchEvent(new CustomEvent('gigi:task-created'));
      setText('');
      setParsed(null);
      setSelectedProject(null);
      setSelectedBoard(null);
      setSection('do');
      setScheduledTime('');
      setScheduledDate('');
      onSaved?.();
      inputRef.current?.focus();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const dueLabel = (scheduledTime || scheduledDate)
    ? null  // Date/time already shown in picker chips
    : parsed?.due_date
      ? new Date(parsed.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : null;

  const durationLabel = parsed?.estimated_duration_min
    ? parsed.estimated_duration_min >= 60 ? `~${Math.round(parsed.estimated_duration_min / 60)}h` : `~${parsed.estimated_duration_min}m`
    : null;

  const sortedProjects = [...projects].sort((a, b) => {
    const aRecent = recentProjectIds.indexOf(a.id);
    const bRecent = recentProjectIds.indexOf(b.id);
    if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
    if (aRecent !== -1) return -1;
    if (bRecent !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  const filteredProjects = projectSearch
    ? sortedProjects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
    : sortedProjects;

  const filteredBoards = boardSearch
    ? boards.filter(b => b.name.toLowerCase().includes(boardSearch.toLowerCase()))
    : boards;

  return (
    <div>
      <div className="relative">
        <div className="flex items-center gap-1.5">
          {/* Project picker */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowProjectPicker(!showProjectPicker)}
              className={cn(
                'flex items-center gap-1.5 h-11 px-3 rounded-lg text-[12px] transition-all shrink-0',
                selectedProject ? 'bg-accent/10 text-accent font-medium' : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
              title={selectedProject ? selectedProject.name : 'Select project'}
            >
              <FolderKanban className="h-3.5 w-3.5" />
              {selectedProject && (
                <>
                  <span className="max-w-[80px] truncate hidden sm:inline">{selectedProject.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedProject(null); setSelectedBoard(null); }}
                    className="p-0.5 rounded hover:bg-accent/20 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </>
              )}
            </button>

            {showProjectPicker && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-scale-in z-50">
                <div className="p-2 border-b border-border">
                  <input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full h-8 px-2.5 text-[12px] bg-secondary rounded-md focus:outline-none focus:ring-1 focus:ring-accent/30"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  <button
                    onClick={() => { setSelectedProject(null); setSelectedBoard(null); setShowProjectPicker(false); setProjectSearch(''); }}
                    className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-colors hover:bg-secondary', !selectedProject && 'text-accent font-medium')}
                  >
                    <span className="text-muted-foreground">No project</span>
                  </button>
                  {recentProjectIds.length > 0 && !projectSearch && (
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/60 font-medium">Recent</span>
                    </div>
                  )}
                  {filteredProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProject(p); setSelectedBoard(null); setShowProjectPicker(false); setProjectSearch(''); }}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-colors hover:bg-secondary', selectedProject?.id === p.id && 'text-accent font-medium')}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || 'hsl(var(--muted-foreground))' }} />
                      <span className="truncate">{p.name}</span>
                      {recentProjectIds.includes(p.id) && !projectSearch && <span className="text-[9px] text-muted-foreground/40 ml-auto">recent</span>}
                    </button>
                  ))}
                  {filteredProjects.length === 0 && !projectSearch.trim() && <p className="text-center text-[11px] text-muted-foreground py-4">No projects yet</p>}
                  {filteredProjects.length === 0 && projectSearch.trim() && <p className="text-center text-[11px] text-muted-foreground py-3">No match</p>}
                </div>
                <div className="border-t border-border p-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createProject(); } }}
                      placeholder="New project..."
                      className="flex-1 h-7 px-2 text-[12px] bg-secondary rounded-md focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                    <button onClick={createProject} disabled={!newProjectName.trim() || creatingProject} className="p-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-30">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Board picker */}
          {selectedProject && (
            <div className="relative" ref={boardPickerRef}>
              <button
                onClick={() => setShowBoardPicker(!showBoardPicker)}
                className={cn(
                  'flex items-center gap-1 h-11 px-2.5 rounded-lg text-[12px] transition-all shrink-0',
                  selectedBoard ? 'bg-accent/8 text-accent font-medium' : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title={selectedBoard ? selectedBoard.name : 'Select sub-folder'}
              >
                <Folder className="h-3 w-3" />
                {selectedBoard ? (
                  <>
                    <span className="max-w-[70px] truncate hidden sm:inline">{selectedBoard.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedBoard(null); }} className="p-0.5 rounded hover:bg-accent/20 transition-colors">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </>
                ) : (
                  <span className="hidden sm:inline text-muted-foreground/60">Board</span>
                )}
              </button>

              {showBoardPicker && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-scale-in z-50">
                  {boards.length > 3 && (
                    <div className="p-2 border-b border-border">
                      <input
                        value={boardSearch}
                        onChange={(e) => setBoardSearch(e.target.value)}
                        placeholder="Search boards..."
                        className="w-full h-7 px-2.5 text-[12px] bg-secondary rounded-md focus:outline-none focus:ring-1 focus:ring-accent/30"
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="max-h-40 overflow-y-auto py-1">
                    <button
                      onClick={() => { setSelectedBoard(null); setShowBoardPicker(false); setBoardSearch(''); }}
                      className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors hover:bg-secondary', !selectedBoard && 'text-accent font-medium')}
                    >
                      <span className="text-muted-foreground">No board</span>
                    </button>
                    {filteredBoards.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => { setSelectedBoard(b); setShowBoardPicker(false); setBoardSearch(''); }}
                        className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors hover:bg-secondary', selectedBoard?.id === b.id && 'text-accent font-medium')}
                      >
                        <Folder className="h-3 w-3 text-muted-foreground/50" />
                        <span className="truncate">{b.name}</span>
                      </button>
                    ))}
                    {filteredBoards.length === 0 && boards.length > 0 && <p className="text-center text-[11px] text-muted-foreground py-3">No boards match</p>}
                  </div>
                  <div className="border-t border-border p-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createBoard(); } }}
                        placeholder="New board..."
                        className="flex-1 h-7 px-2 text-[12px] bg-secondary rounded-md focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                      <button onClick={createBoard} disabled={!newBoardName.trim() || creatingBoard} className="p-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-30">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main input */}
          <input
            ref={inputRef}
            data-capture-input
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            className="flex-1 h-11 bg-secondary rounded-lg px-4 pr-16 text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {parsing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || saving}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {text.trim() && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] animate-fade-in">
          {/* Section picker */}
          {(['do', 'backlog', 'skip'] as BriefSection[]).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={cn(
                'px-3.5 py-2 rounded-xl font-medium transition-colors capitalize min-h-[44px] min-w-[52px] active:scale-95',
                section === s
                  ? s === 'do' ? 'bg-accent/15 text-accent' : s === 'skip' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-foreground'
                  : 'bg-secondary/60 text-muted-foreground hover:text-muted-foreground'
              )}
            >
              {s === 'do' ? 'Do' : s === 'backlog' ? 'Maybe' : 'Skip'}
            </button>
          ))}
          
          {/* Time picker */}
          <label
            className={cn(
              'px-3.5 py-2 rounded-xl font-medium transition-colors min-h-[44px] inline-flex items-center gap-1.5 cursor-pointer active:scale-95 relative',
              scheduledTime ? 'bg-accent/15 text-accent' : 'bg-secondary/60 text-muted-foreground hover:text-muted-foreground'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            {scheduledTime || 'Time'}
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
          {scheduledTime && (
            <button onClick={() => setScheduledTime('')} className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}

          {/* Date picker */}
          <label
            className={cn(
              'px-3.5 py-2 rounded-xl font-medium transition-colors min-h-[44px] inline-flex items-center gap-1.5 cursor-pointer active:scale-95 relative',
              scheduledDate ? 'bg-accent/15 text-accent' : 'bg-secondary/60 text-muted-foreground hover:text-muted-foreground'
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {scheduledDate
              ? new Date(scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'Date'}
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
          {scheduledDate && (
            <button onClick={() => setScheduledDate('')} className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}

          {parsed && (
            <>
              <span className="w-px h-5 bg-border mx-0.5" />
              <span className={cn('px-3.5 py-2 rounded-xl font-medium min-h-[44px] inline-flex items-center', contextColor(parsed.context))}>
                {CONTEXT_LABELS[parsed.context]}
              </span>
              {parsed.priority === 'p1' && (
                <span className="px-3.5 py-2 rounded-xl font-medium bg-accent/10 text-accent inline-flex items-center gap-1.5 min-h-[44px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />Urgent
                </span>
              )}
              <span className="px-3.5 py-2 rounded-xl bg-secondary text-muted-foreground min-h-[44px] inline-flex items-center">
                {ENERGY_LABELS[parsed.energy_type]}
              </span>
              {dueLabel && <span className="px-3.5 py-2 rounded-xl bg-secondary text-muted-foreground min-h-[44px] inline-flex items-center">{dueLabel}</span>}
              {durationLabel && <span className="px-3.5 py-2 rounded-xl bg-secondary text-muted-foreground min-h-[44px] inline-flex items-center">{durationLabel}</span>}
              {parsed.location && (
                <span className="px-3.5 py-2 rounded-xl bg-secondary text-muted-foreground flex items-center gap-1.5 min-h-[44px]">
                  <MapPin className="h-3.5 w-3.5" /> {parsed.location}
                </span>
              )}
              {parsed.project_name && !selectedProject && (
                <button
                  onClick={() => {
                    const match = projects.find(p => p.name.toLowerCase().includes(parsed.project_name!.toLowerCase()));
                    if (match) setSelectedProject(match);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer min-h-[44px] inline-flex items-center active:scale-95"
                >
                  📁 {parsed.project_name}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Inline capture bar for the top of the page */
export function UniversalCapture() {
  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-3 md:px-10">
      <div className="max-w-xl mx-auto">
        <CaptureForm inline autoFocus />
      </div>
    </div>
  );
}

/** Dialog version triggered by FAB */
export function CaptureDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-5">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold tracking-[-0.02em]">Quick capture</DialogTitle>
        </DialogHeader>
        <CaptureForm
          autoFocus
          inline={false}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function contextColor(ctx: TaskContext) {
  const map: Record<TaskContext, string> = {
    work: 'bg-gigi-work/10 text-gigi-work',
    mba: 'bg-gigi-mba/10 text-gigi-mba',
    personal: 'bg-gigi-personal/10 text-gigi-personal',
    finance: 'bg-gigi-finance/10 text-gigi-finance',
    health: 'bg-gigi-health/10 text-gigi-health',
    legal: 'bg-secondary text-muted-foreground',
  };
  return map[ctx] || 'bg-secondary text-muted-foreground';
}

function priorityColor(p: TaskPriority) {
  const map: Record<TaskPriority, string> = {
    p1: 'bg-gigi-p1/10 text-gigi-p1',
    p2: 'bg-gigi-p2/10 text-gigi-p2',
    p3: 'bg-secondary text-muted-foreground',
    p4: 'bg-secondary text-muted-foreground/60',
  };
  return map[p];
}
