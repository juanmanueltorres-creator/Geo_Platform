-- =====================================================
-- 09_MINERALIZATION_GENERATION.sql
-- Variable mineralization zones per drillhole:
--   Inner ring  (1–8):  3 zones  VEIN + STK + DIS
--   Middle ring (9–20): 2 zones  VEIN + STK
--   Outer ring  (21–30):1 zone   VEIN only
--
-- Zone depths use deterministic per-hole offsets so
-- each drillhole looks different while staying coherent.
-- =====================================================

DO $$
DECLARE
    r          RECORD;
    v_min_vein UUID;
    v_min_stk  UUID;
    v_min_dis  UUID;
    v_hole_num INT;

    v_off1     INT;
    v_off2     INT;
    v_off3     INT;

    v_z1_start NUMERIC;
    v_z1_end   NUMERIC;
    v_z2_start NUMERIC;
    v_z2_end   NUMERIC;
    v_z3_start NUMERIC;
    v_z3_end   NUMERIC;
BEGIN

SELECT id INTO v_min_vein FROM mineralization_types WHERE code = 'VEIN';
SELECT id INTO v_min_stk  FROM mineralization_types WHERE code = 'STK';
SELECT id INTO v_min_dis  FROM mineralization_types WHERE code = 'DIS';

FOR r IN SELECT id, hole_id, total_depth FROM drillholes LOOP

    v_hole_num := NULLIF(regexp_replace(r.hole_id, '[^0-9]', '', 'g'), '')::INT;

    -- Deterministic per-hole offsets (avoids identical zones)
    v_off1 := v_hole_num * 7  % 13;   -- 0..12
    v_off2 := v_hole_num * 11 % 17;   -- 0..16
    v_off3 := v_hole_num * 13 % 11;   -- 0..10

    -- ===================================================
    -- Zone 1: Epithermal Au-Ag (VEIN) — all 30 holes
    -- Starts ~15–51 m, width ~40–72 m → ends ≤ 123 m
    -- ===================================================
    v_z1_start := 15 + v_off1 * 3;
    v_z1_end   := v_z1_start + 40 + v_off2 * 2;

    IF v_z1_end <= r.total_depth THEN
        INSERT INTO mineralization_intervals
            (drillhole_id, interval, mineralization_id)
        VALUES
            (r.id, numrange(v_z1_start, v_z1_end, '[)'), v_min_vein);
    END IF;

    -- ===================================================
    -- Zone 2: Stockwork transition (STK) — holes 1..20
    -- Starts ~160–208 m, width ~50–90 m → ends ≤ 298 m
    -- ===================================================
    IF v_hole_num <= 20 THEN
        v_z2_start := 160 + v_off2 * 3;
        v_z2_end   := v_z2_start + 50 + v_off3 * 4;

        IF v_z2_end <= r.total_depth THEN
            INSERT INTO mineralization_intervals
                (drillhole_id, interval, mineralization_id)
            VALUES
                (r.id, numrange(v_z2_start, v_z2_end, '[)'), v_min_stk);
        END IF;
    END IF;

    -- ===================================================
    -- Zone 3: Porphyry Cu-Au core (DIS) — holes 1..8
    -- Starts ~320–350 m, width ~60–96 m → ends ≤ 446 m
    -- ===================================================
    IF v_hole_num <= 8 THEN
        v_z3_start := 320 + v_off3 * 3;
        v_z3_end   := v_z3_start + 60 + v_off1 * 3;

        IF v_z3_end <= r.total_depth THEN
            INSERT INTO mineralization_intervals
                (drillhole_id, interval, mineralization_id)
            VALUES
                (r.id, numrange(v_z3_start, v_z3_end, '[)'), v_min_dis);
        END IF;
    END IF;

END LOOP;

END $$;
