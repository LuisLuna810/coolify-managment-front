"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { logsAPI } from "@/lib/api"
import { Loader2, RefreshCw, Download, Copy, Search, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LogsModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onClose: () => void
}

export function LogsModal({ projectId, projectName, isOpen, onClose }: LogsModalProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [lines, setLines] = useState(100)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloaded'>('idle')
  const { toast } = useToast()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const data = await logsAPI.getServerLogs(projectId, lines)
      const logString = data.logs || ""
      const logArray = logString.split("\n").filter((line: string) => line.trim() !== "")
      setLogs(logArray)
      setLastUpdated(new Date())
    } catch (err: any) {
      setLogs([`❌ Error: ${err.response?.data?.message || err.message}`])
      toast({
        title: "Error loading logs",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyLogsToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(logs.join("\n"))
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not copy logs",
        variant: "destructive",
      })
    }
  }

  const downloadLogs = () => {
    const element = document.createElement("a")
    const file = new Blob([logs.join("\n")], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${projectName}-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    
    setDownloadStatus('downloaded')
    setTimeout(() => setDownloadStatus('idle'), 2000)
  }

  const filteredLogs = logs.filter((line: string) => 
    searchTerm === "" || line.toLowerCase().includes(searchTerm.toLowerCase())
  )



  useEffect(() => {
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen, lines])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="
        w-[95vw] max-w-[95vw] 
        sm:w-[85vw] sm:max-w-[85vw]
        lg:w-[75vw] lg:max-w-[75vw]
        max-h-[85vh] overflow-hidden flex flex-col
      ">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📋 Project Logs: {projectName}
          </DialogTitle>
          <DialogDescription>
            View and manage your project logs. You can filter, copy or download logs for analysis.
          </DialogDescription>
        </DialogHeader>

        {/* Panel de controles */}
        <div className="flex flex-col gap-4 border-b pb-4">
          {/* Primera fila: Cantidad de logs y botón refresh */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="lines-input" className="text-sm font-medium">
                Number of lines
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="lines-input"
                  type="number"
                  value={lines}
                  onChange={(e) => setLines(Number(e.target.value))}
                  className="w-28"
                  min={10}
                  max={2000}
                  placeholder="100"
                />
                <span className="text-xs text-muted-foreground">
                  (10-2000)
                </span>
              </div>
            </div>

            <Button 
              onClick={fetchLogs} 
              disabled={loading}
              variant="outline"
              className="self-end"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {/* Segunda fila: Búsqueda y acciones */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex flex-col gap-1 flex-1">
              <Label htmlFor="search-input" className="text-sm font-medium">
                Search in logs
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for errors, warnings, etc..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={copyLogsToClipboard} 
                variant="outline" 
                size="sm"
                disabled={logs.length === 0}
                className={copyStatus === 'copied' ? 'bg-green-600 text-white border-green-600' : ''}
              >
                {copyStatus === 'copied' ? (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
              </Button>
              <Button 
                onClick={downloadLogs} 
                variant="outline" 
                size="sm"
                disabled={logs.length === 0}
                className={downloadStatus === 'downloaded' ? 'bg-green-600 text-white border-green-600' : ''}
              >
                {downloadStatus === 'downloaded' ? (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                {downloadStatus === 'downloaded' ? 'Downloaded!' : 'Download'}
              </Button>
            </div>
          </div>

          {/* Información adicional */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">
              Total: {logs.length} líneas
            </Badge>
            {searchTerm && (
              <Badge variant="outline">
                Filtered: {filteredLogs.length} lines
              </Badge>
            )}
            {lastUpdated && (
              <span className="text-muted-foreground">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Área de logs */}
        <div className="flex-1 min-h-0 -mx-6 -mb-6 mt-4">
          <ScrollArea className="h-[400px] w-full bg-slate-800 text-green-400 text-sm font-mono">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center gap-2 text-yellow-400 justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading logs...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-2">📝 No logs available</p>
                  <p className="text-xs text-gray-500">
                    Try refreshing or check if the project is running
                  </p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-yellow-400 mb-2">🔍 No results found</p>
                  <p className="text-xs text-gray-400">
                    No logs match "{searchTerm}"
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredLogs.map((line: string, idx: number) => (
                    <div 
                      key={idx} 
                      className={`
                        leading-relaxed break-all
                        ${line.toLowerCase().includes('error') ? 'text-red-400 bg-red-950/20' : ''}
                        ${line.toLowerCase().includes('warn') ? 'text-yellow-400 bg-yellow-950/20' : ''}
                        ${line.toLowerCase().includes('info') ? 'text-blue-400' : ''}
                        ${searchTerm && line.toLowerCase().includes(searchTerm.toLowerCase()) ? 'bg-yellow-500/20' : ''}
                        px-2 py-1 rounded text-xs
                      `}
                    >
                      <span className="text-gray-500 mr-2 text-xs opacity-70 select-none">
                        {idx + 1}
                      </span>
                      <span className="whitespace-pre-wrap">{line}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
