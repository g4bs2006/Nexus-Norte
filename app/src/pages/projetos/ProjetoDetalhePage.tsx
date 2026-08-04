import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function ProjetoDetalhePage() {
  const { projetoId } = useParams<{ projetoId: string }>()

  return (
    <>
      <PageHeader
        titulo="Projeto"
        descricao={`Detalhe do projeto ${projetoId ?? ''}`}
      />
      <PlaceholderFase
        fase={4}
        itens={[
          'Timeline do log de progresso, mais recente no topo (5.3)',
          'Lista de marcos em checklist ou kanban simples (5.3)',
          'Formulário de novo log de progresso — a ação do dia (5.4)',
        ]}
      />
    </>
  )
}
