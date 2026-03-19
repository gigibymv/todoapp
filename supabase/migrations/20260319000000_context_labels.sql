-- Convert task_context ENUM to text so custom labels are supported
-- and migrate old values to new defaults.

-- 1. Drop the default (which casts to the enum) so ALTER TYPE can proceed
ALTER TABLE tasks ALTER COLUMN context DROP DEFAULT;

-- 2. Change tasks.context from enum to text
ALTER TABLE tasks ALTER COLUMN context TYPE text USING context::text;

-- 3. Restore a plain text default
ALTER TABLE tasks ALTER COLUMN context SET DEFAULT 'personal';

-- 4. Change categorization_patterns.context from enum to text (if typed)
ALTER TABLE categorization_patterns ALTER COLUMN context TYPE text USING context::text;

-- 5. Migrate old context values
UPDATE tasks SET context = 'school'   WHERE context = 'mba';
UPDATE tasks SET context = 'admin'    WHERE context = 'finance';
UPDATE tasks SET context = 'personal' WHERE context = 'health';
UPDATE tasks SET context = 'personal' WHERE context = 'legal';

UPDATE categorization_patterns SET context = 'school'   WHERE context = 'mba';
UPDATE categorization_patterns SET context = 'admin'    WHERE context = 'finance';
UPDATE categorization_patterns SET context = 'personal' WHERE context = 'health';
UPDATE categorization_patterns SET context = 'personal' WHERE context = 'legal';

-- 6. Add custom_labels to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_labels jsonb NOT NULL DEFAULT '[]';

-- 7. Drop the now-unused enum (default and column type are already plain text)
DROP TYPE IF EXISTS task_context;
