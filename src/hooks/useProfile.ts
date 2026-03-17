import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';

export interface Profile {
  display_name: string | null;
  timezone: string;
  onboarding_completed: boolean;
  deep_work_preference: string;
  pomodoro_duration: number;
  work_hours_start: string;
  work_hours_end: string;
  notification_enabled: boolean;
}

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  refetch: () => void;
}

const ProfileContext = createContext<ProfileContextValue>({ profile: null, loading: true, refetch: () => {} });

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('profiles')
      .select('display_name, timezone, onboarding_completed, deep_work_preference, pomodoro_duration, work_hours_start, work_hours_end, notification_enabled')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data as Profile | null);
        setLoading(false);
      });
  };

  useEffect(() => { fetch(); }, [user]);

  return React.createElement(ProfileContext.Provider, { value: { profile, loading, refetch: fetch } }, children);
}

export function useProfile() {
  return useContext(ProfileContext);
}
