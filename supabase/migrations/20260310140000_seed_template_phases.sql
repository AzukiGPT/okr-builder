-- Assign default_phase based on channel + action_type combo
UPDATE public.action_templates SET default_phase = 'audit'
WHERE (channel = 'ops' AND action_type = 'strategy')
   OR (channel = 'content' AND action_type = 'strategy');

UPDATE public.action_templates SET default_phase = 'setup'
WHERE default_phase IS NULL
  AND ((channel = 'ops' AND action_type IN ('process', 'technical'))
    OR channel = 'seo'
    OR channel = 'product');

UPDATE public.action_templates SET default_phase = 'launch'
WHERE default_phase IS NULL;

-- Assign estimated_days based on effort
UPDATE public.action_templates SET estimated_days = 5 WHERE effort = 'low';
UPDATE public.action_templates SET estimated_days = 10 WHERE effort = 'medium';
UPDATE public.action_templates SET estimated_days = 21 WHERE effort = 'high';
UPDATE public.action_templates SET estimated_days = 10 WHERE estimated_days IS NULL OR estimated_days = 5;
