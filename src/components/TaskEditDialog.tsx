import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Task, TaskContext, TaskPriority, EnergyType, TaskStatus } from '@/lib/types';
import { CONTEXT_LABELS, PRIORITY_LABELS, ENERGY_LABELS, CONTEXTS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { X, Plus, MapPin, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  short_code: string | null;
  parent_id: string | null;
  color: string | null;
}

interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  onDelete?: (task: Task) => void;
}

const RECURRENCE_OPTIONS = [
  { value: '', label: 'No repeat' },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'Weekdays' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
];

export function TaskEditDialog({ task, open, onOpenChange, onSaved, onDelete }: TaskEditDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState<TaskContext>('personal');
  const [priority, setPriority] = useState<TaskPriority>('p3');
  const [energyType, setEnergyType] = useState<EnergyType>('shallow');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMin, setEstimatedMin] = useState('');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [recurrence, setRecurrence] = useState('');
  const [location, setLocation] = useState('');
  const catInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase.from('task_categories').select('*').eq('user_id', user.id).order('name');
    setCategories((data as Category[]) || []);
  };

  useEffect(() => { if (open && user) fetchCategories(); }, [open, user]);

  // Populate fields whenever task changes or dialog opens
  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setContext(task.context);
      setPriority(task.priority);
      setEnergyType(task.energy_type);
      setStatus(task.status);
      setScheduledDate(task.scheduled_date || '');
      setScheduledTime(task.scheduled_time || '');
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '');
      setEstimatedMin(task.estimated_duration_min?.toString() || '');
      setSelectedCategoryId((task as any).category_id || null);
      setRecurrence(task.recurrence_rule || '');
      setLocation(task.location || '');
      setCategorySearch('');
      setShowCategoryDropdown(false);
    }
  }, [open, task]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!task || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('tasks').update({
      title: title.trim(),
      description: description.trim() || null,
      status,
      context, priority, energy_type: energyType,
      scheduled_date: scheduledDate || null,
      scheduled_time: scheduledTime || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      estimated_duration_min: estimatedMin ? parseInt(estimatedMin) : null,
      category_id: selectedCategoryId,
      recurrence_rule: recurrence || null,
      location: location.trim() || null,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('id', task.id);

    if (error) toast.error(error.message);
    else { toast.success('Updated'); onOpenChange(false); onSaved?.(); }
    setSaving(false);
  };

  const createCategory = async (name: string, parentId?: string) => {
    if (!user || !name.trim()) return;
    const shortCode = name.trim().length <= 6 ? name.trim().toUpperCase() : name.trim().slice(0, 4).toUpperCase();
    const { data, error } = await supabase.from('task_categories').insert({
      user_id: user.id,
      name: name.trim(),
      short_code: shortCode,
      parent_id: parentId || null,
    }).select().single();
    if (error) toast.error(error.message);
    else {
      fetchCategories();
      setSelectedCategoryId((data as Category).id);
      setShowNewCategory(false);
      setNewCategoryName('');
    }
  };

  // Filter categories for search
  const parentCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);
  
  const filteredCategories = categorySearch
    ? categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()) || c.short_code?.toLowerCase().includes(categorySearch.toLowerCase()))
    : parentCategories;

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  // Suggest MBA sub-categories when typing certain keywords
  const MBA_SUGGESTIONS: Record<string, string[]> = {
    'case': ['FIN', 'TEM', 'DSAIL', 'BGIE', 'LCA'],
    'mba': ['FIN', 'TEM', 'DSAIL', 'BGIE', 'LCA', 'Strategy', 'Marketing'],
    'finance': ['Corporate Finance', 'Valuation', 'M&A'],
  };

  const getSuggestions = () => {
    const lower = categorySearch.toLowerCase();
    for (const [key, subs] of Object.entries(MBA_SUGGESTIONS)) {
      if (lower.includes(key)) {
        return subs.filter(s => !categories.some(c => c.short_code === s || c.name === s));
      }
    }
    return [];
  };

  const suggestions = getSuggestions();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* style prop used to reliably override dialog.tsx p-6/gap-4 base classes */}
      <DialogContent
        className="sm:max-w-md bg-background border-border"
        style={{ padding: 0, gap: 0, display: 'flex', flexDirection: 'column', maxHeight: '90dvh', overflow: 'hidden' }}
      >
        {/* Sticky header — always visible, pr-12 avoids the close (X) button */}
        <div className="px-6 pt-5 pb-4 pr-12 shrink-0 border-b border-border/40">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Edit task</h2>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div>
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-10 bg-secondary border-0 text-[13px]" />
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Scheduled date</Label>
                <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-1.5 h-10 bg-secondary border border-border/40 text-[13px] w-full" />
              </div>
              <div className="min-w-0">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Scheduled time</Label>
                <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1.5 h-10 bg-secondary border border-border/40 text-[13px] w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Due date</Label>
                <Input type="date" value={dueDate.slice(0, 10)} onChange={(e) => setDueDate(e.target.value + (dueDate.length >= 16 ? dueDate.slice(10) : 'T00:00'))}
                  className="mt-1.5 h-10 bg-secondary border border-border/40 text-[13px] w-full" />
              </div>
              <div className="min-w-0">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Due time</Label>
                <Input type="time" value={dueDate.length >= 16 ? dueDate.slice(11, 16) : ''} onChange={(e) => setDueDate((dueDate.slice(0, 10) || new Date().toISOString().slice(0, 10)) + 'T' + e.target.value)}
                  className="mt-1.5 h-10 bg-secondary border border-border/40 text-[13px] w-full" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Repeat</Label>
              <Select value={recurrence || 'none'} onValueChange={(v) => setRecurrence(v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-1.5 h-10 bg-secondary border-0 text-[13px]"><SelectValue placeholder="No repeat" /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map(r => <SelectItem key={r.value || 'none'} value={r.value || 'none'}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status — Archived demoted to small text button */}
          <div>
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</Label>
            <div className="mt-1.5 flex gap-1">
              {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn(
                    'flex-1 h-9 rounded-md text-[11px] font-medium transition-colors',
                    status === s ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}>
                  {s === 'in_progress' ? 'Active' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <button type="button" onClick={() => setStatus('archived')}
                className={cn(
                  'h-9 px-3 rounded-md text-[11px] transition-colors',
                  status === 'archived' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground/60 hover:text-muted-foreground'
                )}>
                Archive
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Context</Label>
              <Select value={context} onValueChange={(v) => setContext(v as TaskContext)}>
                <SelectTrigger className="mt-1.5 h-10 bg-secondary border-0 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTEXTS.map((c) => <SelectItem key={c} value={c}>{CONTEXT_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className={cn('mt-1.5 h-10 bg-secondary border-0 text-[13px]', priority === 'p1' && 'text-accent')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['p1','p2','p3','p4'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Energy</Label>
              <Select value={energyType} onValueChange={(v) => setEnergyType(v as EnergyType)}>
                <SelectTrigger className="mt-1.5 h-10 bg-secondary border-0 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['deep_work','shallow','admin','quick_win'] as EnergyType[]).map((e) => <SelectItem key={e} value={e}>{ENERGY_LABELS[e]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Duration</Label>
              <Input type="number" value={estimatedMin} onChange={(e) => setEstimatedMin(e.target.value)}
                className="mt-1.5 h-10 bg-secondary border-0 text-[13px]" placeholder="min" />
            </div>
          </div>

          {/* Category / Tag */}
          <div className="relative">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Category / Tag</Label>
            <div className="mt-1.5">
              {selectedCategory ? (
                <div className="flex items-center gap-2 h-10 bg-secondary rounded-md px-3">
                  <span className="text-[12px] font-medium px-2 py-0.5 rounded bg-foreground/5">{selectedCategory.short_code || selectedCategory.name}</span>
                  <span className="text-[12px] text-muted-foreground flex-1">{selectedCategory.name}</span>
                  <button onClick={() => setSelectedCategoryId(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Input
                  ref={catInputRef}
                  value={categorySearch}
                  onChange={e => { setCategorySearch(e.target.value); setShowCategoryDropdown(true); }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="Search or create category..."
                  className="h-10 bg-secondary border-0 text-[13px]"
                />
              )}
            </div>
            {showCategoryDropdown && !selectedCategory && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredCategories.map(cat => (
                  <div key={cat.id}>
                    <button
                      className="w-full text-left px-3 py-2 text-[12px] hover:bg-secondary transition-colors flex items-center gap-2"
                      onClick={() => { setSelectedCategoryId(cat.id); setShowCategoryDropdown(false); setCategorySearch(''); }}
                    >
                      <span className="font-medium text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 uppercase">{cat.short_code || cat.name.slice(0, 3)}</span>
                      {cat.name}
                    </button>
                    {getChildren(cat.id).map(child => (
                      <button
                        key={child.id}
                        className="w-full text-left px-3 pl-8 py-1.5 text-[11px] hover:bg-secondary transition-colors flex items-center gap-2"
                        onClick={() => { setSelectedCategoryId(child.id); setShowCategoryDropdown(false); setCategorySearch(''); }}
                      >
                        <span className="font-medium text-[9px] px-1 py-0.5 rounded bg-foreground/5 uppercase">{child.short_code || child.name.slice(0, 3)}</span>
                        {child.name}
                      </button>
                    ))}
                  </div>
                ))}
                {suggestions.length > 0 && (
                  <div className="border-t border-border px-3 py-2">
                    <p className="text-[10px] text-muted-foreground mb-1.5">Suggested sub-categories:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.map(s => (
                        <button key={s}
                          className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-foreground/10 font-medium transition-colors"
                          onClick={() => createCategory(s)}
                        >+ {s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {categorySearch.trim() && !categories.some(c => c.name.toLowerCase() === categorySearch.toLowerCase()) && (
                  <button
                    className="w-full text-left px-3 py-2 text-[12px] hover:bg-secondary transition-colors flex items-center gap-1.5 border-t border-border text-muted-foreground"
                    onClick={() => createCategory(categorySearch)}
                  >
                    <Plus className="h-3 w-3" /> Create "{categorySearch}"
                  </button>
                )}
                {filteredCategories.length === 0 && suggestions.length === 0 && !categorySearch.trim() && (
                  <p className="text-[11px] text-muted-foreground py-3 text-center">No categories yet. Type to create one.</p>
                )}
              </div>
            )}
          </div>

          {/* Description — reduced min-h since it's rarely the primary edit */}
          <div>
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 bg-secondary border-0 text-[13px] min-h-[40px]" />
          </div>

          {/* Location — least used, at the bottom */}
          <div>
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Location</Label>
            <div className="relative mt-1.5">
              <MapPin className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors",
                location.trim() && /\d/.test(location) ? "text-accent" : "text-muted-foreground/50"
              )} />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={cn("h-10 bg-secondary border-0 text-[13px] pl-9", location.trim() && /\d/.test(location) && "ring-1 ring-accent/30")}
                placeholder="e.g. Office, 123 Main St…"
              />
              {location.trim() && /\d/.test(location) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-accent font-medium">📍 Address</span>
              )}
            </div>
          </div>
        </div>

        {/* Sticky footer — always visible */}
        <div className="px-6 py-4 border-t border-border/40 shrink-0 flex items-center justify-between">
          {onDelete && task ? (
            <Button variant="ghost" size="sm" className="text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => { onDelete(task); onOpenChange(false); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-[13px]" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" className="text-[13px]" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
