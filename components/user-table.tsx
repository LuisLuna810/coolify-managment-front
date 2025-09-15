"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, UserX, UserCheck, Settings, FolderPlus } from "lucide-react"
import { usersAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ProjectAssignment } from "@/components/project-assignment"

interface User {
  id: string
  username: string
  email: string
  role: "admin" | "developer"
  isActive: boolean
}

interface UserTableProps {
  users: User[]
  onUserUpdate: () => void
}

export function UserTable({ users, onUserUpdate }: UserTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const handleDeactivateUser = async (userId: string) => {
    setLoading(`deactivate-${userId}`)
    try {
      await usersAPI.deactivateUser(userId)
      toast({
        title: "Success",
        description: "User deactivated successfully",
      })
      onUserUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to deactivate user",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleActivateUser = async (userId: string) => {
    setLoading(`activate-${userId}`)
    try {
      await usersAPI.activateUser(userId)
      toast({
        title: "Success",
        description: "User activated successfully",
      })
      onUserUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to activate user",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    setLoading(`delete-${userId}`)
    try {
      await usersAPI.deleteUser(userId)
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      onUserUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete user",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleManageProjects = (user: User) => {
    setSelectedUser(user)
    setShowProjectsModal(true)
  }

  const getRoleColor = (role: string) => {
    return role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(user.isActive)}>{user.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageProjects(user)}
                        className="flex items-center gap-1"
                      >
                        <FolderPlus className="h-3 w-3" />
                        Projects
                      </Button>

                      {user.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateUser(user.id)}
                          disabled={loading === `deactivate-${user.id}`}
                          className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700"
                        >
                          <UserX className="h-3 w-3" />
                          {loading === `deactivate-${user.id}` ? "Deactivating..." : "Deactivate"}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivateUser(user.id)}
                          disabled={loading === `activate-${user.id}`}
                          className="flex items-center gap-1 text-green-600 hover:text-green-700"
                        >
                          <UserCheck className="h-3 w-3" />
                          {loading === `activate-${user.id}` ? "Activating..." : "Activate"}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={loading === `delete-${user.id}`}
                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        {loading === `delete-${user.id}` ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Project Management Modal */}
      <Dialog open={showProjectsModal} onOpenChange={setShowProjectsModal}>
        <DialogContent className="
          w-[95vw] max-w-[95vw] 
          sm:w-[85vw] sm:max-w-[85vw]
          lg:w-[75vw] lg:max-w-[75vw]
          max-h-[85vh] overflow-y-auto
        ">
          <DialogHeader>
            <DialogTitle>Project Management</DialogTitle>
            <DialogDescription>
              Assign and manage projects for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <ProjectAssignment
              userId={selectedUser.id}
              userEmail={selectedUser.email}
              onClose={() => setShowProjectsModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
