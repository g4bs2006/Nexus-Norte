import { z } from 'zod'

/** Formulário do bloco livre/trabalho (resolução 10.48.0). */
export const schemaFluxogramaLivre = z
  .object({
    rotulo: z.string().trim().min(1, 'Informe um rótulo'),
    dia_semana: z.number().int().min(0).max(6),
    horario_inicio: z.string().min(1, 'Informe o início'),
    horario_fim: z.string().min(1, 'Informe o fim'),
  })
  .refine((v) => v.horario_fim > v.horario_inicio, {
    message: 'O fim deve ser depois do início',
    path: ['horario_fim'],
  })

export type FormularioFluxogramaLivre = z.infer<typeof schemaFluxogramaLivre>
