"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { projectsAPI, usersAPI } from "@/lib/api"
import { Plus, Minus, RefreshCw, Search } from "lucide-react"

interface Project {
  id: string
  name: string
  description?: string
  coolifyAppId: string
}

interface ProjectAssignmentProps {
  userId: string
  userEmail: string
  userRole?: string
  onClose?: () => void
}

export function ProjectAssignment({ userId, userEmail, userRole, onClose }: ProjectAssignmentProps) {
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [availableSearchTerm, setAvailableSearchTerm] = useState("")
  const [assignedSearchTerm, setAssignedSearchTerm] = useState("")

  // Filtered projects based on search terms
  const filteredAvailableProjects = useMemo(() => {
    if (!availableSearchTerm.trim()) return availableProjects
    return availableProjects.filter(project =>
      project.name.toLowerCase().includes(availableSearchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(availableSearchTerm.toLowerCase())
    )
  }, [availableProjects, availableSearchTerm])

  const filteredAssignedProjects = useMemo(() => {
    if (!assignedSearchTerm.trim()) return assignedProjects
    return assignedProjects.filter(project =>
      project.name.toLowerCase().includes(assignedSearchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(assignedSearchTerm.toLowerCase())
    )
  }, [assignedProjects, assignedSearchTerm])

  const loadProjects = async () => {
    try {
      setRefreshing(true)
      const [available, assigned] = await Promise.all([
        projectsAPI.getAvailableProjects(),
        projectsAPI.getAssignedProjects(userId)
      ])
      
      setAvailableProjects(available)
      setAssignedProjects(assigned)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const assignProject = async (projectId: string) => {
    try {
      setLoading(true)
      await usersAPI.assignProject(userId, projectId)
      
      toast({
        title: "Proyecto asignado",
        description: "El proyecto se asignó correctamente al usuario",
      })
      
      await loadProjects() // Reload to update the lists
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo asignar el proyecto",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const unassignProject = async (projectId: string) => {
    try {
      setLoading(true)
      await usersAPI.unassignProject(userId, projectId)
      
      toast({
        title: "Proyecto desasignado",
        description: "El proyecto se desasignó correctamente del usuario",
      })
      
      await loadProjects() // Reload to update the lists
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo desasignar el proyecto",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [userId])

  // If user is admin, show informational message
  if (userRole === "admin") {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Project Assignment Not Available
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Admin users do not need project assignments as they have access to the admin panel instead of the developer dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProjects}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">
            Available Projects ({availableSearchTerm.trim() ? filteredAvailableProjects.length : availableProjects.length})
          </TabsTrigger>
          <TabsTrigger value="assigned">
            Assigned Projects ({assignedSearchTerm.trim() ? filteredAssignedProjects.length : assignedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Available Projects to Assign
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search available projects by name..."
                  value={availableSearchTerm}
                  onChange={(e) => setAvailableSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredAvailableProjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {availableSearchTerm.trim() 
                    ? `No projects found matching "${availableSearchTerm}"`
                    : "No projects available to assign"
                  }
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAvailableProjects.map((project) => (
                    <Card key={project.id} className="relative hover:shadow-md transition-shadow h-full flex flex-col">
                      <CardHeader className="pb-3 flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                            {project.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            Available
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 mt-auto">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => assignProject(project.id)}
                            disabled={loading}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Assign Project
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Minus className="h-5 w-5" />
                Assigned Projects to User
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assigned projects by name..."
                  value={assignedSearchTerm}
                  onChange={(e) => setAssignedSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredAssignedProjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {assignedSearchTerm.trim() 
                    ? `No projects found matching "${assignedSearchTerm}"`
                    : "User has no assigned projects"
                  }
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAssignedProjects.map((project) => (
                    <Card key={project.id} className="relative hover:shadow-md transition-shadow h-full flex flex-col">
                      <CardHeader className="pb-3 flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                            {project.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="default" className="ml-2 shrink-0">
                            Assigned
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 mt-auto">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => unassignProject(project.id)}
                            disabled={loading}
                            className="w-full sm:w-auto"
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Remove Project
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}