-- =====================================================
-- 03_COMPANY_PROJECT.sql
-- =====================================================

INSERT INTO companies (name)
VALUES ('Filo del Sol Exploración SA');

INSERT INTO projects (company_id, name, location, crs)
VALUES (
    (SELECT id FROM companies ORDER BY created_at DESC LIMIT 1),
    'Filo del Sol Cu-Au Project',
    'Vicuña Belt, San Juan - Argentina / Atacama - Chile',
    4326
);
