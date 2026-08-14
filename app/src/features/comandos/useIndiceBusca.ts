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
  const [categorias, materias, treinos, exercicios, projetos, notas] =
    await Promise.all([
      supabase.from('categorias').select('id, nome').order('nome'),
      supabase.from('materias').select('id, nome').order('nome'),
      supabase.from('treinos').select('id, nome').order('nome'),
      // Biblioteca, não exercicios_treino: buscar "Supino" deve achar UM
      // resultado, não um por treino que o usa (resolução 10.18)
      supabase.from('biblioteca_exercicios').select('id, nome').order('nome'),
      supabase.from('projetos').select('id, nome').order('nome'),
      // Nota entra pelo TÍTULO, como todo o resto — a paleta filtra em memória.
      // Buscar dentro do conteúdo é outra coisa, e mora em /notas (seção 8).
      supabase
        .from('notas_estudo')
        .select('slug, titulo')
        .order('atualizada_em', { ascending: false }),
    ])

  const erro = [
    categorias,
    materias,
    treinos,
    exercicios,
    projetos,
    notas,
  ].find((r) => r.error)?.error
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
    /*
     * Nota é o texto mais volumoso do sistema e estava fora do índice até
     * 14/08. A paleta vira o modo principal de navegar entre notas: é assim
     * que se usa Obsidian de verdade — se busca, não se navega.
     */
    ...(notas.data ?? []).map((n) => ({
      id: `nota:${n.slug}`,
      nome: n.titulo,
      tipo: 'Nota',
      rota: `/notas/${n.slug}`,
      pilar: 'estudos' as const,
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
