import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function ProjetosPage() {
  return (
    <>
      <PageHeader
        titulo="Projetos"
        descricao="Marcos, log de progresso e momentum."
      />
      <PlaceholderFase
        fase={4}
        itens={[
          'Schema: projetos, marcos_projeto, log_progresso (5.1)',
          'Cálculos: percentual concluído e dias desde a última atualização (5.2)',
          'Momentum calculado na leitura, não por trigger (10.9)',
          'Grid de cards com esfriamento visual por momentum baixo (5.3)',
          'Abas: Ativos / Pausados / Concluídos (5.3)',
          'Página do projeto: timeline do log + lista de marcos (5.3)',
        ]}
      />
    </>
  )
}
