-- Add current_value and target_value to set_key_results for auto-progress calculation
ALTER TABLE set_key_results
  ADD COLUMN IF NOT EXISTS current_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_value numeric DEFAULT 0;

-- Recalculate progress from current/target for any rows that get updated
COMMENT ON COLUMN set_key_results.current_value IS 'Current measured value for this KR';
COMMENT ON COLUMN set_key_results.target_value IS 'Target goal value for this KR';
