import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database'

/**
 * Eventos avulsos sem pilar (resolução "criar eventos", ago/2026).
 *
 * Única tabela que o Calendário possui de verdade (plano 6.1 dizia que ele só
 * agrega — este é o primeiro dado que nasce e morre aqui). Mora em módulo
 * próprio, e não dentro de `features/calendario`, pelo mesmo motivo de
 * `fluxograma`: create/editar/excluir é CRUD de formulário, enquanto
 * `calendario/` é só leitura e agregação.
 */

export interface EventoLivre {
  id: string
  titulo: string
  descricao: string | null
  data: string
  hora_inicio: string | null
  hora_fim: string | null
}

export async function listarEventosLivres(
  de: string,
  ate: string,
): Promise<EventoLivre[]> {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .select('id, titulo, descricao, data, hora_inicio, hora_fim')
    .gte('data', de)
    .lte('data', ate)
    .order('data')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarEventoLivre(
  dados: TablesInsert<'eventos_calendario'>,
): Promise<void> {
  const { error } = await supabase.from('eventos_calendario').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarEventoLivre(
  id: string,
  dados: TablesUpdate<'eventos_calendario'>,
): Promise<void> {
  const { error } = await supabase
    .from('eventos_calendario')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirEventoLivre(id: string): Promise<void> {
  const { error } = await supabase
    .from('eventos_calendario')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
