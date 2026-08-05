import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Clock, Timer, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { deISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import {
  formatarDuracao,
  umRmEstimado,
  type SessaoRealizada,
} from '../calculos'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAtualizarHoraSessao, useExcluirExecucao } from '../hooks'

interface SecaoSessoesProps {
  sessoes: readonly SessaoRealizada[]
  /** Nome do treino por id, para o título de cada sessão. */
  nomePorTreino: ReadonlyMap<string, string>
}

/**
 * Os treinos realizados no período, um por sessão (resolução 10.21).
 *
 * A frequência da semana dizia "3 de 4" e mais nada: não havia como ver *qual*
 * treino foi feito, nem com que cargas. As séries existiam no banco desde a Fase
 * 3, mas chegavam soltas — sem `execucao_treino_id` no retorno, agrupá-las por
 * sessão era impossível, e dois treinos no mesmo dia viravam uma massa só.
 *
 * Fechada por padrão: o resumo responde "o que eu fiz" e a expansão responde
 * "com quanto", que é a pergunta menos frequente.
 */
export function SecaoSessoes({ sessoes, nomePorTreino }: SecaoSessoesProps) {
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(new Set())
  const excluir = useExcluirExecucao()

  function alternar(id: string) {
    setAbertas((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Treinos realizados</CardTitle>
        <CardDescription>
          Sessões da semana, com carga série a série.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessoes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum treino registrado nesta semana.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {sessoes.map((sessao) => {
              const expandida = abertas.has(sessao.id)
              const nome = nomePorTreino.get(sessao.treino_id) ?? 'Treino'

              return (
                <li key={sessao.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => alternar(sessao.id)}
                      aria-expanded={expandida}
                      className="hover:bg-accent/50 -mx-1.5 flex min-w-0 flex-1 items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors"
                    >
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          'text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform',
                          expandida && 'rotate-180',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
                          {nome}
                          <span className="text-muted-foreground font-mono text-xs font-normal tabular-nums">
                            {format(deISO(sessao.data), 'dd/MM')}
                            {sessao.horaInicio && ` · ${sessao.horaInicio}`}
                          </span>
                          {sessao.emAndamento && (
                            <span className="text-status-atencao text-xs font-normal">
                              em andamento
                            </span>
                          )}
                          {sessao.recordes.length > 0 && (
                            <span className="text-treino inline-flex items-center gap-1 text-xs font-normal">
                              <Trophy aria-hidden className="size-3" />
                              {sessao.recordes.length}{' '}
                              {sessao.recordes.length === 1
                                ? 'recorde'
                                : 'recordes'}
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
                          <span className="tabular-nums">
                            {sessao.totalSeries}{' '}
                            {sessao.totalSeries === 1 ? 'série' : 'séries'}
                          </span>
                          <span className="tabular-nums">
                            {Math.round(sessao.volume).toLocaleString('pt-BR')}{' '}
                            kg
                          </span>
                          {sessao.duracaoMinutos !== null && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Timer aria-hidden className="size-3" />
                              {formatarDuracao(sessao.duracaoMinutos)}
                            </span>
                          )}
                        </p>
                      </div>
                    </button>

                    <DialogConfirmarExclusao
                      titulo={`Excluir sessão de ${nome}`}
                      mensagem={`As ${sessao.totalSeries} séries desta sessão serão removidas. Recordes já registrados a partir dela permanecem.`}
                      onConfirmar={async () => {
                        await excluir.mutateAsync(sessao.id)
                      }}
                      pendente={excluir.isPending}
                    />
                  </div>

                  {expandida && (
                    <div className="mt-2 pl-6">
                      <CampoHorario sessao={sessao} />
                    </div>
                  )}

                  {expandida && (
                    <ul className="mt-2 space-y-2.5 pl-6">
                      {sessao.exercicios.map((exercicio) => (
                        <li key={exercicio.exercicio_base_id}>
                          <div className="flex items-baseline justify-between gap-2">
                            <Link
                              to={`/treino/${exercicio.exercicio_base_id}`}
                              className={cn(
                                'truncate text-sm hover:underline',
                                exercicio.pulado &&
                                  'text-muted-foreground line-through',
                              )}
                            >
                              {exercicio.nome}
                            </Link>
                            {exercicio.pulado ? (
                              <span className="text-muted-foreground shrink-0 text-xs">
                                pulado
                              </span>
                            ) : (
                              exercicio.grupo_muscular && (
                                <span className="text-muted-foreground shrink-0 text-xs capitalize">
                                  {exercicio.grupo_muscular}
                                </span>
                              )
                            )}
                          </div>
                          <ul className="mt-1 space-y-0.5">
                            {exercicio.series.map((serie, ordem) => (
                              <li
                                key={serie.id}
                                className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums"
                              >
                                <span className="w-4 shrink-0">
                                  {ordem + 1}
                                </span>
                                <span className="text-foreground">
                                  {serie.carga_real}kg × {serie.reps_reais}
                                </span>
                                {serie.rpe !== null && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Clock aria-hidden className="size-3" />
                                    RPE {serie.rpe}
                                  </span>
                                )}
                                <span className="ml-auto">
                                  1RM{' '}
                                  {umRmEstimado(
                                    serie.carga_real,
                                    serie.reps_reais,
                                  ).toFixed(1)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Horário real da sessão, editável (resolução 10.23).
 *
 * Fica na expansão e não na linha de resumo: informar horário é exceção, e um
 * campo por sessão na lista fechada competiria com o que se lê de relance.
 *
 * Grava no blur — um update por tecla digitada seria absurdo.
 */
function CampoHorario({ sessao }: { sessao: SessaoRealizada }) {
  const atualizar = useAtualizarHoraSessao()
  const [hora, setHora] = useState(sessao.horaInicio ?? '')

  async function salvar() {
    if (hora === (sessao.horaInicio ?? '')) return
    await atualizar.mutateAsync({
      id: sessao.id,
      hora: hora === '' ? null : hora,
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={`hora-${sessao.id}`}
        className="text-muted-foreground text-xs"
      >
        Horário
      </Label>
      <Input
        id={`hora-${sessao.id}`}
        type="time"
        className="h-8 w-28"
        value={hora}
        disabled={atualizar.isPending}
        onChange={(evento) => setHora(evento.target.value)}
        onBlur={() => void salvar()}
      />
      {!sessao.horaInicio && (
        <span className="text-muted-foreground text-xs">não informado</span>
      )}
    </div>
  )
}
