"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authAPI } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, AlertCircle, Loader2, Mail, Lock, X } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{email?: string, password?: string}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { setAuth, redirectBasedOnRole } = useAuth()

  // Función para limpiar error con useCallback para evitar re-creaciones
  const clearError = useCallback(() => {
    console.log("Manually clearing error") // Debug log
    setError("")
    setShowError(false)
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current)
      errorTimerRef.current = null
    }
  }, [])

  // Limpiar timer cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current)
      }
    }
  }, [])

  // Debug: Monitorear cambios en el error
  useEffect(() => {
    console.log("Error state changed:", error)
  }, [error])

  // Alternativa: Error persistente que solo se limpia manualmente o con nuevo submit
  const [showError, setShowError] = useState(true)

  const validateFields = () => {
    const errors: {email?: string, password?: string} = {}
    
    if (!email.trim()) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address"
    }
    
    if (!password.trim()) {
      errors.password = "Password is required"
    } else if (password.length < 3) {
      errors.password = "Password must be at least 3 characters"
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Limpiar errores previos y timer
    setError("")
    setShowError(true)
    setFieldErrors({})
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current)
      errorTimerRef.current = null
    }
    
    // Validar campos
    if (!validateFields()) {
      return
    }
    
    setIsLoading(true)
    setAttemptCount(prev => prev + 1)

    try {
      const response = await authAPI.login(email, password)
      const { user } = response
      
      // No limpiar el formulario hasta que la autenticación sea exitosa
      setAuth(user)
      redirectBasedOnRole(user.role)
    } catch (err: any) {
      // No limpiar los campos en caso de error
      const errorMessage = err.response?.data?.message || "Login failed. Please check your credentials and try again."
      console.log("Setting error:", errorMessage) // Debug log
      setError(errorMessage)
      setShowError(true)
      
      // ELIMINAMOS EL TIMER AUTOMÁTICO - El error permanece hasta que el usuario lo cierre o haga nuevo submit
      console.log("Error set, no auto-clear timer") // Debug log
      
      // Si es un error de credenciales, enfocar el campo de contraseña
      if (errorMessage.toLowerCase().includes("credential") || 
          errorMessage.toLowerCase().includes("password") ||
          errorMessage.toLowerCase().includes("invalid")) {
        setTimeout(() => {
          const passwordInput = document.getElementById("password") as HTMLInputElement
          passwordInput?.focus()
          passwordInput?.select()
        }, 100)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    // Solo limpiar errores de validación de campo, NO el error de login
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: undefined }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    // Solo limpiar errores de validación de campo, NO el error de login
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: undefined }))
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-20 shadow-lg">
      <CardHeader className="space-y-4">
        <CardTitle className="text-2xl text-center font-bold">Welcome Back</CardTitle>
        <p className="text-center text-muted-foreground">
          Sign in to your account to continue
        </p>
        {attemptCount > 2 && (
          <Alert variant="destructive" className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Multiple failed attempts detected. Please double-check your credentials.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && showError && (
            <Alert variant="destructive" className="animate-in fade-in duration-300 relative">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium pr-8">{error}</AlertDescription>
              <button
                onClick={clearError}
                className="absolute right-2 top-2 p-1 rounded-sm opacity-70 hover:opacity-100 hover:bg-red-600/20 transition-all"
                type="button"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Close error</span>
              </button>
            </Alert>
          )}

          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleEmailChange}
                className={`pl-10 ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && (
              <p className="text-sm text-red-600 dark:text-red-400 animate-in fade-in duration-200">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                className={`pl-10 pr-10 ${fieldErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-sm text-red-600 dark:text-red-400 animate-in fade-in duration-200">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 font-medium" 
            disabled={isLoading || !email.trim() || !password.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Having trouble? Contact your administrator
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
