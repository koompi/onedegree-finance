-- Remove duplicate categories, keeping the earliest created one per (company_id, name, type)
DELETE FROM categories
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY company_id, name, type
        ORDER BY created_at ASC
      ) AS rn
    FROM categories
  ) ranked
  WHERE rn > 1
);

-- Remove duplicate system categories (company_id IS NULL), keeping earliest
DELETE FROM categories
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY company_id, name, type
        ORDER BY created_at ASC
      ) AS rn
    FROM categories
    WHERE company_id IS NULL
  ) ranked
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE categories
  ADD CONSTRAINT categories_company_name_type_unique
  UNIQUE (company_id, name, type);
