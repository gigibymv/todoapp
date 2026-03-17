CREATE TABLE public.calendar_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Calendar',
  ics_url text NOT NULL,
  color text DEFAULT '#3b82f6',
  last_synced_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar_links" ON public.calendar_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own calendar_links" ON public.calendar_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar_links" ON public.calendar_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar_links" ON public.calendar_links FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  calendar_link_id uuid NOT NULL REFERENCES public.calendar_links(id) ON DELETE CASCADE,
  uid text NOT NULL,
  summary text,
  description text,
  location text,
  dtstart timestamptz NOT NULL,
  dtend timestamptz,
  all_day boolean DEFAULT false,
  recurrence_rule text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(calendar_link_id, uid)
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar_events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own calendar_events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar_events" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar_events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);