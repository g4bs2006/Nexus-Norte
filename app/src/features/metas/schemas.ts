import { z } from 'zod'
import { CORES_DISPONIVEIS } from '@/lib/cores'

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

/**
 * Cor da categoria: `''` (sem cor) ou um hex da paleta fixa de `lib/cores`.
 *
 * O campo era `z.string()` livre, alimentado por um `<input type="color">` e por
 * um campo de texto — qualquer coisa era aceita e gravada. Cor de categoria fica
 * no banco e precisa continuar legível nos dois temas (ver `lib/cores`), então
 * pertence ao design system e não à digitação do usuário: a validação recusa o
 * que o `SeletorCor` não oferece.
 */
const CORES_VALIDAS = CORES_DISPONIVEIS.map((cor) => cor.valor)

export const schemaCategoriaMeta = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria'),
  cor: z
    .string()
    .refine(
      (valor) => valor === '' || CORES_VALIDAS.includes(valor),
      'Escolha uma cor da paleta',
    ),
})

export type FormularioCategoriaMeta = z.infer<typeof schemaCategoriaMeta>
