export type TaskPriority = 'p1' | 'p2' | 'p3' | 'p4';
export type TaskContext = string;

// Default built-in contexts (always available)
export const DEFAULT_CONTEXTS = ['work', 'school', 'admin', 'personal'] as const;
export type DefaultContext = typeof DEFAULT_CONTEXTS[number];

// Ordered list of contexts shown in UI (defaults only; custom labels appended at runtime)
export const CONTEXTS: string[] = ['work', 'school', 'admin', 'personal'];
export type EnergyType = 'deep_work' | 'shallow' | 'admin' | 'quick_win';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived';
export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  context: TaskContext;
  energy_type: EnergyType;
  due_date?: string;
  estimated_duration_min?: number;
  actual_duration_min?: number;
  project_id?: string;
  parent_task_id?: string;
  recurrence_rule?: string;
  ai_confidence_score?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  category_id?: string;
  board_id?: string;
  brief_action?: string;
  location?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  status: ProjectStatus;
  ai_suggested: boolean;
  created_at: string;
}

export interface AITaskParse {
  title: string;
  context: TaskContext;
  priority: TaskPriority;
  energy_type: EnergyType;
  due_date?: string;
  estimated_duration_min?: number;
  recurrence_rule?: string;
  tags?: string[];
  project_name?: string;
  location?: string;
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  p1: 'Urgent',
  p2: 'High',
  p3: 'Normal',
  p4: 'Low',
};

export const CONTEXT_LABELS: Record<string, string> = {
  work: 'Work',
  school: 'School',
  admin: 'Admin',
  personal: 'Personal',
};

export const ENERGY_LABELS: Record<EnergyType, string> = {
  deep_work: 'Deep Work',
  shallow: 'Shallow',
  admin: 'Admin',
  quick_win: 'Quick Win',
};
