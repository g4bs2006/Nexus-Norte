import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PilarId } from '@/lib/pilares'

/**
 * Índice de busca da paleta de comando.
 *
 * Só é carregado quando a paleta abre (`enabled`): manter cinco queries vivas em
 * toda página para alimentar uma busca que talvez nunca seja usada seria
 * desperdício. Depois de aberta uma vez, o cache do React Query segura o
 * resultado pelo staleTime padrão.
 */

export interface ItemBusca {
  id: string
  nome: string
  /** Rótulo do tipo, exibido ao lado do nome. */
  tipo: string
  rota: string
  pilar: PilarId
}

async function carregarIndice(): Promise<ItemBusca[]> {
  const [categorias, materias, treinos, exercicios, projetos] =
    await Promise.all([
      supabase.from('categorias').select('id, nome').order('nome'),
      supabase.from('materias').select('id, nome').order('nome'),
      supabase.from('treinos').select('id, nome').order('nome'),
      // Biblioteca, não exercicios_treino: buscar "Supino" deve achar UM
      // resultado, não um por treino que o usa (resolução 10.18)
      supabase.from('biblioteca_exercicios').select('id, nome').order('nome'),
      supabase.from('projetos').select('id, nome').order('nome'),
    ])

  const erro = [categorias, materias, treinos, exercicios, projetos].find(
    (r) => r.error,
  )?.error
  if (erro) throw new Error(erro.message)

  return [
    ...(categorias.data ?? []).map((c) => ({
      id: `categoria:${c.id}`,
      nome: c.nome,
      tipo: 'Categoria',
      rota: `/financeiro/categorias/${c.id}`,
      pilar: 'financeiro' as const,
    })),
    ...(materias.data ?? []).map((m) => ({
      id: `materia:${m.id}`,
      nome: m.nome,
      tipo: 'Matéria',
      rota: `/estudos/${m.id}`,
      pilar: 'estudos' as const,
    })),
    // Treino não tem sub-página própria; leva para a listagem
    ...(treinos.data ?? []).map((t) => ({
      id: `treino:${t.id}`,
      nome: t.nome,
      tipo: 'Treino',
      rota: '/treino',
      pilar: 'treino' as const,
    })),
    ...(exercicios.data ?? []).map((e) => ({
      id: `exercicio:${e.id}`,
      nome: e.nome,
      tipo: 'Exercício',
      rota: `/treino/${e.id}`,
      pilar: 'treino' as const,
    })),
    ...(projetos.data ?? []).map((p) => ({
      id: `projeto:${p.id}`,
      nome: p.nome,
      tipo: 'Projeto',
      rota: `/projetos/${p.id}`,
      pilar: 'projetos' as const,
    })),
  ]
}

export function useIndiceBusca(habilitado: boolean) {
  return useQuery({
    queryKey: ['comandos', 'indice'] as const,
    queryFn: carregarIndice,
    enabled: habilitado,
  })
}
