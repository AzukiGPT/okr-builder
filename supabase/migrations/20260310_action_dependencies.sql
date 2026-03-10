-- supabase/migrations/20260310_action_dependencies.sql

-- Dependencies between actions
CREATE TABLE IF NOT EXISTS public.action_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  successor_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  dep_type text NOT NULL DEFAULT 'FS'
    CHECK (dep_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (predecessor_id, successor_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_action_deps_predecessor ON public.action_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_action_deps_successor ON public.action_dependencies(successor_id);

-- RLS
ALTER TABLE public.action_dependencies ENABLE ROW LEVEL SECURITY;

-- Anyone can read (filtered by set access at the API layer)
CREATE POLICY "deps_select" ON public.action_dependencies FOR SELECT USING (true);

-- Authenticated users can insert/update/delete (API layer checks set access)
CREATE POLICY "deps_insert" ON public.action_dependencies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "deps_update" ON public.action_dependencies FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "deps_delete" ON public.action_dependencies FOR DELETE
  USING (auth.role() = 'authenticated');
