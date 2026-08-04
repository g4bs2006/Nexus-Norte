import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import HomePage from '@/pages/HomePage'
import FinanceiroPage from '@/pages/financeiro/FinanceiroPage'
import CategoriaDetalhePage from '@/pages/financeiro/CategoriaDetalhePage'
import EstudosPage from '@/pages/estudos/EstudosPage'
import MateriaDetalhePage from '@/pages/estudos/MateriaDetalhePage'
import TreinoPage from '@/pages/treino/TreinoPage'
import ExercicioDetalhePage from '@/pages/treino/ExercicioDetalhePage'
import ProjetosPage from '@/pages/projetos/ProjetosPage'
import ProjetoDetalhePage from '@/pages/projetos/ProjetoDetalhePage'
import CalendarioPage from '@/pages/calendario/CalendarioPage'
import NotFoundPage from '@/pages/NotFoundPage'

/** Estrutura de rotas conforme plano, seção 1.1. */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />

        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route
          path="financeiro/categorias/:id"
          element={<CategoriaDetalhePage />}
        />

        <Route path="estudos" element={<EstudosPage />} />
        <Route path="estudos/:materiaId" element={<MateriaDetalhePage />} />

        <Route path="treino" element={<TreinoPage />} />
        <Route path="treino/:exercicioId" element={<ExercicioDetalhePage />} />

        <Route path="projetos" element={<ProjetosPage />} />
        <Route path="projetos/:projetoId" element={<ProjetoDetalhePage />} />

        <Route path="calendario" element={<CalendarioPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
