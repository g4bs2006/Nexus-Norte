import { useMemo } from 'react'
import { FolderPlus, Pencil, Plus, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { EstadoVazio } from '@/components/EstadoVazio'
import { paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import {
  useAlternarCheckin,
  useAtualizarMeta,
  useCategoriasMetas,
  useCheckinsDoDia,
  useExcluirCategoriaMeta,
  useExcluirMeta,
  useMetas,
  useReordenarMetas,
} from '../hooks'
import {
  agruparPorCategoria,
  moverNaCategoria,
  moverParaCategoria,
  moverParaExtremo,
} from '../ordenacao'
import type { Meta } from '../types'
import { DialogCategoriaMeta } from './DialogCategoriaMeta'
import { DialogMeta } from './DialogMeta'
import { ItemMeta, type AcoesMover } from './ItemMeta'

interface SecaoMetasProps {
  hoje: Date
}

/**
 * Painel de metas da Home, agrupado por categoria.
 *
 * O agrupamento e a reordenação vivem em `ordenacao.ts` — aqui só ficam o
 * layout e a ligação com as mutations. A versão anterior calculava tudo em
 * `useMemo` dentro do componente e reordenava por arrasto HTML5, que não
 * funciona no toque; ver o cabeçalho de `ordenacao.ts`.
 */
export function SecaoMetas({ hoje }: SecaoMetasProps) {
  const { data: metas, isError: erroAoListar } = useMetas()
  const { data: categorias } = useCategoriasMetas()
  const hojeISO = paraISO(hoje)
  const { data: checkinsDoDia } = useCheckinsDoDia(hojeISO)

  const alternarCheckin = useAlternarCheckin()
  const atualizarMeta = useAtualizarMeta()
  const excluirMeta = useExcluirMeta()
  const excluirCategoria = useExcluirCategoriaMeta()
  const reordenarMetas = useReordenarMetas()

  // Memoizados para nao recriar identidade a cada render e invalidar os memos
  // abaixo (e as deps do lint) sem que dado nenhum tenha mudado.
  const listaMetas = useMemo(() => metas ?? [], [metas])
  const listaCategorias = useMemo(() => categorias ?? [], [categorias])

  const feitosHoje = useMemo(
    () =>
      new Set(
        (checkinsDoDia ?? []).filter((c) => c.feito).map((c) => c.meta_id),
      ),
    [checkinsDoDia],
  )

  const grupos = useMemo(
    () => agruparPorCategoria(listaMetas, listaCategorias),
    [listaMetas, listaCategorias],
  )

  /** Reordenação vazia não vira request — `moverNa…` devolve `[]` nas pontas. */
  function aplicar(itens: ReturnType<typeof moverNaCategoria>) {
    if (itens.length > 0) reordenarMetas.mutate(itens)
  }

  function acoesMover(meta: Meta, indice: number, total: number): AcoesMover {
    return {
      podeSubir: indice > 0,
      podeDescer: indice < total - 1,
      onSubir: () => aplicar(moverNaCategoria(listaMetas, meta.id, -1)),
      onDescer: () => aplicar(moverNaCategoria(listaMetas, meta.id, 1)),
      onMoverParaTopo: () =>
        aplicar(moverParaExtremo(listaMetas, meta.id, 'topo')),
      onMoverParaFim: () =>
        aplicar(moverParaExtremo(listaMetas, meta.id, 'fim')),
      categorias: listaCategorias,
      categoriaAtualId: meta.categoria_meta_id ?? null,
      onMoverParaCategoria: (destinoId) =>
        aplicar(moverParaCategoria(listaMetas, meta.id, destinoId)),
    }
  }

  function renderizarMeta(meta: Meta, indice: number, total: number) {
    return (
      <ItemMeta
        key={meta.id}
        meta={meta}
        marcadoHoje={feitosHoje.has(meta.id)}
        onAlternarCheckDiario={(feito) =>
          alternarCheckin.mutate({ metaId: meta.id, data: hojeISO, feito })
        }
        onAlternarConclusao={(concluida) =>
          atualizarMeta.mutate({
            id: meta.id,
            // Reabrir precisa limpar a data, senão a meta volta ativa
            // carregando a marca de quando foi encerrada.
            dados: {
              concluida,
              concluida_em: concluida ? new Date().toISOString() : null,
            },
          })
        }
        onExcluir={() => excluirMeta.mutate(meta.id)}
        mover={acoesMover(meta, indice, total)}
      />
    )
  }

  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader className="border-border/40 flex-row items-center justify-between gap-2 border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Target className="text-primary size-4" />
          <span>Metas e objetivos</span>
        </CardTitle>
        <div className="flex shrink-0 items-center gap-2">
          <DialogCategoriaMeta
            trigger={
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <FolderPlus className="size-3.5" />
                <span className="sr-only sm:not-sr-only">Categoria</span>
              </Button>
            }
          />
          <DialogMeta
            trigger={
              <Button size="sm" className="h-8 gap-1 text-xs">
                <Plus className="size-3.5" />
                <span>Nova meta</span>
              </Button>
            }
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-4">
        {erroAoListar ? (
          <p className="text-status-risco py-6 text-center text-xs">
            Não foi possível carregar as metas. Verifique a conexão e tente
            novamente.
          </p>
        ) : grupos.length === 0 ? (
          <EstadoVazio
            icone={Target}
            titulo="Nenhuma meta ainda"
            descricao="Metas são o que você persegue em qualquer pilar. Crie uma categoria para agrupá-las, ou comece com uma meta solta."
            acao={
              <DialogMeta
                trigger={
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Plus className="size-3.5" />
                    <span>Criar primeira meta</span>
                  </Button>
                }
              />
            }
          />
        ) : (
          grupos.map(({ categoria, metas: metasDoGrupo }) => (
            <div key={categoria?.id ?? 'sem-categoria'} className="space-y-2">
              <div className="group/cat flex items-center justify-between gap-2">
                <h3 className="text-foreground flex min-w-0 items-center gap-2 text-xs font-semibold">
                  {/* Sem categoria — ou categoria sem cor — cai no tom neutro. */}
                  <span
                    aria-hidden
                    className={cn(
                      'size-2.5 shrink-0 rounded-full',
                      !categoria?.cor && 'bg-muted-foreground/50',
                    )}
                    style={
                      categoria?.cor
                        ? { backgroundColor: categoria.cor }
                        : undefined
                    }
                  />
                  <span className="truncate">
                    {categoria?.nome ?? 'Sem categoria'}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[11px] font-normal">
                    ({metasDoGrupo.length})
                  </span>
                </h3>

                {/*
                  Editar e excluir categoria ficavam só no hover — inalcançáveis
                  no celular. Visíveis no toque, revelados no hover em `sm:`.
                */}
                {categoria && (
                  <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/cat:opacity-100 sm:group-focus-within/cat:opacity-100">
                    <DialogCategoriaMeta
                      categoria={categoria}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground size-9 sm:size-6"
                          aria-label={`Editar categoria ${categoria.nome}`}
                        >
                          <Pencil className="size-3.5 sm:size-3" />
                        </Button>
                      }
                    />
                    <DialogConfirmarExclusao
                      titulo="Excluir categoria"
                      mensagem={`A categoria "${categoria.nome}" será removida. As metas continuarão salvas, sem categoria.`}
                      pendente={excluirCategoria.isPending}
                      onConfirmar={() => excluirCategoria.mutate(categoria.id)}
                    />
                  </div>
                )}
              </div>

              {metasDoGrupo.length === 0 ? (
                <p className="text-muted-foreground py-1 pl-4 text-[11px] italic">
                  Nenhuma meta aqui. Mova uma pelo menu de ações da meta.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {metasDoGrupo.map((meta, indice) =>
                    renderizarMeta(meta, indice, metasDoGrupo.length),
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
