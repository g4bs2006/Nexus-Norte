import { useState } from 'react'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { paraISO } from '@/lib/datas'
import { umRmEstimado } from '../calculos'
import { useRegistrarSessao } from '../hooks'
import type { ExercicioComBase, TreinoComTipo } from '../types'

interface LinhaSerie {
  exercicioId: string
  carga: string
  reps: string
  rpe: string
}

interface DialogExecucaoProps {
  treino: TreinoComTipo
  exercicios: readonly ExercicioComBase[]
  hoje: Date
  /** Rótulo do gatilho. "Registrar" na lista, onde o treino não é o de hoje. */
  rotulo?: string
  /** `secondary` na lista de treinos, para não competir com o card de hoje. */
  variante?: 'default' | 'secondary'
  /** Ocupa a largura toda — usado no rodapé do card no mobile. */
  larguraTotal?: boolean
}

/**
 * Registro de uma sessão de treino (plano 4.3).
 *
 * Abre com uma linha por série planejada, pré-preenchida com carga e reps alvo
 * — na academia o normal é confirmar o previsto, não digitar tudo de novo
 * (plano 8: reduzir fricção nos formulários do dia a dia).
 *
 * Aparece em dois lugares: no card "Treino de hoje" e no card de cada treino.
 * O segundo é o que permite registrar um treino fora do previsto — trocar o
 * Push pelo Upper na hora, ou lançar a sessão de ontem que ficou de fora.
 */
export function DialogExecucao({
  treino,
  exercicios,
  hoje,
  rotulo = 'Iniciar execução',
  variante = 'default',
  larguraTotal = false,
}: DialogExecucaoProps) {
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(paraISO(hoje))
  const registrar = useRegistrarSessao()

  function linhasIniciais(): LinhaSerie[] {
    return exercicios.flatMap((exercicio) =>
      Array.from({ length: exercicio.series }, () => ({
        exercicioId: exercicio.id,
        carga:
          exercicio.carga_alvo === null ? '' : String(exercicio.carga_alvo),
        reps: exercicio.reps_alvo === null ? '' : String(exercicio.reps_alvo),
        rpe: '',
      })),
    )
  }

  const [linhas, setLinhas] = useState<LinhaSerie[]>(linhasIniciais)

  function abrir(estado: boolean) {
    setAberto(estado)
    // Recarrega os alvos ao reabrir, descartando digitação anterior
    if (estado) {
      setLinhas(linhasIniciais())
      setData(paraISO(hoje))
    }
  }

  function alterar(indice: number, campo: keyof LinhaSerie, valor: string) {
    setLinhas((atual) =>
      atual.map((linha, i) =>
        i === indice ? { ...linha, [campo]: valor } : linha,
      ),
    )
  }

  async function submeter() {
    // Só séries com carga e reps válidos entram — linhas em branco significam
    // "não fiz esta série".
    const series = linhas.flatMap((linha) => {
      const carga = Number(linha.carga)
      const reps = Number(linha.reps)
      const rpe = Number(linha.rpe)
      if (!Number.isFinite(carga) || carga < 0) return []
      if (!Number.isInteger(reps) || reps <= 0) return []
      return [
        {
          exercicio_id: linha.exercicioId,
          carga_real: carga,
          reps_reais: reps,
          rpe: Number.isInteger(rpe) && rpe >= 1 && rpe <= 10 ? rpe : null,
        },
      ]
    })

    if (series.length === 0) return

    await registrar.mutateAsync({ treinoId: treino.id, data, series })
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={variante}
          disabled={exercicios.length === 0}
          className={larguraTotal ? 'w-full sm:w-auto' : undefined}
        >
          <Play className="size-4" />
          {rotulo}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{treino.nome}</DialogTitle>
          <DialogDescription>
            Confirme carga e repetições de cada série. Deixe em branco a série
            que não fez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="execucao-data">
              Data
            </Label>
            <Input
              id="execucao-data"
              type="date"
              className="h-8 w-40"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
            />
          </div>

          {exercicios.map((exercicio) => {
            const indices = linhas
              .map((linha, i) => ({ linha, i }))
              .filter(({ linha }) => linha.exercicioId === exercicio.id)

            return (
              <div key={exercicio.id} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">{exercicio.nome}</p>
                  {exercicio.grupo_muscular && (
                    <span className="text-muted-foreground text-xs capitalize">
                      {exercicio.grupo_muscular}
                    </span>
                  )}
                </div>

                {/*
                  Cabeçalho de colunas só no desktop. No celular cada série é um
                  bloco com rótulo em cada campo: em 296px úteis, cinco colunas
                  davam ~73px por input — e esta é a tela que se usa de pé, com
                  uma mão, no intervalo da série.
                */}
                <div className="text-muted-foreground hidden grid-cols-[1.5rem_1fr_1fr_1fr_auto] items-center gap-2 text-[11px] sm:grid">
                  <span />
                  <span>Carga</span>
                  <span>Reps</span>
                  <span>RPE</span>
                  <span className="text-right">1RM</span>
                </div>

                {indices.map(({ linha, i }, ordem) => {
                  const carga = Number(linha.carga)
                  const reps = Number(linha.reps)
                  const estimado =
                    Number.isFinite(carga) && carga > 0 && reps > 0
                      ? umRmEstimado(carga, reps)
                      : null

                  const umRm = estimado === null ? '—' : estimado.toFixed(1)

                  return (
                    <div
                      key={i}
                      className="border-border rounded-md border p-2.5 sm:rounded-none sm:border-0 sm:p-0"
                    >
                      {/* Número da série e 1RM viram linha própria no mobile */}
                      <div className="mb-1.5 flex items-baseline justify-between sm:hidden">
                        <span className="text-xs font-medium">
                          Série {ordem + 1}
                        </span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          1RM {umRm}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[1.5rem_1fr_1fr_1fr_auto] sm:items-center">
                        <span className="text-muted-foreground hidden text-xs tabular-nums sm:block">
                          {ordem + 1}
                        </span>

                        <div className="space-y-1 sm:space-y-0">
                          <span
                            aria-hidden
                            className="text-muted-foreground block text-[11px] sm:hidden"
                          >
                            Carga
                          </span>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            className="h-9 tabular-nums sm:h-8"
                            value={linha.carga}
                            onChange={(evento) =>
                              alterar(i, 'carga', evento.target.value)
                            }
                            aria-label={`Carga da série ${ordem + 1} de ${exercicio.nome}`}
                          />
                        </div>

                        <div className="space-y-1 sm:space-y-0">
                          <span
                            aria-hidden
                            className="text-muted-foreground block text-[11px] sm:hidden"
                          >
                            Reps
                          </span>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            className="h-9 tabular-nums sm:h-8"
                            value={linha.reps}
                            onChange={(evento) =>
                              alterar(i, 'reps', evento.target.value)
                            }
                            aria-label={`Reps da série ${ordem + 1} de ${exercicio.nome}`}
                          />
                        </div>

                        <div className="space-y-1 sm:space-y-0">
                          <span
                            aria-hidden
                            className="text-muted-foreground block text-[11px] sm:hidden"
                          >
                            RPE
                          </span>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            max="10"
                            placeholder="—"
                            className="h-9 tabular-nums sm:h-8"
                            value={linha.rpe}
                            onChange={(evento) =>
                              alterar(i, 'rpe', evento.target.value)
                            }
                            aria-label={`RPE da série ${ordem + 1} de ${exercicio.nome}`}
                          />
                        </div>

                        <span className="text-muted-foreground hidden w-14 text-right text-xs tabular-nums sm:block">
                          {umRm}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button
            onClick={() => void submeter()}
            disabled={registrar.isPending}
          >
            {registrar.isPending ? 'Salvando…' : 'Registrar treino'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
