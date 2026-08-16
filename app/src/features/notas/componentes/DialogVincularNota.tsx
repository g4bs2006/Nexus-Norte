import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Link2, NotebookPen, Plus, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { deISO } from '@/lib/datas'
import { useNotasDaMateria, useVincularNotaASessao } from '../hooks'
import { DialogNota } from './DialogNota'

interface DialogVincularNotaProps {
  sessaoId: string
  materiaId: string
  sessaoData: string
  trigger?: ReactNode
}

/**
 * Diálogo para gerenciar notas vinculadas a uma sessão de estudo.
 * Suporta vincular MÚLTIPLAS notas existentes ou criar novas.
 */
export function DialogVincularNota({
  sessaoId,
  materiaId,
  sessaoData,
  trigger,
}: DialogVincularNotaProps) {
  const [aberto, setAberto] = useState(false)
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())

  const notas = useNotasDaMateria(materiaId)
  const vincular = useVincularNotaASessao()
  const navigate = useNavigate()

  useEffect(() => {
    if (!aberto) return
    setSelecionadas(new Set())
  }, [aberto])

  const listaNotas = notas.data ?? []
  // Notas já vinculadas a ESTA sessão
  const notasVinculadas = listaNotas.filter((n) => n.sessao_id === sessaoId)
  // Notas sem nenhuma sessão vinculada (livres para serem vinculadas)
  const notasDisponiveis = listaNotas.filter((n) => !n.sessao_id)

  function alternarSelecao(id: string) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  async function vincularSelecionadas() {
    if (selecionadas.size === 0) return
    for (const notaId of selecionadas) {
      await vincular.mutateAsync({ notaId, sessaoId })
    }
    setSelecionadas(new Set())
  }

  async function desvincular(notaId: string) {
    await vincular.mutateAsync({ notaId, sessaoId: null })
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <NotebookPen className="size-4" />
            Anotações ({notasVinculadas.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anotações da sessão</DialogTitle>
          <DialogDescription>
            Sessão de {format(deISO(sessaoData), 'dd/MM/yyyy')}. Vincule uma ou mais
            notas de estudo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Seção 1: Notas já vinculadas */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notas vinculadas a esta sessão ({notasVinculadas.length})
            </Label>
            {notasVinculadas.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Nenhuma nota vinculada a esta sessão ainda.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border bg-accent/20">
                {notasVinculadas.map((nota) => (
                  <li
                    key={nota.id}
                    className="flex items-center justify-between gap-2 p-2.5"
                  >
                    <span className="text-sm font-medium truncate min-w-0">
                      {nota.titulo}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setAberto(false)
                          navigate(`/notas/${nota.slug}`)
                        }}
                      >
                        <NotebookPen className="size-3.5" />
                        Abrir
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={vincular.isPending}
                        onClick={() => void desvincular(nota.id)}
                      >
                        <Unlink className="size-3.5" />
                        Desvincular
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Seção 2: Vincular notas existentes */}
          {notasDisponiveis.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vincular outras notas de {notasVinculadas.length > 0 ? 'da matéria' : 'estudo'}
              </Label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-md border p-2">
                {notasDisponiveis.map((nota) => {
                  const checado = selecionadas.has(nota.id)
                  return (
                    <label
                      key={nota.id}
                      className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-accent/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          checked={checado}
                          onCheckedChange={() => alternarSelecao(nota.id)}
                        />
                        <span className="text-xs font-medium truncate">
                          {nota.titulo}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>

              {selecionadas.size > 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="w-full mt-2"
                  disabled={vincular.isPending}
                  onClick={() => void vincularSelecionadas()}
                >
                  <Link2 className="size-4" />
                  Vincular {selecionadas.size} nota(s) selecionada(s)
                </Button>
              )}
            </div>
          )}

          {/* Seção 3: Criar nova nota */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Criar nova anotação</p>
                <p className="text-xs text-muted-foreground">
                  Escreva uma nova nota já vinculada a esta sessão.
                </p>
              </div>
              <DialogNota
                materiaId={materiaId}
                sessaoId={sessaoId}
                tituloInicial={`Sessão de ${format(deISO(sessaoData), 'dd/MM')}`}
                trigger={
                  <Button type="button" variant="secondary" size="sm">
                    <Plus className="size-4" />
                    Nova nota
                  </Button>
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Concluído
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
