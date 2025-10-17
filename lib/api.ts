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
  registerDeveloper: async (userData: { email: string; password: string; username: string }) => {
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
  assignProject: async (userId: string, projectId: string) => {
    const response = await api.post("/user-projects", { userId, projectId })
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
  getServerLogs: async (projectId: string, lines = 100) => {
    const response = await api.get(`/actions/${projectId}/logs`,
      {
        params: { lines },
      }
    )
    return response.data
  },
}
