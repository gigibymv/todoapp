import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight } from 'lucide-react';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (password.toLowerCase() === 'lolo') {
      setUnlocked(true);
      setTimeout(() => navigate('/auth'), 600);
    }
  }, [password, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() !== 'lolo') {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground mb-10">Gigi</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <div className={`relative transition-all duration-500 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''} ${unlocked ? 'scale-95 opacity-40' : ''}`}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full h-12 px-5 rounded-full text-center text-[13px] bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all shadow-sm"
            autoFocus
          />
          {unlocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ArrowRight className="h-4 w-4 animate-pulse text-accent" />
            </div>
          )}
        </div>
      </form>

      <footer className="absolute bottom-6 text-center text-[11px] text-muted-foreground/60 tracking-wide">
        <p>MV Intelligence</p>
        <p className="mt-0.5">© {new Date().getFullYear()} All rights reserved.</p>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
