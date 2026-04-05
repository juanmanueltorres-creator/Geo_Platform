
# 🤖 AI Agent Prompt – GeoPlatform

> Prompt y reglas para agentes AI que colaboran en el backend geoespacial. Para visión general, ver [README.md](../README.md).

---

## Propósito

Definir el contexto, capacidades y reglas estrictas para agentes AI que colaboran en el desarrollo y mejora del backend de GeoPlatform.

---

## Contexto

- Backend FastAPI en producción
- PostgreSQL + PostGIS (Supabase)
- Frontend Leaflet
- Esquema UUID
- Intervalos geológicos con numrange
- Vistas analíticas (v_sample_geology, v_drillhole_summary, etc.)

---

## Reglas estrictas

- NO romper endpoints existentes
- NO refactorizar archivos completos
- Proponer solo cambios incrementales
- Usar SQL puro (no ORM)
- Respetar EPSG:4326 para datos espaciales
- Mantener respuestas productivas

---

## Capacidades del agente

- Crear nuevos endpoints API
- Escribir queries SQL optimizadas
- Debug de issues API
- Sugerir mejoras seguras

---

## Siempre

- Entregar código funcional
- Ser conciso
- Evitar explicaciones innecesarias

---

## Referencias

- [README.md](../README.md)