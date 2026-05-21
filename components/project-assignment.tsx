"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { projectsAPI, usersAPI } from "@/lib/api"
import { Plus, Minus, RefreshCw, Search } from "lucide-react"

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
  description?: string
  coolifyAppId?: string
  // El source decide qué set de permisos aplica: para Coolify mostramos
  // Start/Stop/Restart/EnvVars/Logs; para Argo solo Sync (reusa canStart)
  // y Logs — el resto no tiene equivalente en GitOps.
  source?: "coolify" | "argocd"
  permissions?: ProjectPermissions
}

// Defaults para fallback de proyectos ya asignados (sin permissions en la respuesta).
const DEFAULT_PERMS: ProjectPermissions = {
  canStart: false,
  canStop: false,
  canRestart: false,
  canAccessEnvs: false,
  canAccessLogs: true,
}

// Defaults para asignaciones nuevas (lo que el admin ve preseleccionado en
// los toggles de "Available projects"). Logs viene en true por convención.
const DEFAULT_PENDING_PERMS: ProjectPermissions = {
  canStart: false,
  canStop: false,
  canRestart: false,
  canAccessEnvs: false,
  canAccessLogs: true,
}

type PermissionField = { key: keyof ProjectPermissions; label: string; help?: string }

// Coolify (default): conjunto histórico de acciones del compose.
const PERMISSION_FIELDS_COOLIFY: PermissionField[] = [
  { key: "canStart", label: "Start" },
  { key: "canStop", label: "Stop" },
  { key: "canRestart", label: "Restart" },
  { key: "canAccessEnvs", label: "Env vars" },
  { key: "canAccessLogs", label: "Logs" },
]

// ArgoCD: en GitOps no hay Start/Stop/Restart explícitos ni endpoint de
// env vars (las envs viven en ConfigMaps/Secrets que se cargan al sync).
// "Sync" reusa canStart por simplicidad (ver project-argocd-integration);
// Refresh es read-only y siempre disponible para asignados.
const PERMISSION_FIELDS_ARGO: PermissionField[] = [
  { key: "canStart", label: "Sync", help: "Permite disparar Sync de la Argo Application." },
  { key: "canAccessLogs", label: "Logs" },
]

const getPermissionFields = (source?: Project["source"]): PermissionField[] =>
  source === "argocd" ? PERMISSION_FIELDS_ARGO : PERMISSION_FIELDS_COOLIFY

interface ProjectAssignmentProps {
  userId: string
  userEmail: string
  userRole?: string
  onClose?: () => void
}

export function ProjectAssignment({ userId, userEmail, userRole, onClose }: ProjectAssignmentProps) {
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [availableSearchTerm, setAvailableSearchTerm] = useState("")
  const [assignedSearchTerm, setAssignedSearchTerm] = useState("")
  // Permisos pendientes para proyectos que aún no se asignaron (clave: projectId)
  const [pendingPerms, setPendingPerms] = useState<Record<string, ProjectPermissions>>({})

  const getPendingPerms = (projectId: string): ProjectPermissions =>
    pendingPerms[projectId] || DEFAULT_PENDING_PERMS

  const togglePendingPerm = (projectId: string, key: keyof ProjectPermissions) => {
    setPendingPerms((prev) => {
      const current = prev[projectId] || DEFAULT_PENDING_PERMS
      return { ...prev, [projectId]: { ...current, [key]: !current[key] } }
    })
  }

  const toggleAssignedPerm = async (
    project: Project,
    key: keyof ProjectPermissions,
  ) => {
    const current = project.permissions || DEFAULT_PERMS
    const next = { ...current, [key]: !current[key] }

    // Optimistic update
    setAssignedProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, permissions: next } : p)),
    )

    try {
      await usersAPI.updateProjectPermissions(userId, project.id, { [key]: next[key] })
    } catch {
      // Revert
      setAssignedProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, permissions: current } : p)),
      )
      toast({
        title: "Error",
        description: "No se pudo actualizar el permiso",
        variant: "destructive",
      })
    }
  }

  // Filtered projects based on search terms
  const filteredAvailableProjects = useMemo(() => {
    if (!availableSearchTerm.trim()) return availableProjects
    return availableProjects.filter(project =>
      project.name.toLowerCase().includes(availableSearchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(availableSearchTerm.toLowerCase())
    )
  }, [availableProjects, availableSearchTerm])

  const filteredAssignedProjects = useMemo(() => {
    if (!assignedSearchTerm.trim()) return assignedProjects
    return assignedProjects.filter(project =>
      project.name.toLowerCase().includes(assignedSearchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(assignedSearchTerm.toLowerCase())
    )
  }, [assignedProjects, assignedSearchTerm])

  const loadProjects = async (silent = false) => {
    try {
      setRefreshing(true)
      const [available, assigned] = await Promise.all([
        projectsAPI.getAvailableProjects(userId),
        projectsAPI.getAssignedProjects(userId)
      ])
      
      setAvailableProjects(available)
      setAssignedProjects(assigned)
    } catch (error) {
      // Solo mostrar error si no es una carga silenciosa en segundo plano
      if (!silent) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los proyectos",
          variant: "destructive",
        })
      }
    } finally {
      setRefreshing(false)
    }
  }

  const assignProject = async (projectId: string) => {
    // Encontrar el proyecto en la lista de disponibles
    const projectToAssign = availableProjects.find(p => p.id === projectId)

    if (!projectToAssign) return

    const perms = getPendingPerms(projectId)

    // Actualización optimista de la UI (instantánea)
    setAvailableProjects(prev => prev.filter(p => p.id !== projectId))
    setAssignedProjects(prev => [...prev, { ...projectToAssign, permissions: perms }])

    try {
      setLoading(true)
      await usersAPI.assignProject(userId, projectId, perms)

      // Limpiar el state pendiente del proyecto recién asignado
      setPendingPerms((prev) => {
        const { [projectId]: _, ...rest } = prev
        return rest
      })

      toast({
        title: "Proyecto asignado",
        description: "El proyecto se asignó correctamente al usuario",
      })
      
      // Recargar en segundo plano para asegurar sincronización (silencioso)
      loadProjects(true)
    } catch (error: any) {
      // Revertir cambios optimistas en caso de error
      setAvailableProjects(prev => [...prev, projectToAssign])
      setAssignedProjects(prev => prev.filter(p => p.id !== projectId))

      // Detectar error 409 (conflicto - proyecto ya asignado)
      if (error?.response?.status === 409) {
        toast({
          title: "Proyecto ya asignado",
          description: "Este proyecto ya está asignado a este usuario",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "No se pudo asignar el proyecto",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const unassignProject = async (projectId: string) => {
    // Encontrar el proyecto en la lista de asignados
    const projectToUnassign = assignedProjects.find(p => p.id === projectId)
    
    if (!projectToUnassign) return

    // Actualización optimista de la UI (instantánea)
    setAssignedProjects(prev => prev.filter(p => p.id !== projectId))
    setAvailableProjects(prev => [...prev, projectToUnassign])

    try {
      setLoading(true)
      await usersAPI.unassignProject(userId, projectId)
      
      toast({
        title: "Proyecto desasignado",
        description: "El proyecto se desasignó correctamente del usuario",
      })
      
      // Recargar en segundo plano para asegurar sincronización (silencioso)
      loadProjects(true)
    } catch (error) {
      // Revertir cambios optimistas en caso de error
      setAssignedProjects(prev => [...prev, projectToUnassign])
      setAvailableProjects(prev => prev.filter(p => p.id !== projectId))

      toast({
        title: "Error",
        description: "No se pudo desasignar el proyecto",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [userId])

  // If user is admin, show informational message
  if (userRole === "admin") {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Project Assignment Not Available
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Admin users do not need project assignments as they have access to the admin panel instead of the developer dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadProjects()}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">
            Available Projects ({availableSearchTerm.trim() ? filteredAvailableProjects.length : availableProjects.length})
          </TabsTrigger>
          <TabsTrigger value="assigned">
            Assigned Projects ({assignedSearchTerm.trim() ? filteredAssignedProjects.length : assignedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Available Projects to Assign
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search available projects by name..."
                  value={availableSearchTerm}
                  onChange={(e) => setAvailableSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredAvailableProjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {availableSearchTerm.trim() 
                    ? `No projects found matching "${availableSearchTerm}"`
                    : "No projects available to assign"
                  }
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAvailableProjects.map((project) => {
                    const perms = getPendingPerms(project.id)
                    return (
                      <Card
                        key={project.id}
                        className="relative h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                                <CardTitle
                                  className="text-base truncate min-w-0"
                                  title={project.name}
                                >
                                  {project.name}
                                </CardTitle>
                                {project.source === "argocd" && (
                                  <span
                                    className="shrink-0 inline-flex items-center rounded-sm border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400"
                                    title="Proyecto gestionado por ArgoCD — los permisos disponibles son Sync y Logs (Refresh siempre disponible al asignar)."
                                  >
                                    ArgoCD
                                  </span>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              Available
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto space-y-3 min-w-0">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5">
                              Permissions on assign
                            </p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                              {getPermissionFields(project.source).map(({ key, label }) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 text-sm cursor-pointer select-none min-w-0"
                                >
                                  <Checkbox
                                    checked={perms[key]}
                                    onCheckedChange={() => togglePendingPerm(project.id, key)}
                                    aria-label={label}
                                  />
                                  <span className="truncate">{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => assignProject(project.id)}
                            disabled={loading}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
                            Assign Project
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Minus className="h-5 w-5" />
                Assigned Projects to User
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assigned projects by name..."
                  value={assignedSearchTerm}
                  onChange={(e) => setAssignedSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredAssignedProjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {assignedSearchTerm.trim() 
                    ? `No projects found matching "${assignedSearchTerm}"`
                    : "User has no assigned projects"
                  }
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAssignedProjects.map((project) => {
                    const perms = project.permissions || DEFAULT_PERMS
                    return (
                      <Card
                        key={project.id}
                        className="relative h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                                <CardTitle
                                  className="text-base truncate min-w-0"
                                  title={project.name}
                                >
                                  {project.name}
                                </CardTitle>
                                {project.source === "argocd" && (
                                  <span
                                    className="shrink-0 inline-flex items-center rounded-sm border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400"
                                    title="Proyecto gestionado por ArgoCD — los permisos disponibles son Sync y Logs (Refresh siempre disponible al asignar)."
                                  >
                                    ArgoCD
                                  </span>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="default" className="shrink-0">
                              Assigned
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto space-y-3 min-w-0">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5">
                              Permissions
                            </p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                              {getPermissionFields(project.source).map(({ key, label }) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 text-sm cursor-pointer select-none min-w-0"
                                >
                                  <Checkbox
                                    checked={perms[key]}
                                    onCheckedChange={() => toggleAssignedPerm(project, key)}
                                    aria-label={label}
                                  />
                                  <span className="truncate">{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => unassignProject(project.id)}
                            disabled={loading}
                            className="w-full"
                          >
                            <Minus className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
                            Remove Project
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}