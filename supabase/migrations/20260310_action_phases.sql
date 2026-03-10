-- ============================================================
-- Action Phases: groupement logique + auto-scheduling
-- ============================================================

-- 1. New table for phases
CREATE TABLE IF NOT EXISTS public.action_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.okr_sets(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL,
  color_hex text DEFAULT '#8B5CF6',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_phases_set ON public.action_phases(set_id);

-- 2. Add phase_id + estimated_days to actions
ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES public.action_phases(id) ON DELETE SET NULL;
ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS estimated_days int DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_actions_phase ON public.actions(phase_id);

-- 3. Add default_phase + estimated_days to action_templates
ALTER TABLE public.action_templates ADD COLUMN IF NOT EXISTS default_phase text;
ALTER TABLE public.action_templates ADD COLUMN IF NOT EXISTS estimated_days int DEFAULT 5;

-- 4. RLS policies for action_phases (same pattern as actions)
ALTER TABLE public.action_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read phases of their sets"
  ON public.action_phases FOR SELECT
  USING (
    set_id IN (SELECT set_id FROM public.set_members WHERE user_id = auth.uid())
    OR set_id IN (SELECT id FROM public.okr_sets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert phases to their sets"
  ON public.action_phases FOR INSERT
  WITH CHECK (
    set_id IN (SELECT set_id FROM public.set_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
    OR set_id IN (SELECT id FROM public.okr_sets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update phases of their sets"
  ON public.action_phases FOR UPDATE
  USING (
    set_id IN (SELECT set_id FROM public.set_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
    OR set_id IN (SELECT id FROM public.okr_sets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete phases of their sets"
  ON public.action_phases FOR DELETE
  USING (
    set_id IN (SELECT set_id FROM public.set_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
    OR set_id IN (SELECT id FROM public.okr_sets WHERE user_id = auth.uid())
  );
