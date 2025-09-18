"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: "admin" | "developer"
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, isAuthenticated, validateToken } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true)
      
      // Si no hay estado de autenticación local, redirigir al login
      if (!isAuthenticated || !user) {
        router.push("/login")
        return
      }

      // Si hay estado local, hacer una validación con el backend
      const isValid = await validateToken()
      
      if (!isValid) {
        router.push("/login")
        return
      }

      // Verificar permisos de rol si es necesario
      if (requiredRole && user.role !== requiredRole) {
        const redirectPath = user.role === "admin" ? "/admin" : "/dashboard"
        router.push(redirectPath)
        return
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [isAuthenticated, user, requiredRole, router, validateToken])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}