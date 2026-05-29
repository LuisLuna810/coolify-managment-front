# Fijar/desfijar proyectos (pin) en las cards

Fecha: 2026-05-29
Frontend. Pedido por un dev: con muchos proyectos asignados, poder fijar algunos
para que aparezcan siempre arriba.

## Decisiones
- **Persistencia:** `localStorage`, por usuario (sin backend).
- **Alcance:** dashboard del dev **y** vista admin (ambos usan `ProjectsGrid`).
- **Affordance:** botón-icono `Pin` (lucide) en el header de cada card. Siempre
  visible: atenuado cuando no está fijado, destacado/relleno cuando sí.

## Diseño

### Persistencia — `hooks/use-pinned-projects.ts` (nuevo)
- Toma el usuario actual de `useAuthStore().user?.id`.
- Key namespaceada: `pinned-projects:${userId}` (admin y dev no se pisan).
- Guarda un array JSON de `projectId`. Hidrata en `useEffect` (estado inicial
  `Set` vacío en server y primer render cliente → sin hydration mismatch; tras
  montar reordena).
- Expone `{ pinnedIds: Set<string>, togglePin(id) }`.

### Orden — `components/projects-grid.tsx`
- Usa el hook (saca el userId del store; sin props nuevas).
- `ProjectsGrid` ya renderiza TODAS las cards y oculta las que no matchean con
  `hidden={!matches(project)}` (no filtra el array). Por eso solo hay que
  **reordenar** el array: sort estable, fijados primero, resto en su orden.
- El `key={project.id}` se mantiene → las cards no se remontan (conservan su
  fetch de status). El pin afecta orden, **no** filtrado/búsqueda.
- Pasa `isPinned` + `onTogglePin` a cada `ProjectCard`.

### UI — `components/pin-button.tsx` (nuevo) + ambas cards
- `PinButton` compartido: `onClick` con `stopPropagation`, `aria-pressed`,
  relleno (`fill-current text-primary`) cuando fijado, atenuado cuando no.
- Se ubica como primer item del cluster de acciones del header en:
  - `project-card.tsx` (Coolify) — cluster en el header derecho.
  - `argo-project-card.tsx` (Argo) — cluster equivalente.
- `ProjectCard` recibe `isPinned`/`onTogglePin` y los **forwardea** a
  `ArgoProjectCard` en su return temprano para proyectos Argo.

## Fuera de alcance
- Backend: sin cambios (API/DB/cache intactos). Los pins son por navegador.
- Pins huérfanos (proyecto desasignado) quedan en localStorage sin matchear
  ninguna card; inofensivo. Prune opcional, no en este v1.

## Verificación (manual, UI)
- Fijar sube la card arriba al instante; persiste al recargar.
- Admin y dev tienen pins independientes (keys distintas).
- Convive con búsqueda/filtros sin romperlos.
- Funciona en cards Coolify y Argo.
