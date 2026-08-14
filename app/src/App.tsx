import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useNavegacaoPorNotificacao } from '@/features/notificacoes/hooks'

/**
 * Rotas carregadas sob demanda (plano, seção 8 — polimento de performance).
 *
 * Recharts e FullCalendar são pesados e só fazem sentido nas pages que os usam:
 * sem code-splitting o bundle único passava de 1,5 MB, e abrir a Home baixava o
 * calendário inteiro. O fallback do Suspense fica no AppShell.
 */
const HomePage = lazy(() => import('@/pages/HomePage'))
const FinanceiroPage = lazy(() => import('@/pages/financeiro/FinanceiroPage'))
const CategoriaDetalhePage = lazy(
  () => import('@/pages/financeiro/CategoriaDetalhePage'),
)
const LancamentosPage = lazy(() => import('@/pages/financeiro/LancamentosPage'))
const PlanejamentoPage = lazy(
  () => import('@/pages/financeiro/PlanejamentoPage'),
)
const EstudosPage = lazy(() => import('@/pages/estudos/EstudosPage'))
const MateriaDetalhePage = lazy(
  () => import('@/pages/estudos/MateriaDetalhePage'),
)
const NotasPage = lazy(() => import('@/pages/notas/NotasPage'))
const NotaDetalhePage = lazy(() => import('@/pages/notas/NotaDetalhePage'))
const TreinoPage = lazy(() => import('@/pages/treino/TreinoPage'))
const ExercicioDetalhePage = lazy(
  () => import('@/pages/treino/ExercicioDetalhePage'),
)
const ProjetosPage = lazy(() => import('@/pages/projetos/ProjetosPage'))
const ProjetoDetalhePage = lazy(
  () => import('@/pages/projetos/ProjetoDetalhePage'),
)
const CalendarioPage = lazy(() => import('@/pages/calendario/CalendarioPage'))
const RitualSemanalPage = lazy(
  () => import('@/pages/calendario/RitualSemanalPage'),
)
const HistoricoPage = lazy(() => import('@/pages/calendario/HistoricoPage'))
const BlocosPage = lazy(() => import('@/pages/calendario/BlocosPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

/** Estrutura de rotas conforme plano, seção 1.1. */
export default function App() {
  useNavegacaoPorNotificacao()

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />

        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="financeiro/lancamentos" element={<LancamentosPage />} />
        <Route
          path="financeiro/planejamento"
          element={<PlanejamentoPage />}
        />
        <Route
          path="financeiro/categorias/:id"
          element={<CategoriaDetalhePage />}
        />

        <Route path="estudos" element={<EstudosPage />} />
        <Route path="estudos/:materiaId" element={<MateriaDetalhePage />} />

        {/*
         * Fora de `estudos/` de propósito: o índice cruza todas as matérias e
         * semestres, e a nota tem endereço próprio para poder ser linkada de
         * qualquer lugar (spec 14/08, seção 9).
         */}
        <Route path="notas" element={<NotasPage />} />
        <Route path="notas/:slug" element={<NotaDetalhePage />} />

        <Route path="treino" element={<TreinoPage />} />
        <Route path="treino/:exercicioId" element={<ExercicioDetalhePage />} />

        <Route path="projetos" element={<ProjetosPage />} />
        <Route path="projetos/:projetoId" element={<ProjetoDetalhePage />} />

        <Route path="calendario" element={<CalendarioPage />} />
        <Route path="calendario/semana" element={<RitualSemanalPage />} />
        <Route path="calendario/historico" element={<HistoricoPage />} />
        <Route path="calendario/blocos" element={<BlocosPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
