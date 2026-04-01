# Geo Platform

![CI](https://github.com/juanmanueltorres-creator/Geo_Platform/actions/workflows/ci.yml/badge.svg)

Full-stack geospatial platform for mineral exploration workflows.

This project transforms geological and drilling data into interactive tools for visualization, analysis, and decision-making.

---

## 🚀 Overview

Geo Platform simulates real-world mineral exploration systems by integrating:

- Drillhole datasets
- Geospatial queries (PostGIS)
- API-driven backend
- Interactive mapping frontend

The goal is to build a production-ready geospatial platform aligned with real exploration workflows.

---

## 🧱 Tech Stack

**Backend**
- FastAPI (Python)
- PostgreSQL + PostGIS (Supabase)
- psycopg2 connection pooling

**Frontend**
- React + TypeScript
- Vite
- Leaflet

**DevOps**
- GitHub Actions (CI)
- Render (backend)
- Vercel (frontend)

---

## 🏗️ Architecture

Frontend (React + Leaflet)
        ↓
FastAPI API
        ↓
PostgreSQL + PostGIS (Supabase)

- Backend exposes REST endpoints
- Frontend consumes spatial data via API
- Database handles geospatial queries and domain logic

---

## ⚙️ Quickstart

### Backend

python -m venv .venv
.\.venv\Scripts\activate

pip install -r api/requirements.txt

uvicorn api.main:app --reload

---

### Frontend

cd web
npm install
npm run dev

---

## 🧪 Testing

python -m pytest -v

Includes:

- API smoke tests
- Admin route protection tests
- Database failure behavior tests

---

## 🔐 Security & Reliability

- Admin endpoints protected with `ADMIN_TOKEN`
- Constant-time token validation
- Resilient DB connection handling (retry + lazy reconnect)
- `/health` → app status
- `/ready` → database readiness

---

## ⚙️ CI Pipeline

GitHub Actions runs:

- Backend tests (pytest)
- Frontend build validation

Ensures changes do not break the system.

---

## 📍 Roadmap

- [ ] Stable Supabase connection handling (production-ready)
- [ ] Drillhole dataset ingestion
- [ ] Advanced PostGIS queries
- [ ] Frontend data layers & filtering
- [ ] Authentication & roles
- [ ] Deployment hardening

---

## 📚 Documentation

Detailed technical design and database modeling available in:

- docs/
- database/
- queries/

---

## 📌 Status

Active development.

This project focuses on building a real-world geospatial system with production-grade practices:
testing, CI, security, and incremental improvements.
