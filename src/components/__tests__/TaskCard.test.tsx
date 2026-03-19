import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '../TaskCard';
import type { Task } from '@/lib/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, className, onDragEnd, drag, dragConstraints, dragElastic, whileTap, ...rest }: any) =>
      <div className={className} {...rest}>{children}</div>,
  },
  useMotionValue: () => ({ get: vi.fn(), set: vi.fn() }),
  useTransform: () => 0,
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/integrations/supabase/client', () => {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'lt', 'lte', 'gte', 'not', 'is', 'neq', 'ilike', 'order', 'limit', 'update', 'delete', 'insert', 'single'];
  methods.forEach(m => { chain[m] = vi.fn(() => chain); });
  chain.then = (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve);
  return { supabase: { from: vi.fn(() => chain) } };
});

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { timezone: 'America/New_York' } }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/components/RescheduleMenu', () => ({
  RescheduleMenu: ({ children }: any) => <div>{children}</div>,
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseTask: Task = {
  id: 'task-1',
  user_id: 'user-1',
  title: 'Write tests',
  status: 'todo',
  priority: 'p3',
  context: 'work',
  energy_type: 'deep_work',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const urgentTask: Task = { ...baseTask, priority: 'p1' };

const overdueTask: Task = {
  ...baseTask,
  due_date: '2020-01-01T12:00:00Z', // well in the past
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TaskCard', () => {
  it('renders the task title', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('Write tests')).toBeInTheDocument();
  });

  it('shows Urgent badge for p1 priority', () => {
    render(<TaskCard task={urgentTask} />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('does not show Urgent badge for p3 priority', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
  });

  it('shows overdue due date in red', () => {
    render(<TaskCard task={overdueTask} />);
    // The due label should appear with destructive color
    const clock = document.querySelector('[class*="destructive"]');
    expect(clock).toBeInTheDocument();
  });

  it('calls onEdit when task body is clicked', () => {
    const onEdit = vi.fn();
    render(<TaskCard task={baseTask} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Write tests'));
    expect(onEdit).toHaveBeenCalledWith(baseTask);
  });

  it('applies line-through style when task is done', () => {
    const doneTask: Task = { ...baseTask, status: 'done' };
    render(<TaskCard task={doneTask} />);
    const title = screen.getByText('Write tests');
    expect(title.className).toMatch(/line-through/);
  });

  it('calls onArchive with task id when archive button clicked (swipe tray)', () => {
    const onArchive = vi.fn();
    // Access the swipe tray — we need to trigger swipe state first.
    // Since framer-motion drag is mocked, test the onArchive prop callback directly
    // by importing the handler logic. We verify the prop is wired to the archive button
    // that appears on hover (desktop).
    const { container } = render(<TaskCard task={baseTask} onArchive={onArchive} onEdit={vi.fn()} />);
    // Desktop hover archive button
    const archiveBtn = container.querySelector('[title="Archive"]');
    expect(archiveBtn).toBeInTheDocument();
    fireEvent.click(archiveBtn!);
    expect(onArchive).toHaveBeenCalledWith('task-1');
  });

  it('calls onUpdate after toggling completion via checkbox', async () => {
    const onUpdate = vi.fn();
    render(<TaskCard task={baseTask} onUpdate={onUpdate} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    // supabase.update is async — wait for onUpdate
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalled(), { timeout: 1000 });
  });
});
