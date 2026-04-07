-- Run this SQL once on the production database to add the category column

-- 1. Add column (nullable so it works for all existing records)
ALTER TABLE bonus_ledger ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'bonus';

-- 2. Mark existing salary records based on notes text
UPDATE bonus_ledger SET category = 'salary' WHERE notes ILIKE '%Зарплат%' AND category IS NULL;
UPDATE bonus_ledger SET category = 'salary' WHERE notes ILIKE '%Zarplat%' AND category IS NULL;

-- 3. Mark existing payout records based on notes
UPDATE bonus_ledger SET category = 'salary' WHERE notes ILIKE '%Выплата зарплат%';
UPDATE bonus_ledger SET category = 'bonus' WHERE notes ILIKE '%Выплата бонус%';

-- 4. Remaining without category -> default 'bonus'
UPDATE bonus_ledger SET category = 'bonus' WHERE category IS NULL;
