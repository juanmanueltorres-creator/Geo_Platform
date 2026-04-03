-- =====================================================
-- 06_ASSAYS.sql
-- Initial background assay values for Au and Cu.
-- Zone-based overrides applied later in seed 10.
-- =====================================================

DO $$
DECLARE
    r           RECORD;
    v_au_id     UUID;
    v_cu_id     UUID;
    v_method_id UUID;
    v_lab_id    UUID;
BEGIN

SELECT id INTO v_au_id     FROM elements      WHERE symbol = 'Au';
SELECT id INTO v_cu_id     FROM elements      WHERE symbol = 'Cu';
SELECT id INTO v_method_id FROM assay_methods  WHERE code   = 'FA_AAS';
SELECT id INTO v_lab_id    FROM laboratories   WHERE name   = 'ALS Mendoza';

FOR r IN SELECT id FROM samples LOOP

    -- Background Au: 0.005 – 0.03 ppm (barren host rock)
    INSERT INTO assay_results
        (sample_id, element_id, method_id, laboratory_id, value, unit)
    VALUES
        (r.id, v_au_id, v_method_id, v_lab_id,
         ROUND((0.005 + random() * 0.025)::numeric, 4), 'ppm');

    -- Background Cu: 0.005 – 0.03 % (barren host rock)
    INSERT INTO assay_results
        (sample_id, element_id, method_id, laboratory_id, value, unit)
    VALUES
        (r.id, v_cu_id, v_method_id, v_lab_id,
         ROUND((0.005 + random() * 0.025)::numeric, 4), '%');

END LOOP;

END $$;
