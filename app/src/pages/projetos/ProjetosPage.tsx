import { useMemo } from 'react'
import { FolderKanban } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonPagina } from '@/components/Skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  diasDesdeUltimaAtualizacao,
  momentumBaixo,
  percentualConcluido,
} from '@/features/projetos/calculos'
import { useLogs, useMarcos, useProjetos } from '@/features/projetos/hooks'
import { CardProjeto } from '@/features/projetos/componentes/CardProjeto'
import { DialogProjeto } from '@/features/projetos/componentes/DialogProjeto'
import type { StatusProjeto } from '@/features/projetos/types'

/** Abas do plano 5.3. "Ativos" reúne planejamento e em andamento. */
const ABAS: { valor: string; rotulo: string; status: StatusProjeto[] }[] = [
  { valor: 'ativos', rotulo: 'Ativos', status: ['planejamento', 'em_andamento'] },
  { valor: 'pausados', rotulo: 'Pausados', status: ['pausado'] },
  { valor: 'concluidos', rotulo: 'Concluídos', status: ['concluido'] },
]

export default function ProjetosPage() {
  const hoje = useMemo(() => new Date(), [])

  const projetos = useProjetos()
  const marcos = useMarcos()
  const logs = useLogs()

  const listaProjetos = useMemo(() => projetos.data ?? [], [projetos.data])
  const listaMarcos = useMemo(() => marcos.data ?? [], [marcos.data])
  const listaLogs = useMemo(() => logs.data ?? [], [logs.data])

  const enriquecidos = useMemo(
    () =>
      listaProjetos.map((projeto) => {
        const doProjeto = listaMarcos.filter(
          (marco) => marco.projeto_id === projeto.id,
        )
        const logsDoProjeto = listaLogs.filter(
          (log) => log.projeto_id === projeto.id,
        )
        const dias = diasDesdeUltimaAtualizacao(logsDoProjeto, hoje)

        return {
          projeto,
          percentual: percentualConcluido(doProjeto),
          diasSemAtualizacao: dias,
          momentumBaixo: momentumBaixo(dias),
        }
      }),
    [listaProjetos, listaMarcos, listaLogs, hoje],
  )

  if (projetos.isPending) {
    return (
      <>
        <PageHeader titulo="Projetos"
        pilar="projetos"
        icone={FolderKanban}
      />
        <SkeletonPagina variante="grade" />
      </>
    )
  }

  if (projetos.isError) {
    return (
      <>
        <PageHeader titulo="Projetos"
        pilar="projetos"
        icone={FolderKanban}
      />
        <Card className="border-status-risco/40">
          <CardContent className="text-status-risco text-sm">
            Erro ao carregar: {projetos.error.message}
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        titulo="Projetos"
        descricao="Marcos, log de progresso e momentum."
        pilar="projetos"
        icone={FolderKanban}
        acoes={<DialogProjeto hoje={hoje} />}
      />

      {listaProjetos.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>Nenhum projeto cadastrado ainda.</p>
            <p className="text-xs">
              A ação diária deste pilar é adicionar um log de progresso — os
              cards esfriam quando ficam sem atualização.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="ativos">
          <TabsList>
            {ABAS.map((aba) => {
              const quantidade = enriquecidos.filter((item) =>
                aba.status.includes(item.projeto.status),
              ).length
              return (
                <TabsTrigger key={aba.valor} value={aba.valor}>
                  {aba.rotulo}
                  <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">
                    {quantidade}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {ABAS.map((aba) => {
            const doGrupo = enriquecidos.filter((item) =>
              aba.status.includes(item.projeto.status),
            )
            return (
              <TabsContent key={aba.valor} value={aba.valor} className="mt-5">
                {doGrupo.length === 0 ? (
                  <Card className="border-dashed shadow-none">
                    <CardContent className="text-muted-foreground text-sm">
                      Nenhum projeto nesta situação.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="surgir-grupo grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {doGrupo.map((item) => (
                      <CardProjeto
                        key={item.projeto.id}
                        projeto={item.projeto}
                        percentual={item.percentual}
                        diasSemAtualizacao={item.diasSemAtualizacao}
                        momentumBaixo={item.momentumBaixo}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </>
  )
}
