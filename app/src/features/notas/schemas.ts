import { z } from 'zod'

/**
 * O título é obrigatório porque dele sai o slug, que é a identidade do
 * wikilink. Nota sem título seria nota sem endereço — ninguém conseguiria
 * apontar para ela.
 */
export const schemaNota = z.object({
  titulo: z.string().trim().min(1, 'Informe um título'),
  conteudo: z.string(),
})

export type FormularioNota = z.infer<typeof schemaNota>
