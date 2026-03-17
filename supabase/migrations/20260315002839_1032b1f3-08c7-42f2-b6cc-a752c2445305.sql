
-- Drop and recreate meeting_briefs with better structure for coffee chats
ALTER TABLE public.meeting_briefs 
  ADD COLUMN IF NOT EXISTS person_name text,
  ADD COLUMN IF NOT EXISTS person_linkedin_url text,
  ADD COLUMN IF NOT EXISTS person_company text,
  ADD COLUMN IF NOT EXISTS person_role text,
  ADD COLUMN IF NOT EXISTS background_summary text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Allow updates and deletes on meeting_briefs
CREATE POLICY "Users can update own meeting_briefs"
  ON public.meeting_briefs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meeting_briefs"
  ON public.meeting_briefs FOR DELETE
  USING (auth.uid() = user_id);
