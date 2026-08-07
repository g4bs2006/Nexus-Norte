import { z } from 'zod'

/** Formulário do evento avulso (resolução "criar eventos", ago/2026). */
export const schemaEventoLivre = z
  .object({
    titulo: z.string().trim().min(1, 'Informe um título'),
    descricao: z.string().trim(),
    data: z.string().min(1, 'Informe a data'),
    diaInteiro: z.boolean(),
    hora_inicio: z.string(),
    hora_fim: z.string(),
  })
  .refine((v) => v.diaInteiro || v.hora_inicio.length > 0, {
    message: 'Informe o início',
    path: ['hora_inicio'],
  })
  .refine((v) => v.diaInteiro || v.hora_fim.length > 0, {
    message: 'Informe o fim',
    path: ['hora_fim'],
  })
  .refine((v) => v.diaInteiro || v.hora_fim > v.hora_inicio, {
    message: 'O fim deve ser depois do início',
    path: ['hora_fim'],
  })

export type FormularioEventoLivre = z.infer<typeof schemaEventoLivre>
