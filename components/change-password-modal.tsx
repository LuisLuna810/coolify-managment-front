"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, KeyRound, Loader2, Sparkles, Copy, Check } from "lucide-react"
import { usersAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { generatePassword } from "@/lib/password"

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; username: string; email: string } | null
  onSuccess?: () => void
}

export function ChangePasswordModal({ open, onOpenChange, user, onSuccess }: ChangePasswordModalProps) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const reset = () => {
    setPassword("")
    setConfirm("")
    setError("")
    setLoading(false)
    setShow(false)
    setCopied(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleGenerate = () => {
    const generated = generatePassword(16)
    setPassword(generated)
    setConfirm(generated)
    setShow(true)
    setError("")
    setCopied(false)
  }

  const handleCopy = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)
    setError("")
    try {
      await usersAPI.changePassword(user.id, password)
      toast({
        title: "Contraseña actualizada",
        description: `Se cambió la contraseña de ${user.username}. El usuario deberá volver a iniciar sesión.`,
      })
      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      const msg = err.response?.data?.message || "No se pudo actualizar la contraseña"
      setError(Array.isArray(msg) ? msg.join(", ") : msg)
    } finally {
      setLoading(false)
    }
  }

  const inputType = show ? "text" : "password"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Cambiar contraseña
          </DialogTitle>
          <DialogDescription>
            {user ? `Nueva contraseña para ${user.username} (${user.email})` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-password">Nueva contraseña</Label>
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
                id="new-password"
                type={inputType}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError("")
                  if (copied) setCopied(false)
                }}
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
                  disabled={!password || loading}
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
                  onClick={() => setShow((s) => !s)}
                  disabled={loading}
                  className="h-7 w-7 p-0"
                  title={show ? "Ocultar" : "Mostrar"}
                >
                  {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type={inputType}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value)
                if (error) setError("")
              }}
              disabled={loading}
              required
              minLength={6}
              autoComplete="new-password"
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              Mínimo 6 caracteres. Se cerrarán las sesiones activas.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
