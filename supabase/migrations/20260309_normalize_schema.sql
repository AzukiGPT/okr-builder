-- ============================================================
-- OKR Builder Schema Migration: JSON → Normalized Tables
-- ============================================================

-- 1. set_members (collaboration multi-user)
CREATE TABLE IF NOT EXISTS public.set_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.okr_sets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(set_id, user_id)
);

-- 2. set_objectives (remplace selected JSON)
CREATE TABLE IF NOT EXISTS public.set_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.okr_sets(id) ON DELETE CASCADE,
  objective_id text NOT NULL,
  team text NOT NULL CHECK (team IN ('sales', 'marketing', 'csm')),
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(set_id, objective_id)
);

-- 3. set_key_results (remplace custom_targets JSON + ajoute status/progress)
CREATE TABLE IF NOT EXISTS public.set_key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_objective_id uuid NOT NULL REFERENCES public.set_objectives(id) ON DELETE CASCADE,
  kr_id text NOT NULL,
  custom_target text,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'at_risk', 'done')),
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(set_objective_id, kr_id)
);

-- 4. action_templates (bibliothèque curated)
CREATE TABLE IF NOT EXISTS public.action_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  channel text CHECK (channel IN ('content', 'seo', 'paid', 'events', 'outbound', 'email', 'social', 'product', 'ops')),
  action_type text CHECK (action_type IN ('strategy', 'creation', 'technical', 'process', 'hiring')),
  relevant_objectives text[] DEFAULT '{}',
  effort text CHECK (effort IN ('low', 'medium', 'high')),
  impact text CHECK (impact IN ('low', 'medium', 'high')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. actions (tâches du plan marketing)
CREATE TABLE IF NOT EXISTS public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.okr_sets(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  channel text CHECK (channel IN ('content', 'seo', 'paid', 'events', 'outbound', 'email', 'social', 'product', 'ops')),
  action_type text CHECK (action_type IN ('strategy', 'creation', 'technical', 'process', 'hiring')),
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  start_date date,
  end_date date,
  budget_estimated int DEFAULT 0,
  budget_actual int DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'template', 'ai')),
  template_id uuid REFERENCES public.action_templates(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. action_kr_links (N:N actions <-> KRs)
CREATE TABLE IF NOT EXISTS public.action_kr_links (
  action_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  set_kr_id uuid NOT NULL REFERENCES public.set_key_results(id) ON DELETE CASCADE,
  PRIMARY KEY (action_id, set_kr_id)
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_set_members_user ON public.set_members(user_id);
CREATE INDEX IF NOT EXISTS idx_set_members_set ON public.set_members(set_id);
CREATE INDEX IF NOT EXISTS idx_set_objectives_set ON public.set_objectives(set_id);
CREATE INDEX IF NOT EXISTS idx_set_objectives_obj ON public.set_objectives(objective_id);
CREATE INDEX IF NOT EXISTS idx_set_key_results_obj ON public.set_key_results(set_objective_id);
CREATE INDEX IF NOT EXISTS idx_actions_set ON public.actions(set_id);
CREATE INDEX IF NOT EXISTS idx_actions_assignee ON public.actions(assignee_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON public.actions(status);
CREATE INDEX IF NOT EXISTS idx_action_kr_links_kr ON public.action_kr_links(set_kr_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.set_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_kr_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_templates ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of a set
CREATE OR REPLACE FUNCTION public.is_set_member(p_set_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.set_members
    WHERE set_id = p_set_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- set_members: users can see their own memberships
CREATE POLICY "Users see own memberships" ON public.set_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Set owners manage members" ON public.set_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.set_members sm
      WHERE sm.set_id = set_members.set_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
    )
  );

-- set_objectives: members can read, editors/owners can write
CREATE POLICY "Members read objectives" ON public.set_objectives
  FOR SELECT USING (public.is_set_member(set_id, auth.uid()));

CREATE POLICY "Editors write objectives" ON public.set_objectives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.set_members sm
      WHERE sm.set_id = set_objectives.set_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'editor')
    )
  );

-- set_key_results: via set_objectives membership
CREATE POLICY "Members read KRs" ON public.set_key_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.set_objectives so
      JOIN public.set_members sm ON sm.set_id = so.set_id
      WHERE so.id = set_key_results.set_objective_id
        AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors write KRs" ON public.set_key_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.set_objectives so
      JOIN public.set_members sm ON sm.set_id = so.set_id
      WHERE so.id = set_key_results.set_objective_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'editor')
    )
  );

-- actions: members can read, editors/owners can write
CREATE POLICY "Members read actions" ON public.actions
  FOR SELECT USING (public.is_set_member(set_id, auth.uid()));

CREATE POLICY "Editors write actions" ON public.actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.set_members sm
      WHERE sm.set_id = actions.set_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'editor')
    )
  );

-- action_kr_links: via actions membership
CREATE POLICY "Members read action links" ON public.action_kr_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actions a
      JOIN public.set_members sm ON sm.set_id = a.set_id
      WHERE a.id = action_kr_links.action_id
        AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors write action links" ON public.action_kr_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actions a
      JOIN public.set_members sm ON sm.set_id = a.set_id
      WHERE a.id = action_kr_links.action_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'editor')
    )
  );

-- action_templates: everyone can read
CREATE POLICY "Anyone reads templates" ON public.action_templates
  FOR SELECT USING (true);

-- Only admins write templates (via service role, no RLS policy needed)

-- ============================================================
-- Add created_by to okr_sets (was user_id, rename for clarity)
-- ============================================================
-- okr_sets already has user_id, we keep it as-is for backward compat
