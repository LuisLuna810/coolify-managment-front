"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/hooks/use-auth"
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  RefreshCw,
  PlayCircle,
  FileText,
  ExternalLink,
  GitBranch,
  ChevronDown,
  LogOut,
} from "lucide-react"

export default function DocsPage() {
  return (
    <AuthGuard>
      <DocsContent />
    </AuthGuard>
  )
}

function DocsContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const backTo = user?.role === "admin" ? "/admin" : "/dashboard"

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backTo)}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold leading-tight">Docs</h1>
                <p className="text-xs text-muted-foreground">
                  Cómo leer las cards y qué significa cada estado
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="flex items-center gap-2 bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <QuickRef />
        <CoolifySection />
        <ArgoSection />
        <GitOpsSection />
        <LogsSection />
      </main>
    </div>
  )
}

// ============================================================
// 1) Quick reference: status dots ↔ color
// ============================================================

const DOT = {
  running: "bg-emerald-500",
  stopped: "bg-zinc-400 dark:bg-zinc-500",
  pending: "bg-amber-500",
  error: "bg-rose-500",
  unknown: "bg-zinc-300 dark:bg-zinc-600",
} as const

const TEXT_TONE = {
  running: "text-emerald-700 dark:text-emerald-400",
  stopped: "text-zinc-600 dark:text-zinc-400",
  pending: "text-amber-700 dark:text-amber-400",
  error: "text-rose-700 dark:text-rose-400",
  unknown: "text-muted-foreground",
} as const

function QuickRef() {
  const rows: Array<{
    tone: keyof typeof DOT
    label: string
    means: string
    examples: string
  }> = [
    {
      tone: "running",
      label: "running / healthy / succeeded",
      means: "Todo OK: contenedor corriendo o último deploy OK.",
      examples: "Coolify: `running`. Argo: `Healthy + Synced`.",
    },
    {
      tone: "pending",
      label: "pending / building / progressing",
      means: "Cambio en curso. Sirve refresh manual si no se actualiza.",
      examples: "Coolify: `in_progress`, `queued`, `restarting`. Argo: `Progressing`.",
    },
    {
      tone: "stopped",
      label: "stopped / exited / suspended",
      means: "No está corriendo. NO significa error necesariamente — puede ser intencional.",
      examples: "Coolify: contenedor parado. Argo: app suspended.",
    },
    {
      tone: "error",
      label: "failed / degraded / unhealthy",
      means: "Algo se rompió. Mirá el último deploy/sync y logs.",
      examples: "Coolify: deploy `failed`. Argo: `Degraded`.",
    },
    {
      tone: "unknown",
      label: "unknown",
      means: "El back todavía no resolvió el estado. Esperá unos segundos o refrescá.",
      examples: "Típico al cargar la página por primera vez.",
    },
  ]
  return (
    <Section
      title="Estados generales"
      subtitle="Los colores son los mismos en Coolify y en ArgoCD. El significado puede ser distinto — ver detalle abajo."
    >
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Tono
              </th>
              <th className="px-3 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Aparece como
              </th>
              <th className="px-3 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Significa
              </th>
              <th className="px-3 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Ejemplos
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((r) => (
              <tr key={r.tone} className="hover:bg-muted/20">
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${DOT[r.tone]}`} aria-hidden />
                    <code className="text-[11px]">{r.tone}</code>
                  </span>
                </td>
                <td className={`px-3 py-2 text-xs ${TEXT_TONE[r.tone]}`}>{r.label}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.means}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.examples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

// ============================================================
// 2) Coolify cards
// ============================================================

function CoolifySection() {
  return (
    <Section
      title="Cards de Coolify"
      subtitle="Cada card es UNA aplicación (un contenedor o stack docker-compose). El estado del contenedor y el estado del último deploy son dos cosas distintas — leer ambas."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <DemoCoolifyCardSucceededExited />
        <DemoCoolifyCardRebuilding />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <DemoCoolifyCardRunning />
        <DemoCoolifyCardFailed />
      </div>

      <Callout
        title="Status del contenedor vs status del último deploy"
        body={
          <>
            <p>
              Arriba a la derecha hay un pill (<DotInline tone="running" /> running, <DotInline tone="stopped" /> exited, etc.) que es el estado del{" "}
              <strong>contenedor</strong>. Más abajo, en "Last deploy", hay otro tono que es del{" "}
              <strong>build</strong>.
            </p>
            <p className="mt-1">
              Combinación más confusa:{" "}
              <span className="text-emerald-600 dark:text-emerald-400">Last deploy: Succeeded</span> +{" "}
              <span className="text-zinc-500">status: exited</span> → el build salió OK pero el
              contenedor está apagado. Apretá <strong>Start</strong> y ya.
            </p>
          </>
        }
      />

      <h4 className="text-sm font-semibold mt-6 mb-2">Botones</h4>
      <ul className="text-sm space-y-1.5 list-disc list-inside text-muted-foreground">
        <li>
          <Btn icon={<Play className="h-3.5 w-3.5" />} label="Start" /> — levanta el contenedor (no
          re-build). Equivale a `docker compose start`.
        </li>
        <li>
          <Btn icon={<Square className="h-3.5 w-3.5" />} label="Stop" /> — apaga el contenedor. El
          deploy queda en "Succeeded" (lo último que se buildeó sigue ahí).
        </li>
        <li>
          <Btn icon={<RotateCcw className="h-3.5 w-3.5" />} label="Restart" /> — reinicia sin
          re-build. Útil para forzar release de memoria o re-leer envs.
        </li>
      </ul>
    </Section>
  )
}

// Mini demo cards. Mantienen el visual real pero con datos estáticos.
function DemoCardShell({ children }: { children: React.ReactNode }) {
  return <Card className="h-full flex flex-col p-4 gap-3 overflow-hidden">{children}</Card>
}

function DotInline({ tone }: { tone: keyof typeof DOT }) {
  return <span className={`inline-block h-2 w-2 rounded-full align-middle ${DOT[tone]}`} aria-hidden />
}

function DemoHeader({
  name,
  fqdn,
  tone,
  statusText,
  extraBadge,
}: {
  name: string
  fqdn?: string
  tone: keyof typeof DOT
  statusText: string
  extraBadge?: React.ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <h3 className="text-sm font-semibold leading-tight truncate">{name}</h3>
          {extraBadge}
        </div>
        {fqdn && (
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{fqdn}</span>
          </div>
        )}
      </div>
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium shrink-0 ${TEXT_TONE[tone]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
        {statusText}
      </span>
    </header>
  )
}

function GitGrid({ rows }: { rows: Array<{ k: string; v: React.ReactNode }> }) {
  return (
    <dl className="text-[11px] font-mono space-y-0.5">
      {rows.map((r) => (
        <div key={r.k} className="flex gap-2 min-w-0">
          <dt className="text-muted-foreground/70 w-12 shrink-0">{r.k}</dt>
          <dd className="truncate">{r.v}</dd>
        </div>
      ))}
    </dl>
  )
}

function DeploySection({ tone, status, when, trigger }: { tone: keyof typeof DOT; status: string; when: string; trigger: string }) {
  return (
    <div className="text-[11px] min-w-0 space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
        Last deploy
      </p>
      <div className="font-mono">
        <span className={TEXT_TONE[tone] + " font-medium"}>{status}</span>
        <span className="mx-1 opacity-50">·</span>
        <span className="text-muted-foreground">{when}</span>
        <span className="mx-1 opacity-50">·</span>
        <span className="text-muted-foreground">via {trigger}</span>
      </div>
    </div>
  )
}

function DemoCoolifyCardSucceededExited() {
  return (
    <DemoCardShell>
      <DemoHeader name="my-api" fqdn="api.example.com" tone="stopped" statusText="exited" />
      <GitGrid
        rows={[
          { k: "repo", v: "TechX-Mx/my-api" },
          { k: "branch", v: <><GitBranch className="inline h-3 w-3 mr-0.5 opacity-60" />main</> },
          { k: "sha", v: "84cf872" },
        ]}
      />
      <DeploySection tone="running" status="Succeeded" when="2h ago" trigger="webhook" />
      <ExplainBox>
        El build pasó pero el contenedor está apagado (lo paraste manualmente o crasheó después).{" "}
        <strong>Acción esperada</strong>: Start.
      </ExplainBox>
    </DemoCardShell>
  )
}

function DemoCoolifyCardRebuilding() {
  return (
    <DemoCardShell>
      <DemoHeader name="my-api" fqdn="api.example.com" tone="pending" statusText="rebuilding" />
      <GitGrid
        rows={[
          { k: "repo", v: "TechX-Mx/my-api" },
          { k: "branch", v: <><GitBranch className="inline h-3 w-3 mr-0.5 opacity-60" />main</> },
          { k: "sha", v: "a12c3f4" },
        ]}
      />
      <DeploySection tone="pending" status="Running" when="started 30s ago" trigger="manual" />
      <ExplainBox>
        Está deployando ahora. El pill cambia a verde cuando termine. Si tarda más de 5 min el
        polling se mantiene rápido cada 5s.
      </ExplainBox>
    </DemoCardShell>
  )
}

function DemoCoolifyCardRunning() {
  return (
    <DemoCardShell>
      <DemoHeader name="frontend" fqdn="app.example.com" tone="running" statusText="running" />
      <GitGrid
        rows={[
          { k: "repo", v: "TechX-Mx/frontend" },
          { k: "branch", v: <><GitBranch className="inline h-3 w-3 mr-0.5 opacity-60" />main</> },
          { k: "sha", v: "fa3c771" },
        ]}
      />
      <DeploySection tone="running" status="Succeeded" when="1h ago · in 2m 14s" trigger="webhook" />
      <ExplainBox>Todo OK: corriendo y último deploy verde.</ExplainBox>
    </DemoCardShell>
  )
}

function DemoCoolifyCardFailed() {
  return (
    <DemoCardShell>
      <DemoHeader name="worker" tone="stopped" statusText="exited" />
      <GitGrid
        rows={[
          { k: "repo", v: "TechX-Mx/worker" },
          { k: "branch", v: <><GitBranch className="inline h-3 w-3 mr-0.5 opacity-60" />main</> },
          { k: "sha", v: "9b2c1d8" },
        ]}
      />
      <DeploySection tone="error" status="Failed" when="finished 12m ago" trigger="webhook" />
      <ExplainBox>
        El último deploy falló — por eso el contenedor sigue parado en la versión vieja (o ni se
        creó si era el primer deploy). Revisá logs del build en Coolify.
      </ExplainBox>
    </DemoCardShell>
  )
}

// ============================================================
// 3) ArgoCD cards
// ============================================================

function ArgoSection() {
  return (
    <Section
      title="Cards de ArgoCD"
      subtitle="Una card de Argo NO es un contenedor — es una Application que agrupa N Deployments en Kubernetes. Por eso se ve distinto."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <DemoArgoCardHealthy />
        <DemoArgoCardOutOfSync />
      </div>

      <h4 className="text-sm font-semibold mt-6 mb-2">Dos estados, no uno</h4>
      <p className="text-sm text-muted-foreground">
        En Argo el header muestra dos cosas separadas con un <code>·</code> en el medio:
      </p>
      <ul className="text-sm space-y-1.5 mt-2 list-disc list-inside text-muted-foreground">
        <li>
          <strong>Health</strong> — si los pods están corriendo y respondiendo (
          <span className="text-emerald-600 dark:text-emerald-400">Healthy</span> /{" "}
          <span className="text-amber-600 dark:text-amber-400">Progressing</span> /{" "}
          <span className="text-rose-600 dark:text-rose-400">Degraded</span> / Suspended / Missing).
        </li>
        <li>
          <strong>Sync</strong> — si lo que está corriendo coincide con el repo de manifestos (
          <span className="text-emerald-600 dark:text-emerald-400">Synced</span> /{" "}
          <span className="text-amber-600 dark:text-amber-400">OutOfSync</span> / Unknown).
        </li>
      </ul>
      <Callout
        title="Healthy + OutOfSync es normal"
        body={
          <p>
            Significa que el cluster está corriendo pero el repo tiene cambios sin aplicar. Hace
            falta apretar <Btn icon={<PlayCircle className="h-3.5 w-3.5" />} label="Sync" /> (o
            esperar al cron de Argo) para que aplique lo nuevo.
          </p>
        }
      />

      <h4 className="text-sm font-semibold mt-6 mb-2">El bloque expandible "deployments"</h4>
      <p className="text-sm text-muted-foreground">
        Una Argo App suele agrupar 2-3 Deployments (backend, worker, etc.). El bloque{" "}
        <code>N deployments · X/Y ready</code> se expande mostrando cada uno con sus réplicas y SHA
        individuales:
      </p>
      <div className="mt-3 max-w-md">
        <DemoArgoCardHealthy />
      </div>

      <Callout
        title="¿De dónde sale el SHA por deployment?"
        body={
          <p>
            Del <strong>image tag</strong>. Los deploys siguen la convención{" "}
            <code>prod-&lt;sha40&gt;</code> (ej{" "}
            <code className="text-[11px]">prod-2a1e529e8bbc53a248288a610dd3e6b6c1e2e4e7</code>). Eso
            apunta al commit real del repo del <em>código</em>, no al de manifests.
          </p>
        }
      />

      <h4 className="text-sm font-semibold mt-6 mb-2">Botones</h4>
      <ul className="text-sm space-y-1.5 list-disc list-inside text-muted-foreground">
        <li>
          <Btn icon={<PlayCircle className="h-3.5 w-3.5" />} label="Sync" /> — aplica los manifests
          del repo al cluster (kubectl apply). Es la única acción que muta el cluster.
        </li>
        <li>
          <Btn icon={<RefreshCw className="h-3.5 w-3.5" />} label="Refresh" /> — Argo re-lee el repo
          y recalcula si hay drift. NO muta nada. Útil para forzar la detección de un commit nuevo.
        </li>
        <li>
          <Btn icon={<FileText className="h-3.5 w-3.5" />} label="Logs" /> — abre el viewer con
          filtros por workload (deployment) y por pod individual.
        </li>
      </ul>
    </Section>
  )
}

function ArgoBadge() {
  return (
    <span className="shrink-0 inline-flex items-center gap-1 rounded-sm border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400">
      ArgoCD
    </span>
  )
}
function EnvBadge({ env }: { env: "prod" | "staging" }) {
  const cls =
    env === "prod"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400"
      : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
  return (
    <span className={`shrink-0 inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {env}
    </span>
  )
}

function ArgoHeader({
  name,
  env,
  health,
  sync,
}: {
  name: string
  env: "prod" | "staging"
  health: { tone: keyof typeof DOT; label: string }
  sync: { tone: keyof typeof DOT; label: string }
}) {
  const headerTone: keyof typeof DOT =
    health.tone === "error" || sync.tone === "error"
      ? "error"
      : health.tone === "pending" || sync.tone === "pending"
        ? "pending"
        : "running"
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <h3 className="text-sm font-semibold leading-tight truncate">{name}</h3>
          <ArgoBadge />
          <EnvBadge env={env} />
        </div>
      </div>
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium shrink-0 ${TEXT_TONE[headerTone]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[headerTone]}`} aria-hidden />
        {health.label}
        <span className="opacity-50">·</span>
        <span className="text-muted-foreground">{sync.label}</span>
      </span>
    </header>
  )
}

function DeploymentChip({
  name,
  ready,
  desired,
  tone,
  sha,
}: {
  name: string
  ready: number
  desired: number
  tone: keyof typeof DOT
  sha: string
}) {
  return (
    <div className="text-[11px] px-2 py-1.5 rounded border border-border/60 bg-muted/30">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="font-medium truncate">{name}</span>
        <span className={`inline-flex items-center gap-1 shrink-0 ${TEXT_TONE[tone]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
          <span className="tabular-nums">
            {ready}/{desired}
          </span>
        </span>
      </div>
      <div className="font-mono text-[10px] text-muted-foreground tabular-nums truncate">
        sha {sha}
      </div>
    </div>
  )
}

function DemoArgoCardHealthy() {
  return (
    <DemoCardShell>
      <ArgoHeader
        name="myapp-prod"
        env="prod"
        health={{ tone: "running", label: "Healthy" }}
        sync={{ tone: "running", label: "Synced" }}
      />
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <ExternalLink className="h-3 w-3" aria-hidden />
        <span className="truncate">api.example.com</span>
      </div>
      <GitGrid
        rows={[
          { k: "repo", v: "TechX-Mx/myapp-manifest" },
          { k: "target", v: <><GitBranch className="inline h-3 w-3 mr-0.5 opacity-60" />main</> },
          { k: "sha", v: "84cf872" },
          { k: "synced", v: "10m ago" },
        ]}
      />
      <div className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded border border-border bg-muted/30">
        <span className="font-medium">3 deployments · 4/4 ready</span>
        <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <DeploymentChip name="backend" ready={2} desired={2} tone="running" sha="2a1e529" />
        <DeploymentChip name="worker" ready={1} desired={1} tone="running" sha="f150ea7" />
        <DeploymentChip name="cron" ready={1} desired={1} tone="running" sha="f150ea7" />
      </div>
    </DemoCardShell>
  )
}

function DemoArgoCardOutOfSync() {
  return (
    <DemoCardShell>
      <ArgoHeader
        name="myapp-staging"
        env="staging"
        health={{ tone: "running", label: "Healthy" }}
        sync={{ tone: "pending", label: "OutOfSync" }}
      />
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <ExternalLink className="h-3 w-3" aria-hidden />
        <span className="truncate">test.example.com</span>
      </div>
      <GitGrid
        rows={[
          { k: "repo", v: "TechX-Mx/myapp-manifest" },
          { k: "target", v: <><GitBranch className="inline h-3 w-3 mr-0.5 opacity-60" />main</> },
          { k: "sha", v: "84cf872" },
          { k: "synced", v: "2h ago" },
        ]}
      />
      <ExplainBox>
        Los pods están sanos pero el repo tiene cambios sin aplicar. Apretá{" "}
        <Btn icon={<PlayCircle className="h-3.5 w-3.5" />} label="Sync" /> para deployar lo último,
        o esperá al cron.
      </ExplainBox>
    </DemoCardShell>
  )
}

// ============================================================
// 4) GitOps vs Coolify
// ============================================================

function GitOpsSection() {
  return (
    <Section
      title="¿Por qué Argo se ve distinto de Coolify?"
      subtitle="Coolify y ArgoCD resuelven el mismo problema (deployar apps) pero con modelos opuestos. Lo que en Coolify es 1 click, en Argo es una operación de Git."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
            Coolify (clásico)
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>1 card = 1 contenedor (o stack docker-compose).</li>
            <li>Cada branch (main/staging) tiene su propio app Coolify.</li>
            <li>
              <strong>Deploy</strong> = push a esa branch → Coolify buildea la image y reinicia el
              contenedor.
            </li>
            <li>Start / Stop / Restart se hacen contra el contenedor directamente.</li>
            <li>Env vars se editan en la UI y se aplican al reiniciar.</li>
          </ul>
        </Card>

        <Card className="p-4 space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            ArgoCD (GitOps)
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>1 card = 1 Application (= N Deployments K8s adentro).</li>
            <li>
              <strong>Solo hay un repo de manifestos</strong>, branch <code>main</code> siempre. El
              ambiente lo decide la carpeta:{" "}
              <code>overlays/prod</code> vs <code>overlays/staging</code>.
            </li>
            <li>
              <strong>Deploy</strong> = commit en el repo de manifestos cambiando el image tag →
              Argo sincroniza solo (o lo forzás con <em>Sync</em>).
            </li>
            <li>
              No hay Start/Stop/Restart sobre la app. Para "apagar" se hace PR con{" "}
              <code>replicas: 0</code>.
            </li>
            <li>
              Env vars vienen de ConfigMaps/Secrets en el cluster — no se editan acá; PR al repo.
            </li>
          </ul>
        </Card>
      </div>

      <Callout
        title="Por qué siempre dice branch: main en Argo"
        body={
          <>
            <p>
              Argo no trackea el repo de tu <strong>código</strong>, trackea el repo de{" "}
              <strong>manifestos</strong> (los YAMLs de Kubernetes). Ese repo es uno solo y su
              branch normalmente es <code>main</code>. La distinción prod/staging se ve en el badge
              de ambiente del header (<EnvBadge env="prod" /> <EnvBadge env="staging" />), no en la
              branch.
            </p>
            <p className="mt-1">
              El SHA del último commit del <em>código</em> se ve dentro del bloque expandible, por
              cada deployment (sale del image tag).
            </p>
          </>
        }
      />
    </Section>
  )
}

// ============================================================
// 5) Logs
// ============================================================

function LogsSection() {
  return (
    <Section
      title="Logs"
      subtitle="El viewer es el mismo para Coolify y Argo, pero los filtros se interpretan distinto según la fuente."
    >
      <ul className="text-sm space-y-1.5 list-disc list-inside text-muted-foreground">
        <li>
          <strong>Container</strong> filtra el servicio dentro del proyecto:
          <ul className="ml-5 list-disc text-xs mt-1">
            <li>
              Coolify: el <em>compose service</em> (backend, frontend, redis, …).
            </li>
            <li>
              Argo: el nombre del <em>Deployment</em> (backend, worker, …).
            </li>
          </ul>
        </li>
        <li>
          <strong>Pod</strong> aparece solo cuando hay ≥2 réplicas. Filtra el pod individual; al
          cambiar de container se resetea automáticamente para no mezclar replicas de otro workload.
        </li>
        <li>
          <strong>Live tail</strong>: se re-fetchea cada 3s. Pausá auto-scroll si querés revisar
          algo sin que la pantalla salte.
        </li>
        <li>
          <strong>Buscar</strong> filtra el cliente local (no se re-pega a Loki) — útil para hacer
          highlight rápido. Para queries más complejas, usar el campo de filter en el toolbar (acepta
          fragmentos LogQL como <code>|= "ERROR"</code>).
        </li>
      </ul>
    </Section>
  )
}

// ============================================================
// Small primitives
// ============================================================

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Callout({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-xs text-foreground space-y-1">
      <p className="font-medium text-sky-700 dark:text-sky-300">{title}</p>
      <div className="text-muted-foreground">{body}</div>
    </div>
  )
}

function ExplainBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5 leading-relaxed">
      {children}
    </p>
  )
}

function Btn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium">
      {icon}
      {label}
    </span>
  )
}
