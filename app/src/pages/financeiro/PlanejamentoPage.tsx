import { CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { formatarMoeda } from '@/lib/datas'
import { useDadosHorizonte } from '@/features/financeiro/horizonte-hooks'
import { useExcluirEventoFinanceiro } from '@/features/financeiro/caixa-hooks'
import { DialogEventoFinanceiro } from '@/features/financeiro/componentes/DialogEventoFinanceiro'
import { CartoesFinanceiros } from '@/features/financeiro/componentes/CartoesFinanceiros'
import { ProjecaoCaixa } from '@/features/financeiro/componentes/ProjecaoCaixa'
import { SimuladorCaixa } from '@/features/financeiro/componentes/SimuladorCaixa'

export default function PlanejamentoPage() {
  const dados = useDadosHorizonte()
  const excluir = useExcluirEventoFinanceiro()
  return <>
    <PageHeader titulo="Planejamento" descricao="Entradas e saídas previstas, cartões e cenários." pilar="financeiro" icone={CalendarClock} acoes={<DialogEventoFinanceiro categorias={dados.categorias} />} />
    {dados.carregando ? <p>Carregando planejamento…</p> : dados.erro ? <p role="alert" className="text-status-risco">{dados.erro.message}</p> :
      <div className="surgir-grupo space-y-6">
        <CartoesFinanceiros />
        <Card><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><CardTitle>Eventos previstos</CardTitle><SimuladorCaixa params={dados.params} categorias={dados.categorias} mediaPorCategoria={dados.estimativa.media} /></CardHeader><CardContent>
          {dados.eventos.length === 0 && <p className="text-muted-foreground text-sm">Cadastre salário, contas e parcelas para enxergar seu caixa futuro.</p>}
          <ul className="divide-y">{dados.eventos.map(e => <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="text-sm font-medium">{e.descricao}</p><p className="text-muted-foreground text-xs">{e.categoria_nome} · {e.categoria_natureza} · {e.termino_tipo === 'parcelas' ? `${e.numero_parcelas} parcelas · total ${formatarMoeda(e.valor_total ?? 0)}` : `${formatarMoeda(e.valor ?? 0)}/mês · dia ${e.dia_mes}`}</p><p className="text-muted-foreground text-xs">Desde {e.data_inicio}{e.data_fim ? ` até ${e.data_fim}` : ''}</p></div>
            <div className="flex items-center gap-1"><DialogEventoFinanceiro categorias={dados.categorias} evento={e} /><DialogConfirmarExclusao titulo="Excluir evento" mensagem="O padrão previsto será excluído. Eventos com pagamentos vinculados precisam ter seus vínculos removidos antes." pendente={excluir.isPending} onConfirmar={() => excluir.mutateAsync(e.id)} /></div>
          </li>)}</ul>
        </CardContent></Card>
        {!dados.params.saldoReferencia && <p className="text-status-atencao text-sm">Informe o saldo inicial no Financeiro. Por enquanto, a projeção é relativa a zero.</p>}
        {dados.mesesHistorico < 3 && <p className="text-muted-foreground text-xs">Histórico variável: {dados.mesesHistorico}/3 meses. Configure o orçamento no Horizonte enquanto constrói seu histórico.</p>}
        <ProjecaoCaixa params={dados.params} pessimista={Math.max(dados.params.orcamentoMensalVariavel, Object.values(dados.estimativa.pior).reduce((s,v) => s+v,0))} />
      </div>}
  </>
}
