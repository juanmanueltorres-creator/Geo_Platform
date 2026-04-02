-- =====================================================
-- 07_LITHOLOGY_GENERATION.sql
-- Depth-based lithology zonation for Andean volcanic-
-- intrusive sequence (TUF → AND → BRX → DIO).
-- =====================================================

DO $$
DECLARE
    r       RECORD;
    v_start NUMERIC;
    v_end   NUMERIC;
    v_mid   NUMERIC;
    v_lith_id UUID;
BEGIN

FOR r IN SELECT id, total_depth FROM drillholes LOOP

    v_start := 0;

    WHILE v_start < r.total_depth LOOP

        v_end := LEAST(v_start + 50, r.total_depth);
        v_mid := (v_start + v_end) / 2;

        IF v_mid < 80 THEN
            SELECT id INTO v_lith_id FROM lithologies WHERE code = 'TUF';
        ELSIF v_mid < 200 THEN
            SELECT id INTO v_lith_id FROM lithologies WHERE code = 'AND';
        ELSIF v_mid < 350 THEN
            SELECT id INTO v_lith_id FROM lithologies WHERE code = 'BRX';
        ELSE
            SELECT id INTO v_lith_id FROM lithologies WHERE code = 'DIO';
        END IF;

        INSERT INTO lithology_intervals
            (drillhole_id, interval, lithology_id)
        VALUES
            (r.id, numrange(v_start, v_end, '[)'), v_lith_id);

        v_start := v_end;

    END LOOP;

END LOOP;

END $$;
