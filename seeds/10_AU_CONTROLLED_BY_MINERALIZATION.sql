-- =====================================================
-- 10_AU_CONTROLLED_BY_MINERALIZATION.sql
--
-- Overrides Au (and Cu in porphyry) using a Gaussian
-- bell-curve profile centred on each mineralization
-- interval.  Samples outside all zones keep the
-- background values set by seed 06.
--
-- Grade model (Au, stored as numeric with unit 'ppm'):
--   Background:   0.01 – 0.10
--   VEIN  edges → 0.30,  peak → 4.50
--   STK   edges → 0.20,  peak → 2.50
--   DIS   edges → 0.15,  peak → 1.50
--
-- Bell factor = exp( -3 · (d / hw)² )
--   d  = |sample_mid − zone_mid|
--   hw = zone_half_width
-- =====================================================

SELECT setseed(0.42);

-- 1 ── Reset ALL Au to background
UPDATE assay_results
SET value = ROUND((0.01 + random() * 0.09)::numeric, 4)
WHERE element_id = (SELECT id FROM elements WHERE symbol = 'Au');

-- 2 ── Epithermal VEIN zone  (high Au)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.30
  + (4.50 - 0.30)
    * EXP(-3.0 * POWER(
        ABS(
            ((lower(s.interval) + upper(s.interval)) / 2.0)
          - ((lower(m.interval) + upper(m.interval)) / 2.0)
        )
        / NULLIF((upper(m.interval) - lower(m.interval)) / 2.0, 0)
      , 2))
  + (random() - 0.5) * 0.6
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

-- 3 ── Stockwork STK zone  (moderate-high Au)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.20
  + (2.50 - 0.20)
    * EXP(-3.0 * POWER(
        ABS(
            ((lower(s.interval) + upper(s.interval)) / 2.0)
          - ((lower(m.interval) + upper(m.interval)) / 2.0)
        )
        / NULLIF((upper(m.interval) - lower(m.interval)) / 2.0, 0)
      , 2))
  + (random() - 0.5) * 0.5
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

-- 4 ── Porphyry DIS zone  (moderate Au)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.15
  + (1.50 - 0.15)
    * EXP(-3.0 * POWER(
        ABS(
            ((lower(s.interval) + upper(s.interval)) / 2.0)
          - ((lower(m.interval) + upper(m.interval)) / 2.0)
        )
        / NULLIF((upper(m.interval) - lower(m.interval)) / 2.0, 0)
      , 2))
  + (random() - 0.5) * 0.3
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

-- 5 ── Cu boost in porphyry DIS zone (peak 1.2 %)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.10
  + (1.20 - 0.10)
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
  AND ar.element_id = (SELECT id FROM elements WHERE symbol = 'Cu')
  AND mt.code       = 'DIS';

-- 6 ── Moderate Cu in stockwork STK zone (peak 0.45 %)
UPDATE assay_results ar
SET value = GREATEST(0.005, ROUND((
    0.05
  + (0.45 - 0.05)
    * EXP(-3.0 * POWER(
        ABS(
            ((lower(s.interval) + upper(s.interval)) / 2.0)
          - ((lower(m.interval) + upper(m.interval)) / 2.0)
        )
        / NULLIF((upper(m.interval) - lower(m.interval)) / 2.0, 0)
      , 2))
  + (random() - 0.5) * 0.05
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
