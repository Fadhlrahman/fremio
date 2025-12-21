-- Quick check if payment tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('frame_packages', 'payment_transactions', 'user_package_access')
ORDER BY table_name;
