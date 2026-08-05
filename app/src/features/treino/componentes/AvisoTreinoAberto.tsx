import { Link } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { useDescartarExecucao, useExecucaoAberta } from '../hooks'

interface AvisoTreinoAbertoProps {
  /** Nome do treino por id — a Home já carrega a lista. */
  nomePorTreino: ReadonlyMap<string, string>
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
export function AvisoTreinoAberto({ nomePorTreino }: AvisoTreinoAbertoProps) {
  const aberta = useExecucaoAberta()
  const descartar = useDescartarExecucao()

  const sessao = aberta.data
  if (!sessao) return null

  const nome = nomePorTreino.get(sessao.treino_id) ?? 'Treino'
  const salvas = sessao.series.length

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
              {salvas} {salvas === 1 ? 'série salva' : 'séries salvas'} · fecha
              o treino para contar na frequência
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
          <Button asChild size="sm">
            <Link to="/treino">Continuar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
