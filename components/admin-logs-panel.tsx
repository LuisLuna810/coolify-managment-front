"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { logsAPI, usersAPI, projectsAPI } from "@/lib/api"
import {
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Download,
    X
} from "lucide-react"
import { format } from "date-fns"

interface ActionLog {
    id: string
    action: string
    timestamp: string
    user: {
        id: string
        username: string
        email: string
    }
    project: {
        id: string
        name: string
    }
}

interface LogResponse {
    logs: ActionLog[]
    total: number
    limit: number
    offset: number
}

interface User {
    id: string
    username: string
    email: string
}

interface Project {
    id: string
    name: string
}

export function AdminLogsPanel() {
    const [logsData, setLogsData] = useState<LogResponse | null>(null)
    const [users, setUsers] = useState<User[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    // Filters
    const [filters, setFilters] = useState({
        limit: 25,
        offset: 0,
        userId: 'all',
        projectId: 'all',
        action: 'all'
    })

    const { toast } = useToast()

    const actionTypes = [
        { value: 'all', label: 'All Actions' },
        { value: 'start', label: 'Start Project' },
        { value: 'stop', label: 'Stop Project' },
        { value: 'restart', label: 'Restart Project' },
        { value: 'env-list', label: 'List Environment Variables' },
        { value: 'env-update', label: 'Update Environment Variables' },
        { value: 'get-logs', label: 'Get Project Logs' },
    ]

    const loadLogs = async (newFilters = filters) => {
        try {
            setLoading(true)
            // Convert 'all' values to empty string for the API
            const apiFilters = {
                ...newFilters,
                userId: newFilters.userId === 'all' ? undefined : newFilters.userId,
                projectId: newFilters.projectId === 'all' ? undefined : newFilters.projectId,
                action: newFilters.action === 'all' ? undefined : newFilters.action,
            }
            const response = await logsAPI.getLogs(apiFilters)
            setLogsData(response)
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to load logs",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const loadUsers = async () => {
        try {
            const data = await usersAPI.getUsers()
            setUsers(data)
        } catch (error) {
            // Silent fail for users
        }
    }

    const loadProjects = async () => {
        try {
            const data = await projectsAPI.getAllProjects()
            setProjects(data)
        } catch (error) {
            // Silent fail for projects
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadLogs()
        setRefreshing(false)
    }

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value, offset: 0 }
        setFilters(newFilters)
        loadLogs(newFilters)
    }

    const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
        // Removed date functionality
    }

    const clearFilters = () => {
        const clearedFilters = {
            limit: 25,
            offset: 0,
            userId: 'all',
            projectId: 'all',
            action: 'all'
        }
        setFilters(clearedFilters)
        loadLogs(clearedFilters)
    }

    const handlePagination = (direction: 'prev' | 'next') => {
        if (!logsData) return

        const newOffset = direction === 'next'
            ? filters.offset + filters.limit
            : Math.max(0, filters.offset - filters.limit)

        const newFilters = { ...filters, offset: newOffset }
        setFilters(newFilters)
        loadLogs(newFilters)
    }

    const exportLogs = async () => {
        try {
            const exportFilters = {
                ...filters,
                userId: filters.userId === 'all' ? undefined : filters.userId,
                projectId: filters.projectId === 'all' ? undefined : filters.projectId,
                action: filters.action === 'all' ? undefined : filters.action,
                limit: 1000,
                offset: 0
            }
            const allLogsResponse = await logsAPI.getLogs(exportFilters)
            const csv = [
                'Timestamp,Username,Action,Project,User Email',
                ...allLogsResponse.logs.map((log: ActionLog) =>
                    `${log.timestamp},${log.user.username},${log.action},${log.project.name},${log.user.email}`
                )
            ].join('\n')

            const blob = new Blob([csv], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `admin-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
            a.click()
            window.URL.revokeObjectURL(url)

            toast({
                title: "Success",
                description: "Logs exported successfully",
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to export logs",
                variant: "destructive",
            })
        }
    }

    const getActionBadgeVariant = (action: string) => {
        switch (action) {
            case 'start': return 'default'
            case 'stop': return 'destructive'
            case 'restart': return 'secondary'
            case 'env-update': return 'outline'
            default: return 'secondary'
        }
    }

    const getActionLabel = (action: string) => {
        const actionType = actionTypes.find(t => t.value === action)
        return actionType ? actionType.label : action
    }

    useEffect(() => {
        loadLogs()
        loadUsers()
        loadProjects()
    }, [])

    const currentPage = Math.floor(filters.offset / filters.limit) + 1
    const totalPages = logsData ? Math.ceil(logsData.total / filters.limit) : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Admin Activity Logs</h2>
                    <p className="text-muted-foreground">
                        Monitor user actions and system activity
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportLogs}
                        disabled={!logsData || logsData.logs.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* User Filter */}
                        <div className="space-y-2">
                            <Label>User</Label>
                            <Select value={filters.userId} onValueChange={(value) => handleFilterChange('userId', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Users" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.username}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Project Filter */}
                        <div className="space-y-2">
                            <Label>Project</Label>
                            <Select value={filters.projectId} onValueChange={(value) => handleFilterChange('projectId', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Action Filter */}
                        <div className="space-y-2">
                            <Label>Action Type</Label>
                            <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    {actionTypes.map((action) => (
                                        <SelectItem key={action.value} value={action.value}>
                                            {action.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Limit Filter */}
                        <div className="space-y-2">
                            <Label>Results per page</Label>
                            <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-2" />
                            Clear Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Activity Logs</CardTitle>
                        <div className="text-sm text-muted-foreground">
                            {logsData && (
                                <>
                                    Showing {logsData.logs.length} of {logsData.total} results
                                    {logsData.total > 0 && (
                                        <> (Page {currentPage} of {totalPages})</>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                            Loading logs...
                        </div>
                    ) : !logsData || logsData.logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No logs found with the current filters
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Timestamp</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Project</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logsData.logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium">
                                                            {format(new Date(log.timestamp), "MMM dd, yyyy")}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {format(new Date(log.timestamp), "HH:mm:ss")}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium">{log.user.username}</div>
                                                        <div className="text-sm text-muted-foreground">{log.user.email}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getActionBadgeVariant(log.action)}>
                                                        {getActionLabel(log.action)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{log.project.name}</div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        Results {filters.offset + 1} - {Math.min(filters.offset + filters.limit, logsData.total)} of {logsData.total}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePagination('prev')}
                                            disabled={filters.offset === 0}
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Previous
                                        </Button>
                                        <div className="text-sm">
                                            Page {currentPage} of {totalPages}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePagination('next')}
                                            disabled={filters.offset + filters.limit >= logsData.total}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}