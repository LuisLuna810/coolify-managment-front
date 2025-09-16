"use client"

import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { ROUTES, USER_ROLES } from "@/lib/constants"
import { api, authAPI, setApiLogoutHandler } from "@/lib/api"
import { useEffect, useCallback } from "react"

export const useAuth = () => {
  const { user, isAuthenticated, logout, setAuth } = useAuthStore()
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    try {
      // First, clear local state immediately to prevent UI delays
      logout()
      
      // Then try to notify the backend
      try {
        await api.post("/auth/logout")
      } catch (error) {
        // Continue with logout even if backend fails
      }
      
      // Force redirect to login
      router.push(ROUTES.LOGIN)
      router.refresh() // Force page refresh to clear any cached state
      
    } catch (error) {
      // Fallback: still clear local state and redirect
      logout()
      router.push(ROUTES.LOGIN)
      router.refresh()
    }
  }, [logout, router])

  // Register logout handler with API interceptor
  useEffect(() => {
    setApiLogoutHandler(handleLogout)
  }, [handleLogout])

  // Token validation function
  const validateToken = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return false
    }
    
    try {
      // Try /auth/me first - this is the most reliable method
      try {
        const response = await authAPI.me()
        
        // Handle different response structures
        const userData = response.user || response // Backend returns { user: decoded } or just decoded
        
        if (userData && userData.id) {
          // Update user data if it changed
          if (userData.id !== user.id) {
            setAuth(userData)
          }
          
          return true
        } else {
          throw new Error("No user data in response")
        }
      } catch (error: any) {
        // If it's 401, the token is definitely invalid
        if (error.response?.status === 401) {
          throw error
        }
        
        // For network errors or 5xx errors, don't invalidate the session
        if (!error.response || error.response.status >= 500) {
          return true // Assume token is still valid
        }
        
        throw error
      }
      
    } catch (error: any) {
      // Only trigger logout on 401 errors (invalid token)
      if (error.response?.status === 401) {
        return false
      }
      
      // For other errors, don't invalidate the session
      return true
    }
  }, [isAuthenticated, user, setAuth])

  // Automatic token validation on mount and periodically
  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Wait a bit before validating to ensure the app is fully loaded
    const timeoutId = setTimeout(() => {
      validateToken()
    }, 2000) // 2 second delay

    // Regular periodic validation (every 15 minutes)
    const interval = setInterval(() => {
      if (isAuthenticated && user) {
        validateToken()
      }
    }, 15 * 60 * 1000) // 15 minutes

    return () => {
      clearTimeout(timeoutId)
      clearInterval(interval)
    }
  }, [isAuthenticated, user, validateToken])

  const redirectBasedOnRole = (role: "admin" | "developer") => {
    if (role === USER_ROLES.ADMIN) {
      router.push(ROUTES.ADMIN)
    } else if (role === USER_ROLES.DEVELOPER) {
      router.push(ROUTES.DASHBOARD)
    }
  }

  const checkPermission = (requiredRole?: "admin" | "developer") => {
    if (!isAuthenticated || !user) return false
    if (!requiredRole) return true
    return user.role === requiredRole
  }

  return {
    user,
    isAuthenticated,
    setAuth,
    logout: handleLogout,
    validateToken,
    redirectBasedOnRole,
    checkPermission,
  }
}
