"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Square, RotateCcw, Download, Settings, Logs, RefreshCw } from "lucide-react"
import { projectsAPI } from "@/lib/api"
import { EnvModal } from "@/components/env-modal"
import { useToast } from "@/hooks/use-toast"
import { LogsModal } from "./logs-modal"

interface Project {
  id: string
  name: string
  description: string
  status: string
}

interface ProjectStatus {
  status: string
  uuid?: string
  name?: string
  fqdn?: string
  git_repository?: string
  git_commit_sha?: string
  build_pack?: string
  health_check_enabled?: boolean
  created_at?: string
  updated_at?: string
}

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [showEnvModal, setShowEnvModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const { toast } = useToast()

  const handleAction = async (action: string, projectId: string) => {
    setIsLoading(action)
    try {
      let response
      switch (action) {
        case "start":
          response = await projectsAPI.startProject(projectId)
          break
        case "stop":
          response = await projectsAPI.stopProject(projectId)
          break
        case "restart":
          response = await projectsAPI.restartProject(projectId)
          break
        case "pull":
          response = await projectsAPI.pullProject(projectId)
          break
        default:
          throw new Error("Unknown action")
      }

      toast({
        title: "Success",
        description: `Project ${action} completed successfully`,
      })

      // Refresh status after action
      setTimeout(() => {
        fetchProjectStatus()
      }, 2000)

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to ${action} project`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  const fetchProjectStatus = async () => {
    try {
      setStatusLoading(true)
      const status = await projectsAPI.getProjectStatus(project.id)
      setProjectStatus(status)
    } catch (error: any) {
      console.error("Failed to fetch project status:", error)
      // Don't show error toast for status fetch to avoid spam
    } finally {
      setStatusLoading(false)
    }
  }

  const refreshStatus = () => {
    fetchProjectStatus()
  }

  useEffect(() => {
    fetchProjectStatus()
  }, [project.id])

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    
    // Handle compound statuses - extract main status
    if (statusLower.includes("running")) {
      return "bg-green-100 text-green-800 border-green-200"
    }
    
    if (statusLower.includes("exited") || statusLower.includes("stopped")) {
      return "bg-red-100 text-red-800 border-red-200"
    }
    
    // Single status checks
    switch (statusLower) {
      case "started":
      case "healthy":
        return "bg-green-100 text-green-800 border-green-200"
      case "stopped":
      case "exited":
      case "dead":
        return "bg-red-100 text-red-800 border-red-200"
      case "pending":
      case "starting":
      case "stopping":
      case "restarting":
      case "building":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "failed":
      case "error":
      case "degraded":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = () => {
    if (statusLoading) return "Loading..."
    if (projectStatus?.status) {
      // Simplify compound statuses - extract main status
      const status = projectStatus.status
      if (status.includes(":")) {
        return status.split(":")[0] // Take only the part before ":"
      }
      return status
    }
    return project.status || "Unknown"
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(getStatusText())}>
                {getStatusText()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshStatus}
                disabled={statusLoading}
                className="h-6 w-6 p-0"
                title="Refresh project status"
              >
                <RefreshCw className={`h-3 w-3 ${statusLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          {projectStatus && (
            <div className="text-xs text-muted-foreground space-y-1">
              {projectStatus.git_repository && (
                <div>Repo: {projectStatus.git_repository}</div>
              )}
              {projectStatus.git_commit_sha && projectStatus.git_commit_sha !== "HEAD" && (
                <div>Commit: {projectStatus.git_commit_sha.substring(0, 8)}</div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4">
          <div className="flex-1 space-y-4">
            <p className="text-sm text-muted-foreground">{project.description}</p>

            {statusLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Checking status...
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("start", project.id)}
                disabled={isLoading !== null || statusLoading}
                className="flex items-center gap-2"
              >
                <Play className="h-3 w-3" />
                {isLoading === "start" ? "Starting..." : "Start"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("stop", project.id)}
                disabled={isLoading !== null || statusLoading}
                className="flex items-center gap-2"
              >
                <Square className="h-3 w-3" />
                {isLoading === "stop" ? "Stopping..." : "Stop"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("restart", project.id)}
                disabled={isLoading !== null || statusLoading}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-3 w-3" />
                {isLoading === "restart" ? "Restarting..." : "Restart"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLogsModal(true)}
                disabled={isLoading !== null || statusLoading}
                className="flex items-center gap-2"
              >
                <Logs className="h-3 w-3" />
                Logs
              </Button>
            </div>
          </div>

          {/* Environment Variables Button - Always at bottom */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowEnvModal(true)}
            className="w-full flex items-center gap-2 mt-auto"
          >
            <Settings className="h-3 w-3" />
            Environment Variables
          </Button>
        </CardContent>
      </Card>

      <EnvModal
        projectId={project.id}
        projectName={project.name}
        isOpen={showEnvModal}
        onClose={() => setShowEnvModal(false)}
      />
      <LogsModal
        projectId={project.id}
        projectName={project.name}
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
      />
    </>
  )
}
