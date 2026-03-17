import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sun, Sunset, Moon, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DEEP_WORK_OPTIONS = [
  { value: 'morning', label: 'Morning', desc: '6 AM – 12 PM', icon: Sun },
  { value: 'afternoon', label: 'Afternoon', desc: '12 PM – 6 PM', icon: Sunset },
  { value: 'evening', label: 'Evening', desc: '6 PM – 12 AM', icon: Moon },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [deepWorkPref, setDeepWorkPref] = useState('morning');
  const [saving, setSaving] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const finishOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        display_name: name || user.email?.split('@')[0],
        timezone,
        deep_work_preference: deepWorkPref,
        onboarding_completed: true,
      }).eq('user_id', user.id);
      if (error) throw error;
      navigate('/', { replace: true });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn('h-0.5 w-10 rounded-full transition-colors', s <= step ? 'bg-foreground' : 'bg-border')} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">What's your name?</h1>
              <p className="text-sm text-muted-foreground mt-2">Let's personalize your experience</p>
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              className="h-12 bg-secondary border-0 text-center text-lg focus-visible:ring-1 focus-visible:ring-foreground/10"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(2)}
            />
            <p className="text-xs text-center text-muted-foreground/60">{timezone}</p>
            <Button onClick={() => setStep(2)} disabled={!name.trim()} className="w-full h-11">
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">When do you focus best?</h1>
              <p className="text-sm text-muted-foreground mt-2">We'll protect this time for deep work</p>
            </div>
            <div className="space-y-2">
              {DEEP_WORK_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setDeepWorkPref(value); setTimeout(() => setStep(3), 200); }}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left',
                    deepWorkPref === value
                      ? 'border-foreground bg-foreground/[0.03]'
                      : 'border-border hover:border-muted-foreground/30'
                  )}
                >
                  <Icon className={cn('h-5 w-5', deepWorkPref === value ? 'text-foreground' : 'text-muted-foreground')} strokeWidth={1.5} />
                  <div>
                    <p className="text-[13px] font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">You're all set</h1>
              <p className="text-sm text-muted-foreground mt-2">Let's get started</p>
            </div>
            <Button onClick={() => finishOnboarding()} className="w-full h-11" disabled={saving}>
              {saving ? 'Setting up...' : 'Get started'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
