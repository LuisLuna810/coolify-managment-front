import axios from "axios"
import { API_CONFIG } from "./constants"

// Store logout function to avoid circular dependencies
let logoutFunction: (() => void) | null = null

export const setApiLogoutHandler = (logoutFn: () => void) => {
  logoutFunction = logoutFn
}

export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling authentication errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const status = error.response?.status
    const url = error.config?.url
    
    // Handle 401 errors consistently for token validation
    if (status === 401) {
      // Use the registered logout function if available
      if (logoutFunction) {
        logoutFunction()
      } else if (typeof window !== "undefined") {
        // Fallback to direct redirect if no logout function is registered
        localStorage.removeItem("auth-storage")
        window.location.href = "/login"
      }
    }
    
    return Promise.reject(error)
  },
)

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password })
    return response.data
  },
  logout: async () => {
    const response = await api.post("/auth/logout")
    return response.data
  },
  me: async () => {
    const response = await api.get("/auth/me")
    return response.data
  },
  registerDeveloper: async (userData: {
    email: string
    password: string
    username: string
    role?: "admin" | "developer"
  }) => {
    const response = await api.post("/auth/register-developer", userData)
    return response.data
  },
}

export const projectsAPI = {
  getMyProjects: async () => {
    const response = await api.get("/projects/my")
    return response.data
  },
  getAllProjects: async () => {
    const response = await api.get("/projects")
    return response.data
  },
  syncProjects: async () => {
    const response = await api.get("/projects/sync")
    return response.data
  },
  getAvailableProjects: async (userId: string) => {
    const response = await api.get(`/projects/available/${userId}`)
    return response.data
  },
  getAssignedProjects: async (userId: string) => {
    const response = await api.get(`/projects/assigned/${userId}`)
    return response.data
  },
  startProject: async (projectId: string) => {
    const response = await api.post(`/actions/${projectId}/start`)
    return response.data
  },
  stopProject: async (projectId: string) => {
    const response = await api.post(`/actions/${projectId}/stop`)
    return response.data
  },
  restartProject: async (projectId: string) => {
    const response = await api.post(`/actions/${projectId}/restart`)
    return response.data
  },
  pullProject: async (projectId: string) => {
    const response = await api.post(`/actions/${projectId}/pull`)
    return response.data
  },
  getProjectStatus: async (projectId: string) => {
    const response = await api.get(`/actions/${projectId}/status`)
    return response.data
  },
  getProjectDeployments: async (projectId: string, take = 10, skip = 0) => {
    const response = await api.get(`/actions/${projectId}/deployments`, {
      params: { take, skip },
    })
    return response.data
  },
  getEnvs: async (projectId: string) => {
    const response = await api.get(`/actions/${projectId}/envs`)
    return response.data
  },
  updateEnv: async (projectId: string, key: string, value: string) => {
    const response = await api.post(`/actions/${projectId}/envs`, { key, value })
    return response.data
  },
}

export const usersAPI = {
  getUsers: async () => {
    const response = await api.get("/users")
    return response.data
  },
  deactivateUser: async (userId: string) => {
    const response = await api.patch(`/users/${userId}`, { isActive: false })
    return response.data
  },
  activateUser: async (userId: string) => {
    const response = await api.patch(`/users/${userId}`, { isActive: true })
    return response.data
  },
  deleteUser: async (userId: string) => {
    const response = await api.delete(`/users/${userId}`)
    return response.data
  },
  changePassword: async (userId: string, password: string) => {
    const response = await api.patch(`/users/${userId}/password`, { password })
    return response.data
  },
  updateUser: async (
    userId: string,
    data: Partial<{ role: "admin" | "developer"; username: string; isActive: boolean }>,
  ) => {
    const response = await api.patch(`/users/${userId}`, data)
    return response.data
  },
  assignProject: async (
    userId: string,
    projectId: string,
    permissions?: {
      canStart?: boolean
      canStop?: boolean
      canRestart?: boolean
      canAccessEnvs?: boolean
      canAccessLogs?: boolean
    },
  ) => {
    const response = await api.post("/user-projects", { userId, projectId, ...(permissions || {}) })
    return response.data
  },
  updateProjectPermissions: async (
    userId: string,
    projectId: string,
    permissions: {
      canStart?: boolean
      canStop?: boolean
      canRestart?: boolean
      canAccessEnvs?: boolean
      canAccessLogs?: boolean
    },
  ) => {
    const response = await api.patch(`/user-projects/user/${userId}/project/${projectId}`, permissions)
    return response.data
  },
  unassignProject: async (userId: string, projectId: string) => {
    const response = await api.delete(`/user-projects/user/${userId}/project/${projectId}`)
    return response.data
  },
  getUserProjects: async (userId: string) => {
    const response = await api.get(`/user-projects/user/${userId}`)
    return response.data
  },
}

// Endpoints específicos de ArgoCD: acciones por proyecto + gestión de instancias.
export const argocdAPI = {
  syncProject: async (projectId: string) => {
    const response = await api.post(`/argocd/projects/${projectId}/sync`)
    return response.data
  },
  refreshProject: async (projectId: string, hard = false) => {
    const response = await api.post(`/argocd/projects/${projectId}/refresh`, { hard })
    return response.data
  },
  listInstances: async () => {
    const response = await api.get("/argocd/instances")
    return response.data
  },
  createInstance: async (body: {
    name: string
    serverUrl: string
    authToken: string
    syncIntervalMs?: number
    insecureSkipTlsVerify?: boolean
    lokiClusterLabels?: Record<string, Record<string, string>>
  }) => {
    const response = await api.post("/argocd/instances", body)
    return response.data
  },
  updateInstance: async (
    id: string,
    body: {
      name?: string
      serverUrl?: string
      authToken?: string
      syncIntervalMs?: number
      enabled?: boolean
      insecureSkipTlsVerify?: boolean
      lokiClusterLabels?: Record<string, Record<string, string>>
    },
  ) => {
    const response = await api.patch(`/argocd/instances/${id}`, body)
    return response.data
  },
  deleteInstance: async (id: string) => {
    const response = await api.delete(`/argocd/instances/${id}`)
    return response.data
  },
  syncInstance: async (id: string) => {
    const response = await api.post(`/argocd/instances/${id}/sync`)
    return response.data
  },
}

export const logsAPI = {
  getLogs: async (filters?: {
    limit?: number;
    offset?: number;
    userId?: string;
    projectId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get("/logs", { params: filters })
    return response.data
  },
  getStats: async () => {
    const response = await api.get("/logs/stats")
    return response.data
  },
  getUserLogs: async (userId: string) => {
    const response = await api.get(`/logs/user/${userId}`)
    return response.data
  },
  getProjectLogs: async (projectId: string) => {
    const response = await api.get(`/logs/project/${projectId}`)
    return response.data
  },
  getProjectContainers: async (projectId: string) => {
    const response = await api.get(`/actions/${projectId}/containers`)
    return response.data
  },
  getServerLogs: async (projectId: string, lines = 100, container?: string) => {
    const response = await api.get(`/actions/${projectId}/logs`,
      {
        params: { lines, container },
      }
    )
    return response.data
  },
  // Logs por container desde Loki (vía /container-logs/:projectId).
  // since: "15m", "1h", "30s", etc. container: compose_service ("backend", "frontend"…)
  getContainerLogs: async (
    projectId: string,
    params?: {
      since?: string
      limit?: number
      container?: string
      pod?: string
      filter?: string
      direction?: "forward" | "backward"
    },
  ): Promise<ContainerLogsResponse> => {
    const response = await api.get(`/container-logs/${projectId}`, { params })
    return response.data
  },
}

export interface ContainerLogEntry {
  ts: string
  container: string
  resource?: string
  environment?: string
  vps?: string
  line: string
}

export interface ContainerLogsResponse {
  projectId: string
  source: "coolify" | "argocd"
  coolifyAppId?: string
  argoAppName?: string
  query: string
  from: string
  to: string
  total: number
  containers: string[]
  pods: string[]
  // Mapping pod-by-container (workload). El back lo arma a partir de los
  // streams de Loki: `container_name`/`compose_service` → pods. El modal de
  // logs usa esto para filtrar el dropdown de pods al workload seleccionado.
  podsByContainer: Record<string, string[]>
  entries: ContainerLogEntry[]
}

// Workload (Deployment K8s) que vive dentro de una Argo Application.
export interface ProjectWorkload {
  id: string
  kind: string
  name: string
  namespace: string
  image: string | null
  imageSha: string | null
  replicasDesired: number
  replicasReady: number
  syncStatus: string | null
  healthStatus: string | null
}
