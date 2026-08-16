import { useMemo, useRef, useState, type ReactNode } from 'react'
import { addDays, format, subDays } from 'date-fns'
import { CheckCheck, Pencil, Plus } from 'lucide-react'
import { CheckDia } from '@/components/CheckDia'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarraProgresso } from '@/components/BarraProgresso'
import { ESTILO_TOOLTIP } from '@/components/Grafico'
import { cn } from '@/lib/utils'
import { deISO, inicioSemana, paraISO } from '@/lib/datas'
import { comportamentoRolagem } from '@/lib/movimento'
import {
  useAlternarSessaoPlanejada,
  useCriarSessao,
  useAtualizarSessao,
  useExcluirSessao,
} from '../hooks'
import { aderenciaSessoesSemana, frequenciaEstudoSemana } from '../calculos'
import { DialogAgendarSessao } from './DialogAgendarSessao'
import type { Materia, SessaoEstudo, SessaoEstudoPlanejada } from '../types'

const DIAS_GRAFICO = 14

interface AbaSessoesProps {
  materiaId: string
  sessoes: readonly SessaoEstudo[]
  /** Sessões planejadas da matéria (chat 2026-08-14) — qualquer data, o filtro
   * de "desta semana" é feito aqui dentro, igual ao resto da aba. */
  planejadas: readonly SessaoEstudoPlanejada[]
  /** A própria matéria, só pro Select do diálogo de agendar — já vem travada
   * nesta matéria, sem escolha (diferente do calendário, que agenda pra
   * qualquer uma). */
  materiaAtual: Materia | undefined
  hoje: Date
  /**
   * Primeira nota de cada sessão, quando existe.
   *
  /**
   * Notas vinculadas por sessão.
   */
  notaPorSessao?: ReadonlyMap<string, readonly { titulo: string }[]>
  /**
   * Gatilho de nota da sessão, injetado pela composição.
   *
   * Nota é outra feature desde 14/08, e feature não importa feature (README —
   * a regra de dependência). Quem monta a aba é `MateriaDetalhePage`, que pode
   * importar as duas.
   */
  acaoNota?: (sessaoId: string, data: string) => ReactNode
}

export function AbaSessoes({
  materiaId,
  sessoes,
  planejadas,
  materiaAtual,
  hoje,
  notaPorSessao,
  acaoNota,
}: AbaSessoesProps) {
  const criar = useCriarSessao()
  const atualizar = useAtualizarSessao()
  const excluir = useExcluirSessao()
  const alternarPlanejada = useAlternarSessaoPlanejada()

  const [data, setData] = useState(paraISO(hoje))
  const [hora, setHora] = useState('')
  const [duracao, setDuracao] = useState('')
  const [meta, setMeta] = useState('')
  const [idEditando, setIdEditando] = useState<string | null>(null)
  const formulario = useRef<HTMLDivElement>(null)

  const emEdicao = sessoes.find((sessao) => sessao.id === idEditando)

  const frequencia = useMemo(() => {
    const limite = paraISO(subDays(hoje, 6))
    const daSemana = sessoes.filter((sessao) => sessao.data >= limite)
    return frequenciaEstudoSemana(daSemana, 7)
  }, [sessoes, hoje])

  /**
   * Sessões planejadas da semana corrente, e quais delas já viraram execução
   * (chat 2026-08-14) — mesmo par previsto × realizado que Treino calcula.
   * "Feita" aqui é por matéria+data: como as sessões já vêm filtradas por
   * `materiaId`, a chave simplifica pra só a data.
   */
  const { planejadasDaSemana, feitasHoje, aderencia } = useMemo(() => {
    const inicio = paraISO(inicioSemana(hoje))
    const fim = paraISO(addDays(inicioSemana(hoje), 6))
    const daSemana = planejadas
      .filter((p) => p.data >= inicio && p.data <= fim)
      .sort((a, b) => a.data.localeCompare(b.data))

    const datasFeitas = new Set(sessoes.map((s) => s.data))
    const realizadas = daSemana.filter((p) => datasFeitas.has(p.data)).length

    return {
      planejadasDaSemana: daSemana,
      feitasHoje: datasFeitas,
      aderencia: aderenciaSessoesSemana(realizadas, daSemana.length),
    }
  }, [planejadas, sessoes, hoje])

  // Minutos por dia nos últimos 14 dias, incluindo dias sem estudo
  const dadosGrafico = useMemo(() => {
    const porData = new Map<string, number>()
    for (const sessao of sessoes) {
      porData.set(
        sessao.data,
        (porData.get(sessao.data) ?? 0) + sessao.duracao_minutos,
      )
    }

    const dias: { dia: string; minutos: number }[] = []
    for (let i = DIAS_GRAFICO - 1; i >= 0; i -= 1) {
      const dia = subDays(hoje, i)
      const iso = paraISO(dia)
      dias.push({ dia: format(dia, 'dd/MM'), minutos: porData.get(iso) ?? 0 })
    }
    return dias
  }, [sessoes, hoje])

  /*
   * O lápis da linha não abre diálogo: ele carrega o formulário de registro, que
   * fica DOIS cards acima da lista (métrica, formulário, gráfico de 14 dias,
   * lista). Da altura de uma linha da lista, esse formulário está fora da tela —
   * então clicar no lápis parecia não fazer nada, ainda mais ao lado do lápis de
   * nota, que abre um modal de verdade.
   *
   * Levar a tela até o formulário é o que torna o clique visível. Mesmo recurso
   * que `focarDia` em `CalendarioPage`: a animação existe para mostrar de onde
   * para onde a tela andou, e não há foco automático de campo de propósito —
   * focar um `type="date"` abre o seletor nativo no celular, que seria uma
   * segunda surpresa em cima da primeira.
   */
  function iniciarEdicao(sessao: SessaoEstudo) {
    setIdEditando(sessao.id)
    setData(sessao.data)
    setHora(sessao.hora_inicio ? sessao.hora_inicio.slice(0, 5) : '')
    setDuracao(String(sessao.duracao_minutos))
    setMeta(
      sessao.meta_diaria_minutos ? String(sessao.meta_diaria_minutos) : '',
    )
    formulario.current?.scrollIntoView({
      block: 'center',
      behavior: comportamentoRolagem(),
    })
  }

  function cancelarEdicao() {
    setIdEditando(null)
    setData(paraISO(hoje))
    setHora('')
    setDuracao('')
    setMeta('')
  }

  async function salvar() {
    const minutos = Number(duracao)
    if (!Number.isInteger(minutos) || minutos <= 0) return
    const metaNumero = Number(meta)
    const dados = {
      data,
      // Vazio grava nulo: sessão sem hora vira evento de dia inteiro no
      // calendário, e é melhor que uma hora inventada (resolução 10.24).
      hora_inicio: hora === '' ? null : `${hora}:00`,
      duracao_minutos: minutos,
      meta_diaria_minutos:
        Number.isInteger(metaNumero) && metaNumero > 0 ? metaNumero : null,
    }

    if (idEditando) {
      await atualizar.mutateAsync({ id: idEditando, dados })
      cancelarEdicao()
    } else {
      await criar.mutateAsync({
        materia_id: materiaId,
        ...dados,
      })
      setDuracao('')
      setHora('')
    }
  }

  const pendente = criar.isPending || atualizar.isPending

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-muted-foreground text-xs">
                Estudado nos últimos 7 dias
              </p>
              <p className="metric-lg">
                {Math.floor(frequencia.minutosEstudados / 60)}h
                {String(frequencia.minutosEstudados % 60).padStart(2, '0')}
              </p>
            </div>
            {frequencia.percentual !== null && (
              <p className="text-muted-foreground text-xs tabular-nums">
                {Math.round(frequencia.percentual)}% da meta
              </p>
            )}
          </div>
          {frequencia.percentual === null ? (
            <p className="text-muted-foreground text-xs">
              Defina uma meta diária ao registrar a sessão para acompanhar o
              percentual.
            </p>
          ) : (
            <BarraProgresso
              valor={frequencia.percentual}
              classeCor="bg-estudos"
              rotulo="Meta de estudo da semana"
            />
          )}
        </CardContent>
      </Card>

      {/* Sessões planejadas da semana (chat 2026-08-14) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Sessões planejadas</CardTitle>
          <DialogAgendarSessao
            materias={materiaAtual ? [materiaAtual] : []}
            dataInicial={paraISO(hoje)}
            trigger={
              <Button size="sm" variant="secondary" disabled={!materiaAtual}>
                <Plus className="size-4" />
                Agendar
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {aderencia.planejadas > 0 && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <CheckCheck className="size-3.5" />
              {aderencia.realizadas}/{aderencia.planejadas} desta semana
              {aderencia.percentual !== null &&
                ` · ${Math.round(aderencia.percentual)}%`}
            </p>
          )}
          {planejadasDaSemana.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma sessão planejada nesta semana.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {planejadasDaSemana.map((planejada) => (
                <li key={planejada.id} className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <CheckDia
                      id={`sessao-planejada-${planejada.id}`}
                      marcado={feitasHoje.has(planejada.data)}
                      onAlternar={(marcado) =>
                        alternarPlanejada.mutate({
                          planejada,
                          concluido: marcado,
                        })
                      }
                      detalhe={
                        planejada.hora_inicio
                          ? `${planejada.hora_inicio.slice(0, 5)} · ${planejada.duracao_minutos} min`
                          : `${planejada.duracao_minutos} min`
                      }
                    >
                      <span className="capitalize">
                        {format(deISO(planejada.data), 'EEEE, dd/MM')}
                      </span>
                    </CheckDia>
                  </div>
                  <DialogAgendarSessao
                    materias={materiaAtual ? [materiaAtual] : []}
                    planejada={planejada}
                    trigger={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground size-11 shrink-0 sm:size-7"
                        aria-label="Editar sessão planejada"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card
        ref={formulario}
        className={cn(
          'transition-shadow',
          // Chegar aqui rolando não basta: o formulário de edição é o MESMO de
          // registro, e a única diferença era o rótulo do botão. Sem esta marca
          // dava para achar que se estava criando uma sessão e sobrescrever a
          // que estava sendo editada.
          idEditando && 'ring-estudos/50 ring-2',
        )}
      >
        <CardContent className="flex flex-wrap items-end gap-2">
          {emEdicao && (
            <p className="text-muted-foreground w-full text-xs">
              Editando a sessão de{' '}
              <span className="text-foreground font-medium tabular-nums">
                {format(deISO(emEdicao.data), 'dd/MM/yyyy')}
                {emEdicao.hora_inicio
                  ? ` · ${emEdicao.hora_inicio.slice(0, 5)}`
                  : ' · sem hora'}
              </span>{' '}
              · {emEdicao.duracao_minutos} min
            </p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="sessao-data">
              Data
            </Label>
            <Input
              id="sessao-data"
              type="date"
              className="h-8"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="sessao-hora">
              Hora
            </Label>
            <Input
              id="sessao-hora"
              type="time"
              className="h-8 tabular-nums"
              value={hora}
              onChange={(evento) => setHora(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="sessao-duracao">
              Minutos
            </Label>
            <Input
              id="sessao-duracao"
              type="number"
              min="1"
              step="5"
              className="h-8 w-24 tabular-nums"
              placeholder="60"
              value={duracao}
              onChange={(evento) => setDuracao(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="sessao-meta">
              Meta diária
            </Label>
            <Input
              id="sessao-meta"
              type="number"
              min="1"
              step="5"
              className="h-8 w-24 tabular-nums"
              placeholder="—"
              value={meta}
              onChange={(evento) => setMeta(evento.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => void salvar()} disabled={pendente}>
            {idEditando ? (
              <Pencil className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {idEditando ? 'Salvar' : 'Registrar'}
          </Button>
          {idEditando && (
            <Button size="sm" variant="ghost" onClick={cancelarEdicao}>
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>

      {sessoes.length > 0 && (
        <Card>
          <CardContent>
            <p className="text-muted-foreground mb-3 text-xs">
              Minutos por dia — últimos {DIAS_GRAFICO} dias
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  stroke="var(--border)"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  stroke="var(--border)"
                  width={32}
                />
                <Tooltip
                  formatter={(valor) => `${valor} min`}
                  contentStyle={ESTILO_TOOLTIP}
                />
                <Bar
                  dataKey="minutos"
                  fill="var(--chart-2)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {sessoes.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {sessoes.slice(0, 20).map((sessao) => (
                <li
                  key={sessao.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm tabular-nums">
                      {format(deISO(sessao.data), 'dd/MM/yyyy')}
                      {sessao.hora_inicio && (
                        <> · {sessao.hora_inicio.slice(0, 5)}</>
                      )}{' '}
                      · {sessao.duracao_minutos} min
                    </p>
                    {sessao.meta_diaria_minutos !== null && (
                      <p className="text-muted-foreground text-xs">
                        meta do dia: {sessao.meta_diaria_minutos} min
                      </p>
                    )}
                    {(() => {
                      const list = notaPorSessao?.get(sessao.id)
                      if (!list || list.length === 0) return null
                      const titulos = list.map((n) => n.titulo).join(', ')
                      return (
                        <p className="text-muted-foreground truncate text-xs">
                          {list.length === 1
                            ? `nota: ${list[0]?.titulo}`
                            : `notas (${list.length}): ${titulos}`}
                        </p>
                      )
                    })()}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {/*
                      Anotar o que foi estudado na sessão sem sair da aba. Com
                      nota, edita a existente; sem nota, cria já vinculada.
                    */}
                    {acaoNota?.(sessao.id, sessao.data)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-11 shrink-0 sm:size-7"
                      aria-label="Editar sessão"
                      onClick={() => iniciarEdicao(sessao)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <DialogConfirmarExclusao
                      titulo="Remover sessão de estudo"
                      mensagem={`Os ${sessao.duracao_minutos} min de ${format(deISO(sessao.data), 'dd/MM/yyyy')} saem do total de horas da matéria e do gráfico.`}
                      onConfirmar={() => excluir.mutate(sessao.id)}
                      pendente={excluir.isPending}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
