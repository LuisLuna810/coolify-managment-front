// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL,
  TIMEOUT: 30000, // 30 seconds
}

// Route paths
export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  ADMIN: "/admin",
  HOME: "/",
} as const

// User roles
export const USER_ROLES = {
  ADMIN: "admin",
  DEVELOPER: "developer",
} as const

// Local storage keys
export const STORAGE_KEYS = {
  AUTH: "auth-storage",
} as const
