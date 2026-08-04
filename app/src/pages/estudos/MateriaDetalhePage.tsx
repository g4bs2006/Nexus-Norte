import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonPagina } from '@/components/Skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  faltasRestantes,
  mediaMateria,
  mediaProjetada,
  proximaAvaliacao,
  riscoReprovacao,
} from '@/features/estudos/calculos'
import {
  useAvaliacoes,
  useConfigMedia,
  useDocumentos,
  useExcluirMateria,
  useFaltas,
  useMaterias,
  useRegistroListas,
  useSessoes,
} from '@/features/estudos/hooks'
import { AbaAvaliacoes } from '@/features/estudos/componentes/AbaAvaliacoes'
import { AbaDocumentos } from '@/features/estudos/componentes/AbaDocumentos'
import { AbaFaltas } from '@/features/estudos/componentes/AbaFaltas'
import { AbaListas } from '@/features/estudos/componentes/AbaListas'
import { AbaSessoes } from '@/features/estudos/componentes/AbaSessoes'
import { DialogMateria } from '@/features/estudos/componentes/DialogMateria'
import type { Status } from '@/features/estudos/types'

const ROTULO_STATUS: Record<Status, string> = {
  ok: 'Tranquilo',
  atencao: 'Atenção',
  risco: 'Risco de reprovação',
}

const CLASSE_STATUS: Record<Status, string> = {
  ok: 'text-status-ok',
  atencao: 'text-status-atencao',
  risco: 'text-status-risco',
}

export default function MateriaDetalhePage() {
  const { materiaId } = useParams<{ materiaId: string }>()
  const navigate = useNavigate()
  const hoje = useMemo(() => new Date(), [])

  const materias = useMaterias()
  const avaliacoes = useAvaliacoes()
  const faltas = useFaltas()
  const sessoes = useSessoes()
  const config = useConfigMedia(materiaId)
  const documentos = useDocumentos(materiaId)
  const registros = useRegistroListas(materiaId)
  const excluirMateria = useExcluirMateria()

  const materia = materias.data?.find((item) => item.id === materiaId)

  const daMateria = useMemo(
    () =>
      (avaliacoes.data ?? []).filter(
        (avaliacao) => avaliacao.materia_id === materiaId,
      ),
    [avaliacoes.data, materiaId],
  )

  const faltasDaMateria = useMemo(
    () => (faltas.data ?? []).filter((falta) => falta.materia_id === materiaId),
    [faltas.data, materiaId],
  )

  const sessoesDaMateria = useMemo(
    () =>
      (sessoes.data ?? []).filter((sessao) => sessao.materia_id === materiaId),
    [sessoes.data, materiaId],
  )

  if (materias.isPending) {
    return (
      <>
        <PageHeader titulo="Matéria" pilar="estudos" />
        <SkeletonPagina variante="detalhe" />
      </>
    )
  }

  if (!materia || !materiaId) {
    return (
      <>
        <PageHeader
          titulo="Matéria não encontrada"
          descricao="Esta matéria não existe ou foi excluída."
          pilar="estudos"
        />
        <Button asChild variant="secondary" size="sm">
          <Link to="/estudos">
            <ArrowLeft className="size-4" />
            Voltar para Estudos
          </Link>
        </Button>
      </>
    )
  }

  const configMedia = config.data ?? null
  const media = mediaMateria(daMateria, configMedia)
  const projetada = mediaProjetada(daMateria, configMedia)
  const restantes = faltasRestantes(
    materia.limite_faltas,
    faltasDaMateria.length,
  )
  const status = riscoReprovacao({
    mediaProjetada: projetada,
    faltasRestantes: restantes,
    limiteFaltas: materia.limite_faltas,
  })
  const proxima = proximaAvaliacao(daMateria, hoje)

  return (
    <>
      <PageHeader
        titulo={materia.nome}
        descricao={
          [materia.professor, materia.semestre].filter(Boolean).join(' · ') ||
          undefined
        }
        pilar="estudos"
        acoes={
          <div className="flex items-center gap-1">
            <DialogMateria materia={materia} />
            <DialogConfirmarExclusao
              titulo="Excluir matéria"
              mensagem={`Todas as avaliações, faltas, sessões e documentos de "${materia.nome}" serão excluídos. Essa ação não pode ser desfeita.`}
              onConfirmar={async () => {
                await excluirMateria.mutateAsync(materia.id)
                navigate('/estudos')
              }}
              pendente={excluirMateria.isPending}
            />
            <Button asChild variant="ghost" size="sm">
              <Link to="/estudos">
                <ArrowLeft className="size-4" />
                Voltar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-xs">Média atual</p>
              <p className="metric-lg">
                {media === null ? '—' : media.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Média projetada</p>
              <p className="metric-lg">
                {projetada === null ? '—' : projetada.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Faltas restantes</p>
              <p className="metric-lg">
                {materia.limite_faltas === 0 ? '—' : restantes}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Situação</p>
              <Badge
                variant="secondary"
                className={cn('font-normal', CLASSE_STATUS[status])}
              >
                {ROTULO_STATUS[status]}
              </Badge>
              {proxima && (
                <p className="text-muted-foreground text-xs">
                  {proxima.avaliacao.nome} em{' '}
                  {proxima.dias === 0 ? 'hoje' : `${proxima.dias} dias`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="avaliacoes">
          <TabsList>
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
            <TabsTrigger value="faltas">Faltas</TabsTrigger>
            <TabsTrigger value="sessoes">Sessões</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="listas">Listas</TabsTrigger>
          </TabsList>

          <TabsContent value="avaliacoes" className="mt-5">
            <AbaAvaliacoes
              materiaId={materiaId}
              avaliacoes={daMateria}
              config={configMedia}
            />
          </TabsContent>

          <TabsContent value="faltas" className="mt-5">
            <AbaFaltas
              materiaId={materiaId}
              faltas={faltasDaMateria}
              limiteFaltas={materia.limite_faltas}
              hoje={hoje}
            />
          </TabsContent>

          <TabsContent value="sessoes" className="mt-5">
            <AbaSessoes
              materiaId={materiaId}
              sessoes={sessoesDaMateria}
              hoje={hoje}
            />
          </TabsContent>

          <TabsContent value="documentos" className="mt-5">
            <AbaDocumentos
              materiaId={materiaId}
              documentos={documentos.data ?? []}
            />
          </TabsContent>

          <TabsContent value="listas" className="mt-5">
            <AbaListas
              materiaId={materiaId}
              registros={registros.data ?? []}
              hoje={hoje}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
