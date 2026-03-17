
-- Add onboarding and settings fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deep_work_preference TEXT DEFAULT 'morning';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_hours_start TIME DEFAULT '09:00';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_hours_end TIME DEFAULT '17:00';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pomodoro_duration INTEGER DEFAULT 25;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;
