# GeoPlatform Explorer v3.0

Modern React + Vite frontend for GEO-PLATFORM mineral exploration database.

**Live:** https://geo-platform-axhipqo2p-juanmanueltorres-creators-projects.vercel.app

## 🚀 Features

- ⚛️ **React 18** with TypeScript
- ⚡ **Vite** for ultra-fast builds
- 🎨 **Shadcn/ui** for professional components
- 🌙 **Dark Mode** built-in
- 🗺️ **React-Leaflet** for interactive maps
- 📊 **Recharts** ready for analytics
- 🎯 **Type-safe** API integration
- 📱 **Responsive design**

## 📋 Prerequisites

- Node.js 18+
- npm or yarn

## 🛠️ Setup

```bash
cd web
npm install
```

## 🔧 Configuration

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` if using local API:

```env
VITE_API_URL=http://localhost:8000
```

## 🎯 Development

```bash
npm run dev
```

Opens at `http://localhost:3000` with hot reload.

## 📦 Build

```bash
npm run build
```

Outputs to `dist/` folder.

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Shadcn/ui components (Button, Card, etc)
│   ├── ThemeToggle.tsx # Dark/Light switcher
│   ├── MapView.tsx     # Leaflet map
│   └── DrillholeSummaryCard.tsx  # AU statistics
├── pages/
│   └── Explorer.tsx    # Main page
├── hooks/              # Custom React hooks
├── context/
│   └── ThemeContext.tsx # Dark mode state
├── lib/
│   ├── api.ts          # API client
│   └── utils.ts        # Utilities
├── types/
│   └── index.ts        # TypeScript types
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── index.css           # Tailwind + custom styles
```

## 🎨 Styling

- **Tailwind CSS** for utilities
- **Shadcn/ui** for components
- **Dark mode** via class on `<html>`
- Custom colors in `tailwind.config.js`

## 📡 API Integration

All API calls via `/src/lib/api.ts` (Type-safe with TypeScript):

```typescript
import { api } from '@/lib/api'

// Get all drillhole locations
const locations = await api.getDrillholeLocations()

// Get summary stats (NEW ENDPOINT - `/drillholes/{id}/summary`)
const summary = await api.getDrillholeSummary(drillholeId)
// Returns: { drillhole_id, total_samples, avg_au, max_au }

// Get assays with filtering
const assays = await api.getAssays(drillholeId, 'Au')

// Get lithology
const lithology = await api.getLithology(drillholeId)
```

**Backend:** https://geo-plataform.onrender.com

## 🌙 Dark Mode

Automatic based on system preference. Toggle via button in header.

Preference saved to localStorage.

## 🚀 Deployment

Build and serve the `dist/` folder:

```bash
npm run build
# Upload dist/ to web server or Render
```

## 📝 License

Part of GeoPlatform project.

---

**Last Updated:** March 2026 | **Version:** 3.0.0
