# StudioFlow

StudioFlow es una plataforma para administrar estudios boutique de movimiento y fitness (pole, yoga, pilates, danza, aéreo y disciplinas similares).

Este repositorio corresponde al desarrollo nuevo del MVP, iniciado desde cero.

## Principios técnicos

- Next.js + TypeScript en modo estricto
- App Router
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Storage, RLS)
- Vercel
- Arquitectura modular monolítica
- Acciones de dominio compartidas entre Admin, Alumna, Coach y futuras integraciones
- Auditoría y ledger append-only para operaciones sensibles
- Aislamiento estricto por studio/tenant

## Estado

Sprint 0 — Foundation

## Regla de proyecto

No reutilizar código, migraciones, base de datos ni configuración del desarrollo anterior de StudioFlow. El trabajo previo sirve únicamente como referencia de producto/UX cuando corresponda.
