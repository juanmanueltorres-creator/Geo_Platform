-- =====================================================
-- 04_DRILLHOLES.sql
-- 30 drillholes — Miocene porphyry–epithermal system
-- Frontal Cordillera, San Juan, Argentina
-- =====================================================

SELECT setseed(0.42);

DO $$
DECLARE
    v_project_id   UUID;
    v_drillhole_id UUID;

    -- Project center: Frontal Cordillera, El Indio belt region
    v_center_lat NUMERIC := -30.1800;
    v_center_lon NUMERIC := -69.3500;
    v_base_elev  NUMERIC := 4200;

    v_i       INT;
    v_lat     NUMERIC;
    v_lon     NUMERIC;
    v_elev    NUMERIC;
    v_depth   NUMERIC;
    v_azimuth NUMERIC;
    v_dip     NUMERIC;
    v_angle   NUMERIC;
    v_radius  NUMERIC;
BEGIN

    SELECT id INTO v_project_id
    FROM projects
    ORDER BY created_at DESC
    LIMIT 1;

    FOR v_i IN 1..30 LOOP

        -- ---- placement by concentric ring ----
        IF v_i <= 8 THEN
            -- Inner ring: ~150–300 m from center, deep holes
            v_angle  := (v_i - 1) * 45.0  + random() * 15;
            v_radius := 0.0014 + random() * 0.0013;
            v_depth  := 480 + FLOOR(random() * 120);
            v_dip    := -(65 + FLOOR(random() * 11));
        ELSIF v_i <= 20 THEN
            -- Middle ring: ~330–700 m, medium holes
            v_angle  := (v_i - 9) * 30.0  + random() * 10;
            v_radius := 0.0030 + random() * 0.0033;
            v_depth  := 350 + FLOOR(random() * 150);
            v_dip    := -(55 + FLOOR(random() * 16));
        ELSE
            -- Outer ring: ~770–1200 m, shallow holes
            v_angle  := (v_i - 21) * 36.0 + random() * 12;
            v_radius := 0.0070 + random() * 0.0038;
            v_depth  := 250 + FLOOR(random() * 150);
            v_dip    := -(50 + FLOOR(random() * 16));
        END IF;

        v_lat  := v_center_lat + v_radius * sin(radians(v_angle));
        v_lon  := v_center_lon + v_radius * cos(radians(v_angle));
        v_elev := v_base_elev  + (random() - 0.5) * 200;

        -- Azimuth roughly toward project center ± noise
        v_azimuth := MOD((v_angle + 180 + (random() - 0.5) * 40)::numeric, 360);

        INSERT INTO drillholes (
            project_id, hole_id, drilling_type, status, total_depth
        )
        VALUES (
            v_project_id,
            'SJDH-' || LPAD(v_i::TEXT, 3, '0'),
            'Diamond',
            'Completed',
            ROUND(v_depth)
        )
        RETURNING id INTO v_drillhole_id;

        INSERT INTO collars (drillhole_id, geom)
        VALUES (
            v_drillhole_id,
            ST_SetSRID(ST_MakePoint(v_lon, v_lat, v_elev), 4326)
        );

        INSERT INTO surveys (drillhole_id, depth, azimuth, dip)
        VALUES (
            v_drillhole_id, 0,
            ROUND(v_azimuth::numeric, 1),
            ROUND(v_dip::numeric, 1)
        );

    END LOOP;

END $$;
