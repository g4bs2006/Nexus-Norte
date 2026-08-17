import { z } from 'zod'

export function textoOuNulo(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

export const schemaMeta = z.object({
  titulo: z.string().trim().min(1, 'Informe um título'),
  descricao: z.string(),
  categoria_meta_id: z.string().nullable(),
  pilar: z
    .enum(['financeiro', 'estudos', 'treino', 'projetos', 'pessoal'])
    .nullable(),
  data_alvo: z.string().nullable(),
  no_check_diario: z.boolean(),
})

export type FormularioMeta = z.infer<typeof schemaMeta>

export const schemaCategoriaMeta = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria'),
  cor: z.string(),
  ordem: z.number().int(),
})

export type FormularioCategoriaMeta = z.infer<typeof schemaCategoriaMeta>
