"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authAPI } from "@/lib/api"
import { UserPlus, Loader2, Eye, EyeOff, Sparkles, Copy, Check } from "lucide-react"
import { generatePassword } from "@/lib/password"
import { useToast } from "@/hooks/use-toast"

type Role = "admin" | "developer"

interface RegisterDeveloperModalProps {
  onSuccess?: () => void
}

export function RegisterDeveloperModal({ onSuccess }: RegisterDeveloperModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState<{
    email: string
    password: string
    username: string
    role: Role
  }>({
    email: "",
    password: "",
    username: "",
    role: "developer",
  })
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError("")
    if (success) setSuccess("")
    if (field === "password" && copied) setCopied(false)
  }

  const handleGenerate = () => {
    const generated = generatePassword(16)
    setFormData(prev => ({ ...prev, password: generated }))
    setShowPassword(true)
    setCopied(false)
    if (error) setError("")
  }

  const handleCopy = async () => {
    if (!formData.password) return
    try {
      await navigator.clipboard.writeText(formData.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Tu navegador bloqueó el portapapeles. Copialo manualmente.",
        variant: "destructive",
      })
    }
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.username) {
      setError("All fields are required")
      return false
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      await authAPI.registerDeveloper(formData)
      setSuccess(
        formData.role === "admin"
          ? "Admin registered successfully!"
          : "Developer registered successfully!",
      )

      setFormData({ email: "", password: "", username: "", role: "developer" })
      setShowPassword(false)
      setCopied(false)

      if (onSuccess) {
        onSuccess()
      }
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to register user"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Register User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Register New User
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              disabled={loading}
              required
              autoComplete="off"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={loading}
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as Role }))}
              disabled={loading}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Los admins tienen acceso completo al panel y gestión de usuarios.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={loading}
                className="h-7 px-2 text-xs"
                title="Generar contraseña segura"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Generar
              </Button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                disabled={loading}
                required
                minLength={6}
                autoComplete="new-password"
                className="pr-20 font-mono"
              />
              <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!formData.password || loading}
                  className="h-7 w-7 p-0"
                  title="Copiar contraseña"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword((s) => !s)}
                  disabled={loading}
                  className="h-7 w-7 p-0"
                  title={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Password must be at least 6 characters long
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                formData.role === "admin" ? "Register Admin" : "Register Developer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}