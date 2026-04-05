
# 🚀 Quick Start Guide – GeoPlatform

> Guía rápida para levantar el sistema en modo desarrollo y producción.

---

## Propósito

Este archivo resume los pasos esenciales para instalar, correr y construir GeoPlatform, tanto backend como frontend. Para detalles completos, ver [README.md](README.md).

---

## 1. Backend API

- **API de producción:** `https://geo-plataform.onrender.com`
- FastAPI + PostgreSQL (Supabase)
- Endpoints REST principales documentados en `/docs`

### Pasos para desarrollo local

1. Crear entorno virtual:
   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate
   ```
2. Instalar dependencias:
   ```bash
   pip install -r api/requirements.txt
   ```
3. Iniciar el backend:
   ```bash
   uvicorn api.main:app --reload
   ```

---

## 2. Frontend (React)

### Pasos para desarrollo

1. Instalar dependencias:
   ```bash
   cd web
   npm install
   ```
2. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abre en: [http://localhost:3000](http://localhost:3000)

### Build para producción

```bash
npm run build
# Output en: web/dist/
```

---

## 3. Features principales

- React 18 + TypeScript
- Componentes Shadcn/ui (Card, Button, etc)
- React-Leaflet + OpenStreetMap
- Dark Mode
- Estadísticas vía endpoint `/summary`
- API type-safe con Axios
- Responsive/mobile

---

## 4. Estructura del proyecto

```
geo_platform/
├── api/                # FastAPI backend
│   └── main.py         # Python API server
├── web/                # React frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page layouts
│   │   ├── context/    # Estado global
│   │   ├── lib/        # API client
│   │   └── types/      # Tipos TypeScript
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
```

---

## 5. Más información

- [README.md](README.md) – visión general y arquitectura
- [docs/](docs/) – documentación técnica y roadmap
├── database/          # PostgreSQL schema
└── seeds/             # Data loading scripts
```

## 🌙 Dark Mode

- Automatic system preference detection
- Toggle button in header
- Preference saved to localStorage
- Tailwind CSS dark mode support

## 📊 Summary Card

The new `DrillholeSummaryCard` component shows:

- **Total Samples:** Count of all samples in drillhole
- **Avg Au:** Average gold value (ppm/ppb)
- **Max Au:** Maximum gold value observed

Data from new endpoint: `/drillholes/{id}/summary`

## 🔧 Configuration

Edit `web/.env`:

```env
# Production (default)
VITE_API_URL=https://geo-plataform.onrender.com

# Local development
VITE_API_URL=http://localhost:8000
```

## 📡 API Integration

Type-safe API calls via `src/lib/api.ts`:

```typescript
import { api } from '@/lib/api'

// Fetch drillhole locations
const data = await api.getDrillholeLocations()

// Get summary stats
const summary = await api.getDrillholeSummary(drillholeId)

// Get assays
const assays = await api.getAssays(drillholeId, 'Au')
```

## 🎯 Next Steps

1. **Deploy Frontend:**
   ```bash
   npm run build
   # Upload dist/ to Vercel, Netlify, or Render
   ```

2. **Add Analytics:**
   - Recharts is ready to use
   - Create depth profile charts
   - Element distribution graphs

3. **Enhance Features:**
   - 3D drillhole viewer (Three.js)
   - Cross-section generator
   - Lithology/alteration drill-down
   - Export to PDF

## 🚀 Deployment Options

### Vercel (Recommended)
```bash
npm run build
# Push to GitHub, connect to Vercel
```

### Netlify
```bash
npm run build
# Drag & drop dist/ folder
```

### Self-hosted
```bash
npm run build
# Serve dist/ with nginx/Apache
```

---

**Status:** ✅ Ready for Production

**Last Updated:** March 2026 | **Version:** 3.0.0
