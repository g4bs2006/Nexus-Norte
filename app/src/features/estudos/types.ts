import type { Tables } from '@/types/database'

/** Tipos de domínio de Estudos — estreitam as colunas `text` com CHECK. */

export type TipoDocumento =
  'lista' | 'livro' | 'anotacao' | 'ementa' | 'prova_anterior'

export type TipoCalculoMedia = 'ponderada' | 'manual'
export type StatusExcecao = 'cancelado' | 'remarcado'

export type Materia = Tables<'materias'>

export type Documento = Omit<Tables<'documentos'>, 'tipo'> & {
  tipo: TipoDocumento
}

export type Falta = Tables<'faltas'>
export type Avaliacao = Tables<'avaliacoes'>
export type RegistroLista = Tables<'registro_listas'>
export type SessaoEstudo = Tables<'sessoes_estudo'>

/**
 * Nota de estudo — documento vivo, não entrada datada.
 *
 * Entidade própria desde 13/08. Antes era a coluna `materias.notas_estudo`, e
 * anotar significava editar o cadastro da matéria.
 */
export type NotaEstudo = Tables<'notas_estudo'>
export type FluxogramaSemanal = Tables<'fluxograma_semanal'>

/**
 * Entrada de fluxograma que representa uma AULA.
 *
 * A tabela é compartilhada com Treino (resolução 10.6) e o check constraint
 * garante que exatamente uma das FKs esteja preenchida. Este tipo estreita
 * `materia_id` para não-nulo nas consultas já filtradas.
 */
export type FluxogramaAula = Omit<FluxogramaSemanal, 'materia_id'> & {
  materia_id: string
}

export type ConfigCalculoMedia = Omit<
  Tables<'config_calculo_media'>,
  'tipo'
> & {
  tipo: TipoCalculoMedia
}

export type ExcecaoFluxograma = Omit<
  Tables<'excecoes_fluxograma'>,
  'status'
> & {
  status: StatusExcecao
}

export const ROTULOS_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  lista: 'Lista',
  livro: 'Livro',
  anotacao: 'Anotação',
  ementa: 'Ementa',
  prova_anterior: 'Prova anterior',
}
