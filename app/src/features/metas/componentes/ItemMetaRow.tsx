import { useState } from 'react'
import { Check, Clock, GripVertical, MoreHorizontal, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Meta } from '../types'
import { DialogEncerrarMeta } from './DialogEncerrarMeta'
import { DialogMeta } from './DialogMeta'

interface ItemMetaRowProps {
  meta: Meta
  marcadoHoje?: boolean
  onAlternarCheckDiario?: (feito: boolean) => void
  onAlternarConclusaoDirecta?: (concluida: boolean) => void
  onExcluir?: () => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDragging?: boolean
  isDropTarget?: boolean
}

export function ItemMetaRow({
  meta,
  marcadoHoje,
  onAlternarCheckDiario,
  onAlternarConclusaoDirecta,
  onExcluir,
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  isDropTarget,
}: ItemMetaRowProps) {
  const [encerrarAberto, setEncerrarAberto] = useState(false)

  const ehHabitoDiario = meta.no_check_diario && !meta.data_alvo
  const checado = meta.concluida || (ehHabitoDiario ? Boolean(marcadoHoje) : meta.concluida)

  function lidarComCliqueCheckbox(checked: boolean) {
    if (ehHabitoDiario && onAlternarCheckDiario) {
      onAlternarCheckDiario(checked)
    } else if (onAlternarConclusaoDirecta) {
      onAlternarConclusaoDirecta(checked)
    }
  }

  return (
    <>
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'group border-border/50 bg-card/60 hover:bg-accent/40 relative flex items-center justify-between gap-2.5 rounded-lg border px-2.5 py-2 text-xs transition-all select-none',
          meta.concluida && 'bg-muted/20 opacity-60',
          isDragging && 'opacity-30 border-dashed border-primary',
          isDropTarget && 'border-t-2 border-t-primary bg-primary/5',
        )}
      >
        <div className="flex min-w-0 items-center gap-2 truncate">
          {/* Drag Handle */}
          {draggable && (
            <span
              className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 transition-opacity group-hover:opacity-100 shrink-0"
              title="Arrastar para reordenar"
            >
              <GripVertical className="size-3.5" />
            </span>
          )}

          <Checkbox
            checked={checado}
            onCheckedChange={(c) => lidarComCliqueCheckbox(Boolean(c))}
            className="border-border size-4 rounded-xs shrink-0"
          />
          <span
            className={cn(
              'text-foreground truncate font-medium transition-colors',
              meta.concluida && 'text-muted-foreground line-through',
            )}
          >
            {meta.titulo}
          </span>

          {/* Indicador de Check Diário */}
          {meta.no_check_diario && (
            <span
              title="Aparece nos checks diários do topo"
              className="flex shrink-0 items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500"
            >
              <Zap className="size-3" />
              <span>Diário</span>
            </span>
          )}

          {/* Badge de Prazo */}
          {meta.data_alvo && !meta.concluida && (
            <span className="text-muted-foreground bg-muted/60 flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px]">
              <Clock className="size-3" />
              <span>
                até{' '}
                {new Date(meta.data_alvo + 'T00:00:00').toLocaleDateString(
                  'pt-BR',
                  { day: '2-digit', month: 'short' },
                )}
              </span>
            </span>
          )}
        </div>

        {/* Menu de Ações da Meta */}
        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground size-6"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DialogMeta
                meta={meta}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Editar Meta
                  </DropdownMenuItem>
                }
              />

              {!meta.concluida && (
                <DropdownMenuItem
                  onClick={() => setEncerrarAberto(true)}
                  className="text-emerald-500 focus:text-emerald-500 font-medium"
                >
                  <Check className="mr-1.5 size-3.5" />
                  <span>Encerrar completamente</span>
                </DropdownMenuItem>
              )}

              {onExcluir && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onExcluir}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    <span>Excluir</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modal Dedicado de Encerramento Definitivo */}
      <DialogEncerrarMeta
        meta={meta}
        aberto={encerrarAberto}
        onOpenChange={setEncerrarAberto}
      />
    </>
  )
}
