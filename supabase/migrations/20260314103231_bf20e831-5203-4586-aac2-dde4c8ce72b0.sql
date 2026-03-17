-- Create a table for user-defined tag categories with sub-tags
CREATE TABLE public.task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.task_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_code text,
  color text DEFAULT '#94a3b8',
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON public.task_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own categories" ON public.task_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.task_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.task_categories FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.tasks ADD COLUMN category_id uuid REFERENCES public.task_categories(id) ON DELETE SET NULL;

CREATE TABLE public.project_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boards" ON public.project_boards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own boards" ON public.project_boards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own boards" ON public.project_boards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own boards" ON public.project_boards FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.tasks ADD COLUMN board_id uuid REFERENCES public.project_boards(id) ON DELETE SET NULL;

ALTER TABLE public.tasks ADD COLUMN brief_action text;