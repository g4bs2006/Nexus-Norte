import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function TreinoPage() {
  return (
    <>
      <PageHeader
        titulo="Treino"
        descricao="Execuções, progressão de carga e recordes pessoais."
      />
      <PlaceholderFase
        fase={3}
        itens={[
          'Schema: treinos, exercicios_treino com grupo_muscular, execucoes, PRs, registro_corporal, lesoes (4.1 + 10.1)',
          'Estender fluxograma_semanal com treino_id (10.6)',
          'Cálculos: 1RM estimado (Epley), progressão, sinal de estagnação, volume por grupo (4.2)',
          'Card de treino de hoje derivado do fluxograma (4.3)',
          'Grid de exercícios com gráfico de progressão de carga (4.3)',
          'Seção de PRs recentes com destaque visual (4.3)',
          'Gráfico discreto de peso corporal (4.3)',
          'Indicador de frequência semanal (4.3)',
          'Upload de foto de progresso no bucket progresso-treino (10.10)',
          'Check diário derivado do fluxograma (4.4)',
        ]}
      />
    </>
  )
}
