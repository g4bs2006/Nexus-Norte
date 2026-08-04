import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function EstudosPage() {
  return (
    <>
      <PageHeader
        titulo="Estudos"
        descricao="Matérias, médias, faltas e sessões de estudo."
      />
      <PlaceholderFase
        fase={2}
        itens={[
          'Schema: materias, documentos, faltas, avaliacoes, registro_listas, sessoes_estudo (3.1 + 10.7)',
          'Schema: fluxograma_semanal e excecoes_fluxograma com FK real (10.5 + 10.6)',
          'Cálculos: media_materia, media_projetada, risco_reprovacao (3.2 + 10.3)',
          'Trigger de campo-resumo: media_atual em materias (3.2)',
          'Grid de cards de matéria com faltas restantes e contagem regressiva (3.3)',
          'Sub-página com abas: Documentos / Avaliações / Faltas / Sessões (3.3)',
          'Upload de documentos no bucket documentos-estudos (10.10)',
          'Grade de fluxograma semanal — componente compartilhado com Treino (3.3)',
          'Check diário derivado do fluxograma (3.4)',
        ]}
      />
    </>
  )
}
