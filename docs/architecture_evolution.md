
# 🏗️ Architecture Evolution – GeoPlatform

> Historia y justificación de la evolución arquitectónica del sistema. Para visión general, ver [README.md](../README.md).

---

## Propósito

Este documento resume las fases clave de evolución arquitectónica, motivaciones y decisiones técnicas que llevaron a la estructura actual de GeoPlatform.

---

## Índice

1. Fase 1 – Modelo relacional inicial
2. Fase 2 – Modelo espacial
3. Fase 3 – Plataforma multi-tenant (actual)

---

## 1. Fase 1 – Modelo Relacional de Exploración

**Enfoque:** Esquema normalizado para exploración aurífera inicial.

**Estructura:**
```
Project
└── Drillhole
    └── Assay (intervalo + elemento + valor)
```
**Características:**
- SERIAL primary keys
- Ensayos por intervalo
- CHECK constraints para validación de profundidad
- Supone una sola organización

**Objetivo:** Validar integridad relacional y queries analíticas.

**Limitación:** No separa muestras físicas de resultados analíticos. No es multi-tenant.

---

## 2. Fase 2 – Modelo Espacial de Sondajes

**Enfoque:** Incorporación de capacidades geoespaciales.

**Mejoras:**
- Integración PostGIS
- Collar de sondaje como POINT (EPSG:4326)
- Índices GiST espaciales
- Transformación CRS para cálculos métricos

**Concepto clave:** Se agrega conciencia espacial, pero la geometría sigue acoplada a la identidad del sondaje.

**Limitación:** Sin separación muestra/ensayo. Sin arquitectura enterprise.

---

## 3. Fase 3 – Plataforma Geológica Multi-Tenant (Actual)

**Rediseño total antes de datos productivos.**

**Cambios principales:**
- UUID primary keys (distribución segura)
- Estructura multi-tenant (compañías)
- Separación entre:
  - Identidad de sondaje
  - Geometría de collar
  - Trayectoria de survey

---

## Referencias

- [README.md](../README.md)
- [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md)
  - Physical Samples (interval material)
  - Assay Results (laboratory analysis)
- QA/QC-ready design
- EXCLUDE constraints for interval overlap prevention
- Enterprise audit compatibility

Architectural Principle:
Build the backbone correctly before loading real data.

This phase transforms the project from a database exercise into a scalable geological data platform suitable for SaaS environments and professional reporting standards.

## 🧭 Why This Architecture Matters

Geological data systems are often built incrementally, leading to structural limitations when scaling to enterprise or audit environments.

This project intentionally avoids that path.

By redesigning the schema before production data ingestion, the platform ensures:

- Structural separation between physical material and analytical results  
- Audit-ready data lineage  
- Multi-tenant scalability  
- Compatibility with industry reporting standards  
- Reduced technical debt over time  

The evolution from a simple relational model to an enterprise-ready geological data platform reflects a deliberate architectural mindset:

Design the backbone correctly before building analytical or visualization layers on top of it.

This approach enables seamless integration with:

- API layers (FastAPI)
- Geospatial analysis tools (GeoPandas)
- 3D reconstruction workflows
- Resource estimation pipelines
- Machine learning applications

The result is not just a database — but a scalable geological data foundation.