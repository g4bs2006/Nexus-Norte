import { useMemo } from 'react'
import { GraduationCap } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EstadoVazio } from '@/components/EstadoVazio'
import { SkeletonPagina } from '@/components/Skeletons'
import { ChecksFluxograma } from '@/components/ChecksFluxograma'
import {
  GradeFluxograma,
  type ItemFluxograma,
} from '@/components/GradeFluxograma'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { paraISO } from '@/lib/datas'
import { ocorrenciasDoDia } from '@/lib/recorrencia'
import {
  faltasRestantes,
  mediaMateria,
  mediaProjetada,
  proximaAvaliacao,
  riscoReprovacao,
} from '@/features/estudos/calculos'
import {
  useAvaliacoes,
  useConclusoes,
  useDefinirConclusao,
  useExcluirFluxograma,
  useFaltas,
  useFluxograma,
  useMaterias,
} from '@/features/estudos/hooks'
import { CardMateria } from '@/features/estudos/componentes/CardMateria'
import { DialogMateria } from '@/features/estudos/componentes/DialogMateria'
import { DialogFluxograma } from '@/features/estudos/componentes/DialogFluxograma'

export default function EstudosPage() {
  const hoje = useMemo(() => new Date(), [])
  const hojeISO = paraISO(hoje)

  const materias = useMaterias()
  const avaliacoes = useAvaliacoes()
  const faltas = useFaltas()
  const fluxograma = useFluxograma()
  const conclusoes = useConclusoes(hojeISO)
  const excluirHorario = useExcluirFluxograma()
  const definirConclusao = useDefinirConclusao()

  const listaMaterias = useMemo(() => materias.data ?? [], [materias.data])
  const listaAvaliacoes = useMemo(
    () => avaliacoes.data ?? [],
    [avaliacoes.data],
  )
  const listaFaltas = useMemo(() => faltas.data ?? [], [faltas.data])
  const listaFluxograma = useMemo(
    () => fluxograma.data ?? [],
    [fluxograma.data],
  )

  const nomePorMateria = useMemo(
    () => new Map(listaMaterias.map((materia) => [materia.id, materia.nome])),
    [listaMaterias],
  )

  /**
   * A média exibida no card vem do campo-resumo `media_atual` (trigger). O
   * cálculo em TS entra apenas como fallback quando o resumo ainda está nulo —
   * assim a Home e esta listagem leem o mesmo número.
   */
  const cards = useMemo(() => {
    return listaMaterias.map((materia) => {
      const daMateria = listaAvaliacoes.filter(
        (avaliacao) => avaliacao.materia_id === materia.id,
      )
      const totalFaltas = listaFaltas.filter(
        (falta) => falta.materia_id === materia.id,
      ).length

      const restantes = faltasRestantes(materia.limite_faltas, totalFaltas)
      const projetada = mediaProjetada(daMateria, null)
      const proxima = proximaAvaliacao(daMateria, hoje)

      return {
        materia,
        media: materia.media_atual ?? mediaMateria(daMateria, null),
        faltasRestantes: restantes,
        status: riscoReprovacao({
          mediaProjetada: projetada,
          faltasRestantes: restantes,
          limiteFaltas: materia.limite_faltas,
        }),
        proxima: proxima
          ? { nome: proxima.avaliacao.nome, dias: proxima.dias }
          : null,
      }
    })
  }, [listaMaterias, listaAvaliacoes, listaFaltas, hoje])

  // Aulas de hoje, derivadas do fluxograma na leitura (plano 3.4)
  const checksDeHoje = useMemo(() => {
    const concluidos = new Set(conclusoes.data ?? [])
    return ocorrenciasDoDia(listaFluxograma, hojeISO).map((ocorrencia) => ({
      fluxogramaId: ocorrencia.regra.id,
      rotulo: nomePorMateria.get(ocorrencia.regra.materia_id) ?? 'Matéria',
      horario: ocorrencia.regra.horario_inicio.slice(0, 5),
      concluido: concluidos.has(ocorrencia.regra.id),
      remarcada: ocorrencia.remarcada,
    }))
  }, [listaFluxograma, hojeISO, conclusoes.data, nomePorMateria])

  const itensGrade: ItemFluxograma[] = useMemo(
    () =>
      listaFluxograma.map((item) => ({
        id: item.id,
        dia_semana: item.dia_semana,
        horario_inicio: item.horario_inicio,
        horario_fim: item.horario_fim,
        rotulo: nomePorMateria.get(item.materia_id) ?? 'Matéria',
      })),
    [listaFluxograma, nomePorMateria],
  )

  if (materias.isPending) {
    return (
      <>
        <PageHeader titulo="Estudos" pilar="estudos" icone={GraduationCap} />
        <SkeletonPagina variante="lista" />
      </>
    )
  }

  if (materias.isError) {
    return (
      <>
        <PageHeader titulo="Estudos" pilar="estudos" icone={GraduationCap} />
        <Card className="border-status-risco/40">
          <CardContent className="text-status-risco text-sm">
            Erro ao carregar: {materias.error.message}
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        titulo="Estudos"
        descricao="Matérias, médias, faltas e sessões de estudo."
        pilar="estudos"
        icone={GraduationCap}
        acoes={
          <>
            <DialogFluxograma materias={listaMaterias} />
            <DialogMateria />
          </>
        }
      />

      {listaMaterias.length === 0 ? (
        <EstadoVazio
          icone={GraduationCap}
          classeCor="text-estudos"
          classeFundo="bg-estudos-soft"
          titulo="Cadastre a primeira matéria"
          descricao="Informe o limite de faltas para o semáforo de risco funcionar. Depois adicione as avaliações e os horários no fluxograma."
          acao={<DialogMateria />}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aulas de hoje</CardTitle>
              <CardDescription>Derivado do fluxograma semanal.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChecksFluxograma
                itens={checksDeHoje}
                vazio="Nenhuma aula prevista para hoje."
                onAlternar={(fluxogramaId, concluido) =>
                  definirConclusao.mutate({
                    fluxogramaId,
                    data: hojeISO,
                    concluido,
                  })
                }
              />
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Matérias</h2>
            <div className="surgir-grupo grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <CardMateria
                  key={card.materia.id}
                  id={card.materia.id}
                  nome={card.materia.nome}
                  professor={card.materia.professor}
                  media={card.media}
                  faltasRestantes={card.faltasRestantes}
                  limiteFaltas={card.materia.limite_faltas}
                  status={card.status}
                  proximaAvaliacao={card.proxima}
                />
              ))}
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fluxograma semanal</CardTitle>
              <CardDescription>
                Padrão recorrente de aulas — a base dos checks diários.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {itensGrade.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum horário cadastrado. Use "Horário" para adicionar.
                </p>
              ) : (
                <GradeFluxograma
                  itens={itensGrade}
                  classeCorPadrao="bg-estudos"
                  onExcluir={(id) => excluirHorario.mutate(id)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
