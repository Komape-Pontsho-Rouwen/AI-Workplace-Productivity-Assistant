ALTER TABLE public.tasks ADD COLUMN due_time time without time zone;
COMMENT ON COLUMN public.tasks.due_time IS 'Local due time paired with due_date; required for tasks saved by the Task Planner.';