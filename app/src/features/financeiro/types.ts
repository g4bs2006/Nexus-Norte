import type { Tables } from '@/types/database'

/**
 * Tipos de domínio do Financeiro.
 *
 * O arquivo gerado (`src/types/database.ts`) tipa colunas `text` com CHECK
 * apenas como `string`. Aqui elas são estreitadas para uniões de literais, de
 * modo que o compilador cubra os `switch` e comparações — sem editar o arquivo
 * gerado, que é sobrescrito a cada `npm run types:gen`.
 */

export type NaturezaCategoria = 'receita' | 'despesa'
export type TipoCategoria = 'fixo' | 'variavel'
export type MetaTipo = 'valor' | 'percentual_renda'
export type TipoInvestimento = 'aporte' | 'rendimento'

export type Categoria = Omit<
  Tables<'categorias'>,
  'natureza' | 'tipo' | 'meta_tipo'
> & {
  natureza: NaturezaCategoria
  /** Null para categorias de receita (constraint categorias_tipo_por_natureza). */
  tipo: TipoCategoria | null
  meta_tipo: MetaTipo | null
}

export type Lancamento = Tables<'lancamentos'>

export type Investimento = Omit<Tables<'investimentos'>, 'tipo'> & {
  tipo: TipoInvestimento
}

export type PlanejamentoSemanal = Tables<'planejamento_semanal_financeiro'>

export interface CandidatoCorte {
  categoria_id: string
  nome: string
  meta_efetiva: number
  meses_estourados: number
}

/** Status do semáforo usado pelos pilares (🟢/🟡/🔴). */
export type Status = 'ok' | 'atencao' | 'risco'
