import { format, isYesterday } from 'date-fns'
import { Link } from 'react-router-dom'
import { Check, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { deISO } from '@/lib/datas'
import {
  useDescartarExecucao,
  useExecucaoAberta,
  useFinalizarExecucao,
} from '../hooks'

interface AvisoTreinoAbertoProps {
  /** Nome do treino por id — a Home já carrega a lista. */
  nomePorTreino: ReadonlyMap<string, string>
  /** Hoje em ISO. Quem sabe a data é a página (plano, seção 9). */
  hojeISO: string
}

/**
 * Aviso de treino em andamento (resolução 10.21).
 *
 * Existe porque salvar o progresso resolve metade do problema: abrir o app depois
 * cai na Home, e sem isto não haveria nenhum sinal de que ficou algo pela metade.
 *
 * Um aviso explícito em vez de restaurar a última rota — restaurar rota
 * desorienta (você abre o app e está numa tela que não pediu), enquanto o aviso
 * diz o que está pendente e deixa a decisão de voltar com você.
 *
 * Não renderiza nada quando não há sessão aberta: um card permanente dizendo
 * "nenhum treino em andamento" só ocuparia espaço na tela mais disputada do app.
 */
export function AvisoTreinoAberto({
  nomePorTreino,
  hojeISO,
}: AvisoTreinoAbertoProps) {
  const aberta = useExecucaoAberta()
  const descartar = useDescartarExecucao()
  const finalizar = useFinalizarExecucao()

  const sessao = aberta.data
  if (!sessao) return null

  const nome = nomePorTreino.get(sessao.treino_id) ?? 'Treino'
  const salvas = sessao.series.length
  /*
   * Sessão de dia que já passou é o caso que motivou o botão de finalizar aqui
   * (13/08): um Push com 15 séries e a duração informada ficou aberto de um dia
   * para o outro, ficou fora da frequência da semana e — porque o banco só
   * admite uma sessão aberta — travou o início de qualquer outro treino.
   */
  const deDiaPassado = sessao.data < hojeISO
  const pendente = finalizar.isPending || descartar.isPending

  return (
    <Card className="border-treino/40">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Dumbbell
            aria-hidden
            className="text-treino mt-0.5 size-4 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">{nome} em andamento</p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {salvas} {salvas === 1 ? 'série salva' : 'séries salvas'}
              {deDiaPassado && ` · ${rotuloDoDia(sessao.data)}`} · fecha o treino
              para contar na frequência
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/*
            Saída para a sessão que não vai acontecer. Sem isto, uma sessão sem
            séries fica travando o início de qualquer outro treino, porque o banco
            só admite uma aberta.
          */}
          <DialogConfirmarExclusao
            titulo={`Descartar ${nome}`}
            mensagem={
              salvas === 0
                ? 'A sessão será removida. Nada foi salvo nela.'
                : `As ${salvas} séries já salvas nesta sessão serão removidas.`
            }
            onConfirmar={async () => {
              await descartar.mutateAsync(sessao.id)
            }}
            pendente={descartar.isPending}
          />
          {/*
            Finalizar direto daqui. Antes o aviso só oferecia Continuar e
            Descartar — as duas saídas erradas para um treino que já aconteceu e
            só não foi encerrado. Chegar ao botão certo exigia ir ao pilar, abrir
            o diálogo e achar "Finalizar treino" no rodapé.

            Zero série desabilita, mesma regra do diálogo: sem nada gravado não há
            treino a registrar, e a saída é descartar.
          */}
          <Button
            size="sm"
            variant={deDiaPassado ? 'default' : 'secondary'}
            disabled={pendente || salvas === 0}
            title={
              salvas === 0
                ? 'Nada foi salvo nesta sessão — descarte em vez de finalizar.'
                : undefined
            }
            onClick={() => void finalizar.mutateAsync(sessao.id)}
          >
            <Check className="size-4" />
            {finalizar.isPending ? 'Finalizando…' : 'Finalizar'}
          </Button>
          {/*
            Continuar deixa de ser a ação primária quando a sessão é de outro dia:
            ali o provável é encerrar, não voltar a anotar séries.
          */}
          <Button asChild size="sm" variant={deDiaPassado ? 'secondary' : 'default'}>
            <Link to="/treino">Continuar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** `"de ontem"` ou `"de 12/08"` — de quando é a sessão que ficou aberta. */
function rotuloDoDia(data: string): string {
  const dia = deISO(data)
  return isYesterday(dia) ? 'de ontem' : `de ${format(dia, 'dd/MM')}`
}
