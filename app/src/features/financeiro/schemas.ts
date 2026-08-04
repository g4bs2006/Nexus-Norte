import { z } from 'zod'
import { CORES_DISPONIVEIS } from '@/lib/cores'

/**
 * Schemas de validação dos formulários do Financeiro (plano 2.5).
 *
 * Espelham as constraints do banco — em especial a relação entre `natureza`,
 * `tipo` e a dupla `meta_mensal`/`meta_tipo` — para que o erro apareça no campo
 * em vez de voltar como falha de constraint do Postgres.
 *
 * Campos de texto opcionais são modelados como `string` com default `''`, não
 * como `nullable`: é o que um `<input>` vazio devolve. A conversão `'' → null`
 * acontece na submissão, junto à chamada da API.
 */

/** `'' → null` para colunas de texto opcionais. */
export function textoOuNulo(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

export const schemaCategoria = z
  .object({
    nome: z.string().trim().min(1, 'Informe um nome'),
    natureza: z.enum(['receita', 'despesa']),
    tipo: z.union([z.enum(['fixo', 'variavel']), z.literal('')]),
    /** Vazio significa "sem meta". */
    meta_mensal: z.union([z.number().positive('A meta deve ser maior que zero'), z.nan()]),
    meta_tipo: z.union([z.enum(['valor', 'percentual_renda']), z.literal('')]),
    // Restrita à paleta do design system: a cor vem de um seletor de swatches,
    // não de entrada livre. `''` = sem cor (cai na cor do pilar).
    cor: z
      .string()
      .refine(
        (valor) =>
          valor === '' ||
          CORES_DISPONIVEIS.some((opcao) => opcao.valor === valor),
        { message: 'Selecione uma cor da paleta' },
      ),
  })
  .refine((v) => v.natureza === 'receita' || v.tipo !== '', {
    message: 'Despesa precisa ser fixa ou variável',
    path: ['tipo'],
  })
  .refine((v) => v.natureza === 'despesa' || v.tipo === '', {
    message: 'Receita não usa fixo/variável',
    path: ['tipo'],
  })
  .refine((v) => Number.isNaN(v.meta_mensal) === (v.meta_tipo === ''), {
    message: 'Defina a meta e o tipo de meta juntos',
    path: ['meta_tipo'],
  })
  .refine(
    (v) => v.meta_tipo !== 'percentual_renda' || v.meta_mensal <= 100,
    { message: 'Percentual da renda deve ser até 100', path: ['meta_mensal'] },
  )

export type FormularioCategoria = z.infer<typeof schemaCategoria>

export const schemaLancamento = z.object({
  valor: z.number({ message: 'Informe um valor' }).positive('O valor deve ser maior que zero'),
  categoria_id: z.string().uuid('Selecione uma categoria'),
  data: z.string().min(1, 'Informe a data'),
  descricao: z.string(),
  forma_pagamento: z.string(),
  /** Resolução 10.2 — só relevante para categorias fixas. */
  data_vencimento: z.string(),
})

export type FormularioLancamento = z.infer<typeof schemaLancamento>

export const schemaInvestimento = z.object({
  tipo: z.enum(['aporte', 'rendimento']),
  // Rendimento pode ser negativo (prejuízo no período); aporte, não.
  valor: z.number({ message: 'Informe um valor' }),
  data: z.string().min(1, 'Informe a data'),
  descricao: z.string(),
})

export type FormularioInvestimento = z.infer<typeof schemaInvestimento>
