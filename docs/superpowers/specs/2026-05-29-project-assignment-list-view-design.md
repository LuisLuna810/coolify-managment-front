# Vista lista en asignación de proyectos

Fecha: 2026-05-29
Componente: `components/project-assignment.tsx` (frontend, cambio aislado)

## Objetivo

Agregar una vista alternativa tipo **lista** a la asignación de proyectos, además
del grid de cards actual. Aplica a las dos pestañas (Available y Assigned).

## Decisiones

- **Alcance:** ambas pestañas comparten un único toggle.
- **Mecanismo:** toggle grid ↔ lista. Default `grid` (comportamiento actual).
  Se persiste en `localStorage` (key `project-assignment:view`) y se hidrata al montar.
- **Fila de lista:** compacta, con checkboxes de permisos inline.

## Diseño

### Estado
- `viewMode: "grid" | "list"` en `ProjectAssignment`, default `"grid"`.
- Hidratación desde `localStorage` en `useEffect` de montaje; escritura en cada cambio.

### Control
- `ToggleGroup type="single"` (shadcn) con dos `ToggleGroupItem`: iconos
  `LayoutGrid` y `List` (lucide). Guard: ignorar `onValueChange("")` para que
  siempre haya una vista activa.
- Ubicado en el header, al lado de **Refresh** (arriba de los `Tabs`) → controla ambas pestañas.

### Render
- Toda la lógica existente queda intacta: búsqueda, updates optimistas,
  `assignProject` / `unassignProject` / `toggleAssignedPerm` / `togglePendingPerm`,
  y `getPermissionFields(source)` (Coolify vs Argo).
- `viewMode === "grid"` → grid de cards actual, sin cambios.
- `viewMode === "list"` → cada proyecto es una fila:
  - Izquierda: nombre (truncado) + badge `ArgoCD` si `source === "argocd"` + descripción corta.
  - Centro: checkboxes de permisos inline (`getPermissionFields(source)`, mismos handlers).
  - Derecha: botón **Assign** (Available) o **Remove** (Assigned).
- Componente presentacional `ProjectListRow` en el mismo archivo, parametrizado por
  `project`, `perms`, `fields`, `onTogglePerm`, `action` (nodo del botón). Available
  y Assigned lo reusan con sus respectivos handlers/botón.

## Fuera de alcance
- Backend: sin cambios. No toca permisos, endpoints ni la separación Coolify/Argo.
- No se agrega vista de `Table` shadcn (se descartó a favor de filas flex por simplicidad).

## Verificación (manual, UI)
- El toggle alterna grid/lista y la elección persiste tras recargar/reabrir el modal.
- En lista, los checkboxes togglean igual que en grid (optimista + revert en error).
- Assign / Remove funcionan en lista.
- Badge ArgoCD y los campos de permisos por `source` se mantienen correctos.
