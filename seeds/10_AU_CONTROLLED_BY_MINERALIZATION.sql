-- =====================================================
-- 10_AU_CONTROLLED_BY_MINERALIZATION.sql
--
-- Overrides Au (and Cu in porphyry) using a Gaussian
-- bell-curve profile centred on each mineralization
-- interval.  Samples outside all zones keep the
-- background values set by seed 06.
--
-- Grade model (Au, stored as numeric with unit 'ppm'):
-- Aligned to real Filo del Sol PFS: avg 0.33 g/t Au, avg 0.38% Cu
--   Background:   0.005 – 0.03
--   VEIN  edges → 0.08,  peak → 1.20
--   STK   edges → 0.06,  peak → 0.60
--   DIS   edges → 0.04,  peak → 0.30
--
-- Bell factor = exp( -3 · (d / hw)² )
--   d  = |sample_mid − zone_mid|
--   hw = zone_half_width
-- =====================================================

SELECT setseed(0.42);

-- 1 ── Reset ALL Au to background (low, realistic for barren host rock)
UPDATE assay_results
SET value = ROUND((0.005 + random() * 0.025)::numeric, 4)
WHERE element_id = (SELECT id FROM elements WHERE symbol = 'Au');

-- 2 ── Epithermal VEIN zone  (best Au, high-sulphidation style)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.08
  + (1.20 - 0.08)
    * EXP(-3.0 * POWER(
        ABS(
            ((lower(s.interval) + upper(s.interval)) / 2.0)
          - ((lower(m.interval) + upper(m.interval)) / 2.0)
        )
        / NULLIF((upper(m.interval) - lower(m.interval)) / 2.0, 0)
      , 2))
  + (random() - 0.5) * 0.15
)::numeric, 4))
FROM samples s
JOIN mineralization_intervals m
    ON  m.drillhole_id = s.drillhole_id
    AND s.interval && m.interval
JOIN mineralization_types mt
    ON  mt.id = m.mineralization_id
WHERE ar.sample_id  = s.id
  AND ar.element_id = (SELECT id FROM elements WHERE symbol = 'Au')
  AND mt.code       = 'VEIN';

-- 3 ── Stockwork STK zone  (moderate Au, transition to porphyry)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.06
  + (0.60 - 0.06)
    * EXP(-3.0 * POWER(
        ABS(
            ((lower(s.interval) + upper(s.interval)) / 2.0)
          - ((lower(m.interval) + upper(m.interval)) / 2.0)
        )
        / NULLIF((upper(m.interval) - lower(m.interval)) / 2.0, 0)
      , 2))
  + (random() - 0.5) * 0.10
)::numeric, 4))
FROM samples s
JOIN mineralization_intervals m
    ON  m.drillhole_id = s.drillhole_id
    AND s.interval && m.interval
JOIN mineralization_types mt
    ON  mt.id = m.mineralization_id
WHERE ar.sample_id  = s.id
  AND ar.element_id = (SELECT id FROM elements WHERE symbol = 'Au')
  AND mt.code       = 'STK';

-- 4 ── Porphyry DIS zone  (Cu-dominant, moderate Au)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.04
  + (0.30 - 0.04)
    * EXP(-3.0 * POWER(
        ABS(
            ((lower(s.interval) + upper(s.interval)) / 2.0)
          - ((lower(m.interval) + upper(m.interval)) / 2.0)
        )
        / NULLIF((upper(m.interval) - lower(m.interval)) / 2.0, 0)
      , 2))
  + (random() - 0.5) * 0.06
)::numeric, 4))
FROM samples s
JOIN mineralization_intervals m
    ON  m.drillhole_id = s.drillhole_id
    AND s.interval && m.interval
JOIN mineralization_types mt
    ON  mt.id = m.mineralization_id
WHERE ar.sample_id  = s.id
  AND ar.element_id = (SELECT id FROM elements WHERE symbol = 'Au')
  AND mt.code       = 'DIS';

-- 5 ── Cu boost in porphyry DIS zone (peak 0.50 %, avg ~0.38%)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.08
  + (0.50 - 0.08)
    * EXP(-3.0 * POWER(
        ABS(
            ((lower(s.interval) + upper(s.interval)) / 2.0)
          - ((lower(m.interval) + upper(m.interval)) / 2.0)
        )
        / NULLIF((upper(m.interval) - lower(m.interval)) / 2.0, 0)
      , 2))
  + (random() - 0.5) * 0.06
)::numeric, 4))
FROM samples s
JOIN mineralization_intervals m
    ON  m.drillhole_id = s.drillhole_id
    AND s.interval && m.interval
JOIN mineralization_types mt
    ON  mt.id = m.mineralization_id
WHERE ar.sample_id  = s.id
  AND ar.element_id = (SELECT id FROM elements WHERE symbol = 'Cu')
  AND mt.code       = 'DIS';

-- 6 ── Moderate Cu in stockwork STK zone (peak 0.25 %)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.03
  + (0.25 - 0.03)
    * EXP(-3.0 * POWER(
        ABS(
            ((lower(s.interval) + upper(s.interval)) / 2.0)
          - ((lower(m.interval) + upper(m.interval)) / 2.0)
        )
        / NULLIF((upper(m.interval) - lower(m.interval)) / 2.0, 0)
      , 2))
  + (random() - 0.5) * 0.03
)::numeric, 4))
FROM samples s
JOIN mineralization_intervals m
    ON  m.drillhole_id = s.drillhole_id
    AND s.interval && m.interval
JOIN mineralization_types mt
    ON  mt.id = m.mineralization_id
WHERE ar.sample_id  = s.id
  AND ar.element_id = (SELECT id FROM elements WHERE symbol = 'Cu')
  AND mt.code       = 'STK';
