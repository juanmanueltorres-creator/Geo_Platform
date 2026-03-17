# GEO-PLATFORM EXPLORATION DATABASE

Production-style mineral exploration database architecture.

## Stack

- **Database Engine:** PostgreSQL
- **Spatial Engine:** PostGIS
- **Architecture Goals:**
  - Exploration Data Platform
  - Geospatial Analytics
  - Machine Learning Dataset
  - Web API Integration

## Geological Model

Synthetic Andean Au-dominant transitional system.

### Vertical system architecture

```text
Epithermal Au–Ag zone
        │
        ▼
  Phyllic alteration
        │
        ▼
  Porphyry Cu–Au core
```

### Typical geochemical indicators

- **Epithermal:** Au, Ag, As, Sb, Pb, Zn
- **Porphyry:** Cu, Mo, Fe, S

## Database Design Principles

- UUID primary keys
- Interval-based geological modeling
- `numrange` intervals
- `EXCLUDE` constraints for overlap prevention
- PostGIS spatial geometry
- Normalized exploration schema
- Separation between samples and assays
- Interpretative geological domains

## Core Data Model

```text
Company
└── Project
    ├── Drillholes
    │   ├── Collars
    │   ├── Surveys
    │   └── Samples
    │       ├── Assays
    │       ├── Density
    │       ├── Lithology
    │       ├── Alteration
    │       ├── Mineralization
    │       └── Structures
    └── Geological Domains
```

## Repository Structure

```text
database/
  00_Extensions.sql
  01_Multitenant.sql
  02_core_drillholes.sql
  03_sampling.sql
  04_geochemistry.sql
  05_geology.sql
  06_structural.sql
  07_domains.sql

seeds/
  01_reference_data.sql
  02_MASTER_CLEAN.sql
  03_COMPANY_PROJECT.sql
  04_DRILLHOLES.sql
  05_SAMPLES.sql
  06_ASSAYS.sql
  07_LITHOLOGY_GENERATION.sql
  08_ALTERATION_GENERATION.sql
  09_MINERALIZATION_GENERATION.sql
  10_AU_CONTROLLED_BY_MINERALIZATION.sql
  11_domains.sql
  12_validation_queries.sql
  13_geology_views.sql

queries/
  14_compositing_engine.sql
  15_intersection_engine.sql
  16_exploration_dashboard.sql
  17_ml_dataset.sql
  18_spatial_drillholes.sql

api/
  main.py

web/
  map.html
```

## Data Generation Pipeline

1. Base catalogs
2. Database cleanup
3. Company + Project
4. Drillholes
5. Samples
6. Assays
7. Lithology generation
8. Alteration generation
9. Mineralization generation
10. Gold grade control
11. Geological domains
12. Validation queries
13. Geological analytical views

## Analytical Layer

### `v_sample_geology`
Integrated geological dataset combining:
- Samples
- Lithology
- Alteration
- Mineralization
- Domains
- Au assays

### `v_drillhole_summary`
Drillhole-level statistics:
- `total_samples`
- `average_Au`
- `max_Au`
- `total_depth`

### `v_domain_statistics`
Geological domain grade statistics.

## Exploration Analytics

### Downhole compositing engine
- 5-meter composites generated from samples
- View: `v_downhole_composites`

### High-grade intersection detection
- Criteria:
  - Au ≥ 1 g/t
  - Thickness ≥ 2 m
- View: `v_high_grade_intersections`

### Exploration dashboard
- Project-level metrics
- View: `v_project_dashboard`

## Machine Learning Dataset

- View: `v_ml_dataset`
- Fields:
  - `mid_depth`
  - `lithology`
  - `alteration`
  - `mineralization`
  - `domain`
  - `au_grade`

Designed for direct use in:
- Python
- GeoPandas
- scikit-learn

## Spatial Data

- PostGIS drillhole collar geometry
- View: `v_drillhole_locations`
- CRS: `EPSG:4326`

## Simulated Dataset

- 4 drillholes
- ~1200 samples
- Au and Cu assays
- Synthetic lithology logs
- Alteration zonation
- Mineralization intervals
- Domain modeling

## Industry Parallels

The architecture follows concepts used in professional mineral exploration data platforms.

Comparable workflows exist in:
- Leapfrog Geo
- Micromine
- Datamine
- Seequent Central
- acQuire GIM Suite

This system is implemented using open-source technologies.

## Future Development

- **API layer:** FastAPI
- **Web mapping:** Leaflet, Mapbox
- **Data science:** Python, GeoPandas, scikit-learn

## Pipeline Summary

```text
PostgreSQL + PostGIS
        │
        ▼
Exploration Database
        │
        ▼
Geological Modeling
        │
        ▼
Analytical SQL Views
        │
        ▼
Exploration Dataset
        │
        ▼
Machine Learning Dataset
        │
        ▼
Spatial Drillhole Layer
        │
        ▼
REST API
        │
        ▼
Web Visualization