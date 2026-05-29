"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuthStore } from "@/lib/auth-store"

// Pins por usuario, persistidos en localStorage (preferencia de UI, sin backend).
// Namespaceamos por userId para que admin y dev (o usuarios distintos en el mismo
// navegador) no compartan pins.
const keyFor = (userId?: string) => `pinned-projects:${userId ?? "anon"}`

export function usePinnedProjects() {
  const userId = useAuthStore((s) => s.user?.id)
  // Estado inicial vacío en server y primer render cliente → sin hydration
  // mismatch. Se hidrata desde localStorage al montar / cambiar de usuario.
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(keyFor(userId))
      const arr: string[] = raw ? JSON.parse(raw) : []
      setPinnedIds(new Set(Array.isArray(arr) ? arr : []))
    } catch {
      setPinnedIds(new Set())
    }
  }, [userId])

  const togglePin = useCallback(
    (projectId: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev)
        if (next.has(projectId)) next.delete(projectId)
        else next.add(projectId)
        if (typeof window !== "undefined") {
          localStorage.setItem(keyFor(userId), JSON.stringify([...next]))
        }
        return next
      })
    },
    [userId],
  )

  return { pinnedIds, togglePin }
}
