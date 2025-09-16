"use client"

import { useEffect, useRef, useCallback } from "react"
import { useAuth } from "./use-auth"

interface UseTokenValidationOptions {
  /**
   * Interval in milliseconds for token validation
   * Default: 2 minutes (120000ms)
   */
  interval?: number
  /**
   * Whether to validate token on window focus
   * Default: true
   */
  validateOnFocus?: boolean
  /**
   * Whether to validate token on page visibility change
   * Default: true
   */
  validateOnVisibility?: boolean
}

/**
 * Hook for automatic token validation with configurable options
 * Use this in critical pages that need frequent token verification
 */
export function useTokenValidation(options: UseTokenValidationOptions = {}) {
  const {
    interval = 10 * 60 * 1000, // 10 minutes (increased from 2)
    validateOnFocus = true,
    validateOnVisibility = true,
  } = options

  const { isAuthenticated, validateToken } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastValidationRef = useRef<number>(0)

  // Throttle validation to prevent excessive API calls
  const throttledValidation = useCallback(() => {
    const now = Date.now()
    const timeSinceLastValidation = now - lastValidationRef.current
    
    // Only validate if it's been more than 2 minutes since last validation
    if (timeSinceLastValidation > 2 * 60 * 1000) {
      lastValidationRef.current = now
      validateToken()
    }
  }, [validateToken])

  // Handle window focus validation
  useEffect(() => {
    if (!validateOnFocus || !isAuthenticated) return

    const handleFocus = () => {
      throttledValidation()
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [validateOnFocus, isAuthenticated, throttledValidation])

  // Handle visibility change validation
  useEffect(() => {
    if (!validateOnVisibility || !isAuthenticated) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        throttledValidation()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [validateOnVisibility, isAuthenticated, throttledValidation])

  // Handle periodic validation
  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Set up periodic validation
    intervalRef.current = setInterval(() => {
      throttledValidation()
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isAuthenticated, interval, throttledValidation])

  return {
    validateToken,
    isAuthenticated,
  }
}