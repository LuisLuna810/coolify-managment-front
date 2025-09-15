"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { projectsAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface EnvValue {
  key: string
  value: string
  created_at?: string
  updated_at?: string
  uuid?: string
}

interface EnvVariable {
  key: string
  value: EnvValue
}

interface EnvModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onClose: () => void
}

export function EnvModal({ projectId, projectName, isOpen, onClose }: EnvModalProps) {
  const [envVars, setEnvVars] = useState<EnvVariable[]>([])
  const [envText, setEnvText] = useState("")
  const [originalText, setOriginalText] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchEnvVars()
    }
  }, [isOpen, projectId])

  const fetchEnvVars = async () => {
    setLoading(true)
    try {
      const data = await projectsAPI.getEnvs(projectId)
      const envArray: EnvVariable[] = Object.entries(data).map(([key, value]) => ({
        key,
        value: typeof value === "object"
          ? (value as EnvValue)
          : { key, value: value as string }
      }))
      // 1. Filtrar las que no tienen value
      const filtered = envArray.filter(env => env.value?.value && env.value.value.trim() !== "")

      // 2. Eliminar duplicados por key (nos quedamos con la última)
      const unique = Object.values(
        filtered.reduce((acc, env) => {
          acc[env.value.key] = env
          return acc
        }, {} as Record<string, EnvVariable>)
      )

      setEnvVars(envArray)

      // Generar texto en formato KEY=VALUE
      const text = (unique as EnvVariable[])
        .map(env => `${env.value.key}=${env.value.value}`)
        .join("\n")
      setEnvText(text)
      setOriginalText(text)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load environment variables",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const lines = envText.split("\n").filter(line => line.includes("="))

      for (const line of lines) {
        const [key, value] = line.split("=")
        if (key && value !== undefined) {
          await projectsAPI.updateEnv(projectId, key.trim(), value.trim())
        }
      }

      setOriginalText(envText)
      toast({
        title: "Success",
        description: "Environment variables saved successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save environment variables",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = envText !== originalText

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="
    w-[90vw] max-w-[90vw] 
    sm:w-[80vw] sm:max-w-[80vw]
    lg:w-[70vw] lg:max-w-[70vw]
    max-h-[80vh] overflow-y-auto
  ">
        <DialogHeader>
          <DialogTitle>Environment Variables</DialogTitle>
          <DialogDescription>Manage environment variables for {projectName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="">
              {loading ? (
                <p className="text-muted-foreground">Loading environment variables...</p>
              ) : (
                <Textarea
                  className="w-full h-64 font-mono text-sm"
                  value={envText}
                  //onChange={(e) => setEnvText(e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          {/* <Button
            onClick={handleSaveAll}
            disabled={!hasChanges || saving}
            className="w-full"
          >
            {saving ? "Saving..." : "Save All Environment Variables"}
          </Button> */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
