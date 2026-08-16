import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Link2, NotebookPen, Plus, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deISO } from '@/lib/datas'
import { useNotasDaMateria, useVincularNotaASessao } from '../hooks'
import { DialogNota } from './DialogNota'

interface DialogVincularNotaProps {
  sessaoId: string
  materiaId: string
  sessaoData: string
  /** Nota atualmente vinculada a esta sessão, se houver. */
  notaVinculada?: { id: string; slug: string; titulo: string } | null
  trigger?: ReactNode
}

/**
 * Diálogo para vincular uma nota existente (ou criar uma nova) a uma sessão de estudo.
 */
export function DialogVincularNota({
  sessaoId,
  materiaId,
  sessaoData,
  notaVinculada,
  trigger,
}: DialogVincularNotaProps) {
  const [aberto, setAberto] = useState(false)
  const [notaSelecionadaId, setNotaSelecionadaId] = useState('')

  const notas = useNotasDaMateria(materiaId)
  const vincular = useVincularNotaASessao()
  const navigate = useNavigate()

  useEffect(() => {
    if (!aberto) return
    setNotaSelecionadaId('')
  }, [aberto])

  const listaNotas = notas.data ?? []
  // Notas que podem ser vinculadas (que não estão vinculadas a esta mesma sessão)
  const notasDisponiveis = listaNotas.filter(
    (n) => n.id !== notaVinculada?.id,
  )

  async function confirmarVinculo() {
    if (!notaSelecionadaId) return
    // Se já havia uma vinculada, desvincula a antiga
    if (notaVinculada) {
      await vincular.mutateAsync({ notaId: notaVinculada.id, sessaoId: null })
    }
    await vincular.mutateAsync({ notaId: notaSelecionadaId, sessaoId })
    setAberto(false)
  }

  async function desvincularAtual() {
    if (!notaVinculada) return
    await vincular.mutateAsync({ notaId: notaVinculada.id, sessaoId: null })
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <NotebookPen className="size-4" />
            Anotação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anotação da sessão</DialogTitle>
          <DialogDescription>
            Vincule uma nota existente ou crie uma nova para a sessão de{' '}
            {format(deISO(sessaoData), 'dd/MM/yyyy')}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {notaVinculada && (
            <div className="bg-accent/40 border-border space-y-2.5 rounded-lg border p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">
                  Nota atualmente vinculada
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setAberto(false)
                    navigate(`/notas/${notaVinculada.slug}`)
                  }}
                >
                  <NotebookPen className="size-3.5" />
                  Abrir nota
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{notaVinculada.titulo}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive h-7 text-xs"
                  disabled={vincular.isPending}
                  onClick={() => void desvincularAtual()}
                >
                  <Unlink className="size-3.5" />
                  Desvincular
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {notaVinculada
                ? 'Trocar por outra nota existente'
                : 'Vincular uma nota existente'}
            </Label>
            {notasDisponiveis.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Nenhuma outra nota cadastrada para esta matéria.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Select
                  value={notaSelecionadaId}
                  onValueChange={setNotaSelecionadaId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma nota" />
                  </SelectTrigger>
                  <SelectContent>
                    {notasDisponiveis.map((nota) => (
                      <SelectItem key={nota.id} value={nota.id}>
                        {nota.titulo}
                        {nota.sessao_id && ' (já vinculada a outra sessão)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  disabled={!notaSelecionadaId || vincular.isPending}
                  onClick={() => void confirmarVinculo()}
                >
                  <Link2 className="size-4" />
                  Vincular
                </Button>
              </div>
            )}
          </div>

          <div className="border-border border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Não achou a nota?</p>
                <p className="text-muted-foreground text-xs">
                  Crie uma nova anotação já vinculada a esta sessão.
                </p>
              </div>
              <DialogNota
                materiaId={materiaId}
                sessaoId={sessaoId}
                tituloInicial={`Sessão de ${format(deISO(sessaoData), 'dd/MM')}`}
                trigger={
                  <Button type="button" variant="secondary" size="sm">
                    <Plus className="size-4" />
                    Criar nova
                  </Button>
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
