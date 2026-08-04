import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function ExercicioDetalhePage() {
  const { exercicioId } = useParams<{ exercicioId: string }>()

  return (
    <>
      <PageHeader
        titulo="Exercício"
        descricao={`Histórico de progressão do exercício ${exercicioId ?? ''}`}
      />
      <PlaceholderFase
        fase={3}
        itens={[
          'Gráfico de carga ao longo do tempo (4.3)',
          'Histórico de execuções com reps e RPE (4.1)',
          'Recordes pessoais e 1RM estimado (4.2)',
          'Sinal de estagnação e sugestão de ajuste (4.2)',
        ]}
      />
    </>
  )
}
