import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckSquare, FolderKanban, Sun, User, Type, Plus, Settings, Coffee } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { UniversalCapture, CaptureDialog } from './UniversalCapture';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', icon: Sun, label: 'Today' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/coffee-chats', icon: Coffee, label: 'Coffee Chats' },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [captureOpen, setCaptureOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-14 hover:w-44 transition-all duration-300 ease-out border-r border-border bg-sidebar group">
        <div className="h-14 flex items-center justify-center group-hover:justify-start group-hover:px-4 border-b border-border transition-all">
          <Type className="h-[18px] w-[18px] shrink-0 text-accent" strokeWidth={1.5} />
          <span className="hidden group-hover:inline text-sm font-bold tracking-[-0.02em] ml-2.5">GIGI</span>
        </div>
        <nav className="py-3">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'w-full flex items-center gap-3 px-5 py-2.5 text-[13px] transition-all duration-200 relative',
                  isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Orange active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent animate-scale-in" />
                )}
                <Icon
                  className={cn('h-[18px] w-[18px] shrink-0 transition-colors', isActive && 'text-accent')}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </nav>
        <button
          onClick={() => navigate('/settings')}
          className={cn(
            'flex items-center gap-3 px-5 py-4 text-[13px] border-t border-border transition-colors',
            location.pathname === '/settings' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors',
            location.pathname === '/settings' ? 'bg-accent text-accent-foreground' : 'bg-secondary'
          )}>
            <User className="h-3 w-3" />
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap truncate">
            {profile?.display_name || 'Settings'}
          </span>
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0">
        <UniversalCapture />
        <div className="flex-1 overflow-y-auto px-5 py-6 md:px-10 md:py-8 animate-fade-in">
          {children}
        </div>
        <footer className="hidden md:block text-center text-[10px] text-muted-foreground/50 tracking-wide py-4 border-t border-border/50">
          <p>MV Intelligence · © {new Date().getFullYear()} All rights reserved.</p>
        </footer>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border flex justify-around py-2.5 z-50">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 transition-colors relative',
                isActive ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              {isActive && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-accent" />
              )}
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] tracking-wide">{label}</span>
            </button>
          );
        })}
        <button
          onClick={() => navigate('/settings')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 transition-colors relative',
            location.pathname === '/settings' ? 'text-accent' : 'text-muted-foreground'
          )}
        >
          {location.pathname === '/settings' && (
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-accent" />
          )}
          <Settings className="h-5 w-5" strokeWidth={location.pathname === '/settings' ? 2 : 1.5} />
          <span className="text-[10px] tracking-wide">Settings</span>
        </button>
      </nav>

      {/* Floating add button */}
      <button
        onClick={() => setCaptureOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 active:scale-95 transition-all flex items-center justify-center"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <CaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} />
    </div>
  );
}
