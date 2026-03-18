import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { getDayBoundsUTC } from '@/lib/timezone';
import { toast } from 'sonner';
import { Coffee, Notebook, Linkedin, Loader2, User, MessageSquare, Trash2, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TalkingPoint {
  topic: string;
  detail: string;
}

interface KeyQuestion {
  question: string;
  why: string;
}

interface CoffeeChatBrief {
  id: string;
  calendar_event_id: string | null;
  person_name: string | null;
  person_company: string | null;
  person_linkedin_url: string | null;
  person_role: string | null;
  background_summary: string | null;
  talking_points_json: TalkingPoint[] | null;
  research_json: { key_questions?: KeyQuestion[] } | null;
  status: string | null;
  created_at: string;
}

interface CalEvent {
  id: string;
  summary: string | null;
  dtstart: string;
  dtend: string | null;
  description: string | null;
  location: string | null;
}

const PREPARE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prepare-coffee-chat`;

export default function CoffeeChats() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [briefs, setBriefs] = useState<CoffeeChatBrief[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualLinkedin, setManualLinkedin] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tz = profile?.timezone || 'America/New_York';

  const fetchBriefs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('meeting_briefs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setBriefs((data as unknown as CoffeeChatBrief[]) || []);
    setLoading(false);
  }, [user]);

  const fetchUpcomingEvents = useCallback(async () => {
    if (!user) return;
    const { start, end } = getDayBoundsUTC(tz);
    // Fetch events for next 7 days
    const endDate = new Date(new Date(end).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('calendar_events')
      .select('id, summary, dtstart, dtend, description, location')
      .eq('user_id', user.id)
      .gte('dtstart', start)
      .lt('dtstart', endDate)
      .neq('dismissed', true)
      .order('dtstart', { ascending: true });
    setUpcomingEvents((data as CalEvent[]) || []);
  }, [user, tz]);

  useEffect(() => {
    fetchBriefs();
    fetchUpcomingEvents();
  }, [fetchBriefs, fetchUpcomingEvents]);

  // Strip user's own name from a meeting title to get the counterpart's name
  const extractCounterpartName = (summary: string): string => {
    const displayName = profile?.display_name || '';
    const userFirstNames = displayName.split(/\s+/).filter((n: string) => n.length > 1).map((n: string) => n.toLowerCase());
    // Common patterns: "Gilles and John", "John / Gilles", "Gilles, John"
    const parts = summary
      .replace(/^[\w]+:\s*/i, '') // strip prefix like "Coffee:"
      .split(/\s+(?:and|&|\/|,|x|-)\s+|,\s+/i)
      .map(p => p.trim())
      .filter(Boolean);
    // Filter out parts that match any of the user's names
    const others = parts.filter(part => {
      const partWords = part.toLowerCase().split(/\s+/);
      return !partWords.some(w => userFirstNames.includes(w));
    });
    return others.length > 0 ? others.join(', ') : summary;
  };

  const prepareBrief = async (opts: {
    calendar_event_id?: string;
    person_name: string;
    person_company?: string;
    person_linkedin_url?: string;
    existing_brief_id?: string;
  }) => {
    if (!user) return;
    setPreparing(opts.calendar_event_id || 'manual');
    try {
      const session = await supabase.auth.getSession();
      const resp = await fetch(PREPARE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          calendar_event_id: opts.calendar_event_id,
          person_name: opts.person_name,
          person_company: opts.person_company,
          person_linkedin_url: opts.person_linkedin_url,
          existing_brief_id: opts.existing_brief_id,
          user_display_name: profile?.display_name || '',
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || 'Failed to prepare brief');
        setPreparing(null);
        return;
      }
      toast.success('Coffee chat brief ready!');
      fetchBriefs();
    } catch (e) {
      console.error(e);
      toast.error('Failed to prepare brief');
    }
    setPreparing(null);
  };

  const deleteBrief = async (id: string) => {
    await supabase.from('meeting_briefs').delete().eq('id', id);
    setBriefs(prev => prev.filter(b => b.id !== id));
    toast.success('Brief removed');
  };

  const handleManualSubmit = () => {
    if (!manualName.trim()) return;
    prepareBrief({
      person_name: manualName.trim(),
      person_company: manualCompany.trim() || undefined,
      person_linkedin_url: manualLinkedin.trim() || undefined,
    });
    setManualOpen(false);
    setManualName('');
    setManualCompany('');
    setManualLinkedin('');
  };

  // Keywords that indicate a 1:1 / coffee chat meeting
  const COFFEE_KEYWORDS = ['coffee', 'chat', '1:1', '1-on-1', 'one-on-one', 'catch up', 'catchup', 'intro', 'meet', 'sync', 'lunch', 'dinner', 'drinks'];

  // Words that suggest it's NOT a 1:1 (group/institutional events)
  const EXCLUDE_KEYWORDS = ['club', 'study', 'class', 'team', 'meeting', 'standup', 'stand-up', 'all-hands', 'allhands', 'workshop', 'seminar', 'webinar', 'training', 'review', 'retro', 'sprint', 'planning', 'booklet', 'appointment', 'mass', 'church', 'bible', 'hold', 'ceremony', 'conference', 'committee'];

  // Check if a title looks like person names (e.g. "John and Jane", "Alice, Bob", "Tom / Jerry")
  const looksLikeNames = (summary: string) => {
    // Split by common separators: "and", "&", "/", ","
    const parts = summary.split(/\s+(?:and|&|\/|,)\s+|,\s+/i).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2 || parts.length > 4) return false;
    // Each part should look like a name: 1-4 capitalized words, no numbers
    return parts.every(part => {
      const words = part.split(/\s+/);
      return words.length >= 1 && words.length <= 4 && 
        words.every(w => /^[A-ZÀ-ÖØ-Þ]/.test(w)) && 
        !/\d/.test(part);
    });
  };

  const isCoffeeChat = (summary: string | null) => {
    if (!summary) return false;
    const lower = summary.toLowerCase();
    // Exclude institutional/group events
    if (EXCLUDE_KEYWORDS.some(kw => lower.includes(kw))) return false;
    // Match by keyword
    if (COFFEE_KEYWORDS.some(kw => lower.includes(kw))) return true;
    // Match by name pattern (looks like "Person A and Person B")
    // Strip common prefixes like "Coffee:" first
    const cleaned = summary.replace(/^[\w]+:\s*/i, '').trim();
    if (looksLikeNames(summary) || looksLikeNames(cleaned)) return true;
    return false;
  };

  // Events that look like coffee chats and don't have a brief yet
  const eventsWithoutBrief = upcomingEvents
    .filter(ev => isCoffeeChat(ev.summary))
    .filter(ev => !briefs.some(b => b.calendar_event_id === ev.id));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] flex items-center gap-2">
            <Coffee className="h-6 w-6 text-accent" />
            Coffee Chats
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered 1:1 meeting prep &mdash; know who you're meeting
          </p>
        </div>
        <Dialog open={manualOpen} onOpenChange={setManualOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Person
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Prepare Coffee Chat</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Person's name *"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
              />
              <Input
                placeholder="Company (optional)"
                value={manualCompany}
                onChange={e => setManualCompany(e.target.value)}
              />
              <Input
                placeholder="LinkedIn URL (optional)"
                value={manualLinkedin}
                onChange={e => setManualLinkedin(e.target.value)}
              />
              <Button
                onClick={handleManualSubmit}
                disabled={!manualName.trim() || preparing === 'manual'}
                className="w-full"
              >
                {preparing === 'manual' ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Researching…</>
                ) : (
                  <><Notebook className="h-4 w-4 mr-2" /> Generate Brief</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming meetings that need prep */}
      {eventsWithoutBrief.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3 px-1">
            Upcoming Meetings
          </h2>
          <div className="space-y-1">
            {eventsWithoutBrief.map(ev => {
              const time = new Date(ev.dtstart).toLocaleString('en-US', {
                timeZone: tz,
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-secondary/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{ev.summary || 'Untitled'}</p>
                    <p className="text-[11px] text-muted-foreground">{time}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-[12px] shrink-0"
                    disabled={preparing === ev.id}
                    onClick={() =>
                      prepareBrief({
                        calendar_event_id: ev.id,
                        person_name: extractCounterpartName(ev.summary || 'Unknown'),
                      })
                    }
                  >
                    {preparing === ev.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Notebook className="h-3.5 w-3.5" />
                    )}
                    Prep
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Prepared briefs */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3 px-1">
          Prepared Briefs ({briefs.length})
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : briefs.length === 0 ? (
          <div className="text-center py-12">
            <Coffee className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No coffee chat briefs yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Click "Prep" on an upcoming meeting or add a person manually.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {briefs.map(brief => {
              const isExpanded = expandedId === brief.id;
              const points = (brief.talking_points_json || []) as TalkingPoint[];
              const questions = ((brief.research_json as any)?.key_questions || []) as KeyQuestion[];

              return (
                <div
                  key={brief.id}
                  className={cn(
                    'rounded-xl border border-border bg-card transition-all',
                    isExpanded && 'shadow-sm'
                  )}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : brief.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {brief.person_name || 'Unknown'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {brief.person_role || brief.person_company || 'No role info'}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full shrink-0',
                      brief.status === 'ready'
                        ? 'bg-accent/10 text-accent'
                        : 'bg-secondary text-muted-foreground'
                    )}>
                      {brief.status === 'ready' ? 'Ready' : 'Pending'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 animate-fade-in">
                      {/* Background */}
                      {brief.background_summary && (
                        <div>
                          <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
                            Background
                          </h4>
                          <p className="text-[13px] text-foreground/80 leading-relaxed">
                            {brief.background_summary}
                          </p>
                        </div>
                      )}

                      {/* Talking Points */}
                      {points.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                            Talking Points
                          </h4>
                          <div className="space-y-2">
                            {points.map((tp, i) => (
                              <div key={i} className="flex gap-2.5">
                                <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                                  <MessageSquare className="h-2.5 w-2.5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium">{tp.topic}</p>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {tp.detail}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Questions */}
                      {questions.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                            Key Questions
                          </h4>
                          <div className="space-y-2">
                            {questions.map((q, i) => (
                              <div key={i} className="pl-3 border-l-2 border-border">
                                <p className="text-[12px] font-medium">{q.question}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{q.why}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* LinkedIn link */}
                      {brief.person_linkedin_url && (
                        <a
                          href={brief.person_linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:underline"
                        >
                          <Linkedin className="h-3.5 w-3.5" />
                          View LinkedIn Profile
                        </a>
                      )}

                      {(brief.research_json as any)?.confidence_note && (
                        <p className="text-[10px] text-muted-foreground/50 italic">
                          {(brief.research_json as any).confidence_note}
                        </p>
                      )}

                      <div className="flex justify-end gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[11px] text-muted-foreground hover:text-foreground gap-1"
                          disabled={preparing === brief.id}
                          onClick={() => {
                            prepareBrief({
                              calendar_event_id: brief.calendar_event_id || undefined,
                              person_name: brief.person_name || 'Unknown',
                              person_company: brief.person_company || undefined,
                              person_linkedin_url: brief.person_linkedin_url || undefined,
                              existing_brief_id: brief.id,
                            });
                          }}
                        >
                          {preparing === brief.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Regenerate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[11px] text-muted-foreground hover:text-destructive gap-1"
                          onClick={() => deleteBrief(brief.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
