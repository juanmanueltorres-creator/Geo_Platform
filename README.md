@"
# Geo Platform

![CI](https://github.com/juanmanueltorres-creator/Geo_Platform/actions/workflows/ci.yml/badge.svg)

Full-stack geospatial platform for mineral exploration workflows.

This project transforms geological and drilling data into interactive tools for visualization, analysis, and decision-making.

---

## 🚀 Overview

Geo Platform is designed to simulate real-world exploration workflows:

- Drillhole data visualization
- Spatial analysis with PostGIS
- API-driven architecture for scalability
- Interactive frontend for geoscientists

---

## 🧱 Tech Stack

**Backend**
- FastAPI
- PostgreSQL / PostGIS (Supabase)
- Python

**Frontend**
- React
- Vite
- Leaflet

**DevOps**
- GitHub Actions (CI)
- Render (backend deployment)
- Vercel (frontend deployment)

---

## 🏗️ Architecture

Frontend (React + Leaflet)
        ↓
FastAPI Backend
        ↓
PostgreSQL + PostGIS (Supabase)

- Backend exposes REST endpoints
- Frontend consumes API and renders spatial data
- Database handles geospatial queries

---

## ⚙️ Quickstart

### 1. Clone repo

git clone https://github.com/juanmanueltorres-creator/Geo_Platform.git
cd Geo_Platform

---

### 2. Backend setup

python -m venv .venv
.\.venv\Scripts\activate

pip install -r api/requirements.txt

Run server:

uvicorn api.main:app --reload

---

### 3. Frontend setup

cd web
npm install
npm run dev

---

## 🧪 Running tests

python -m pytest -v

Includes smoke tests for:

- /health
- /
- /debug-db (protected endpoint)

---

## 🔐 Security

- /debug-db is protected with ADMIN_TOKEN
- Token validation uses constant-time comparison
- No sensitive configuration is exposed in responses

---

## ⚙️ CI Pipeline

GitHub Actions workflow:

- Backend: installs dependencies and runs pytest
- Frontend: installs dependencies and builds project

Ensures changes do not break the system.

---

## 📍 Roadmap

- [ ] Stable database connection handling (Supabase)
- [ ] Drillhole dataset ingestion
- [ ] Advanced geospatial queries (PostGIS)
- [ ] Frontend data layers and filtering
- [ ] Authentication & roles
- [ ] Deployment hardening

---

## 📌 Status

Active development. Focused on building a production-ready geospatial system aligned with real exploration workflows.
"@ | Set-Content -Encoding UTF8 README.md

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