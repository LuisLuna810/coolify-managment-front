"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  RefreshCw,
  ChevronDown,
  FileText,
  GitBranch,
  PlayCircle,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { argocdAPI, type ProjectWorkload } from "@/lib/api"
import { ContainerLogsModal } from "@/components/container-logs-modal"
import { useToast } from "@/hooks/use-toast"

export interface ArgoProject {
  id: string
  name: string
  description?: string | null
  source: "argocd"
  argoAppName: string | null
  argoCluster: string | null
  argoNamespace: string | null
  repoUrl: string | null
  targetRevision: string | null
  lastSyncRevision: string | null
  syncStatus: string | null
  healthStatus: string | null
  lastSyncAt: string | null
  fqdns?: string[]
  workloads?: ProjectWorkload[]
  permissions?: {
    canStart: boolean
    canStop: boolean
    canRestart: boolean
    canAccessEnvs: boolean
    canAccessLogs: boolean
  }
}

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

/**
 * ArgoCD reporta dos dimensiones independientes — sync (¿el cluster matchea el
 * git?) y health (¿los pods están sanos?). Mostramos el peor de los dos como
 * tono general para que un degraded health no se oculte detrás de "Synced".
 */
const toneFromHealth = (h?: string | null): Tone => {
  switch ((h || "").toLowerCase()) {
    case "healthy":
      return "running"
    case "progressing":
      return "pending"
    case "degraded":
    case "missing":
      return "error"
    case "suspended":
      return "stopped"
    default:
      return "unknown"
  }
}
const toneFromSync = (s?: string | null): Tone => {
  switch ((s || "").toLowerCase()) {
    case "synced":
      return "running"
    case "outofsync":
      return "pending"
    case "unknown":
    default:
      return "unknown"
  }
}
const combineTone = (a: Tone, b: Tone): Tone => {
  // Orden de severidad (peor primero).
  const sev: Tone[] = ["error", "pending", "stopped", "unknown", "running"]
  return sev.find((t) => t === a || t === b) ?? "unknown"
}

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

const shortSha = (s: string | null | undefined) =>
  s && /^[0-9a-f]{7,40}$/i.test(s) ? s.substring(0, 7) : s || ""

/**
 * Acorta el URL del repo para mostrarlo limpio (sin `https://github.com/`).
 *   https://github.com/TechX-Mx/docappoint-manifest      → TechX-Mx/docappoint-manifest
 *   https://gitlab.foo.com/group/sub/repo.git            → group/sub/repo
 *   git@github.com:owner/repo.git                        → owner/repo
 * Fallback: devuelve el original si no matchea ningún patrón.
 */
const shortRepo = (url: string): string => {
  if (!url) return ""
  // SSH form: git@host:owner/repo(.git)
  const ssh = /^[^@]+@[^:]+:(.+?)(?:\.git)?$/.exec(url)
  if (ssh) return ssh[1]
  // HTTPS / HTTP form: keep path after the host, strip trailing .git
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\/+/, "").replace(/\.git$/, "")
    return path || url
  } catch {
    return url.replace(/^https?:\/\/[^/]+\//, "").replace(/\.git$/, "")
  }
}

/**
 * Tono visual del badge de ambiente. Usamos `argoNamespace` que en la
 * convención local es el env real (prod/staging/dev/...). Sin esta señal
 * los devs no podían distinguir entornos porque el targetRevision es
 * siempre `main` (el repo es de manifestos, no de código).
 */
const envBadgeClass = (ns: string | null | undefined): string => {
  const v = (ns || "").toLowerCase()
  if (v === "prod" || v === "production")
    return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400"
  if (v === "staging" || v === "stage" || v === "qa")
    return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
  if (v === "dev" || v === "develop" || v === "development")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  return "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-400"
}

const stripScheme = (u: string) => u.replace(/^https?:\/\//, "")

interface ArgoProjectCardProps {
  project: ArgoProject
  hidden?: boolean
}

export function ArgoProjectCard({ project, hidden }: ArgoProjectCardProps) {
  const [showLogs, setShowLogs] = useState(false)
  const [busy, setBusy] = useState<"sync" | "refresh" | null>(null)
  const [expanded, setExpanded] = useState(false)
  const { toast } = useToast()

  const permissions = project.permissions ?? {
    canStart: true,
    canStop: true,
    canRestart: true,
    canAccessEnvs: true,
    canAccessLogs: true,
  }
  const canSync = permissions.canStart
  const canShowLogs = permissions.canAccessLogs

  const workloads = project.workloads ?? []
  const fqdns = project.fqdns ?? []
  const totalDesired = workloads.reduce((acc, w) => acc + (w.replicasDesired || 0), 0)
  const totalReady = workloads.reduce((acc, w) => acc + (w.replicasReady || 0), 0)

  const tone = combineTone(
    toneFromHealth(project.healthStatus),
    toneFromSync(project.syncStatus),
  )

  const handleSync = async () => {
    setBusy("sync")
    try {
      await argocdAPI.syncProject(project.id)
      toast({ title: "Sync iniciado", description: project.argoAppName ?? project.name })
    } catch (err: any) {
      toast({
        title: "Sync falló",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }
  const handleRefresh = async () => {
    setBusy("refresh")
    try {
      await argocdAPI.refreshProject(project.id)
      toast({ title: "Refresh disparado", description: project.argoAppName ?? project.name })
    } catch (err: any) {
      toast({
        title: "Refresh falló",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  if (hidden) return <div className="hidden" aria-hidden="true" />

  return (
    <>
      <Card className="h-full flex flex-col p-5 gap-4 overflow-hidden">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h3
                className="text-base font-semibold leading-tight truncate"
                title={project.name}
              >
                {project.name}
              </h3>
              <span
                className="shrink-0 inline-flex items-center gap-1 rounded-sm border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400"
                title="Origen: ArgoCD"
              >
                ArgoCD
              </span>
              {project.argoNamespace && (
                <span
                  className={`shrink-0 inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${envBadgeClass(project.argoNamespace)}`}
                  title={`Namespace / ambiente: ${project.argoNamespace}`}
                >
                  {project.argoNamespace}
                </span>
              )}
            </div>
            {fqdns.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5 min-w-0 text-xs">
                <a
                  href={fqdns[0].startsWith("http") ? fqdns[0] : `https://${fqdns[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline underline-offset-2 truncate min-w-0"
                  title={`Open ${fqdns[0]}`}
                >
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{stripScheme(fqdns[0])}</span>
                </a>
                {fqdns.length > 1 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 rounded-sm border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={`Show ${fqdns.length - 1} more domain${fqdns.length - 1 === 1 ? "" : "s"}`}
                      >
                        +{fqdns.length - 1}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto max-w-[28rem] p-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5 px-1">
                        All domains
                      </p>
                      <ul className="space-y-0.5">
                        {fqdns.map((d) => {
                          const href = d.startsWith("http") ? d : `https://${d}`
                          return (
                            <li key={d}>
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted transition-colors"
                                title={d}
                              >
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span className="truncate font-mono">{stripScheme(d)}</span>
                              </a>
                            </li>
                          )
                        })}
                      </ul>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${textToneClass[tone]}`}
              aria-live="polite"
            >
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClass[tone]}`} />
              {(project.healthStatus || "Unknown")}
              <span aria-hidden="true" className="opacity-50">·</span>
              <span className="text-muted-foreground">{project.syncStatus || "—"}</span>
            </span>
          </div>
        </header>

        {/* Git info */}
        {(project.repoUrl || project.targetRevision || project.lastSyncRevision) && (
          <dl className="text-xs font-mono space-y-0.5 min-w-0">
            {project.repoUrl && (
              <div className="flex gap-2 min-w-0">
                <dt className="text-muted-foreground/70 w-12 shrink-0">repo</dt>
                <dd className="truncate text-foreground" title={project.repoUrl}>
                  {shortRepo(project.repoUrl)}
                </dd>
              </div>
            )}
            {project.targetRevision && (
              <div className="flex gap-2 min-w-0">
                <dt className="text-muted-foreground/70 w-12 shrink-0">target</dt>
                <dd className="truncate text-foreground inline-flex items-center gap-1">
                  <GitBranch className="h-3 w-3 opacity-60" aria-hidden="true" />
                  {project.targetRevision}
                </dd>
              </div>
            )}
            {project.lastSyncRevision && (
              <div className="flex gap-2 min-w-0">
                <dt className="text-muted-foreground/70 w-12 shrink-0">sha</dt>
                <dd
                  className="truncate text-foreground tabular-nums"
                  title={project.lastSyncRevision}
                >
                  {shortSha(project.lastSyncRevision)}
                </dd>
              </div>
            )}
            {project.lastSyncAt && (
              <div className="flex gap-2 min-w-0">
                <dt className="text-muted-foreground/70 w-12 shrink-0">synced</dt>
                <dd className="truncate text-muted-foreground">
                  {formatRelative(project.lastSyncAt)}
                </dd>
              </div>
            )}
          </dl>
        )}

        {/* Workloads (expandible) */}
        {workloads.length > 0 && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded border border-border hover:bg-muted/50 transition-colors"
                aria-expanded={expanded}
              >
                <span className="font-medium">
                  {workloads.length} {workloads.length === 1 ? "deployment" : "deployments"} ·{" "}
                  <span className="tabular-nums">
                    {totalReady}/{totalDesired}
                  </span>{" "}
                  ready
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1.5 space-y-1.5">
              {workloads.map((w) => {
                const wTone = combineTone(
                  toneFromHealth(w.healthStatus),
                  toneFromSync(w.syncStatus),
                )
                return (
                  <div
                    key={w.id}
                    className="text-xs px-2 py-1.5 rounded border border-border/60 bg-muted/30 space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="font-medium truncate" title={w.name}>
                        {w.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 shrink-0 ${textToneClass[wTone]}`}
                      >
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClass[wTone]}`} />
                        <span className="tabular-nums">
                          {w.replicasReady}/{w.replicasDesired}
                        </span>
                      </span>
                    </div>
                    {w.imageSha && (
                      <div className="font-mono text-[10px] text-muted-foreground tabular-nums truncate" title={w.imageSha}>
                        sha {shortSha(w.imageSha)}
                      </div>
                    )}
                  </div>
                )
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2" title={project.description}>
            {project.description}
          </p>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="space-y-1.5">
          {(canSync || true) && (
            <div className="grid grid-cols-2 gap-1.5">
              {canSync && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={busy !== null}
                  aria-label="Sync application"
                  className="h-8"
                >
                  {busy === "sync" ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <PlayCircle className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  )}
                  {busy === "sync" ? "Syncing…" : "Sync"}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={busy !== null}
                aria-label="Refresh application"
                className="h-8"
              >
                {busy === "refresh" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                )}
                {busy === "refresh" ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          )}
          {canShowLogs && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowLogs(true)}
              disabled={busy !== null}
              aria-label="View container logs"
              className="h-8 w-full text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Logs
            </Button>
          )}
        </div>
      </Card>

      <ContainerLogsModal
        projectId={project.id}
        projectName={project.name}
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
      />
    </>
  )
}
