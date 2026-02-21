# PLAN: Múltiplos Destinos e Estadias
**Slug:** `trip-stays`

## Overview
Implementar o conceito de "Bases" (Stays) em uma viagem, permitindo que os usuários agrupem trechos de sua viagem principal sob cidades/abrigos específicos.

## Project Type
**WEB + BACKEND**

## Success Criteria
- O banco de dados armazena as Estadias atreladas à viagem.
- O Frontend permite criar/editar/excluir Estadias.
- O Roteiro se transforma em uma visualização agrupada, dividindo os dias entre Estadias correspondentes.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Fastify + Prisma + Zod

## File Structure
- `backend/prisma/schema.prisma` -> Add `Stay` model
- `backend/src/routes/stays.routes.ts` -> Stays endpoints
- `src/types.ts` -> Add `Stay` interface
- `pages/TripDetails.tsx` -> Update UI to render Stays
- `components/...` -> Add modals

## Task Breakdown
1. **Backend Schema Update**
   - Agent: `backend-specialist` + `prisma-expert`
   - Input: Schema mod
   - Output: `Stay` model / DB pushed
   - Verify: `npx prisma validate` passes
2. **Backend Routes Implementation**
   - Agent: `backend-specialist`
   - Input: Controller logic for CRUD
   - Output: `stays.routes.ts` and registered router
   - Verify: Server boots
3. **Frontend API & Types**
   - Agent: `frontend-specialist`
   - Input: Fetch types
   - Output: Types inside `types.ts`, API fetches
   - Verify: TypeScript builds with `tsc --noEmit`
4. **Frontend UI Integration**
   - Agent: `frontend-specialist` + `frontend-design`
   - Input: Add Modals and update Day Itinerary logic
   - Output: Modals, Grouped Days
   - Verify: Manual test for creation and rendering

## Phase X: Verification
- [ ] Segurança: `security_scan.py`
- [ ] TS Check: `tsc` and backend build
- [ ] Frontend Lint
- [ ] Fluxo Teste Manual no Browser
