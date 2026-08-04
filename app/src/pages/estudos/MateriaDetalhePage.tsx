import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function MateriaDetalhePage() {
  const { materiaId } = useParams<{ materiaId: string }>()

  return (
    <>
      <PageHeader
        titulo="Matéria"
        descricao={`Detalhe da matéria ${materiaId ?? ''}`}
      />
      <PlaceholderFase
        fase={2}
        itens={[
          'Aba Documentos: lista com upload e filtro por tipo (3.3)',
          'Aba Avaliações: tabela nota/peso + editor de fórmula (3.3)',
          'Aba Faltas: lista com motivo e contador de restantes (3.3)',
          'Aba Sessões de estudo: timer ou input manual + histórico (3.3)',
          'Registro de listas de exercícios (3.3 + 10.7)',
        ]}
      />
    </>
  )
}
