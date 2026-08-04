import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function CategoriaDetalhePage() {
  const { id } = useParams<{ id: string }>()

  return (
    <>
      <PageHeader
        titulo="Categoria"
        descricao={`Detalhe e histórico da categoria ${id ?? ''}`}
      />
      <PlaceholderFase
        fase={1}
        itens={[
          'Histórico de lançamentos da categoria (2.3)',
          'Progresso da meta mensal (2.2)',
          'Tendência de gasto x meta nos últimos 6 meses (2.3)',
        ]}
      />
    </>
  )
}
