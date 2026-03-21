# 🌍 GEO-PLATFORM v3.0

**En 5 segundos:** Una plataforma interactiva donde geólogos exploran datos de perforaciones (drillholes), muestras y ensayos de oro en tiempo real. 

🎯 **Lo que puedes hacer:**
- 📍 Ver perforaciones en el mapa
- 💰 Revisar resultados de oro por pozo  
- 📊 Analizar patrones de minerales
- 📈 Gráficos de profundidad vs. oro

🚀 **[Explorar ahora](https://geo-platform-axhipqo2p-juanmanueltorres-creators-projects.vercel.app)** | 🔧 **[API Docs](https://geo-plataform.onrender.com)**

---

**Status:** ✅ **Fully Live in Production** | Last Update: March 2026 | **v3.0 Frontend Deployed ✨**

Production-ready mineral exploration database with modern React frontend and interactive geospatial API platform.

## Stack

**Backend:**
- **API:** FastAPI 0.104.1 (Python 3.11.9)
- **Server:** Render.com (Cloud Deployment)
- **Database:** PostgreSQL 15+ with PostGIS 3.4+ (Supabase)
- **Connection Pooling:** psycopg2 SimpleConnectionPool (2-10 connections)

**Frontend:**
- **Framework:** React 18 + TypeScript + Vite (v3.0)
- **UI Library:** Shadcn/ui with Tailwind CSS
- **Map:** React-Leaflet 4.2 + OpenStreetMap
- **Charts:** Recharts
- **Theming:** Dark Mode support

**Architecture Goals:**
- ✅ Exploration Data Platform
- ✅ Geospatial Analytics API
- ✅ Interactive Web Portal
- ✅ Mobile-friendly exploration dashboard

## Geological Model

Synthetic Andean Au-dominant transitional system with real exploration data.

**Dataset:** 4 Drillholes | ~1,200 Samples | 682 Assay Results | Lithology, Alteration, Mineralization Logs

## Production Deployment (v3.0)

**Backend API:** `https://geo-plataform.onrender.com`  
**Frontend Web:** `https://geo-platform-axhipqo2p-juanmanueltorres-creators-projects.vercel.app`

### Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | API health check |
| `/drillholes` | GET | List all drillholes with pagination |
| `/drillholes/{id}/summary` | GET | Drillhole summary (total_samples, avg_au, max_au) |
| `/drillholes/{id}/assays` | GET | Assay results for drillhole (filterable by element, depth) |
| `/drillholes/{id}/lithology` | GET | Lithology intervals for drillhole |
| `/geospatial/drillhole-locations` | GET | GeoJSON features with drillhole coordinates |
| `/geospatial/domains` | GET | Domain geometries for geospatial visualization |
| `/geospatial/drillholes-geojson` | GET | All drillholes as GeoJSON FeatureCollection |

**Example Response** (Assays):
```json
{
  "drillhole_id": "26411fec-cb87-4439-b539-ac436a6fec7e",
  "assay_count": 682,
  "data": [
    {
      "sample_id": "1eebb13e-a7e0-40b2-81fc-1d0d40972f15",
      "from_depth": 0.0,
      "to_depth": 2.0,
      "element": "Au",
      "value": 0.180216613744019,
      "unit": "ppb",
      "below_detection": false
    }
  ]
}
```

### Query Parameters

- **Pagination:** `page=1&limit=50`
- **Assay Filtering:** `element=Au&from_depth=0&to_depth=100`
- **CRS:** All spatial data in EPSG:4326

## Web Interface (v3.0) ✨

**Interactive Explorer:** React 18 + TypeScript + Vite + Shadcn/ui with Dark Mode

**Live:** https://geo-platform-axhipqo2p-juanmanueltorres-creators-projects.vercel.app

### Features
- 🗺️ Real-time drillhole locations (React-Leaflet 4.2)
- 📍 Click popups with interactive data + coordinates
- 📊 Drillhole summary stats using NEW `/drillholes/{id}/summary` endpoint
- 📈 Interactive Assay charts (Recharts) with Au vs depth
- 🌙 Dark/Light mode toggle with persistence
- ✨ **NEW** Hero section with instant project context (5-second overview)
- 🔍 **NEW** Search & Filter panel for drillhole discovery
- 🏆 **NEW** Top Drillholes ranking by Au grade (premium visualization)
- ⚡ Type-safe API integration (TypeScript + Axios)
- 📱 Responsive design (Tailwind CSS)
- 🎨 Professional UI with Shadcn/ui components
- ⚡ Ultra-fast builds (Vite 5.4.21)

### 🎯 New Components (v3.0 Update)

**HeroSection** — Instant project context with:
- Clear 5-second value proposition
- Visual feature highlights with icons
- Dataset overview metrics

**SearchFilter** — Smart discovery panel featuring:
- Drillhole name search with real-time filtering
- Au grade range slider (dual handle)
- Min/Max ppb visual feedback
- Reset filters button

**TopDrillholes** — Premium ranking visualization:
- Ranked list of top 4 drillholes by max Au
- Visual progress bars normalized to highest value
- Sample counts & average Au grades per hole
- Click-to-select integration with map & charts

### Local Development

```bash
cd web
npm install  # 304 packages
npm run dev  # Opens http://localhost:3000
```

### Production Build

```bash
npm run build  # Creates optimized dist/
# Auto-deployed to Vercel on git push
```

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

## Database Design (PostgreSQL + PostGIS on Supabase)

- **UUID Primary Keys:** All tables use UUID for distributed system context
- **Interval-based Modeling:** `numrange` type for geological intervals (from_depth, to_depth)
- **PostGIS Geometry:** 4326 (WGS84) spatial reference for all coordinates
- **Normalized Schema:** Separate tables for samples, assays, lithology, alteration, mineralization
- **Foreign Key Relationships:** Element lookups, domain assignments, method/laboratory tracking
- **EXCLUDE Constraints:** Prevents overlapping intervals in geological sequences
- **Standardized Views:** 13+ analytical views for exploration analytics

### Real Schema (Supabase)

**Key Tables:**
```
- drillholes (id UUID, hole_id text, status, total_depth)
- collars (drillhole_id UUID, geom PostGIS, location)
- samples (id UUID, drillhole_id UUID, interval numrange, sample_type)
- assay_results (sample_id UUID, element_id UUID, value numeric, unit text, is_below_detection)
- elements (id UUID, symbol text: 'Au', 'Cu', 'As', etc.)
- lithology_intervals (sample_id UUID, lithology_code, lithology_description)
- alteration_events (sample_id UUID, alteration_type, intensity)
- mineralization_intervals (sample_id UUID, mineral, percentage)
- domain_assignments (sample_id UUID, domain_id UUID)
- geological_domains (id UUID, name text, domain_type text)
```

**Sample Count:** ~1,200 samples across 4 drillholes

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

```
api/
  main.py                 # FastAPI application (9 endpoints)
  requirements.txt        # Python dependencies
  .python-version         # Python 3.11.9 (Render compatibility)

web/
  index.html             # React entry HTML
  package.json           # Node dependencies (React, Vite, Shadcn/ui)
  tsconfig.json          # TypeScript config
  tailwind.config.js     # Tailwind CSS theming
  vite.config.ts         # Vite build config
  src/
    ├── components/      # React components (UI, Map, Cards)
    ├── pages/           # Page components
    ├── hooks/           # Custom React hooks
    ├── context/         # Theme context (Dark Mode)
    ├── lib/             # API client, utils
    ├── types/           # TypeScript interfaces
    ├── App.tsx          # Root component
    ├── main.tsx         # React entry point
    └── index.css        # Tailwind + custom styles

database/                # PostgreSQL schema (13 initialization scripts)
  00_Extensions.sql      # PostGIS, UUID generation
  01_Multitenant.sql     # Company/Project structure
  02_core_drillholes.sql # Drillhole, collar, survey tables
  03_sampling.sql        # Sample interval modeling
  04_geochemistry.sql    # Assay results & elements
  05_geology.sql         # Lithology, alteration, mineralization
  06_structural.sql      # Structural measurements
  07_domains.sql         # Geological domain definitions

seeds/                   # Data loading (13 scripts)
  01_reference_data.sql  # Elements catalog
  02_MASTER_CLEAN.sql    # Data cleanup
  03-04_COMPANY_PROJECT & DRILLHOLES.sql
  05-09_SAMPLES through MINERALIZATION GENERATION
  10_AU_CONTROLLED.sql   # Gold grade-control logic
  11_domains.sql         # Domain assignments
  12-13_VALIDATION & VIEWS

queries/                 # Advanced analytics
  14_compositing_engine.sql
  15_intersection_engine.sql
  16_exploration_dashboard.sql
  17_ml_dataset.sql
  18_spatial_drillholes.sql
  19_fix_drillhole_view.sql

docs/
  architecture_evolution.md # Design decisions
  PRODUCTION_ROADMAP.md    # v2.0+ planning
```

## Deployment Architecture

### Production Stack

```
┌─────────────────────────────────────┐
│  Web Browser (map.html)             │
│  Leaflet.js Interactive Map         │
└──────────────┬──────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────┐
│  Render.com (FastAPI Server)        │
│  - 9 REST API Endpoints             │
│  - Connection Pooling (2-10)        │
│  - Logging & Error Handling         │
│  - CORS Enabled                     │
└──────────────┬──────────────────────┘
               │ SSL/TLS
               ▼
┌─────────────────────────────────────┐
│  Supabase (PostgreSQL + PostGIS)    │
│  - 30+ Tables                       │
│  - Real exploration data            │
│  - Automated backups                │
│  - Row-level security ready         │
└─────────────────────────────────────┘
```

### Local Development

1. **Database:** PostgreSQL 15+ with PostGIS 3.4+
2. **Environment:** `.env` with `DATABASE_URL`
3. **Dependencies:** `pip install -r api/requirements.txt`
4. **Run API:** `uvicorn api.main:app --reload --port 8000`
5. **Access Map:** Open `web/map.html` locally (detects localhost API)

### Initial Data Load

1. Run schema initialization scripts (`database/*.sql`)
2. Load reference data (`seeds/01_reference_data.sql`)
3. Load company/project structure (`seeds/02-03_*.sql`)
4. Populate drillholes and samples (`seeds/04-11_*.sql`)
5. Validate with views (`seeds/12-13_*.sql`)

## Analytical Views (13 Views Available)

### Sample-Level

**`v_sample_geology`**
- Integrated geological dataset
- Combines: samples + lithology + alteration + mineralization + domains + assays
- Used by: Frontend drill-down, analytics, ML pipeline

### Drillhole-Level

**`v_drillhole_summary`**
- Drillhole statistics
- Fields: `total_samples`, `average_Au`, `max_Au`, `total_depth`, `hole_id`

**`v_drillhole_locations`** ⭐
- Frontend source for map visualization
- Fields: `drillhole_id`, `hole_id`, `geom` (PostGIS), `max_depth`
- Returns: GeoJSON-serializable coordinates

### Domain-Level

**`v_domain_statistics`**
- Domain-based grade statistics
- Fields: `domain_name`, `mean_Au`, `median_Cu`, `sample_count`

### Composititing & ML

**`v_downhole_composites`**
- 5-meter weighted composites from samples
- View: `v_downhole_composites`

**`v_high_grade_intersections`**
- Au ≥ 1 g/t && Thickness ≥ 2 m
- Used for exploration targeting

**`v_ml_dataset`** 🤖
- Features: `mid_depth`, `lithology`, `alteration`, `mineralization`, `domain`, `au_grade`
- Designed for: Python + GeoPandas + scikit-learn

## Spatial Data & Coordinates

- **Reference System:** EPSG:4326 (WGS84)
- **Storage:** PostGIS geometry in `collars.geom` column
- **API Format:** GeoJSON with [longitude, latitude] ordering
- **Map Rendering:** Leaflet.js L.geoJSON() with automatic feature styling

## Current Dataset

- **4 Drillholes:** DH-1, DH-2, DH-3, DH-4
- **~1,200 Samples:** 2m intervals across 4 drillholes
- **682+ Assay Results:** Au, Cu with real geochemical patterns
- **Lithology:** Synthetic Andean mineralogy (granodiorite, porphyry, epithermal)
- **Alteration:** Phyllic, propylitic, advanced argillic zonation
- **Mineralization:** Au and Cu intervals with grade relationships
- **Domains:** Epithermal (Au-Ag), Phyllic, Porphyry (Cu-Au) interpreted

## Known Limitations

- Synthetic data for development/demo purposes
- Single project context (extensible to multi-project)
- No user authentication layer (JWT ready architecture)
- CORS permissive (needs domain restriction for production)
- Map tile requests via OpenStreetMap (requires internet access)

## Production Roadmap (v2.1+)

- [ ] JWT authentication & role-based access
- [ ] Rate limiting on API endpoints
- [ ] Domain-specific color-coded map visualization
- [ ] 3D view integration (Three.js)
- [ ] Cross-section generator (N-S, E-W views)
- [ ] Lithology/alteration drill-down UI
- [ ] Real-time data sync via WebSockets
- [ ] Mobile-optimized interface
- [ ] Admin dashboard for system management

## Industry Comparisons

This architecture follows workflows similar to industry-standard platforms:

| Platform | Key Feature | Equivalent in GeoPlatform |
|----------|-------------|---------------------------|
| **Leapfrog Geo** | 3D geological modeling | v_sample_geology + domains |
| **Micromine** | Block model generation | Compositing engine |
| **Datamine** | Grade estimation | v_ml_dataset |
| **Seequent Central** | Cloud-based collaboration | Supabase + Render |

## Contributing

The project is structured for rapid feature addition:

1. **Add API Endpoint:** Edit `api/main.py`, add route + SQL query
2. **Create Query:** Add `.sql` file to `queries/`, reference in views
3. **Frontend Integration:** Update `web/map.html` Leaflet event handlers
4. **Deploy:** `git push origin main` → Render auto-builds

## License & Attribution

Synthetic exploration database built for educational and demonstration purposes.

---

**Last Updated:** March 2026 | **Backend:** ✅ Live on Render | **Frontend:** ✅ Live on Vercel | **Version:** 3.0
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