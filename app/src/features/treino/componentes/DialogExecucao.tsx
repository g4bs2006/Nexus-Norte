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
import type { ExercicioTreino, Treino } from '../types'

interface LinhaSerie {
  exercicioId: string
  carga: string
  reps: string
  rpe: string
}

interface DialogExecucaoProps {
  treino: Treino
  exercicios: readonly ExercicioTreino[]
  hoje: Date
}

/**
 * Registro de uma sessão de treino (plano 4.3).
 *
 * Abre com uma linha por série planejada, pré-preenchida com carga e reps alvo
 * — na academia o normal é confirmar o previsto, não digitar tudo de novo
 * (plano 8: reduzir fricção nos formulários do dia a dia).
 */
export function DialogExecucao({
  treino,
  exercicios,
  hoje,
}: DialogExecucaoProps) {
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(paraISO(hoje))
  const registrar = useRegistrarSessao()

  function linhasIniciais(): LinhaSerie[] {
    return exercicios.flatMap((exercicio) =>
      Array.from({ length: exercicio.series }, () => ({
        exercicioId: exercicio.id,
        carga: exercicio.carga_alvo === null ? '' : String(exercicio.carga_alvo),
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
        <Button size="sm" disabled={exercicios.length === 0}>
          <Play className="size-4" />
          Iniciar execução
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
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

                <div className="text-muted-foreground grid grid-cols-[1.5rem_1fr_1fr_1fr_auto] items-center gap-2 text-[11px]">
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

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[1.5rem_1fr_1fr_1fr_auto] items-center gap-2"
                    >
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {ordem + 1}
                      </span>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        className="h-8 tabular-nums"
                        value={linha.carga}
                        onChange={(evento) =>
                          alterar(i, 'carga', evento.target.value)
                        }
                        aria-label={`Carga da série ${ordem + 1} de ${exercicio.nome}`}
                      />
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        className="h-8 tabular-nums"
                        value={linha.reps}
                        onChange={(evento) =>
                          alterar(i, 'reps', evento.target.value)
                        }
                        aria-label={`Reps da série ${ordem + 1} de ${exercicio.nome}`}
                      />
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        max="10"
                        placeholder="—"
                        className="h-8 tabular-nums"
                        value={linha.rpe}
                        onChange={(evento) =>
                          alterar(i, 'rpe', evento.target.value)
                        }
                        aria-label={`RPE da série ${ordem + 1} de ${exercicio.nome}`}
                      />
                      <span className="text-muted-foreground w-14 text-right text-xs tabular-nums">
                        {estimado === null ? '—' : estimado.toFixed(1)}
                      </span>
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
