import { differenceInCalendarDays, format } from 'date-fns'
import { Link2, Pencil, Plus, Unlink } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { EstadoVazio } from '@/components/EstadoVazio'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { deISO, paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { statusAtividade } from '../calculos'
import {
  useDefinirConclusaoAtividade,
  useDesvincularAvaliacaoAtividade,
  useExcluirAtividade,
} from '../hooks'
import type { Atividade, Avaliacao, StatusAtividade } from '../types'
import { DialogAtividade } from './DialogAtividade'
import { DialogVincularAvaliacao } from './DialogVincularAvaliacao'

interface AbaAtividadesProps {
  materiaId: string
  atividades: readonly Atividade[]
  avaliacoes: readonly Avaliacao[]
  hoje: Date
}

const TITULO_GRUPO: Record<StatusAtividade, string> = {
  atrasada: 'Atrasadas',
  pendente: 'Próximas',
  concluida: 'Concluídas',
}

/** Atrasada primeiro: é o que exige ação hoje. Concluída por último. */
const ORDEM_GRUPOS: readonly StatusAtividade[] = [
  'atrasada',
  'pendente',
  'concluida',
]

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" — contagem, não data crua. */
function rotuloPrazo(dias: number): string {
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias === -1) return 'ontem'
  return dias > 0 ? `em ${dias} dias` : `há ${Math.abs(dias)} dias`
}

export function AbaAtividades({
  materiaId,
  atividades,
  avaliacoes,
  hoje,
}: AbaAtividadesProps) {
  const definirConclusao = useDefinirConclusaoAtividade()
  const desvincular = useDesvincularAvaliacaoAtividade()
  const excluir = useExcluirAtividade()

  const hojeISO = paraISO(hoje)

  const grupos = ORDEM_GRUPOS.map((status) => ({
    status,
    itens: atividades.filter(
      (atividade) => statusAtividade(atividade, hojeISO) === status,
    ),
  })).filter((grupo) => grupo.itens.length > 0)

  if (atividades.length === 0) {
    return (
      <EstadoVazio
        icone={Plus}
        classeCor="text-estudos"
        titulo="Nenhuma entrega registrada"
        descricao="Trabalho, relatório, lista com prazo — o que precisa ser entregue nesta matéria. A nota, quando houver, continua na aba Avaliações."
        acao={<DialogAtividade materiaId={materiaId} />}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {atividades.length}{' '}
          {atividades.length === 1 ? 'entrega' : 'entregas'} nesta matéria
        </p>
        <DialogAtividade materiaId={materiaId} />
      </div>

      {grupos.map(({ status, itens }) => (
        <div key={status} className="space-y-2">
          <h3
            className={cn(
              'text-xs font-semibold',
              status === 'atrasada' ? 'text-status-risco' : 'text-foreground',
            )}
          >
            {TITULO_GRUPO[status]}
            <span className="text-muted-foreground ml-1.5 font-normal">
              ({itens.length})
            </span>
          </h3>

          <div className="space-y-1.5">
            {itens.map((atividade) => {
              const dias = differenceInCalendarDays(
                deISO(atividade.data_entrega),
                hoje,
              )
              const vinculada = avaliacoes.find(
                (avaliacao) => avaliacao.id === atividade.avaliacao_id,
              )

              return (
                <Card key={atividade.id} className="shadow-none">
                  <CardContent className="flex items-start gap-2.5 px-3 py-2.5">
                    <Checkbox
                      checked={status === 'concluida'}
                      onCheckedChange={(marcado) =>
                        definirConclusao.mutate({
                          id: atividade.id,
                          concluida: Boolean(marcado),
                        })
                      }
                      aria-label={
                        status === 'concluida'
                          ? `Reabrir ${atividade.titulo}`
                          : `Concluir ${atividade.titulo}`
                      }
                      className="mt-0.5 shrink-0"
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={cn(
                            'text-sm font-medium break-words',
                            status === 'concluida' &&
                              'text-muted-foreground line-through',
                          )}
                        >
                          {atividade.titulo}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 text-xs tabular-nums',
                            status === 'atrasada'
                              ? 'text-status-risco font-medium'
                              : 'text-muted-foreground',
                          )}
                        >
                          {format(deISO(atividade.data_entrega), 'dd/MM')}
                          {atividade.hora_entrega
                            ? ` · ${atividade.hora_entrega.slice(0, 5)}`
                            : ''}
                          {status !== 'concluida' && ` · ${rotuloPrazo(dias)}`}
                        </span>
                      </div>

                      {atividade.descricao && (
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {atividade.descricao}
                        </p>
                      )}

                      {/*
                        Vínculo com avaliação: a nota mora lá, nunca aqui. Só
                        aparece depois de entregue — antes disso não há nota
                        para lançar.
                      */}
                      {status === 'concluida' &&
                        (vinculada ? (
                          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                            <Link2 className="size-3 shrink-0" />
                            <span className="truncate">
                              Avaliação: {vinculada.nome}
                              {vinculada.nota === null
                                ? ' (sem nota lançada)'
                                : ` — nota ${vinculada.nota}`}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-1.5 text-xs"
                              onClick={() => desvincular.mutate(atividade.id)}
                            >
                              <Unlink className="size-3" />
                              <span>Desvincular</span>
                            </Button>
                          </div>
                        ) : (
                          <DialogVincularAvaliacao
                            atividade={atividade}
                            avaliacoes={avaliacoes}
                          />
                        ))}
                    </div>

                    <div className="flex shrink-0 items-center">
                      <DialogAtividade
                        atividade={atividade}
                        materiaId={materiaId}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground size-11 sm:size-7"
                            aria-label={`Editar ${atividade.titulo}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <DialogConfirmarExclusao
                        titulo="Excluir entrega"
                        mensagem={`"${atividade.titulo}", com entrega em ${format(deISO(atividade.data_entrega), 'dd/MM/yyyy')}, será removida. A avaliação vinculada, se houver, continua.`}
                        pendente={excluir.isPending}
                        onConfirmar={() => excluir.mutate(atividade.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
