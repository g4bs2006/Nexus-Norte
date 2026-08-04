import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function FinanceiroPage() {
  return (
    <>
      <PageHeader
        titulo="Financeiro"
        descricao="Planejado vs. realizado, metas por categoria e investimentos."
      />
      <PlaceholderFase
        fase={1}
        itens={[
          'Schema: categorias, lancamentos, investimentos, planejamento_semanal_financeiro (2.1 + 10.2 + 10.4)',
          'Cálculos como funções puras: gasto disponível, progresso, saldo projetado (2.2)',
          'Trigger de campo-resumo: total_gasto_mes e candidato_corte (2.2 + 10.9)',
          'Card de receita vs. despesa (2.3)',
          'Grade de planejamento semanal dia × categoria (2.3)',
          'Grid de cards por categoria com anel de progresso (2.3)',
          'Gráfico de tendência 6 meses via Recharts (2.3)',
          'Seção de atenção: candidatos a corte (2.3)',
          'Checks diário e semanal (2.4)',
        ]}
      />
    </>
  )
}
