-- Create function to deactivate expired access
-- This is required by PaymentDatabaseService.getUserActiveAccess()

CREATE OR REPLACE FUNCTION deactivate_expired_access()
RETURNS void AS $$
BEGIN
  UPDATE user_package_access
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND access_end <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT deactivate_expired_access();

-- Verify it works
SELECT 
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_count,
  COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_count,
  COUNT(*) as total_count
FROM user_package_access;
