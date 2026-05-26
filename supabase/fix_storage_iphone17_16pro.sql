-- Fix storage strings for iPhone 17, iPhone 17 Air, iPhone 16 Pro
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

-- 1. iPhone 17: remove 128GB → 256GB / 512GB only
UPDATE products
SET
  storage = '256GB / 512GB',
  storage_prices = CASE
    WHEN storage_prices IS NOT NULL THEN storage_prices - '128GB'
    ELSE storage_prices
  END,
  updated_at = now()
WHERE model = 'iPhone 17' AND category = 'iphone';

-- 2. iPhone 17 Air: remove 128GB, add 1TB → 256GB / 512GB / 1TB
UPDATE products
SET
  storage = '256GB / 512GB / 1TB',
  storage_prices = CASE
    WHEN storage_prices IS NOT NULL THEN storage_prices - '128GB'
    ELSE storage_prices
  END,
  updated_at = now()
WHERE model = 'iPhone 17 Air' AND category = 'iphone';

-- 3. iPhone 16 Pro: add 128GB to storage string
-- NOTE: The 128GB price is NOT set in storage_prices automatically.
--       Go to Admin → Prices → iPhone 16 Pro to set the 128GB price manually.
UPDATE products
SET
  storage = '128GB / 256GB / 512GB / 1TB',
  updated_at = now()
WHERE model = 'iPhone 16 Pro' AND category = 'iphone';
