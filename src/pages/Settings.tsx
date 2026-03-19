import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, Trash2, RefreshCw, Calendar, Plus, Link, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { CustomLabel } from '@/lib/context-labels';
import { nextPaletteColor } from '@/lib/context-labels';


interface Profile {
  display_name: string; timezone: string; deep_work_preference: string;
  work_hours_start: string; work_hours_end: string; pomodoro_duration: number;
  notification_enabled: boolean;
}

interface Pattern {
  id: string; pattern_text: string; context: string; priority: string;
  energy_type: string; usage_count: number;
}

interface CalendarLink {
  id: string; name: string; ics_url: string; color: string;
  last_synced_at: string | null; enabled: boolean;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { refetch: refetchProfile } = useProfile();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [saving, setSaving] = useState(false);
  const [calendars, setCalendars] = useState<CalendarLink[]>([]);
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [showAddCal, setShowAddCal] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalUrl, setNewCalUrl] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [tzOpen, setTzOpen] = useState(false);
  const allTimezones = useMemo(() => {
    try { return (Intl as any).supportedValuesOf('timeZone') as string[]; }
    catch { return ['America/New_York','America/Los_Angeles','America/Chicago','Europe/London','Europe/Paris','Asia/Tokyo','Asia/Shanghai','Australia/Sydney']; }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile(data as any);
        setCustomLabels((data as any).custom_labels || []);
      }
    });
    supabase.from('categorization_patterns').select('*').eq('user_id', user.id).order('usage_count', { ascending: false }).then(({ data }) => {
      setPatterns((data as Pattern[]) || []);
    });
    fetchCalendars();
  }, [user]);

  const fetchCalendars = async () => {
    if (!user) return;
    const { data } = await supabase.from('calendar_links').select('*').eq('user_id', user.id).order('created_at');
    setCalendars((data as CalendarLink[]) || []);
  };

  const save = async (updates: Partial<Profile>) => {
    if (!user) return;
    setSaving(true);
    setProfile({ ...profile, ...updates } as Profile);
    const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else { toast.success('Saved'); refetchProfile(); }
    setSaving(false);
  };

  const deletePattern = async (id: string) => {
    const { error } = await supabase.from('categorization_patterns').delete().eq('id', id);
    if (error) toast.error(error.message);
    else setPatterns(patterns.filter((p) => p.id !== id));
  };

  const saveLabels = async (labels: CustomLabel[]) => {
    if (!user) return;
    setCustomLabels(labels);
    const { error } = await supabase.from('profiles').update({ custom_labels: labels as any }).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else refetchProfile();
  };

  const addLabel = async () => {
    const name = newLabelName.trim();
    if (!name) return;
    const newLabel: CustomLabel = {
      id: crypto.randomUUID(),
      name,
      color: nextPaletteColor(customLabels),
    };
    await saveLabels([...customLabels, newLabel]);
    setNewLabelName('');
  };

  const deleteLabel = (id: string) => saveLabels(customLabels.filter(l => l.id !== id));

  const normalizeCalUrl = (url: string) => {
    let u = url.trim();
    u = u.replace(/^webcals?:\/\//i, 'https://');
    if (!u.match(/^https?:\/\//i)) u = 'https://' + u;
    u = u.replace(/^http:\/\//i, 'https://');
    return u;
  };

  const addCalendar = async () => {
    if (!newCalUrl.trim() || !user) return;
    const normalized = normalizeCalUrl(newCalUrl);
    const { data, error } = await supabase.from('calendar_links').insert({
      user_id: user.id,
      name: newCalName.trim() || 'My Calendar',
      ics_url: normalized,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setNewCalName(''); setNewCalUrl(''); setShowAddCal(false);
    fetchCalendars();
    // Auto-sync
    if (data) syncCalendar(data as CalendarLink);
  };

  const syncCalendar = async (cal: CalendarLink) => {
    if (!user) return;
    setSyncing(cal.id);
    try {
      const { data, error } = await supabase.functions.invoke('sync-calendar', {
        body: { calendar_link_id: cal.id, ics_url: cal.ics_url, user_id: user.id },
      });
      if (error) {
        let errorMsg = error.message || 'Sync failed';
        try {
          const body = await (error as any)?.context?.json?.();
          if (body?.error) errorMsg = body.error;
        } catch {}
        throw new Error(errorMsg);
      }
      if (data?.error) throw new Error(data.error);
      toast.success(`Synced ${data.events_count} events`);
      fetchCalendars();
    } catch (e: any) {
      const msg = e.message || 'Sync failed';
      if (msg.includes('404')) {
        toast.error(`Calendar "${cal.name}" returned 404 — the ICS link may be expired or invalid. Check the URL in your calendar provider.`);
      } else {
        toast.error(msg);
      }
    }
    setSyncing(null);
  };

  const deleteCalendar = async (id: string) => {
    const { error } = await supabase.from('calendar_links').delete().eq('id', id);
    if (error) toast.error(error.message);
    else fetchCalendars();
  };

  if (!profile) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-10">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Settings</h1>
      </div>

      {/* Calendar Links */}
      <Section title="Calendars">
        <div className="space-y-2 mb-3">
          {calendars.map(cal => (
            <div key={cal.id} className="flex items-center gap-3 py-2.5 px-3 rounded-md bg-secondary">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{cal.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {cal.last_synced_at ? `Synced ${new Date(cal.last_synced_at).toLocaleString('en-US', { timeZone: profile?.timezone || 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet'}
                </p>
              </div>
              <button onClick={() => syncCalendar(cal)} disabled={syncing === cal.id}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                <RefreshCw className={cn('h-3 w-3', syncing === cal.id && 'animate-spin')} />
              </button>
              <button onClick={() => deleteCalendar(cal.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {showAddCal ? (
          <div className="space-y-2 p-3 rounded-md border border-border">
            <Input value={newCalName} onChange={e => setNewCalName(e.target.value)}
              placeholder="Calendar name (optional)" className="h-9 bg-secondary border-0 text-[13px]" />
            <Input value={newCalUrl} onChange={e => setNewCalUrl(e.target.value)}
              placeholder="Paste ICS URL here..." className="h-9 bg-secondary border-0 text-[13px]" autoFocus />
            <div className="flex gap-2">
              <Button size="sm" className="text-[12px] h-8" onClick={addCalendar} disabled={!newCalUrl.trim()}>
                <Link className="h-3 w-3 mr-1" /> Add & Sync
              </Button>
              <Button size="sm" variant="ghost" className="text-[12px] h-8" onClick={() => setShowAddCal(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddCal(true)}
            className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add calendar (ICS link)
          </button>
        )}
      </Section>

      {/* Profile — right below calendar */}
      <Section title="Profile">
        <div className="space-y-4">
          <div>
            <label className="text-[12px] text-muted-foreground mb-1 block">Display name</label>
            <Input value={profile.display_name || ''} className="h-9 bg-secondary border-0 text-[13px]"
              onChange={e => setProfile({ ...profile, display_name: e.target.value })}
              onBlur={() => save({ display_name: profile.display_name })} />
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground mb-1 block">Timezone</label>
            <Popover open={tzOpen} onOpenChange={setTzOpen}>
              <PopoverTrigger asChild>
                <button className="w-full h-9 flex items-center justify-between px-3 rounded-md bg-secondary text-[13px] text-left transition-colors hover:bg-secondary/80">
                  <span className={cn(!profile.timezone && 'text-muted-foreground')}>{profile.timezone || 'Select timezone…'}</span>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search timezone…" className="text-[13px]" />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty className="text-[13px] py-3 text-center text-muted-foreground">No timezone found.</CommandEmpty>
                    {allTimezones.map(tz => (
                      <CommandItem
                        key={tz}
                        value={tz}
                        onSelect={() => {
                          setProfile({ ...profile, timezone: tz });
                          save({ timezone: tz });
                          setTzOpen(false);
                        }}
                        className="text-[13px]"
                      >
                        <Check className={cn('mr-2 h-3.5 w-3.5', profile.timezone === tz ? 'opacity-100' : 'opacity-0')} />
                        {tz}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[12px] text-muted-foreground mb-1 block">Work start</label>
              <Input type="time" value={profile.work_hours_start || '09:00'} className="h-9 bg-secondary border-0 text-[13px]"
                onBlur={e => save({ work_hours_start: e.target.value })} />
            </div>
            <div className="flex-1">
              <label className="text-[12px] text-muted-foreground mb-1 block">Work end</label>
              <Input type="time" value={profile.work_hours_end || '17:00'} className="h-9 bg-secondary border-0 text-[13px]"
                onBlur={e => save({ work_hours_end: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground mb-1 block">Deep work preference</label>
            <div className="flex gap-2">
              {['morning', 'afternoon', 'evening'].map(pref => (
                <button key={pref} onClick={() => save({ deep_work_preference: pref })}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[12px] capitalize transition-colors',
                    profile.deep_work_preference === pref
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}>
                  {pref}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">Push notifications</p>
          <Switch checked={profile.notification_enabled} onCheckedChange={(v) => save({ notification_enabled: v })} />
        </div>
      </Section>

      {/* AI Patterns */}
      <Section title="AI learning">
        {patterns.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No patterns yet. Override AI to teach it.</p>
        ) : (
          <div className="space-y-1.5">
            {patterns.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">"{p.pattern_text}"</p>
                  <p className="text-[11px] text-muted-foreground">{p.context} · {p.priority} · {p.usage_count}×</p>
                </div>
                <button onClick={() => deletePattern(p.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Labels */}
      <Section title="Labels">
        <div className="space-y-1.5 mb-3">
          {customLabels.map(l => (
            <div key={l.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-secondary">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: `hsl(${l.color})` }} />
              <p className="flex-1 text-[13px] font-medium">{l.name}</p>
              <button onClick={() => deleteLabel(l.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newLabelName}
            onChange={e => setNewLabelName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addLabel()}
            placeholder="New label name…"
            className="h-9 bg-secondary border-0 text-[13px]"
          />
          <Button size="sm" className="h-9 shrink-0" onClick={addLabel} disabled={!newLabelName.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </Section>

      <div className="border-t border-border pt-6 mt-2">
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive text-[13px]" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.1em] mb-3">{title}</h2>
      {children}
    </div>
  );
}
