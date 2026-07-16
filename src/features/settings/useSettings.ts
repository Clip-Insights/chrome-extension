import { useEffect, useState } from 'react';
import { fetchProfile, type UserProfile } from '@/core/api/client';
import { getValidAccessToken } from '@/core/auth/session';
import { getPlanInfo, type PlanInfo } from '@/core/limits/limitService';

export interface UseSettings {
  profile: UserProfile | null;
  plan: PlanInfo | null;
  loading: boolean;
  error: string | null;
}

/** Loads the account profile and plan/usage details for the settings view. */
export function useSettings(): UseSettings {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) throw new Error('Not logged in');
        const [profileData, planData] = await Promise.all([fetchProfile(token), getPlanInfo()]);
        if (cancelled) return;
        setProfile(profileData);
        setPlan(planData);
      } catch (err) {
        console.error('Failed to load settings', err);
        if (!cancelled) setError('Could not load your account details. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, plan, loading, error };
}
