"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { projectsAPI } from "@/lib/api"
import { ProjectCard } from "@/components/project-card"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

interface Project {
  id: string
  name: string
  description: string
  status: string
}

export default function DashboardPage() {
  return (
    <AuthGuard requiredRole="developer">
      <DashboardContent />
    </AuthGuard>
  )
}

function DashboardContent() {
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogout = async () => {
    if (loggingOut) return // Prevent multiple clicks
    
    setLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      // Even if logout fails, we still want to try again
      setLoggingOut(false)
    }
  }

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectsAPI.getMyProjects()
        setProjects(data)
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load projects")
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Developer Dashboard</h1>
                  <p className="text-sm text-muted-foreground">
                    Welcome back, {user?.username}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Logging out..." : "Logout"}
                </Button>
              </div>
            </div>
          </header>
        </div>

        {/* Loading Overlay */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-background border rounded-lg p-8 shadow-2xl flex flex-col items-center space-y-4 max-w-sm mx-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Loading projects...</h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we fetch your projects
              </p>
              <div className="flex items-center justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Developer Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.username}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            My Projects
          </h2>
          <p className="text-muted-foreground">
            Manage and monitor your assigned projects
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No projects assigned
            </h3>
            <p className="text-muted-foreground">
              Contact your administrator to get projects assigned to you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
