import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function CalendarioPage() {
  return (
    <>
      <PageHeader
        titulo="Calendário"
        descricao="Camada transversal — provas, aulas, treinos, vencimentos e sono."
      />
      <PlaceholderFase
        fase={5}
        itens={[
          'FullCalendar com eventos coloridos por pilar (6.2)',
          'Visões mensal e semanal (6.2)',
          'Filtro de camadas por pilar (6.2)',
          'Expansão de recorrência no cliente via função pura (10.5)',
          'Exceções pontuais de fluxograma: cancelado / remarcado (10.5)',
          'Contas a pagar via data_vencimento com fallback para data (10.2)',
          'Blocos de sono na grade semanal (6.2)',
        ]}
      />
    </>
  )
}
