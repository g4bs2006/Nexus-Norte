import { format } from 'date-fns'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { Card, CardContent } from '@/components/ui/card'
import { deISO, formatarMoeda } from '@/lib/datas'
import { rotuloFormaPagamento } from '@/lib/formasPagamento'
import { cn } from '@/lib/utils'
import { agruparPorDia } from '../calculos'
import { useExcluirLancamento } from '../hooks'
import type { LancamentoDetalhado } from '../types'
import { DialogLancamento } from './DialogLancamento'
import type { Categoria } from '../types'

interface ListaLancamentosProps {
  lancamentos: readonly LancamentoDetalhado[]
  /** Necessárias pelo diálogo de edição. */
  categorias: readonly Categoria[]
  hoje: Date
  carregando?: boolean
  /**
   * Omite o nome da categoria na linha. Para quando a lista já está dentro de uma
   * categoria e repetir o nome em toda linha só gasta a largura que a descrição
   * precisa.
   */
  ocultarCategoria?: boolean
  /** Texto do estado vazio, que muda com o contexto da lista. */
  mensagemVazia?: string
}

/**
 * Lançamentos agrupados por dia (resolução 10.23).
 *
 * Por dia porque a pergunta é "o que eu gastei", que é cronológica. A visão por
 * categoria já existe na grade de categorias do painel, e repeti-la aqui seria
 * redundância — o mesmo raciocínio que tirou o painel de prazos do calendário.
 *
 * O sinal do valor vem da natureza da categoria, não de um campo próprio: `valor`
 * é sempre positivo no banco, e é a categoria que diz se aquilo entrou ou saiu.
 */
export function ListaLancamentos({
  lancamentos,
  categorias,
  hoje,
  carregando = false,
  ocultarCategoria = false,
  mensagemVazia = 'Nenhum lançamento neste período.',
}: ListaLancamentosProps) {
  const excluir = useExcluirLancamento()
  const dias = agruparPorDia(lancamentos)

  if (carregando && lancamentos.length === 0) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="text-muted-foreground text-sm">
          Carregando…
        </CardContent>
      </Card>
    )
  }

  if (dias.length === 0) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="text-muted-foreground text-sm">
          {mensagemVazia}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {dias.map((dia) => (
        <section key={dia.data}>
          {/* Cabeçalho do dia com o saldo — responde "quanto foi hoje" sem somar */}
          <header className="border-border mb-1 flex items-baseline justify-between gap-2 border-b pb-1">
            <h3 className="text-muted-foreground text-xs capitalize">
              {format(deISO(dia.data), 'EEE, dd/MM')}
            </h3>
            <span
              className={cn(
                'metric-sm',
                dia.saldo < 0 ? 'text-foreground' : 'text-status-ok',
              )}
            >
              {dia.saldo < 0 ? '−' : '+'}
              {formatarMoeda(Math.abs(dia.saldo))}
            </span>
          </header>

          <ul className="divide-border divide-y">
            {dia.lancamentos.map((lancamento) => {
              const entrada = lancamento.categoria_natureza === 'receita'

              return (
                <li
                  key={lancamento.id}
                  className="flex items-center gap-2.5 py-2"
                >
                  <span
                    aria-hidden
                    className="h-8 w-0.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        lancamento.categoria_cor ?? 'var(--financeiro)',
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    {/*
                      Quebra em vez de truncar. Com dois alvos de 44px na linha, a
                      descrição fica com ~160px no celular, e `truncate` cortava
                      "Almoço foi mais caro …" numa linha só. Deixar a linha crescer
                      mostra o texto inteiro — é literalmente para isso que a tabela
                      virou lista.
                    */}
                    <p className="text-sm break-words">
                      {lancamento.descricao ?? lancamento.categoria_nome}
                    </p>
                    <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                      {!ocultarCategoria && (
                        <span className="truncate">
                          {lancamento.categoria_nome}
                        </span>
                      )}
                      {lancamento.forma_pagamento && (
                        <span>
                          {rotuloFormaPagamento(lancamento.forma_pagamento)}
                        </span>
                      )}
                    </p>
                  </div>

                  <span
                    className={cn(
                      'metric-sm shrink-0',
                      /*
                       * Só a entrada ganha cor. Pintar a saída de vermelho faria
                       * todo gasto normal parecer problema, e a regra do sistema
                       * é reservar cor semântica ao que pede atenção.
                       */
                      entrada ? 'text-status-ok' : 'text-foreground',
                    )}
                  >
                    {entrada ? '+' : '−'}
                    {formatarMoeda(lancamento.valor)}
                  </span>

                  <DialogLancamento
                    categorias={categorias}
                    hoje={hoje}
                    lancamento={lancamento}
                  />
                  <DialogConfirmarExclusao
                    titulo="Excluir lançamento"
                    mensagem={`${formatarMoeda(lancamento.valor)} em ${format(deISO(lancamento.data), 'dd/MM/yyyy')}${
                      lancamento.descricao ? ` — ${lancamento.descricao}` : ''
                    }. Essa ação não pode ser desfeita.`}
                    onConfirmar={() => excluir.mutate(lancamento.id)}
                    pendente={excluir.isPending}
                  />
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
