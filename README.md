pip install -r api/requirements.txt
testing, CI, security, and incremental improvements.

# GeoPlatform – Geospatial Exploration Platform

![CI](https://github.com/juanmanueltorres-creator/Geo_Platform/actions/workflows/ci.yml/badge.svg)

---

## 🧭 Overview

GeoPlatform es una plataforma full-stack para la gestión, visualización y análisis de datos de exploración minera, integrando información de perforaciones, muestreo, geología y estructuras en un entorno interactivo y escalable.

---

## ❓ Problem

En exploración minera, se generan grandes volúmenes de datos espaciales y de intervalos (profundidad, litología, ensayos, estructuras). Herramientas tradicionales como planillas no permiten consultas espaciales, visualización ni gestión eficiente de estos datos.

---

## 💡 Motivation

El proyecto surge de la brecha entre la formación académica en geociencias y los flujos de trabajo reales de datos en la industria. Busca acercar prácticas de software profesional al manejo de datos geológicos.

---

## 🛠️ Solution

- Modelado relacional y espacial de datos de perforación y muestreo
- Uso de PostGIS para consultas geoespaciales
- Visualización interactiva en mapa (React + Leaflet)
- Arquitectura multi-tenant (compañías → proyectos)
- Lógica extensible para ranking y priorización de proyectos (en desarrollo)

---

## 🚩 Features

- Visualización interactiva de proyectos y sondajes
- Consultas espaciales y de intervalos
- Gestión multi-proyecto y multi-compañía
- Paneles explicativos y ranking de proyectos (próximamente)
- Seguridad y endpoints protegidos
- CI/CD y testing automatizado

---

## 🧱 Tech Stack

**Frontend:** React + TypeScript, Vite, Leaflet
**Backend:** FastAPI (Python), PostgreSQL + PostGIS (Supabase), psycopg2
**DevOps:** GitHub Actions (CI), Render (backend), Vercel (frontend)

---

## 🏗️ Architecture

```
Frontend (React + Leaflet)
        ↓
FastAPI API
        ↓
PostgreSQL + PostGIS (Supabase)
```
- Backend expone endpoints REST
- Frontend consume datos espaciales y de negocio
- Base de datos maneja lógica geoespacial y de dominio

---

## 🔐 Security & Reliability

- Endpoints admin protegidos con `ADMIN_TOKEN`
- Validación de token en tiempo constante
- Manejo resiliente de conexiones a DB (retry + lazy reconnect)
- Endpoints `/health` y `/ready` para monitoreo

---

## ⚙️ CI Pipeline

GitHub Actions ejecuta:
- Tests backend (pytest)
- Validación de build frontend

Asegura que los cambios no rompan el sistema.

---

## 🚀 Quickstart

### Backend

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r api/requirements.txt
uvicorn api.main:app --reload
```

### Frontend

```bash
cd web
npm install
npm run dev
```

---

## 🧪 Testing

```bash
python -m pytest -v
```
Incluye:
- API smoke tests
- Protección de rutas admin
- Tests de fallos de base de datos

---

## 🗺️ Database Design (Resumen)

- PostGIS para datos espaciales (collares, estructuras, dominios)
- NUMRANGE para intervalos (muestras, geología)
- Índices GiST para performance
- Integridad relacional y diseño multi-tenant

---

## ⚡ Trade-offs

- Se priorizó claridad y performance de queries sobre máxima complejidad geológica
- Relaciones geológicas simplificadas para mantener el modelo entendible
- Foco en workflows de exploración, no en producción minera

---

## 🚧 Limitations

- Dataset sintético y simplificado
- No cubre toda la complejidad geológica real
- No es un sistema productivo final

---

## 📈 Future Improvements & Scalability

- Priorización y ranking multi-proyecto (en desarrollo)
- Visualización regional y paneles explicativos
- Capas avanzadas: clima, fallas, pendiente, IA para scoring
- Visualización 3D y análisis avanzado
- Seguridad, autenticación y roles

---

## 📚 Documentation

Documentación técnica y modelado en:
- docs/
- database/
- queries/

---

## 📌 Status

Desarrollo activo. El foco está en prácticas productivas: testing, CI, seguridad y mejoras incrementales.
