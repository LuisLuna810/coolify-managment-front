"use client"

import { useCallback, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProjectCard, type ProjectStatus } from "@/components/project-card"
import { usePinnedProjects } from "@/hooks/use-pinned-projects"
import { Search, X } from "lucide-react"

interface Project {
  id: string
  name: string
  description: string
  status: string
  permissions?: {
    canStart: boolean
    canStop: boolean
    canRestart: boolean
    canAccessEnvs: boolean
    canAccessLogs: boolean
  }
}

interface ProjectsGridProps {
  projects: Project[]
  /** Si true, muestra skeletons de N cards mientras carga la lista de proyectos */
  loading?: boolean
  /** Mensaje a mostrar si projects está vacío (no es por filtro) */
  emptyMessage?: string
}

type RunFilter = "all" | "running" | "stopped" | "other"
type DeployFilter = "all" | "succeeded" | "failed" | "in_progress" | "none"

const RUN_OPTIONS: { value: RunFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "stopped", label: "Stopped" },
  { value: "other", label: "Other" },
]

const DEPLOY_OPTIONS: { value: DeployFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "in_progress", label: "In progress" },
  { value: "none", label: "No deploys" },
]

function FilterPills<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  ariaLabel: string
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-0.5" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`px-2.5 py-1 rounded-sm text-xs transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-5 space-y-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        <div className="h-4 w-16 bg-muted rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-muted rounded w-1/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-3/4" />
      </div>
      <div className="space-y-1.5 mt-auto">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
        </div>
        <div className="h-8 bg-muted rounded" />
      </div>
    </div>
  )
}

const getRunBucket = (status?: string): RunFilter => {
  const s = (status || "").toLowerCase()
  if (s.includes("running") || s === "started" || s === "healthy") return "running"
  if (s.includes("exited") || s === "stopped" || s === "dead") return "stopped"
  return "other"
}

const getDeployBucket = (deployStatus?: string | null): DeployFilter => {
  if (!deployStatus) return "none"
  if (deployStatus === "finished") return "succeeded"
  if (deployStatus === "failed") return "failed"
  if (deployStatus === "in_progress" || deployStatus === "queued") return "in_progress"
  return "none"
}

export function ProjectsGrid({ projects, loading, emptyMessage }: ProjectsGridProps) {
  const [query, setQuery] = useState("")
  const [runFilter, setRunFilter] = useState<RunFilter>("all")
  const [deployFilter, setDeployFilter] = useState<DeployFilter>("all")
  const [statusMap, setStatusMap] = useState<Record<string, ProjectStatus | null>>({})
  const { pinnedIds, togglePin } = usePinnedProjects()

  // Reordenar: fijados primero, resto en su orden original. Sort estable
  // (V8) → conserva el orden dentro de cada grupo. No filtra: las cards que
  // no matchean se ocultan vía `hidden`, igual que antes.
  const orderedProjects = useMemo(() => {
    return [...projects].sort(
      (a, b) => Number(pinnedIds.has(b.id)) - Number(pinnedIds.has(a.id)),
    )
  }, [projects, pinnedIds])

  const handleStatusChange = useCallback(
    (projectId: string, status: ProjectStatus | null) => {
      setStatusMap((prev) => ({ ...prev, [projectId]: status }))
    },
    [],
  )

  const matches = useCallback(
    (project: Project) => {
      const status = statusMap[project.id]
      const deploy = status?.lastDeployment

      // Search (name, commit message, sha — full or short)
      const q = query.trim().toLowerCase()
      if (q) {
        const haystack = [
          project.name,
          deploy?.commit || "",
          deploy?.shortCommit || "",
          deploy?.commitMessage || "",
          status?.git_repository || "",
          status?.git_branch || "",
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      // Si el status aún no llegó del back, no aplicamos filtros de status
      // (sino los cards quedarían ocultos hasta que se complete el fetch).
      if (runFilter !== "all" && status?.status) {
        if (getRunBucket(status.status) !== runFilter) return false
      }
      if (deployFilter !== "all" && status) {
        if (getDeployBucket(deploy?.status) !== deployFilter) return false
      }

      return true
    },
    [query, runFilter, deployFilter, statusMap],
  )

  const visibleCount = useMemo(
    () => projects.filter(matches).length,
    [projects, matches],
  )

  const hasActiveFilter = query.trim() !== "" || runFilter !== "all" || deployFilter !== "all"

  const clearAll = () => {
    setQuery("")
    setRunFilter("all")
    setDeployFilter("all")
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 bg-muted rounded animate-pulse w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground mb-2">
          No projects
        </h3>
        <p className="text-muted-foreground">
          {emptyMessage || "There are no projects to display."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-xl">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, commit message or SHA…"
            className="pl-9 pr-9"
            aria-label="Search projects"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterPills
            value={runFilter}
            onChange={setRunFilter}
            options={RUN_OPTIONS}
            ariaLabel="Filter by app status"
          />
          <FilterPills
            value={deployFilter}
            onChange={setDeployFilter}
            options={DEPLOY_OPTIONS}
            ariaLabel="Filter by deploy status"
          />
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Result count when filtered */}
      {hasActiveFilter && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Showing {visibleCount} of {projects.length} projects
        </p>
      )}

      {visibleCount === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">
            No projects match the current filters.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="mt-2 text-xs"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orderedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              hidden={!matches(project)}
              onStatusChange={handleStatusChange}
              isPinned={pinnedIds.has(project.id)}
              onTogglePin={() => togglePin(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
