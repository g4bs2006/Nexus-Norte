import { useMemo } from 'react'
import { FolderPlus, Pencil, Plus, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { paraISO } from '@/lib/datas'
import {
  useAlternarCheckin,
  useAtualizarMeta,
  useCategoriasMetas,
  useCheckinsDoDia,
  useExcluirCategoriaMeta,
  useExcluirMeta,
  useMetas,
} from '../hooks'
import { DialogCategoriaMeta } from './DialogCategoriaMeta'
import { DialogMeta } from './DialogMeta'
import { ItemMetaRow } from './ItemMetaRow'

interface SecaoMetasHomeProps {
  hoje: Date
}

export function SecaoMetasHome({ hoje }: SecaoMetasHomeProps) {
  const { data: metas } = useMetas()
  const { data: categorias } = useCategoriasMetas()
  const hojeISO = paraISO(hoje)
  const { data: checkinsDoDia } = useCheckinsDoDia(hojeISO)

  const alternarCheckin = useAlternarCheckin()
  const atualizarMeta = useAtualizarMeta()
  const excluirMeta = useExcluirMeta()
  const excluirCategoria = useExcluirCategoriaMeta()

  const checkinsFeitosSet = useMemo(() => {
    const set = new Set<string>()
    ;(checkinsDoDia ?? []).forEach((c) => {
      if (c.feito) set.add(c.meta_id)
    })
    return set
  }, [checkinsDoDia])

  // Agrupamento de metas por categoria
  const grupos = useMemo(() => {
    const listaMetas = metas ?? []
    const listaCategorias = categorias ?? []

    const mapa = new Map<string, typeof listaMetas>()

    // Inicializa grupos
    listaCategorias.forEach((cat) => mapa.set(cat.id, []))
    mapa.set('sem_categoria', [])

    listaMetas.forEach((meta) => {
      const catId = meta.categoria_meta_id ?? 'sem_categoria'
      const atual = mapa.get(catId) ?? []
      mapa.set(catId, [...atual, meta])
    })

    return { mapa, listaCategorias }
  }, [metas, categorias])

  const temAlgumaMeta = (metas ?? []).length > 0 || (categorias ?? []).length > 0

  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader className="border-border/40 flex-row items-center justify-between border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Target className="text-primary size-4" />
          <span>Metas e Objetivos</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <DialogCategoriaMeta
            trigger={
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <FolderPlus className="size-3.5" />
                <span>Categoria</span>
              </Button>
            }
          />
          <DialogMeta
            trigger={
              <Button size="sm" className="h-8 gap-1 text-xs">
                <Plus className="size-3.5" />
                <span>Nova Meta</span>
              </Button>
            }
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-4">
        {!temAlgumaMeta ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-xs">
              Nenhuma meta cadastrada. Clique em "Nova Meta" para começar!
            </p>
          </div>
        ) : (
          <>
            {/* Categorias personalizadas */}
            {grupos.listaCategorias.map((cat) => {
              const itensDaCat = grupos.mapa.get(cat.id) ?? []

              return (
                <div key={cat.id} className="space-y-2">
                  <div className="group/cat flex items-center justify-between">
                    <h3 className="text-foreground flex items-center gap-2 text-xs font-semibold">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.cor }}
                      />
                      <span>{cat.nome}</span>
                      <span className="text-muted-foreground text-[10px] font-normal">
                        ({itensDaCat.length})
                      </span>
                    </h3>

                    <div className="flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                      <DialogCategoriaMeta
                        categoria={cat}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5 text-muted-foreground hover:text-foreground"
                            aria-label={`Editar categoria ${cat.nome}`}
                          >
                            <Pencil className="size-3" />
                          </Button>
                        }
                      />
                      <DialogConfirmarExclusao
                        titulo="Excluir categoria"
                        mensagem={`A categoria "${cat.nome}" será removida. As metas continuarão salvas.`}
                        pendente={excluirCategoria.isPending}
                        onConfirmar={() => excluirCategoria.mutate(cat.id)}
                        classeTrigger="size-5 text-muted-foreground hover:text-destructive"
                      />
                    </div>
                  </div>

                  {itensDaCat.length === 0 ? (
                    <p className="text-muted-foreground text-[11px] italic pl-4 py-1">
                      Nenhuma meta nesta categoria.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {itensDaCat.map((meta) => (
                        <ItemMetaRow
                          key={meta.id}
                          meta={meta}
                          marcadoHoje={checkinsFeitosSet.has(meta.id)}
                          onAlternarCheckDiario={(feito) =>
                            alternarCheckin.mutate({
                              metaId: meta.id,
                              data: hojeISO,
                              feito,
                            })
                          }
                          onAlternarConclusaoDirecta={(concluida) =>
                            atualizarMeta.mutate({
                              id: meta.id,
                              dados: { concluida },
                            })
                          }
                          onExcluir={() => excluirMeta.mutate(meta.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Metas sem categoria */}
            {(() => {
              const semCat = grupos.mapa.get('sem_categoria') ?? []
              if (semCat.length === 0) return null

              return (
                <div className="space-y-2 pt-2">
                  <h3 className="text-foreground flex items-center gap-2 text-xs font-semibold">
                    <span className="bg-muted-foreground/50 size-2.5 rounded-full shrink-0" />
                    <span>Geral / Outras</span>
                    <span className="text-muted-foreground text-[10px] font-normal">
                      ({semCat.length})
                    </span>
                  </h3>
                  <div className="space-y-1.5">
                    {semCat.map((meta) => (
                      <ItemMetaRow
                        key={meta.id}
                        meta={meta}
                        marcadoHoje={checkinsFeitosSet.has(meta.id)}
                        onAlternarCheckDiario={(feito) =>
                          alternarCheckin.mutate({
                            metaId: meta.id,
                            data: hojeISO,
                            feito,
                          })
                        }
                        onAlternarConclusaoDirecta={(concluida) =>
                          atualizarMeta.mutate({
                            id: meta.id,
                            dados: { concluida },
                          })
                        }
                        onExcluir={() => excluirMeta.mutate(meta.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </CardContent>
    </Card>
  )
}
