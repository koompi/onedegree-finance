-- Seed default categories for existing companies that don't have any
INSERT INTO categories (company_id, name, name_km, type, icon, is_system)
SELECT 
  c.id,
  sc.name,
  sc.name_km,
  sc.type,
  sc.icon,
  FALSE
FROM companies c
CROSS JOIN categories sc
WHERE sc.is_system = TRUE 
  AND sc.company_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories cat WHERE cat.company_id = c.id
  )
ON CONFLICT DO NOTHING;
