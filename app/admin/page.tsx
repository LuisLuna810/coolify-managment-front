"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { usersAPI } from "@/lib/api"
import { UserTable } from "@/components/user-table"
import { AdminLogsPanel } from "@/components/admin-logs-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Users, FileText } from "lucide-react"

interface User {
  id: string
  username: string
  email: string
  role: "admin" | "developer"
  isActive: boolean
}

export default function AdminPage() {
  const { user, logout } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState("")

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
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getUsers()
      setUsers(data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const handleUserUpdate = () => {
    fetchUsers()
  }

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                </div>
                <Button variant="outline" onClick={handleLogout} disabled={loggingOut} className="flex items-center gap-2 bg-transparent">
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
              <h3 className="font-semibold text-lg">Loading admin dashboard...</h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we prepare your admin panel
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
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            </div>
            <Button variant="outline" onClick={handleLogout} disabled={loggingOut} className="flex items-center gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">User Management</h2>
              <p className="text-muted-foreground">Manage users, roles, and project assignments</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <UserTable users={users} onUserUpdate={handleUserUpdate} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <AdminLogsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
