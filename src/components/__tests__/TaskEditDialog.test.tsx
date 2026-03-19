import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskEditDialog } from '../TaskEditDialog';
import type { Task } from '@/lib/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock Radix Dialog to avoid jsdom portal/animation hangs
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

// Mock Select to render a plain <select>
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/integrations/supabase/client', () => {
  const chain: any = {};
  const methods = ['select','eq','in','lt','lte','gte','not','is','neq','ilike','order','limit','update','delete','insert','single'];
  methods.forEach(m => { chain[m] = vi.fn(() => chain); });
  chain.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
  return { supabase: { from: vi.fn(() => chain) } };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { timezone: 'America/New_York' } }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseTask: Task = {
  id: 'task-1',
  user_id: 'user-1',
  title: 'Finish report',
  description: 'Write the Q1 report',
  status: 'todo',
  priority: 'p2',
  context: 'work',
  energy_type: 'deep_work',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TaskEditDialog — field persistence', () => {
  it('populates title from task when opened', () => {
    render(<TaskEditDialog task={baseTask} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Finish report')).toBeInTheDocument();
  });

  it('populates description from task when opened', () => {
    render(<TaskEditDialog task={baseTask} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Write the Q1 report')).toBeInTheDocument();
  });

  it('disables Save button when title is empty', () => {
    render(<TaskEditDialog task={baseTask} open={true} onOpenChange={vi.fn()} />);
    const titleInput = screen.getByDisplayValue('Finish report');
    fireEvent.change(titleInput, { target: { value: '' } });
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).toBeDisabled();
  });

  it('calls onOpenChange(false) when Cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(<TaskEditDialog task={baseTask} open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows Delete button when onDelete is provided', () => {
    render(
      <TaskEditDialog task={baseTask} open={true} onOpenChange={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('does not show Delete button when onDelete is not provided', () => {
    render(<TaskEditDialog task={baseTask} open={true} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('re-populates fields when a different task is passed', () => {
    const { rerender } = render(
      <TaskEditDialog task={baseTask} open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByDisplayValue('Finish report')).toBeInTheDocument();

    const otherTask: Task = { ...baseTask, id: 'task-2', title: 'New task' };
    rerender(<TaskEditDialog task={otherTask} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByDisplayValue('New task')).toBeInTheDocument();
  });

  it('does not render content when open=false', () => {
    render(<TaskEditDialog task={baseTask} open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
});
