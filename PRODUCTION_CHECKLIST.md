
# ✅ Production Readiness Checklist – GeoPlatform API v2.0

> Checklist de validación para despliegue productivo. Para resultados de test y reporte de go-live, ver [DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md).

---

## Propósito

Este archivo lista los requisitos y validaciones que debe cumplir la API antes de ser considerada lista para producción. Es un snapshot de readiness.

---

## Checklist de readiness

| Ítem                        | Estado | Detalles                                    |
|-----------------------------|--------|---------------------------------------------|
| Python Syntax Validation    | PASS   | Sin errores de sintaxis en main.py           |
| Module Import               | PASS   | Todos los módulos requeridos importados      |
| Function Definitions        | PASS   | 13 funciones críticas accesibles             |
| Endpoint Registration       | PASS   | 13 endpoints (7 API + 4 auto docs)           |
| HTTP Responses              | PASS   | Todos los endpoints devuelven 200            |
| JSON Structure              | PASS   | Estructuras de respuesta válidas             |
| Error Handling              | PASS   | Respuestas de error correctas                |
| Swagger Docs                | PASS   | Documentación auto-generada accesible        |
| Connection Pooling          | PASS   | psycopg2.pool (2-10 conexiones)              |
| Logging                     | PASS   | Requests logueados con timestamp             |
| Pagination                  | PASS   | LIMIT/OFFSET en drillholes                   |
| Filtering                   | PASS   | Parámetros: project_id, element, domain, etc.|
| CORS                        | PASS   | Habilitado para todos los orígenes           |
| Graceful Shutdown           | PASS   | Limpieza de pool al cerrar app               |
| Startup Validation          | PASS   | Pool inicializado al arrancar                |

---

## Nota

Este checklist es un snapshot. Para reporte de resultados y contexto, ver [DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md).

---

## Pre-Production Deployment Checklist

### Environment Configuration

**Local Testing:**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/geoplatform
```

**Production (Render + Supabase):**
```bash
DATABASE_URL=postgresql://user:pass@geo-platform-db.supabase.co:5432/postgres
```

### Deployment Steps

#### 1. Environment Setup

- [ ] Install Python 3.10+ (target: 3.11+)
- [ ] Create virtual environment: `python -m venv .venv`
- [ ] Activate venv: `.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (Linux)
- [ ] Install dependencies: `pip install -r api/requirements.txt`

#### 2. Database Validation

```bash
# Test connection
psql -U postgres -h localhost -d geoplatform -c "SELECT version();"

# Or test with Python:
python -c "import psycopg2; conn = psycopg2.connect('postgresql://...'); print('OK')"
```

- [ ] PostgreSQL 15+ running
- [ ] PostGIS 3.4+ installed
- [ ] Database schema loaded (database/load_database_fixed.sql)
- [ ] Seed data populated
- [ ] v_drillhole_locations view exists

#### 3. API Testing (Local)

```bash
# Terminal 1: Start API
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/
curl http://localhost:8000/drillholes?limit=10
curl http://localhost:8000/drillholes/1/assays?element=Au
```

- [ ] API starts without errors
- [ ] All endpoints respond with 200 status
- [ ] Logging appears in console
- [ ] Swagger docs accessible at /docs

#### 4. Production Deployment (Render)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "API v2.0: Connection pooling + new endpoints"
   git push origin main
   ```

2. **Configure Render Service**
   - [ ] New Web Service from GitHub repo
   - [ ] Build command: `pip install -r api/requirements.txt`
   - [ ] Start command: `cd api && uvicorn main:app --host 0.0.0.0 --port 8000`
   - [ ] Set environment variable: `DATABASE_URL` (from Supabase)
   - [ ] Enable automatic deploys

3. **Post-Deployment Validation**
   ```bash
   # Replace with your Render URL
   curl https://geo-plataform.onrender.com/health
   curl https://geo-plataform.onrender.com/drillholes?limit=5
   ```
   - [ ] Health endpoint responds
   - [ ] Drillholes endpoint returns data
   - [ ] No database connection errors

#### 5. Frontend Integration

Update `web/map.html` to use new endpoints:

```javascript
// Example: Fetch with pagination
fetch("https://geo-plataform.onrender.com/drillholes?limit=50&offset=0")
  .then(r => r.json())
  .then(data => console.log(data.data))

// Example: Fetch assays
fetch("https://geo-plataform.onrender.com/drillholes/DHO001/assays?element=Au")
  .then(r => r.json())
  .then(data => console.log(data.data))
```

- [ ] Frontend updated with new endpoint URLs
- [ ] Leaflet map refreshes correctly
- [ ] Drill-down assay functionality tested

---

## Security Checklist (Before Production)

| Item | Status | Action |
|------|--------|--------|
| **CORS Restriction** | PENDING | Restrict to frontend domain only: `allow_origins=["https://your-domain.com"]` |
| **SQL Injection** | PASS | Using parameterized queries (psycopg2 %s) |
| **Error Messages** | PASS | Hiding database details in API responses |
| **HTTPS** | PASS | Render provides SSL/TLS by default |
| **Authentication** | PENDING | Add JWT tokens for data access control |
| **Rate Limiting** | PENDING | Implement with slowapi or similar |
| **Input Validation** | PASS | FastAPI Query parameters validated |
| **Database URL** | PASS | Using environment variable (not hardcoded) |

**Critical Before Production:**
- [ ] Change `allow_origins` from `["*"]` to specific domain
- [ ] Add authentication layer (phase 2)
- [ ] Implement rate limiting (phase 2)
- [ ] Set up monitoring/alerting (phase 2)

---

## Performance Expectations

### Database Queries

| Query | Latency (Est.) | Scaling |
|-------|----------------|---------|
| GET /health | < 5ms | O(1) |
| GET /drillholes?limit=50 | 50-100ms | O(n) with pagination |
| GET /drillholes/{id}/assays | 100-200ms | O(n) with joins |
| GET /geospatial/domains | 150-300ms | O(n) with geometry |

### Connection Pool Behavior

- **Min connections:** 2 (always active)
- **Max connections:** 10 (scales with requests)
- **Timeout:** 5 seconds per connection attempt
- **Optimal for:** 50-100 concurrent users

### Recommended Load Testing

```bash
# Using Apache Bench (ab)
ab -n 1000 -c 10 http://localhost:8000/health

# Expected: ~95% success rate with connection pool
# Without pool: connection failures after 20-30 requests
```

---

## Monitoring & Logging

### Log Levels (Production)

Application logs to console with format:
```
TIMESTAMP - geoplataform - LEVEL - MESSAGE
2026-03-20 17:12:52,647 - geoplataform - INFO - Connection pool initialized successfully
```

### Key Log Events to Monitor

```python
logger.info("Connection pool initialized successfully")  # Startup
logger.error("Failed to initialize connection pool: ...")  # Critical
logger.info(f"Fetched {len(rows)} drillholes ...")  # Query success
logger.error(f"Error fetching drillholes: ...")  # Query failure
```

### Production Monitoring Setup

- [ ] Configure Render logs dashboard
- [ ] Set up error alerts (email/Slack)
- [ ] Monitor database connection pool health
- [ ] Track API response times

---

## Rollback Plan

If issues occur in production:

1. **Quick Rollback (Git)**
   ```bash
   git revert <last-good-commit-hash>
   git push origin main
   # Render redeploys automatically
   ```

2. **Database Backup**
   - Supabase automatically backs up daily
   - Manual backup: `pg_dump` before major changes

3. **Monitoring Post-Rollback**
   - [ ] Check /health endpoint
   - [ ] Verify API response times
   - [ ] Review error logs for issues

---

## Success Criteria for Production

- [x] All endpoints respond with correct HTTP status codes
- [x] Connection pooling reduces per-request latency
- [x] Logging captures all operations and errors
- [x] Error handling is graceful and non-blocking
- [x] Database queries use parameterized SQL (injection-safe)
- [x] API documentation auto-generated and accessible
- [x] Code syntax validated with no errors
- [ ] CORS restrictions applied to production domain
- [ ] Alert monitoring configured
- [ ] Load testing passed (1000+ requests)

---

## Next Steps After Deployment

### Phase 2 (Week 3-4): Security & Authentication

- [ ] Implement JWT authentication
- [ ] Add API key management
- [ ] Restrict CORS to production domain
- [ ] Set up rate limiting
- [ ] Add request logging to database

### Phase 3 (Week 5-6): Frontend Enhancements

- [ ] Domain layer visualization (Leaflet)
- [ ] Drill-down assay UI
- [ ] Lithology depth profiles
- [ ] Cross-section views
- [ ] Mobile responsiveness

### Phase 4 (Week 7-8): Intelligence Layer

- [ ] Grade estimation endpoints
- [ ] Anomaly detection API
- [ ] Machine learning model integration
- [ ] 3D visualization backend

---

## Contact & Support

- **API Base URL:** https://geo-plataform.onrender.com
- **API Docs:** /docs (Swagger UI)
- **ReDoc:** /redoc
- **GitHub:** [Your repo URL]
- **Database:** Supabase PostgreSQL

---

**Last Updated:** March 20, 2026  
**Next Review:** After first production week  
**Prepared by:** GeoPlatform Development Team
