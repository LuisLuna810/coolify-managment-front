"use client"

import { Pin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Botón de fijar/desfijar para las cards. Mismo estilo que el botón de
// actualizar/sync del header (ghost, h-6 w-6, icono h-3): solo cambia el color
// + relleno del icono cuando está fijado. stopPropagation para no disparar
// acciones de la card.
export function PinButton({
  pinned,
  onToggle,
}: {
  pinned: boolean
  onToggle: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={pinned}
      aria-label={pinned ? "Desfijar proyecto" : "Fijar proyecto arriba"}
      title={pinned ? "Desfijar" : "Fijar arriba"}
      className={cn(
        "h-6 w-6 p-0",
        pinned
          ? "text-primary hover:text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Pin className={cn("h-3 w-3", pinned && "fill-current")} />
    </Button>
  )
}
