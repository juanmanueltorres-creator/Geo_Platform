-- =====================================================
-- 08_ALTERATION_GENERATION.sql
-- Depth-based alteration zonation for Andean
-- porphyry–epithermal system
-- (ARG → PHY → POT → PRO from surface to depth).
-- =====================================================

DO $$
DECLARE
    r           RECORD;
    v_start     NUMERIC;
    v_end       NUMERIC;
    v_mid       NUMERIC;
    v_alt_id    UUID;
    v_intensity TEXT;
BEGIN

FOR r IN SELECT id, total_depth FROM drillholes LOOP

    v_start := 0;

    WHILE v_start < r.total_depth LOOP

        v_end := LEAST(v_start + 50, r.total_depth);
        v_mid := (v_start + v_end) / 2;

        IF v_mid < 100 THEN
            SELECT id INTO v_alt_id FROM alteration_types WHERE code = 'ARG';
            v_intensity := CASE WHEN random() < 0.5 THEN 'moderate' ELSE 'strong' END;
        ELSIF v_mid < 250 THEN
            SELECT id INTO v_alt_id FROM alteration_types WHERE code = 'PHY';
            v_intensity := CASE WHEN random() < 0.3 THEN 'strong' ELSE 'moderate' END;
        ELSIF v_mid < 400 THEN
            SELECT id INTO v_alt_id FROM alteration_types WHERE code = 'POT';
            v_intensity := CASE WHEN random() < 0.4 THEN 'strong' ELSE 'moderate' END;
        ELSE
            SELECT id INTO v_alt_id FROM alteration_types WHERE code = 'PRO';
            v_intensity := CASE WHEN random() < 0.7 THEN 'weak' ELSE 'moderate' END;
        END IF;

        INSERT INTO alteration_events
            (drillhole_id, interval, alteration_id, intensity)
        VALUES
            (r.id, numrange(v_start, v_end, '[)'), v_alt_id, v_intensity);

        v_start := v_end;

    END LOOP;

END LOOP;

END $$;
