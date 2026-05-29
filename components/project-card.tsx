"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Play,
  Square,
  RotateCcw,
  Settings,
  RefreshCw,
  ExternalLink,
  FileText,
} from "lucide-react"
import { projectsAPI, type ProjectWorkload } from "@/lib/api"
import { EnvModal } from "@/components/env-modal"
import { ContainerLogsModal } from "@/components/container-logs-modal"
import { ArgoProjectCard, type ArgoProject } from "@/components/argo-project-card"
import { PinButton } from "@/components/pin-button"
import { useToast } from "@/hooks/use-toast"

interface ProjectPermissions {
  canStart: boolean
  canStop: boolean
  canRestart: boolean
  canAccessEnvs: boolean
  canAccessLogs: boolean
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  // 'coolify' (default — match al modelo legacy) o 'argocd'. Cuando es argocd
  // delegamos en <ArgoProjectCard> al inicio del componente.
  source?: "coolify" | "argocd"
  // Campos específicos de Argo. Sólo poblados cuando source='argocd'.
  argoAppName?: string | null
  argoCluster?: string | null
  argoNamespace?: string | null
  repoUrl?: string | null
  targetRevision?: string | null
  lastSyncRevision?: string | null
  syncStatus?: string | null
  healthStatus?: string | null
  lastSyncAt?: string | null
  fqdns?: string[]
  workloads?: ProjectWorkload[]
  permissions?: ProjectPermissions
}

interface LastDeployment {
  uuid: string
  status: string
  isTerminal: boolean
  commit: string | null
  shortCommit: string | null
  commitMessage: string | null
  createdAt: string | null
  updatedAt: string | null
  finishedAt: string | null
  durationSeconds: number | null
  trigger: "webhook" | "api" | "manual"
  rollback: boolean
  restartOnly: boolean
  pullRequestId: number | null
}

interface ProjectStatus {
  status: string
  uuid?: string
  name?: string
  fqdn?: string
  /** Lista consolidada de URLs: fqdn + docker_compose_domains. Provista por el back. */
  domains?: string[]
  git_repository?: string
  git_branch?: string
  git_commit_sha?: string
  build_pack?: string
  health_check_enabled?: boolean
  created_at?: string
  updated_at?: string
  lastDeployment?: LastDeployment | null
}

interface ProjectCardProps {
  project: Project
  hidden?: boolean
  onStatusChange?: (projectId: string, status: ProjectStatus | null) => void
  /** Estado de fijado (pin) para mostrar el botón relleno/atenuado. */
  isPinned?: boolean
  /** Toggle de fijado. Si no se pasa, no se muestra el botón de pin. */
  onTogglePin?: () => void
}

// Exporto el tipo de estado para que el grid pueda filtrar
export type { ProjectStatus, LastDeployment }

type ActionKey = "start" | "stop" | "restart" | "pull"

// ---------- Status tone ----------

type Tone = "running" | "stopped" | "pending" | "error" | "unknown"

const dotClass: Record<Tone, string> = {
  running: "bg-emerald-500",
  stopped: "bg-zinc-400 dark:bg-zinc-500",
  pending: "bg-amber-500",
  error: "bg-rose-500",
  unknown: "bg-zinc-300 dark:bg-zinc-600",
}

const textToneClass: Record<Tone, string> = {
  running: "text-emerald-700 dark:text-emerald-400",
  stopped: "text-zinc-600 dark:text-zinc-400",
  pending: "text-amber-700 dark:text-amber-400",
  error: "text-rose-700 dark:text-rose-400",
  unknown: "text-muted-foreground",
}

const getTone = (status?: string): Tone => {
  const s = (status || "").toLowerCase()
  if (s.includes("running") || s === "started" || s === "healthy" || s === "finished") return "running"
  if (s.includes("exited") || s === "stopped" || s === "dead" || s === "cancelled-by-user") return "stopped"
  if (
    s === "pending" ||
    s === "starting" ||
    s === "stopping" ||
    s === "restarting" ||
    s === "building" ||
    s === "queued" ||
    s === "in_progress"
  )
    return "pending"
  if (s === "failed" || s === "error" || s === "degraded" || s.includes("unhealthy")) return "error"
  return "unknown"
}

const simplifyStatus = (status?: string) => {
  if (!status) return "unknown"
  return status.includes(":") ? status.split(":")[0] : status
}

const humanDeployStatus = (status?: string) => {
  switch (status) {
    case "finished":
      return "Succeeded"
    case "failed":
      return "Failed"
    case "in_progress":
      return "Running"
    case "queued":
      return "Queued"
    case "cancelled-by-user":
      return "Cancelled"
    default:
      return status ? status.replace(/-/g, " ") : "Unknown"
  }
}

// ---------- Time helpers ----------

const formatRelative = (iso?: string | null) => {
  if (!iso) return null
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return null
  const diff = Math.max(0, Date.now() - ts)
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const formatDuration = (seconds?: number | null) => {
  if (seconds == null || seconds < 0) return null
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s ? `${m}m ${s}s` : `${m}m`
}

const formatDateTitle = (iso?: string | null) => {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleString()
}

// ---------- Component ----------

const POLL_INTERVAL_NORMAL = 30_000
const POLL_INTERVAL_REBUILDING = 5_000

const isInProgressStatus = (status?: string) =>
  status === "in_progress" || status === "queued"

export function ProjectCard({ project, hidden, onStatusChange, isPinned, onTogglePin }: ProjectCardProps) {
  // Si el proyecto viene de ArgoCD, delegamos a un componente especializado.
  // No corremos el polling de Coolify status (no aplica) y los botones son
  // distintos (Sync/Refresh en lugar de Start/Stop/Restart).
  if (project.source === "argocd") {
    return (
      <ArgoProjectCard
        project={project as unknown as ArgoProject}
        hidden={hidden}
        isPinned={isPinned}
        onTogglePin={onTogglePin}
      />
    )
  }

  const [activeAction, setActiveAction] = useState<ActionKey | null>(null)
  const [showEnvModal, setShowEnvModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const { toast } = useToast()
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Si el back no manda permissions (admin sin restricciones, o asignaciones
  // viejas) defaulteamos a todo true para no romper la UX existente. Para
  // developers nuevos el back siempre devuelve los flags reales.
  const permissions: ProjectPermissions = project.permissions || {
    canStart: true,
    canStop: true,
    canRestart: true,
    canAccessEnvs: true,
    canAccessLogs: true,
  }
  const canShowAnyAction =
    permissions.canStart || permissions.canStop || permissions.canRestart
  const canShowEnv = permissions.canAccessEnvs
  const canShowLogs = permissions.canAccessLogs

  // Tracker para detectar el momento en que un deploy pasa a terminal y mostrar un toast
  const prevDeployStatusRef = useRef<string | null>(null)
  const prevDeployUuidRef = useRef<string | null>(null)

  const fetchProjectStatus = async (): Promise<ProjectStatus | null> => {
    // Reintenta hasta 2 veces con backoff (0.8s, 1.8s) si falla. Coolify a
    // veces rate-limita cuando hay thundering herd al cargar la página y un
    // reintento simple alcanza para recuperar sin que el user vea "unknown".
    const attempts = [0, 800, 1800]
    setStatusLoading(true)
    try {
      for (let i = 0; i < attempts.length; i++) {
        if (attempts[i] > 0) {
          await new Promise((r) => setTimeout(r, attempts[i]))
        }
        try {
          const status = await projectsAPI.getProjectStatus(project.id)

          // Detectar transición a estado terminal del último deploy y avisar al user
          const newDeploy = status?.lastDeployment
          if (newDeploy?.uuid && prevDeployUuidRef.current === newDeploy.uuid) {
            const prev = prevDeployStatusRef.current
            const next = newDeploy.status
            const wasRunning = prev === "in_progress" || prev === "queued"
            const isTerminal = ["finished", "failed", "cancelled-by-user"].includes(next)
            if (wasRunning && isTerminal) {
              if (next === "finished") {
                toast({
                  title: `${project.name}: deploy succeeded`,
                  description: newDeploy.commitMessage
                    ? newDeploy.commitMessage.split("\n")[0]
                    : undefined,
                })
              } else if (next === "failed") {
                toast({
                  title: `${project.name}: deploy failed`,
                  description: newDeploy.commitMessage
                    ? newDeploy.commitMessage.split("\n")[0]
                    : undefined,
                  variant: "destructive",
                })
              }
            }
          }
          prevDeployStatusRef.current = newDeploy?.status || null
          prevDeployUuidRef.current = newDeploy?.uuid || null

          setProjectStatus(status)
          onStatusChange?.(project.id, status)
          return status
        } catch (err) {
          // Si fue el último intento, dejamos que caiga al fallback
          if (i === attempts.length - 1) return null
        }
      }
      return null
    } finally {
      setStatusLoading(false)
    }
  }

  // Polling con intervalo dinámico: más rápido cuando hay un deploy en curso
  useEffect(() => {
    let cancelled = false

    const schedule = (intervalMs: number) => {
      if (cancelled) return
      // Jitter ±15% para evitar que muchos cards se sincronicen
      const jitter = intervalMs * (Math.random() * 0.3 - 0.15)
      pollTimerRef.current = setTimeout(tick, Math.round(intervalMs + jitter))
    }

    const tick = async () => {
      if (cancelled) return
      const status = await fetchProjectStatus()
      if (cancelled) return
      const rebuilding = isInProgressStatus(status?.lastDeployment?.status)
      schedule(rebuilding ? POLL_INTERVAL_REBUILDING : POLL_INTERVAL_NORMAL)
    }

    tick()

    return () => {
      cancelled = true
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  const manualRefresh = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    fetchProjectStatus().then((status) => {
      const rebuilding = isInProgressStatus(status?.lastDeployment?.status)
      pollTimerRef.current = setTimeout(
        () => fetchProjectStatus(),
        rebuilding ? POLL_INTERVAL_REBUILDING : POLL_INTERVAL_NORMAL,
      )
    })
  }

  const handleAction = async (action: ActionKey) => {
    setActiveAction(action)
    try {
      switch (action) {
        case "start":
          await projectsAPI.startProject(project.id)
          break
        case "stop":
          await projectsAPI.stopProject(project.id)
          break
        case "restart":
          await projectsAPI.restartProject(project.id)
          break
        case "pull":
          await projectsAPI.pullProject(project.id)
          break
      }
      toast({
        title: "Success",
        description: `Project ${action} completed successfully`,
      })
      setTimeout(fetchProjectStatus, 2000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to ${action} project`,
        variant: "destructive",
      })
    } finally {
      setActiveAction(null)
    }
  }

  const rawStatus = projectStatus?.status || project.status || ""
  const deploy = projectStatus?.lastDeployment
  const isRebuilding = isInProgressStatus(deploy?.status)

  // Si está rebuildeando, el pill arriba refleja eso (no el container viejo)
  const tone: Tone = isRebuilding ? "pending" : getTone(rawStatus)
  const statusText = statusLoading && !projectStatus
    ? "loading…"
    : isRebuilding
      ? "rebuilding"
      : simplifyStatus(rawStatus) || "unknown"

  const deployTone = deploy ? getTone(deploy.status) : null
  const deployTime = deploy?.isTerminal
    ? formatRelative(deploy.finishedAt)
    : formatRelative(deploy?.createdAt)
  const deployTimeLabel = deploy?.isTerminal ? "finished" : "started"

  const repo = projectStatus?.git_repository
  const branch = projectStatus?.git_branch
  const sha = deploy?.shortCommit || null

  const anyBusy = activeAction !== null

  if (hidden) {
    // Mantenemos el componente montado para que siga el polling, pero ocultamos
    // la card. Cuando un filtro la vuelva visible, ya tiene status fresco.
    return <div className="hidden" aria-hidden="true" />
  }

  return (
    <>
      <Card className="h-full flex flex-col p-5 gap-5 overflow-hidden">
        {/* ---------- Header ---------- */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className="text-base font-semibold leading-tight truncate"
              style={{ textWrap: "balance" as any }}
              title={project.name}
            >
              {project.name}
            </h3>
            {(() => {
              const domains =
                projectStatus?.domains && projectStatus.domains.length > 0
                  ? projectStatus.domains
                  : projectStatus?.fqdn
                    ? [projectStatus.fqdn]
                    : []
              if (domains.length === 0) return null
              const primary = domains[0]
              const stripped = (u: string) => u.replace(/^https?:\/\//, "")

              return (
                <div className="flex items-center gap-1 mt-0.5 min-w-0 text-xs">
                  <a
                    href={primary}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline underline-offset-2 truncate min-w-0"
                    title={`Open ${primary}`}
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{stripped(primary)}</span>
                  </a>

                  {domains.length > 1 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="shrink-0 rounded-sm border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label={`Show ${domains.length - 1} more domain${
                            domains.length - 1 === 1 ? "" : "s"
                          }`}
                        >
                          +{domains.length - 1}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-auto max-w-[28rem] p-2"
                      >
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5 px-1">
                          All domains
                        </p>
                        <ul className="space-y-0.5">
                          {domains.map((d) => (
                            <li key={d}>
                              <a
                                href={d}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted transition-colors"
                                title={d}
                              >
                                <ExternalLink
                                  className="h-3 w-3 shrink-0 text-muted-foreground"
                                  aria-hidden="true"
                                />
                                <span className="truncate font-mono">
                                  {stripped(d)}
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )
            })()}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${textToneClass[tone]}`}
              aria-live="polite"
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${dotClass[tone]} ${
                  isRebuilding ? "motion-safe:animate-pulse" : ""
                }`}
              />
              {statusText}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={manualRefresh}
              disabled={statusLoading}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Refresh project status"
              title="Refresh project status"
            >
              <RefreshCw
                className={`h-3 w-3 ${statusLoading ? "motion-safe:animate-spin" : ""}`}
              />
            </Button>
            {onTogglePin && (
              <PinButton pinned={!!isPinned} onToggle={onTogglePin} />
            )}
          </div>
        </header>

        {/* ---------- Git info: repo / branch / sha (stacked, clean) ---------- */}
        {(repo || branch || sha) && (
          <dl className="text-xs font-mono space-y-0.5 min-w-0">
            {repo && (
              <div className="flex gap-2 min-w-0">
                <dt className="text-muted-foreground/70 w-12 shrink-0">repo</dt>
                <dd className="truncate text-foreground" title={repo}>
                  {repo}
                </dd>
              </div>
            )}
            {branch && (
              <div className="flex gap-2 min-w-0">
                <dt className="text-muted-foreground/70 w-12 shrink-0">branch</dt>
                <dd className="truncate text-foreground">{branch}</dd>
              </div>
            )}
            {sha && (
              <div className="flex gap-2 min-w-0">
                <dt className="text-muted-foreground/70 w-12 shrink-0">sha</dt>
                <dd
                  className="truncate text-foreground tabular-nums"
                  title={deploy?.commit || undefined}
                >
                  {sha}
                </dd>
              </div>
            )}
          </dl>
        )}

        {/* ---------- Last deploy ---------- */}
        {deploy && deployTone && (() => {
          const subject = (deploy.commitMessage || "").split(/\r?\n/)[0].trim()

          return (
            <section aria-label="Last deployment" className="space-y-2 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                Last deploy
              </p>

              <dl className="text-xs space-y-1 min-w-0">
                {subject && (
                  <div className="flex gap-2 min-w-0">
                    <dt className="font-mono text-muted-foreground/70 w-12 shrink-0">
                      commit
                    </dt>
                    <dd className="min-w-0 flex-1">
                      <p
                        className="text-sm text-foreground leading-snug break-words"
                        title={subject}
                      >
                        {subject}
                      </p>
                    </dd>
                  </div>
                )}

                <div className="flex gap-2 min-w-0">
                  <dt className="font-mono text-muted-foreground/70 w-12 shrink-0">
                    status
                  </dt>
                  <dd className="text-xs text-muted-foreground tabular-nums min-w-0 flex-1">
                    <span className={`font-medium ${textToneClass[deployTone]}`}>
                      {humanDeployStatus(deploy.status)}
                    </span>
                    {deployTime && (
                      <>
                        <span aria-hidden="true" className="mx-1.5 opacity-50">·</span>
                        <span
                          title={formatDateTitle(
                            deploy.isTerminal ? deploy.finishedAt : deploy.createdAt,
                          )}
                        >
                          {deploy.isTerminal ? deployTime : `started ${deployTime}`}
                        </span>
                      </>
                    )}
                    {deploy.durationSeconds != null && (
                      <>
                        <span aria-hidden="true" className="mx-1.5 opacity-50">·</span>
                        <span>in {formatDuration(deploy.durationSeconds)}</span>
                      </>
                    )}
                    <span aria-hidden="true" className="mx-1.5 opacity-50">·</span>
                    <span>via {deploy.trigger}</span>
                    {deploy.rollback && (
                      <>
                        <span aria-hidden="true" className="mx-1.5 opacity-50">·</span>
                        <span className="text-amber-700 dark:text-amber-400">
                          rollback
                        </span>
                      </>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          )
        })()}

        {/* ---------- Description (only if set) ---------- */}
        {project.description && (
          <p
            className="text-sm text-muted-foreground leading-relaxed line-clamp-3"
            title={project.description}
          >
            {project.description}
          </p>
        )}

        {/* Spacer pushes actions to the bottom */}
        <div className="flex-1" />

        {/* ---------- Actions ---------- */}
        {(canShowAnyAction || canShowEnv || canShowLogs) && (
          <div className="space-y-1.5">
            {canShowAnyAction && (
              <div
                className={`grid gap-1.5 ${
                  [permissions.canStart, permissions.canStop, permissions.canRestart].filter(Boolean).length === 1
                    ? "grid-cols-1"
                    : [permissions.canStart, permissions.canStop, permissions.canRestart].filter(Boolean).length === 2
                      ? "grid-cols-2"
                      : "grid-cols-3"
                }`}
              >
                {permissions.canStart && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("start")}
                    disabled={anyBusy || statusLoading}
                    aria-label="Start application"
                    className="h-8"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    {activeAction === "start" ? "Starting…" : "Start"}
                  </Button>
                )}
                {permissions.canStop && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("stop")}
                    disabled={anyBusy || statusLoading}
                    aria-label="Stop application"
                    className="h-8"
                  >
                    <Square className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    {activeAction === "stop" ? "Stopping…" : "Stop"}
                  </Button>
                )}
                {permissions.canRestart && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("restart")}
                    disabled={anyBusy || statusLoading}
                    aria-label="Restart application"
                    className="h-8"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    {activeAction === "restart" ? "Restarting…" : "Restart"}
                  </Button>
                )}
              </div>
            )}
            {(canShowEnv || canShowLogs) && (
              <div
                className={`grid gap-1.5 ${
                  canShowEnv && canShowLogs ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {canShowLogs && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowLogsModal(true)}
                    disabled={anyBusy}
                    aria-label="View container logs"
                    className="h-8 text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    Logs
                  </Button>
                )}
                {canShowEnv && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowEnvModal(true)}
                    disabled={anyBusy}
                    aria-label="Edit environment variables"
                    className="h-8 text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    Env vars
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      <EnvModal
        projectId={project.id}
        projectName={project.name}
        isOpen={showEnvModal}
        onClose={() => setShowEnvModal(false)}
      />

      <ContainerLogsModal
        projectId={project.id}
        projectName={project.name}
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
      />
    </>
  )
}
