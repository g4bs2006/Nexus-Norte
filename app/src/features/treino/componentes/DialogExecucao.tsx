import { useEffect, useState } from 'react'
import { Check, Play, RotateCcw } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { umRmEstimado } from '../calculos'
import {
  useAtualizarSerie,
  useExcluirSerie,
  useExecucaoAberta,
  useFinalizarExecucao,
  useSalvarSerie,
} from '../hooks'
import type { ExercicioComBase, TreinoComTipo } from '../types'

interface LinhaSerie {
  exercicioId: string
  carga: string
  reps: string
  rpe: string
  /** Id em `execucoes_exercicio` quando a série já foi gravada. */
  serieId: string | null
}

interface DialogExecucaoProps {
  treino: TreinoComTipo
  exercicios: readonly ExercicioComBase[]
  hoje: Date
  rotulo?: string
  variante?: 'default' | 'secondary'
  larguraTotal?: boolean
  /** Abre já aberto — usado pelo aviso de "continuar" (resolução 10.21). */
  abrirAoMontar?: boolean
}

/**
 * Registro de uma sessão de treino, série a série (plano 4.3 + resolução 10.21).
 *
 * Cada série é gravada no banco quando você confirma, não no fim. Antes tudo
 * ficava em estado do React até um botão final: fechar o app no meio do treino
 * perdia o que já tinha sido anotado, que é exatamente o que acontece quando você
 * está na academia com o celular na mão.
 *
 * Abre com uma linha por série planejada, pré-preenchida com carga e reps alvo —
 * na academia o normal é confirmar o previsto, não digitar tudo de novo (plano 8).
 *
 * A sessão só nasce na primeira série gravada. Abrir e fechar sem anotar nada não
 * deixa lixo no banco nem bloqueia o próximo treino, já que só pode haver uma
 * sessão aberta.
 */
export function DialogExecucao({
  treino,
  exercicios,
  hoje,
  rotulo = 'Iniciar execução',
  variante = 'default',
  larguraTotal = false,
  abrirAoMontar = false,
}: DialogExecucaoProps) {
  const [aberto, setAberto] = useState(abrirAoMontar)

  const aberta = useExecucaoAberta()
  const salvar = useSalvarSerie()
  const atualizar = useAtualizarSerie()
  const excluir = useExcluirSerie()
  const finalizar = useFinalizarExecucao()

  const sessao =
    aberta.data?.treino_id === treino.id ? (aberta.data ?? null) : null
  const outroTreinoAberto =
    aberta.data !== null &&
    aberta.data !== undefined &&
    aberta.data.treino_id !== treino.id

  const [execucaoId, setExecucaoId] = useState<string | null>(null)
  const [data, setData] = useState(paraISO(hoje))
  const [linhas, setLinhas] = useState<LinhaSerie[]>([])

  /**
   * Monta as linhas a partir do planejado e casa com o que já está gravado.
   *
   * O casamento é por ordem dentro de cada exercício: a série salva não guarda
   * "qual slot do plano" ela era, e a ordem é a única correspondência honesta.
   * Séries gravadas além do planejado ganham linha extra — treinar uma série a
   * mais é normal e não deveria desaparecer da tela.
   */
  function montarLinhas(): LinhaSerie[] {
    const salvasPorExercicio = new Map<
      string,
      NonNullable<typeof sessao>['series'][number][]
    >()
    for (const serie of sessao?.series ?? []) {
      const lista = salvasPorExercicio.get(serie.exercicio_id)
      if (lista) lista.push(serie)
      else salvasPorExercicio.set(serie.exercicio_id, [serie])
    }

    return exercicios.flatMap((exercicio) => {
      const salvas = salvasPorExercicio.get(exercicio.id) ?? []
      const quantidade = Math.max(exercicio.series, salvas.length)

      return Array.from({ length: quantidade }, (_, indice) => {
        const salva = salvas[indice]
        if (salva) {
          return {
            exercicioId: exercicio.id,
            carga: String(salva.carga_real),
            reps: String(salva.reps_reais),
            rpe: salva.rpe === null ? '' : String(salva.rpe),
            serieId: salva.id,
          }
        }
        return {
          exercicioId: exercicio.id,
          carga:
            exercicio.carga_alvo === null ? '' : String(exercicio.carga_alvo),
          reps: exercicio.reps_alvo === null ? '' : String(exercicio.reps_alvo),
          rpe: '',
          serieId: null,
        }
      })
    })
  }

  /**
   * Carrega o estado do banco UMA VEZ por abertura, depois que a consulta
   * resolve.
   *
   * Não pode reagir a `sessao`: cada série gravada invalida a query, e um efeito
   * dependente dela reconstruiria todas as linhas — apagando o que estivesse
   * sendo digitado na série seguinte. Depois de carregado, a tela é atualizada
   * cirurgicamente por `gravar` e `desfazer`, que já sabem qual linha mudou.
   */
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    if (!aberto) {
      setCarregado(false)
      return
    }
    if (carregado || aberta.isPending) return

    setExecucaoId(sessao?.id ?? null)
    setData(sessao?.data ?? paraISO(hoje))
    setLinhas(montarLinhas())
    setCarregado(true)
    // `montarLinhas` lê `sessao` e `exercicios`, que só importam nesta carga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, carregado, aberta.isPending])

  function alterar(indice: number, campo: keyof LinhaSerie, valor: string) {
    setLinhas((atual) =>
      atual.map((linha, i) =>
        i === indice ? { ...linha, [campo]: valor } : linha,
      ),
    )
  }

  /** `null` quando a linha não tem valores válidos para gravar. */
  function valoresDaLinha(linha: LinhaSerie) {
    const carga = Number(linha.carga)
    const reps = Number(linha.reps)
    const rpe = Number(linha.rpe)
    if (!Number.isFinite(carga) || carga < 0) return null
    if (!Number.isInteger(reps) || reps <= 0) return null
    return {
      carga_real: carga,
      reps_reais: reps,
      rpe: Number.isInteger(rpe) && rpe >= 1 && rpe <= 10 ? rpe : null,
    }
  }

  async function gravar(indice: number) {
    const linha = linhas[indice]
    if (!linha) return
    const valores = valoresDaLinha(linha)
    if (!valores) return

    if (linha.serieId) {
      await atualizar.mutateAsync({ id: linha.serieId, dados: valores })
      return
    }

    const resultado = await salvar.mutateAsync({
      execucaoId,
      treinoId: treino.id,
      data,
      serie: { exercicio_id: linha.exercicioId, ...valores },
    })

    setExecucaoId(resultado.execucaoId)
    setLinhas((atual) =>
      atual.map((item, i) =>
        i === indice ? { ...item, serieId: resultado.serieId } : item,
      ),
    )
  }

  /** Desfaz a gravação mantendo a linha, para poder corrigir e gravar de novo. */
  async function desfazer(indice: number) {
    const linha = linhas[indice]
    if (!linha?.serieId) return
    await excluir.mutateAsync(linha.serieId)
    setLinhas((atual) =>
      atual.map((item, i) => (i === indice ? { ...item, serieId: null } : item)),
    )
  }

  async function encerrar() {
    if (!execucaoId) return
    await finalizar.mutateAsync(execucaoId)
    setAberto(false)
  }

  const gravadas = linhas.filter((linha) => linha.serieId !== null).length
  const pendente =
    salvar.isPending ||
    atualizar.isPending ||
    excluir.isPending ||
    finalizar.isPending

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={sessao ? 'default' : variante}
          disabled={exercicios.length === 0 || outroTreinoAberto}
          className={larguraTotal ? 'w-full sm:w-auto' : undefined}
          title={
            outroTreinoAberto
              ? 'Há outro treino em andamento. Finalize-o primeiro.'
              : undefined
          }
        >
          <Play className="size-4" />
          {sessao ? 'Continuar treino' : rotulo}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{treino.nome}</DialogTitle>
          <DialogDescription>
            {sessao
              ? 'Sessão em andamento. Cada série confirmada já está salva.'
              : 'Confirme cada série ao terminá-la — ela é salva na hora.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="execucao-data">
                Data
              </Label>
              <Input
                id="execucao-data"
                type="date"
                className="h-8 w-40"
                value={data}
                // A data trava depois da primeira série: mudá-la moveria séries
                // já gravadas para outro dia
                disabled={execucaoId !== null}
                onChange={(evento) => setData(evento.target.value)}
              />
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">
              {gravadas} de {linhas.length} séries
            </p>
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
                <div className="text-muted-foreground hidden grid-cols-[1.5rem_1fr_1fr_1fr_auto_auto] items-center gap-2 text-[11px] sm:grid">
                  <span />
                  <span>Carga</span>
                  <span>Reps</span>
                  <span>RPE</span>
                  <span className="text-right">1RM</span>
                  <span />
                </div>

                {indices.map(({ linha, i }, ordem) => {
                  const valores = valoresDaLinha(linha)
                  const estimado = valores
                    ? umRmEstimado(valores.carga_real, valores.reps_reais)
                    : null
                  const umRm = estimado === null ? '—' : estimado.toFixed(1)
                  const salva = linha.serieId !== null

                  return (
                    <div
                      key={linha.serieId ?? `nova-${i}`}
                      className={cn(
                        'rounded-md border p-2.5 transition-colors sm:rounded-none sm:border-0 sm:p-0',
                        salva
                          ? 'border-status-ok/40 bg-status-ok/5 sm:bg-transparent'
                          : 'border-border',
                      )}
                    >
                      <div className="mb-1.5 flex items-baseline justify-between sm:hidden">
                        <span className="text-xs font-medium">
                          Série {ordem + 1}
                          {salva && (
                            <span className="text-status-ok ml-1.5 font-normal">
                              salva
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          1RM {umRm}
                        </span>
                      </div>

                      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 sm:grid-cols-[1.5rem_1fr_1fr_1fr_auto_auto] sm:items-center">
                        <span className="text-muted-foreground hidden text-xs tabular-nums sm:block">
                          {ordem + 1}
                        </span>

                        <CampoSerie
                          rotulo="Carga"
                          aria={`Carga da série ${ordem + 1} de ${exercicio.nome}`}
                          valor={linha.carga}
                          step="0.5"
                          min="0"
                          onChange={(valor) => alterar(i, 'carga', valor)}
                        />
                        <CampoSerie
                          rotulo="Reps"
                          aria={`Reps da série ${ordem + 1} de ${exercicio.nome}`}
                          valor={linha.reps}
                          step="1"
                          min="1"
                          onChange={(valor) => alterar(i, 'reps', valor)}
                        />
                        <CampoSerie
                          rotulo="RPE"
                          aria={`RPE da série ${ordem + 1} de ${exercicio.nome}`}
                          valor={linha.rpe}
                          step="1"
                          min="1"
                          max="10"
                          placeholder="—"
                          onChange={(valor) => alterar(i, 'rpe', valor)}
                        />

                        <span className="text-muted-foreground hidden w-14 text-right text-xs tabular-nums sm:block">
                          {umRm}
                        </span>

                        {salva ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground size-9 shrink-0 sm:size-7"
                            aria-label={`Desfazer série ${ordem + 1} de ${exercicio.nome}`}
                            disabled={pendente}
                            onClick={() => void desfazer(i)}
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="size-9 shrink-0 sm:size-7"
                            aria-label={`Salvar série ${ordem + 1} de ${exercicio.nome}`}
                            disabled={pendente || valores === null}
                            onClick={() => void gravar(i)}
                          >
                            <Check className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {gravadas === 0
              ? 'Nada salvo ainda.'
              : 'Pode fechar e voltar depois — o progresso fica salvo.'}
          </p>
          <Button
            onClick={() => void encerrar()}
            disabled={pendente || gravadas === 0}
          >
            {finalizar.isPending ? 'Finalizando…' : 'Finalizar treino'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Campo numérico com rótulo visível só no mobile, onde não há cabeçalho. */
function CampoSerie({
  rotulo,
  aria,
  valor,
  onChange,
  step,
  min,
  max,
  placeholder,
}: {
  rotulo: string
  aria: string
  valor: string
  onChange: (valor: string) => void
  step: string
  min: string
  max?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1 sm:space-y-0">
      <span
        aria-hidden
        className="text-muted-foreground block text-[11px] sm:hidden"
      >
        {rotulo}
      </span>
      <Input
        type="number"
        step={step}
        min={min}
        {...(max ? { max } : {})}
        {...(placeholder ? { placeholder } : {})}
        className="h-9 tabular-nums sm:h-8"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        aria-label={aria}
      />
    </div>
  )
}
