-- Trigger: increment jobs_completed on rider_shifts when a request is completed

CREATE OR REPLACE FUNCTION increment_rider_jobs_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire only when status transitions TO 'completed' and rider is assigned
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.rider_id IS NOT NULL
  THEN
    UPDATE rider_shifts
    SET jobs_completed = jobs_completed + 1
    WHERE id = (
      SELECT id FROM rider_shifts
      WHERE rider_id = NEW.rider_id
        AND clocked_out_at IS NULL
      ORDER BY clocked_in_at DESC
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_rider_jobs_completed ON requests;
CREATE TRIGGER trg_rider_jobs_completed
  AFTER UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_rider_jobs_completed();
