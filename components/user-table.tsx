"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, UserX, UserCheck, Settings, FolderPlus, KeyRound, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usersAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { ProjectAssignment } from "@/components/project-assignment"
import { ChangePasswordModal } from "@/components/change-password-modal"

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
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [roleChange, setRoleChange] = useState<{ user: User; nextRole: "admin" | "developer" } | null>(null)
  const { toast } = useToast()
  const { user: currentUser } = useAuth()

  const requestRoleChange = (target: User, nextRole: "admin" | "developer") => {
    if (target.role === nextRole) return
    setRoleChange({ user: target, nextRole })
  }

  const confirmRoleChange = async () => {
    if (!roleChange) return
    const { user: target, nextRole } = roleChange

    setLoading(`role-${target.id}`)
    try {
      await usersAPI.updateUser(target.id, { role: nextRole })
      toast({
        title: "Rol actualizado",
        description: `${target.username} ahora es ${nextRole}.`,
      })
      setRoleChange(null)
      onUserUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "No se pudo cambiar el rol",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

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

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return

    setLoading(`delete-${deleteTarget.id}`)
    try {
      await usersAPI.deleteUser(deleteTarget.id)
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      setDeleteTarget(null)
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
                    {currentUser?.id === user.id ? (
                      <Badge className={getRoleColor(user.role)} title="No podés cambiar tu propio rol">
                        {user.role}
                      </Badge>
                    ) : user.role === "admin" ? (
                      <Badge
                        className={getRoleColor(user.role)}
                        title="No se puede cambiar el rol de un admin"
                      >
                        {user.role}
                      </Badge>
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(v) => requestRoleChange(user, v as "admin" | "developer")}
                        disabled={loading === `role-${user.id}`}
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="developer">developer</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(user.isActive)}>{user.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Only show Projects button for developers */}
                      {user.role === "developer" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageProjects(user)}
                          className="flex items-center gap-1"
                        >
                          <FolderPlus className="h-3 w-3" />
                          Projects
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPasswordTarget(user)}
                        className="flex items-center gap-1"
                        title="Cambiar contraseña"
                      >
                        <KeyRound className="h-3 w-3" />
                        Password
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
                        onClick={() => setDeleteTarget(user)}
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
              userRole={selectedUser.role}
              onClose={() => setShowProjectsModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ChangePasswordModal
        open={passwordTarget !== null}
        onOpenChange={(next) => {
          if (!next) setPasswordTarget(null)
        }}
        user={passwordTarget}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next && loading !== `delete-${deleteTarget?.id}`) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  Vas a eliminar a <span className="font-semibold">{deleteTarget.username}</span> ({deleteTarget.email}).
                  Esta acción no se puede deshacer y sus asignaciones a proyectos se borrarán. Los logs quedan como huérfanos para auditoría.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading === `delete-${deleteTarget?.id}`}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDeleteUser()
              }}
              disabled={loading === `delete-${deleteTarget?.id}`}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading === `delete-${deleteTarget?.id}` ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={roleChange !== null}
        onOpenChange={(next) => {
          if (!next && loading !== `role-${roleChange?.user.id}`) setRoleChange(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar rol</AlertDialogTitle>
            <AlertDialogDescription>
              {roleChange ? (
                <>
                  Vas a cambiar el rol de <span className="font-semibold">{roleChange.user.username}</span> de{" "}
                  <span className="font-semibold">{roleChange.user.role}</span> a{" "}
                  <span className="font-semibold">{roleChange.nextRole}</span>. El usuario tendrá que volver a iniciar sesión.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading === `role-${roleChange?.user.id}`}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmRoleChange()
              }}
              disabled={loading === `role-${roleChange?.user.id}`}
            >
              {loading === `role-${roleChange?.user.id}` ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
