import { PageHeader } from '@/components/PageHeader'
import { PlaceholderFase } from '@/components/PlaceholderFase'

export default function HomePage() {
  return (
    <>
      <PageHeader
        titulo="Home"
        descricao="Hub central — agrega os pilares sem duplicar dado."
      />
      <PlaceholderFase
        fase={6}
        itens={[
          'Mini-card Financeiro: receita vs. despesa + status do mês (7.1)',
          'Mini-card Estudos: matérias em risco + próxima avaliação (7.1)',
          'Mini-card Treino: frequência da semana + PR mais recente (7.1)',
          'Mini-card Projetos: momentum baixo + projeto mais ativo (7.1)',
          'Mini-indicador de sono: horas de ontem vs. meta (7.1)',
          'Bloco unificado de checks do dia (7.1)',
          'Atalho para o calendário: próximos 3-5 eventos (7.1)',
        ]}
      />
    </>
  )
}
