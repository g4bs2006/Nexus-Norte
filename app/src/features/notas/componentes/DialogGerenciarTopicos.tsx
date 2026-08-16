import { useState } from 'react'
import { Check, Pencil, Search, Tag, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useExcluirTopico, useNotas, useRenomearTopico, useTopicos } from '../hooks'
import type { Topico } from '../types'

interface DialogGerenciarTopicosProps {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
}

/**
 * Diálogo de CRUD completo para gerenciar tópicos (tags/categorias) do workspace.
 *
 * Permite listar, pesquisar, renomear e excluir tópicos órfãos ou existentes.
 */
export function DialogGerenciarTopicos({
  aberto,
  onAbertoChange,
}: DialogGerenciarTopicosProps) {
  const [busca, setBusca] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novoNomeRascunho, setNovoNomeRascunho] = useState('')

  const topicos = useTopicos()
  const notas = useNotas()
  const excluirTopico = useExcluirTopico()
  const renomearTopico = useRenomearTopico()

  const lista = (topicos.data ?? []).filter((t) =>
    t.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  )

  function iniciarEdicao(topico: Topico) {
    setEditandoId(topico.id)
    setNovoNomeRascunho(topico.nome)
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setNovoNomeRascunho('')
  }

  function salvarEdicao(id: string) {
    if (!novoNomeRascunho.trim()) return
    renomearTopico.mutate(
      { id, novoNome: novoNomeRascunho.trim() },
      { onSuccess: () => cancelarEdicao() },
    )
  }

  function contarNotas(topicoSlug: string): number {
    return (notas.data ?? []).filter((nota) =>
      nota.topicos.some((t) => t.slug === topicoSlug),
    ).length
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-4 text-estudos" />
            <span>Gerenciar Tópicos</span>
          </DialogTitle>
          <DialogDescription>
            Organize, renomeie ou exclua os tópicos de assuntos das suas notas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="relative">
            <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar tópicos..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {topicos.isPending ? (
              <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
                Carregando tópicos...
              </div>
            ) : lista.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {busca ? 'Nenhum tópico encontrado com esse termo.' : 'Nenhum tópico cadastrado.'}
              </div>
            ) : (
              lista.map((topico) => {
                const totalNotas = contarNotas(topico.slug)
                const emEdicao = editandoId === topico.id

                return (
                  <div
                    key={topico.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors text-xs"
                  >
                    {emEdicao ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <Input
                          autoFocus
                          value={novoNomeRascunho}
                          onChange={(e) => setNovoNomeRascunho(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') salvarEdicao(topico.id)
                            if (e.key === 'Escape') cancelarEdicao()
                          }}
                          className="h-7 text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-green-600 hover:text-green-700"
                          disabled={renomearTopico.isPending}
                          onClick={() => salvarEdicao(topico.id)}
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                          onClick={cancelarEdicao}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate">
                          <Badge variant="secondary" className="font-normal shrink-0">
                            #{topico.nome}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {totalNotas === 1 ? '1 nota' : `${totalNotas} notas`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            aria-label={`Renomear tópico ${topico.nome}`}
                            onClick={() => iniciarEdicao(topico)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            aria-label={`Excluir tópico ${topico.nome}`}
                            disabled={excluirTopico.isPending}
                            onClick={() => excluirTopico.mutate(topico.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
