-- =====================================================
-- 12_VALIDATION_QUERIES.sql
-- Geological model validation
-- =====================================================


--------------------------------------------------------
-- 1. Drillhole overview
--------------------------------------------------------

SELECT
    COUNT(*) AS n_drillholes,
    ROUND(AVG(total_depth)::numeric,2) AS avg_depth,
    MIN(total_depth) AS min_depth,
    MAX(total_depth) AS max_depth
FROM drillholes;


--------------------------------------------------------
-- 2. Samples generated
--------------------------------------------------------

SELECT
    COUNT(*) AS total_samples,
    ROUND(AVG(upper(interval)-lower(interval))::numeric,2) AS avg_sample_length
FROM samples;


--------------------------------------------------------
-- 3. Assay coverage
--------------------------------------------------------

SELECT
    e.symbol,
    COUNT(*) AS assays,
    ROUND(MIN(ar.value)::numeric, 4) AS min_value,
    ROUND(MAX(ar.value)::numeric, 4) AS max_value,
    ROUND(AVG(ar.value)::numeric, 4) AS avg_value
FROM assay_results ar
JOIN elements e
    ON e.id = ar.element_id
GROUP BY e.symbol
ORDER BY assays DESC;


--------------------------------------------------------
-- 4. Lithology distribution
--------------------------------------------------------

SELECT
    l.code,
    COUNT(*) AS intervals
FROM lithology_intervals li
JOIN lithologies l
    ON l.id = li.lithology_id
GROUP BY l.code
ORDER BY intervals DESC;


--------------------------------------------------------
-- 5. Alteration distribution
--------------------------------------------------------

SELECT
    a.code,
    COUNT(*) AS intervals
FROM alteration_events ae
JOIN alteration_types a
    ON a.id = ae.alteration_id
GROUP BY a.code
ORDER BY intervals DESC;


--------------------------------------------------------
-- 6. Mineralization distribution
--------------------------------------------------------

SELECT
    mt.code,
    COUNT(*) AS intervals
FROM mineralization_intervals mi
JOIN mineralization_types mt
    ON mt.id = mi.mineralization_id
GROUP BY mt.code;


--------------------------------------------------------
-- 7. Domain assignments
--------------------------------------------------------

SELECT
    gd.name AS domain,
    COUNT(*) AS intervals
FROM domain_assignments da
JOIN geological_domains gd
    ON gd.id = da.domain_id
GROUP BY gd.name
ORDER BY intervals DESC;


--------------------------------------------------------
-- 8. Gold grade by domain
--------------------------------------------------------

SELECT
    gd.name AS domain,
    ROUND(AVG(ar.value)::numeric,3) AS avg_au,
    MIN(ar.value) AS min_au,
    MAX(ar.value) AS max_au,
    COUNT(*) AS n_samples
FROM assay_results ar
JOIN samples s
    ON s.id = ar.sample_id
JOIN domain_assignments da
    ON da.drillhole_id = s.drillhole_id
    AND s.interval && da.interval
JOIN geological_domains gd
    ON gd.id = da.domain_id
WHERE ar.element_id = (
    SELECT id FROM elements WHERE symbol='Au'
)
GROUP BY gd.name
ORDER BY avg_au DESC;


--------------------------------------------------------
-- 9. Au grade ranges (background / anomalous / high)
--------------------------------------------------------

SELECT
    CASE
        WHEN ar.value < 0.10  THEN 'background (<0.10)'
        WHEN ar.value < 0.50  THEN 'low-anomalous (0.10-0.50)'
        WHEN ar.value < 2.00  THEN 'anomalous (0.50-2.00)'
        ELSE                       'high-grade (>=2.00)'
    END AS grade_class,
    COUNT(*) AS n_assays,
    ROUND(MIN(ar.value)::numeric, 4) AS min_au,
    ROUND(MAX(ar.value)::numeric, 4) AS max_au,
    ROUND(AVG(ar.value)::numeric, 4) AS avg_au
FROM assay_results ar
WHERE ar.element_id = (SELECT id FROM elements WHERE symbol = 'Au')
GROUP BY grade_class
ORDER BY min_au;


--------------------------------------------------------
-- 10. Zones per drillhole
--------------------------------------------------------

SELECT
    dh.hole_id,
    COUNT(mi.id) AS n_zones,
    STRING_AGG(mt.code, ', ' ORDER BY lower(mi.interval)) AS zone_types
FROM drillholes dh
LEFT JOIN mineralization_intervals mi
    ON mi.drillhole_id = dh.id
LEFT JOIN mineralization_types mt
    ON mt.id = mi.mineralization_id
GROUP BY dh.hole_id
ORDER BY dh.hole_id;


--------------------------------------------------------
-- 11. Example drillholes: depth intervals + Au pattern
--     (first 3 drillholes, sampled every 20 m)
--------------------------------------------------------

SELECT
    dh.hole_id,
    lower(s.interval) AS from_m,
    upper(s.interval) AS to_m,
    ROUND(ar.value::numeric, 3) AS au,
    COALESCE(mt.code, 'BG') AS zone
FROM drillholes dh
JOIN samples s          ON s.drillhole_id = dh.id
JOIN assay_results ar   ON ar.sample_id = s.id
                       AND ar.element_id = (SELECT id FROM elements WHERE symbol = 'Au')
LEFT JOIN mineralization_intervals mi
    ON mi.drillhole_id = s.drillhole_id
   AND s.interval && mi.interval
LEFT JOIN mineralization_types mt
    ON mt.id = mi.mineralization_id
WHERE dh.hole_id IN ('SJDH-001', 'SJDH-015', 'SJDH-025')
  AND MOD(lower(s.interval)::int, 20) = 0
ORDER BY dh.hole_id, from_m;


--------------------------------------------------------
-- 12. Structural measurements check
--------------------------------------------------------

SELECT COUNT(*) AS structural_measurements
FROM structural_measurements;


--------------------------------------------------------
-- 13. Gold grade by domain (summary)
--------------------------------------------------------

SELECT
    gd.name,
    ROUND(AVG(ar.value)::numeric,3) AS avg_au,
    COUNT(*) AS samples
FROM assay_results ar
JOIN samples s ON s.id = ar.sample_id
JOIN domain_assignments da
    ON da.drillhole_id = s.drillhole_id
    AND s.interval && da.interval
JOIN geological_domains gd
    ON gd.id = da.domain_id
WHERE ar.element_id = (
    SELECT id FROM elements WHERE symbol='Au'
)
GROUP BY gd.name
ORDER BY avg_au DESC;