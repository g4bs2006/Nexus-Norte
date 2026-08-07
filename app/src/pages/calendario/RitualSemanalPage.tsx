import { useMemo, useState } from 'react'
import { addDays } from 'date-fns'
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'
import { deISO, inicioSemana, paraISO } from '@/lib/datas'
import { DIAS_SEMANA } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { expandirRecorrencia } from '@/lib/recorrencia'
import {
  resolverDonoFluxograma,
  type EventoCalendario,
} from '@/features/calendario/eventos'
import { cargaPorDia, formatarCarga } from '@/features/calendario/carga'
import { useFontesCalendario } from '@/features/calendario/hooks'
import {
  alocarSugestao,
  detectarConflitos,
  detectarSobrecarga,
  pressaoDosPrazos,
} from '@/features/calendario/planejador'
import { useMetas } from '@/features/metas/hooks'
import { MenuOcorrencia } from '@/features/fluxograma/componentes/MenuOcorrencia'
import {
  usePlanejamentoCompleto,
  useSalvarPlanejamentoSono,
} from '@/features/sono/hooks'
import {
  useCategorias,
  useCheckDia,
  usePlanejamentoSemana,
  useSalvarCheck,
  useSalvarPlanejamento,
} from '@/features/financeiro/hooks'
import { GradePlanejamentoSemanal } from '@/features/financeiro/componentes/GradePlanejamentoSemanal'

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0] as const

const PASSOS = ['Sono', 'Rotina', 'Estudo e treino', 'Financeiro'] as const

/**
 * Ritual de domingo unificado (resolução 10.48.3).
 *
 * O planejamento semanal existia só no Financeiro
 * (`GradePlanejamentoSemanal`), enquanto a ideia original do sistema era um
 * ritual único. O calendário é o lugar natural para reuni-lo — é a única
 * tela que já enxerga todos os pilares.
 *
 * "Planejei a semana?" (2.4) passa a ser marcado pela conclusão deste
 * fluxo, no fim do passo 4, em vez de um booleano solto na Home.
 */
export default function RitualSemanalPage() {
  const hoje = useMemo(() => new Date(), [])
  const hojeISO = paraISO(hoje)
  const [passo, setPasso] = useState(0)

  // Sempre a PRÓXIMA semana — o ritual de domingo planeja o que vem, não a
  // semana que está terminando.
  const proximaSemana = useMemo(
    () => addDays(inicioSemana(hoje), 7),
    [hoje],
  )
  const semanaInicioISO = paraISO(proximaSemana)
  const intervalo = useMemo(
    () => ({ de: semanaInicioISO, ate: paraISO(addDays(proximaSemana, 6)) }),
    [semanaInicioISO, proximaSemana],
  )

  const salvarCheck = useSalvarCheck()
  const check = useCheckDia(hojeISO)

  async function concluir() {
    await salvarCheck.mutateAsync({
      data: hojeISO,
      campos: { planejamento_semana_feito: true },
    })
  }

  return (
    <>
      <PageHeader
        titulo="Ritual de domingo"
        descricao="Sono, rotina, estudo/treino e financeiro da semana que vem, num fluxo só."
        pilar="sono"
        icone={CalendarCheck}
      />

      <div className="mb-4 flex items-center gap-1.5">
        {PASSOS.map((nome, indice) => (
          <button
            key={nome}
            type="button"
            onClick={() => setPasso(indice)}
            className={cn(
              'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
              indice === passo
                ? 'border-foreground bg-accent'
                : 'border-border text-muted-foreground hover:bg-accent/50',
            )}
          >
            {indice + 1}. {nome}
          </button>
        ))}
      </div>

      {passo === 0 && <PassoSono />}
      {passo === 1 && (
        <PassoRotina semanaInicio={semanaInicioISO} intervalo={intervalo} />
      )}
      {passo === 2 && (
        <PassoEstudoTreino semanaInicio={semanaInicioISO} intervalo={intervalo} />
      )}
      {passo === 3 && <PassoFinanceiro semanaInicio={semanaInicioISO} />}

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={passo === 0}
          onClick={() => setPasso((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft className="size-4" />
          Voltar
        </Button>
        {passo < PASSOS.length - 1 ? (
          <Button onClick={() => setPasso((p) => p + 1)}>
            Próximo
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={() => void concluir()}
            disabled={salvarCheck.isPending}
          >
            {check.data?.planejamento_semana_feito
              ? 'Planejamento concluído ✓'
              : 'Concluir planejamento'}
          </Button>
        )}
      </div>
    </>
  )
}

// --- Passo 1: Sono -----------------------------------------------------------

function PassoSono() {
  const planejamento = usePlanejamentoCompleto()
  const salvar = useSalvarPlanejamentoSono()
  const porDia = new Map((planejamento.data ?? []).map((p) => [p.dia_semana, p]))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metas de sono por dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ORDEM_DIAS.map((dia) => {
          const atual = porDia.get(dia)
          return (
            <div key={dia} className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0 text-sm">
                {DIAS_SEMANA[dia]}
              </span>
              <Input
                type="time"
                className="w-28"
                defaultValue={atual?.hora_dormir_alvo?.slice(0, 5) ?? '23:00'}
                onBlur={(e) =>
                  salvar.mutate({
                    dia_semana: dia,
                    hora_dormir_alvo: e.target.value,
                    hora_acordar_alvo: atual?.hora_acordar_alvo?.slice(0, 5) ?? '07:00',
                  })
                }
              />
              <span className="text-muted-foreground text-xs">até</span>
              <Input
                type="time"
                className="w-28"
                defaultValue={atual?.hora_acordar_alvo?.slice(0, 5) ?? '07:00'}
                onBlur={(e) =>
                  salvar.mutate({
                    dia_semana: dia,
                    hora_dormir_alvo: atual?.hora_dormir_alvo?.slice(0, 5) ?? '23:00',
                    hora_acordar_alvo: e.target.value,
                  })
                }
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// --- Passo 2: Rotina ----------------------------------------------------------

interface PassoRotinaProps {
  semanaInicio: string
  intervalo: { de: string; ate: string }
}

function PassoRotina({ intervalo }: PassoRotinaProps) {
  const { fontes, carga } = useFontesCalendario(intervalo.de, intervalo.ate, {
    comCarga: true,
  })

  const ocorrencias = useMemo(
    () => expandirRecorrencia(fontes.fluxograma, intervalo, fontes.excecoes),
    [fontes.fluxograma, fontes.excecoes, intervalo],
  )

  const eventos: EventoCalendario[] = useMemo(
    () =>
      ocorrencias.map((ocorrencia) => {
        const { nome, camada, tipo, rota } = resolverDonoFluxograma(
          ocorrencia.regra,
          fontes.nomePorMateria,
          fontes.nomePorTreino,
        )
        return {
          id: `fluxograma:${ocorrencia.regra.id}:${ocorrencia.data}`,
          origemId: ocorrencia.regra.id,
          titulo: nome,
          inicio: `${ocorrencia.data}T${ocorrencia.regra.horario_inicio.slice(0, 5)}:00`,
          fim: `${ocorrencia.data}T${ocorrencia.regra.horario_fim.slice(0, 5)}:00`,
          diaInteiro: false,
          camada,
          tipo,
          rota,
        }
      }),
    [ocorrencias, fontes.nomePorMateria, fontes.nomePorTreino],
  )

  const conflitos = useMemo(() => detectarConflitos(eventos), [eventos])
  const dias = useMemo(
    () =>
      cargaPorDia(
        eventos,
        intervalo,
        deISO(intervalo.de),
        fontes.planejamentoSono,
        carga.sonoRealizado,
        carga.conclusoes,
      ),
    [eventos, intervalo, fontes.planejamentoSono, carga],
  )
  const sobrecarga = useMemo(() => detectarSobrecarga(dias), [dias])

  const porDia = new Map<number, typeof ocorrencias>()
  for (const ocorrencia of ocorrencias) {
    const diaSemana = deISO(ocorrencia.data).getDay()
    const lista = porDia.get(diaSemana) ?? []
    lista.push(ocorrencia)
    porDia.set(diaSemana, lista)
  }

  return (
    <div className="space-y-3">
      {(conflitos.length > 0 || sobrecarga.length > 0) && (
        <Card className="border-status-atencao/40">
          <CardContent className="text-status-atencao space-y-1 text-sm">
            {conflitos.map((c) => (
              <p key={`${c.eventoA.id}-${c.eventoB.id}`} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {c.eventoA.titulo} e {c.eventoB.titulo} se sobrepõem em{' '}
                {c.data}.
              </p>
            ))}
            {sobrecarga.map((dia) => (
              <p key={dia.data} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {dia.data} não sobra nenhum tempo livre — a semana não cabe
                como está.
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Confirme a rotina da semana
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ORDEM_DIAS.map((dia) => {
            const doDia = (porDia.get(dia) ?? []).sort((a, b) =>
              a.regra.horario_inicio.localeCompare(b.regra.horario_inicio),
            )
            return (
              <div key={dia} className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium">
                  {DIAS_SEMANA[dia]}
                </p>
                {doDia.length === 0 ? (
                  <p className="text-muted-foreground/60 text-xs">—</p>
                ) : (
                  <ul className="space-y-1">
                    {doDia.map((ocorrencia) => {
                      const { nome } = resolverDonoFluxograma(
                        ocorrencia.regra,
                        fontes.nomePorMateria,
                        fontes.nomePorTreino,
                      )
                      return (
                        <li
                          key={`${ocorrencia.regra.id}-${ocorrencia.data}`}
                          className="border-border bg-card flex items-center gap-1 rounded-md border px-2 py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs">
                              {ocorrencia.remarcada ? `${nome} (remarcado)` : nome}
                            </p>
                            <p className="text-muted-foreground text-[11px] tabular-nums">
                              {ocorrencia.regra.horario_inicio.slice(0, 5)}–
                              {ocorrencia.regra.horario_fim.slice(0, 5)}
                            </p>
                          </div>
                          <MenuOcorrencia
                            fluxogramaId={ocorrencia.regra.id}
                            data={ocorrencia.dataOriginal ?? ocorrencia.data}
                            rotulo={nome}
                            horarioInicio={ocorrencia.regra.horario_inicio}
                            horarioFim={ocorrencia.regra.horario_fim}
                            remarcada={ocorrencia.remarcada}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

// --- Passo 3: Estudo e treino --------------------------------------------------

function PassoEstudoTreino({
  intervalo,
}: {
  semanaInicio: string
  intervalo: { de: string; ate: string }
}) {
  const { fontes, carga } = useFontesCalendario(intervalo.de, intervalo.ate, {
    comCarga: true,
  })
  const ocorrencias = useMemo(
    () => expandirRecorrencia(fontes.fluxograma, intervalo, fontes.excecoes),
    [fontes.fluxograma, fontes.excecoes, intervalo],
  )
  const eventos = useMemo(
    () =>
      ocorrencias.map((o) => ({
        id: `f:${o.regra.id}:${o.data}`,
        titulo: '',
        inicio: `${o.data}T${o.regra.horario_inicio.slice(0, 5)}:00`,
        fim: `${o.data}T${o.regra.horario_fim.slice(0, 5)}:00`,
        diaInteiro: false,
        camada: resolverDonoFluxograma(o.regra, fontes.nomePorMateria, fontes.nomePorTreino).camada,
        tipo: resolverDonoFluxograma(o.regra, fontes.nomePorMateria, fontes.nomePorTreino).tipo,
      })),
    [ocorrencias, fontes.nomePorMateria, fontes.nomePorTreino],
  )
  const dias = useMemo(
    () =>
      cargaPorDia(
        eventos,
        intervalo,
        deISO(intervalo.de),
        fontes.planejamentoSono,
        carga.sonoRealizado,
        carga.conclusoes,
      ),
    [eventos, intervalo, fontes.planejamentoSono, carga],
  )

  const metas = useMetas()

  // Mesmo cruzamento do card de pressão (10.48.4), mas sobre a semana do
  // ritual em vez do horizonte de 30 dias — aqui o objetivo é encaixar, não
  // só alertar.
  const sugestoesPorMateria = useMemo(() => {
    const metaPorMateria = new Map<string, number>()
    for (const meta of metas.data ?? []) {
      if (meta.tipo === 'numerica' && meta.materia_id && meta.valor_alvo) {
        metaPorMateria.set(meta.materia_id, meta.valor_alvo)
      }
    }
    const estudadoPorMateria = new Map<string, number>()
    for (const sessao of fontes.sessoesEstudo) {
      estudadoPorMateria.set(
        sessao.materia_id,
        (estudadoPorMateria.get(sessao.materia_id) ?? 0) + sessao.duracao_minutos,
      )
    }

    const pressoes = pressaoDosPrazos(
      fontes.avaliacoes,
      intervalo.de,
      dias,
      metaPorMateria,
      estudadoPorMateria,
    )

    const comprometido = new Map<string, number>()
    return pressoes.flatMap((pressao) => {
      if (pressao.minutosMetaRestante === undefined) return []
      const diasAteAVespera = dias.filter((dia) => dia.data < pressao.data)
      const sugestao = alocarSugestao(
        pressao.minutosMetaRestante,
        diasAteAVespera,
        comprometido,
      )
      for (const bloco of sugestao) {
        comprometido.set(bloco.data, (comprometido.get(bloco.data) ?? 0) + bloco.minutos)
      }
      return sugestao.length > 0 ? [{ pressao, sugestao }] : []
    })
  }, [metas.data, fontes.sessoesEstudo, fontes.avaliacoes, intervalo.de, dias])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Onde encaixar estudo e treino</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
          {dias.map((dia) => (
            <div key={dia.data} className="rounded-md border p-2 text-center">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {DIAS_SEMANA[deISO(dia.data).getDay()]?.slice(0, 3)}
              </p>
              <p className="font-mono text-sm tabular-nums">
                {formatarCarga(dia.minutosLivres)}
              </p>
            </div>
          ))}
        </div>

        {sugestoesPorMateria.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Sugestão de encaixe</p>
            {sugestoesPorMateria.map(({ pressao, sugestao }) => (
              <p key={pressao.avaliacaoId} className="text-muted-foreground text-xs">
                <strong className="text-foreground">{pressao.nome}</strong>:{' '}
                {sugestao
                  .map(
                    (bloco) =>
                      `${DIAS_SEMANA[deISO(bloco.data).getDay()]?.slice(0, 3)} ${formatarCarga(bloco.minutos)}`,
                  )
                  .join(', ')}
              </p>
            ))}
            <p className="text-muted-foreground/70 text-[11px]">
              Propõe, não agenda — abra Estudos e registre a sessão você mesmo
              se topar o encaixe.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Nenhuma prova com meta cadastrada nesta semana para sugerir
            encaixe. Treino segue pelo fluxograma normal.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// --- Passo 4: Financeiro -------------------------------------------------------

function PassoFinanceiro({ semanaInicio }: { semanaInicio: string }) {
  const categorias = useCategorias()
  const planejamento = usePlanejamentoSemana(semanaInicio)
  const salvar = useSalvarPlanejamento()

  return (
    <GradePlanejamentoSemanal
      semanaInicio={semanaInicio}
      categorias={categorias.data ?? []}
      planejamento={planejamento.data ?? []}
      salvando={salvar.isPending}
      onSalvar={(entradas) =>
        salvar.mutate({ semanaInicio, entradas })
      }
    />
  )
}
