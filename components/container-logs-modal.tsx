"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { logsAPI, type ContainerLogEntry } from "@/lib/api"
import {
  Loader2,
  RefreshCw,
  Search,
  Download,
  Copy,
  CheckCircle2,
  WrapText,
  ArrowDownToLine,
  Radio,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ContainerLogsModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onClose: () => void
}

const SINCE_OPTIONS = [
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "1h", label: "1 hora" },
  { value: "6h", label: "6 horas" },
  { value: "24h", label: "24 horas" },
]

const LIMIT_OPTIONS = [
  { value: 200, label: "200" },
  { value: 500, label: "500" },
  { value: 1000, label: "1k" },
  { value: 2000, label: "2k" },
]

const ANSI_RE = /\[[0-9;]*m/g
const stripAnsi = (s: string) => s.replace(ANSI_RE, "")

// Coolify suele sufijar containers con `<service>-<uuid>-<timestamp>`. El nombre
// del compose_service vive en el prefijo; lo extraigo para mostrar un badge limpio
// (y para que coincida con el filtro del back, que usa compose_service exacto).
const extractService = (containerName: string): string => {
  const m = /^([a-z0-9_-]+?)-[a-z0-9]{20,}/i.exec(containerName)
  return m?.[1] || containerName
}

type Tone = "error" | "warn" | "info" | "debug" | "default"

const detectTone = (line: string): Tone => {
  const l = line.toLowerCase()
  if (/\b(error|err|fatal|panic|fail(ed|ure)?|exception)\b/.test(l)) return "error"
  if (/\bwarn(ing)?\b/.test(l)) return "warn"
  if (/\binfo\b/.test(l)) return "info"
  if (/\bdebug|trace\b/.test(l)) return "debug"
  return "default"
}

const toneClass: Record<Tone, string> = {
  error: "text-rose-300 bg-rose-950/40",
  warn: "text-amber-200 bg-amber-950/30",
  info: "text-sky-200",
  debug: "text-zinc-400",
  default: "text-zinc-200",
}

// Genera un color estable por servicio para el badge (paleta tailwind).
const servicePalette = [
  "border-sky-700 text-sky-200 bg-sky-950/40",
  "border-emerald-700 text-emerald-200 bg-emerald-950/40",
  "border-violet-700 text-violet-200 bg-violet-950/40",
  "border-amber-700 text-amber-200 bg-amber-950/40",
  "border-rose-700 text-rose-200 bg-rose-950/40",
  "border-cyan-700 text-cyan-200 bg-cyan-950/40",
]
const colorForService = (service: string): string => {
  let h = 0
  for (let i = 0; i < service.length; i++) h = (h * 31 + service.charCodeAt(i)) >>> 0
  return servicePalette[h % servicePalette.length]
}

// Resalta `needle` dentro de `text` envolviendo coincidencias en <mark>.
const highlight = (text: string, needle: string): React.ReactNode => {
  if (!needle) return text
  const parts: React.ReactNode[] = []
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <mark key={key++} className="bg-yellow-500/50 text-zinc-900 rounded px-0.5">
        {m[0]}
      </mark>,
    )
    last = m.index + m[0].length
    if (m[0].length === 0) re.lastIndex++
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  const ms = String(d.getMilliseconds()).padStart(3, "0")
  return `${hh}:${mm}:${ss}.${ms}`
}

export function ContainerLogsModal({
  projectId,
  projectName,
  isOpen,
  onClose,
}: ContainerLogsModalProps) {
  const [entries, setEntries] = useState<ContainerLogEntry[]>([])
  const [knownContainers, setKnownContainers] = useState<string[]>([])
  // Mantenemos un mapping `container → Set<pod>` que acumula cross-refresh
  // pero PERMITE filtrar al workload activo (sin esto el dropdown de pods
  // mostraba mezclados los pods de todos los Deployments y elegir uno fuera
  // del workload seleccionado dejaba la query Loki sin resultados).
  const [podsByContainer, setPodsByContainer] = useState<Record<string, string[]>>({})
  const [selectedContainer, setSelectedContainer] = useState<string>("all")
  const [selectedPod, setSelectedPod] = useState<string>("all")
  const [source, setSource] = useState<"coolify" | "argocd" | null>(null)
  const [since, setSince] = useState("15m")
  const [limit, setLimit] = useState(500)
  const [searchTerm, setSearchTerm] = useState("")
  const [wrap, setWrap] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Ordenadas asc para presentación tipo terminal (newest abajo).
  // El back devuelve direction=backward por default (newest primero), así que
  // pedimos direction=forward para que ya vengan en orden cronológico desde Loki.
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await logsAPI.getContainerLogs(projectId, {
        since,
        limit,
        container: selectedContainer === "all" ? undefined : selectedContainer,
        pod: selectedPod === "all" ? undefined : selectedPod,
        direction: "backward",
      })
      const sorted = [...data.entries].sort((a, b) =>
        a.ts.localeCompare(b.ts),
      )
      setEntries(sorted)
      setSource(data.source)
      // Acumulo el set de servicios vistos para el selector (estable
      // cross-refresh — útil para que un container no desaparezca cuando
      // la ventana de tiempo no tiene logs suyos).
      setKnownContainers((prev) => {
        const set = new Set(prev)
        for (const c of data.containers) set.add(c)
        return Array.from(set)
      })
      // Mismo accumulator para pods, pero indexado por su container (workload).
      // Cuando el back devuelve el mapping ya hecho lo respetamos; sino lo
      // armamos vacío y dejamos que se llene en futuros refreshes.
      setPodsByContainer((prev) => {
        const next = { ...prev }
        const incoming = data.podsByContainer || {}
        for (const [c, pods] of Object.entries(incoming)) {
          const set = new Set(next[c] || [])
          for (const p of pods) set.add(p)
          next[c] = Array.from(set).sort()
        }
        return next
      })
      setLastUpdated(new Date())
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.response?.data?.message || "No se pudieron cargar los logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, since, limit, selectedContainer, selectedPod, toast])

  useEffect(() => {
    if (isOpen) fetchLogs()
  }, [isOpen, fetchLogs])

  useEffect(() => {
    if (!isOpen) {
      setEntries([])
      setKnownContainers([])
      setPodsByContainer({})
      setSelectedContainer("all")
      setSelectedPod("all")
      setSource(null)
      setSearchTerm("")
      setSince("15m")
      setLimit(500)
      setWrap(true)
      setAutoScroll(true)
      setIsLive(false)
    }
  }, [isOpen])

  // Tail-like polling cuando isLive está activo. Re-ejecuta la misma query cada
  // 3s (incluye rango/limit/container/sort actuales). No es incremental — el
  // back devuelve la ventana completa de `since` y reemplazamos el set local.
  // Para un endpoint dedicado de tail (Loki tiene websockets) sería un paso aparte.
  useEffect(() => {
    if (!isOpen || !isLive) return
    const id = setInterval(() => {
      // Si ya hay un fetch en curso, salteamos este tick para no encolar.
      if (!loading) fetchLogs()
    }, 3000)
    return () => clearInterval(id)
  }, [isOpen, isLive, loading, fetchLogs])

  const visible = useMemo(() => {
    if (!searchTerm.trim()) return entries
    const needle = searchTerm.toLowerCase()
    return entries.filter((e) => stripAnsi(e.line).toLowerCase().includes(needle))
  }, [entries, searchTerm])

  // Auto-scroll al fondo cuando llegan logs nuevos (sólo si el toggle está activo).
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [visible, autoScroll])

  const copyAll = async () => {
    try {
      const text = visible
        .map((e) => `${e.ts} [${extractService(e.container)}] ${stripAnsi(e.line)}`)
        .join("\n")
      await navigator.clipboard.writeText(text)
      setCopyStatus("copied")
      setTimeout(() => setCopyStatus("idle"), 1500)
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive",
      })
    }
  }

  const downloadAll = () => {
    const text = visible
      .map((e) => `${e.ts} [${extractService(e.container)}] ${stripAnsi(e.line)}`)
      .join("\n")
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${projectName}-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const services = useMemo(() => {
    // En Coolify los container names traen sufijo (`<svc>-<uuid>-<ts>`) y
    // tenemos que parsear el service prefix. En Argo el container_name ya
    // es directamente el nombre del workload (no hay sufijo), así que
    // saltamos el parseo para no mutilarlo.
    const set = new Set(
      source === "argocd" ? knownContainers : knownContainers.map(extractService),
    )
    return Array.from(set).sort()
  }, [knownContainers, source])

  // Pods filtrados al workload (container) actualmente seleccionado. Si está
  // "all" mostramos la unión de pods de TODOS los containers; sino sólo los
  // del workload elegido. Evita que un dev mezcle (ej: filter container=
  // docappoint-back + pod=analisis-sangre-xxx → query Loki vacía).
  const pods = useMemo(() => {
    if (selectedContainer === "all") {
      const all = new Set<string>()
      for (const list of Object.values(podsByContainer)) {
        for (const p of list) all.add(p)
      }
      return [...all].sort()
    }
    return podsByContainer[selectedContainer] ? [...podsByContainer[selectedContainer]].sort() : []
  }, [podsByContainer, selectedContainer])

  // Cuando cambia el container/workload, el pod seleccionado puede dejar
  // de pertenecer al nuevo set — reset a "all" para que la próxima query
  // sea válida en vez de mostrar "Sin coincidencias" silenciosamente.
  useEffect(() => {
    if (selectedPod !== "all" && !pods.includes(selectedPod)) {
      setSelectedPod("all")
    }
  }, [selectedContainer, pods, selectedPod])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="
          p-0 gap-0 flex flex-col overflow-hidden
          w-[96vw] max-w-[96vw] sm:max-w-[96vw]
          h-[92vh] max-h-[92vh]
          sm:rounded-lg
        "
      >
        {/* ----------- Header ----------- */}
        <DialogHeader className="px-4 py-3 border-b flex-row items-center gap-3 space-y-0 shrink-0">
          <DialogTitle className="truncate text-base font-semibold flex-1 min-w-0 pr-10">
            Logs · <span className="font-mono">{projectName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* ----------- Toolbar: fila 1 (query a Loki) ----------- */}
        <div className="border-b bg-muted/30 px-4 py-2 flex flex-wrap items-center gap-2 shrink-0">
          <Select value={since} onValueChange={setSince}>
            <SelectTrigger className="h-8 w-28 text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SINCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="h-8 w-24 text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                  {o.label} líneas
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedContainer} onValueChange={setSelectedContainer}>
            <SelectTrigger className="h-8 w-48 text-xs shrink-0">
              <SelectValue placeholder="Container" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos los containers
              </SelectItem>
              {services.map((s) => (
                <SelectItem key={s} value={s} className="text-xs font-mono">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {pods.length > 1 && (
            <Select value={selectedPod} onValueChange={setSelectedPod}>
              <SelectTrigger
                className="h-8 w-56 text-xs shrink-0"
                title={
                  selectedContainer === "all"
                    ? "Filtrar por pod/replica individual"
                    : `Pods del workload "${selectedContainer}"`
                }
              >
                <SelectValue placeholder="Pod" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  {selectedContainer === "all"
                    ? `Todos los pods (${pods.length})`
                    : `Todos los pods de ${selectedContainer} (${pods.length})`}
                </SelectItem>
                {pods.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs font-mono">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en logs…"
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <Button
              variant={isLive ? "secondary" : "outline"}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                setIsLive((live) => {
                  // Al activar live, también forzamos auto-scroll para que
                  // se sienta como un tail real.
                  if (!live) setAutoScroll(true)
                  return !live
                })
              }}
              title={isLive ? "Pausar live tail" : "Activar live tail (3s)"}
            >
              <Radio
                className={`h-4 w-4 mr-1 ${isLive ? "text-rose-500 motion-safe:animate-pulse" : ""}`}
              />
              {isLive ? "Live" : "Live off"}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={fetchLogs}
              disabled={loading || isLive}
              title={isLive ? "Refresh deshabilitado mientras live tail está activo" : "Refrescar"}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refrescar
            </Button>
            <Button
              variant={wrap ? "secondary" : "outline"}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setWrap((w) => !w)}
              title={wrap ? "Desactivar wrap" : "Activar wrap"}
            >
              <WrapText className="h-4 w-4 mr-1" />
              Wrap
            </Button>
            <Button
              variant={autoScroll ? "secondary" : "outline"}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setAutoScroll((a) => !a)}
              title={autoScroll ? "Pausar auto-scroll" : "Activar auto-scroll"}
            >
              <ArrowDownToLine className="h-4 w-4 mr-1" />
              Auto-scroll
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={copyAll}
              disabled={visible.length === 0}
              title="Copiar al portapapeles"
            >
              {copyStatus === "copied" ? (
                <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              Copiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={downloadAll}
              disabled={visible.length === 0}
              title="Descargar como .txt"
            >
              <Download className="h-4 w-4 mr-1" />
              Descargar
            </Button>
          </div>
        </div>

        {/* ----------- Status bar ----------- */}
        <div className="px-4 py-1.5 border-b flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
          <span>
            <span className="tabular-nums">{visible.length}</span>
            {searchTerm && visible.length !== entries.length && (
              <> de <span className="tabular-nums">{entries.length}</span></>
            )}
            {" "}líneas
          </span>
          {lastUpdated && (
            <span className="tabular-nums">
              actualizado {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          {services.length > 0 && (
            <span className="flex items-center gap-1">
              containers:
              {services.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="h-4 px-1 text-[10px] font-mono"
                >
                  {s}
                </Badge>
              ))}
            </span>
          )}
        </div>

        {/* ----------- Log viewport ----------- */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-auto bg-zinc-950 font-mono text-[12px] leading-[1.45]"
        >
          {loading && entries.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando logs…
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-1">
              <p>Sin coincidencias en esta ventana.</p>
              <p className="text-xs text-zinc-500">
                Probá ampliar el rango ({since}), bajar filtros o refrescar.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-zinc-900">
              {visible.map((e, i) => {
                const service = extractService(e.container)
                const text = stripAnsi(e.line)
                const tone = detectTone(text)
                return (
                  <li
                    key={`${e.ts}-${i}`}
                    className={`flex gap-3 px-4 py-1 hover:bg-zinc-900/60 ${toneClass[tone]}`}
                  >
                    <span
                      className="text-zinc-500 tabular-nums shrink-0 select-none"
                      title={new Date(e.ts).toLocaleString()}
                    >
                      {formatTime(e.ts)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`shrink-0 h-4 px-1 text-[10px] font-mono ${colorForService(service)}`}
                      title={e.container}
                    >
                      {service}
                    </Badge>
                    <span
                      className={
                        wrap
                          ? "whitespace-pre-wrap break-words min-w-0 flex-1"
                          : "whitespace-pre min-w-0 flex-1 overflow-x-auto"
                      }
                    >
                      {highlight(text, searchTerm)}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
