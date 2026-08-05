import { z } from 'zod'

/**
 * Schemas dos formulários de Estudos.
 *
 * Campos opcionais são `string` com default `''` (o que um input vazio
 * devolve) e convertidos na submissão. Campos numéricos opcionais usam `NaN`
 * como "vazio", já que `valueAsNumber` de um input vazio é `NaN`.
 */

export function textoOuNulo(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

export function numeroOuNulo(valor: number): number | null {
  return Number.isNaN(valor) ? null : valor
}

/**
 * Converte "4, 7, 12" em [4, 7, 12] (resolução 10.7 — a coluna é `int[]`;
 * a lista separada por vírgula é só conveniência de digitação).
 * Ignora entradas vazias e ordena para leitura estável.
 */
export function parsearQuestoesErradas(valor: string): number[] {
  return valor
    .split(',')
    .map((parte) => parte.trim())
    .filter((parte) => parte !== '')
    .map(Number)
    .filter((numero) => Number.isInteger(numero) && numero > 0)
    .sort((a, b) => a - b)
}

export const schemaMateria = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da matéria'),
  professor: z.string(),
  carga_horaria_total: z.union([
    z.number().positive('Carga horária deve ser positiva'),
    z.nan(),
  ]),
  limite_faltas: z
    .number({ message: 'Informe o limite de faltas' })
    .int('Use um número inteiro')
    .min(0, 'Não pode ser negativo'),
  semestre: z.string(),
})

export type FormularioMateria = z.infer<typeof schemaMateria>

export const schemaAvaliacao = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da avaliação'),
  peso: z
    .number({ message: 'Informe o peso' })
    .positive('O peso deve ser maior que zero'),
  /** Vazio = ainda sem nota lançada. */
  nota: z.union([z.number().min(0, 'A nota não pode ser negativa'), z.nan()]),
  /** Vazio = data ainda não marcada (resolução 10.14). */
  data: z.string(),
})

export type FormularioAvaliacao = z.infer<typeof schemaAvaliacao>

export const schemaFalta = z.object({
  data: z.string().min(1, 'Informe a data'),
  motivo: z.string(),
})

export type FormularioFalta = z.infer<typeof schemaFalta>

export const schemaSessao = z.object({
  data: z.string().min(1, 'Informe a data'),
  duracao_minutos: z
    .number({ message: 'Informe a duração' })
    .int('Use minutos inteiros')
    .positive('A duração deve ser maior que zero'),
  meta_diaria_minutos: z.union([
    z.number().int('Use minutos inteiros').positive('A meta deve ser positiva'),
    z.nan(),
  ]),
})

export type FormularioSessao = z.infer<typeof schemaSessao>

export const schemaRegistroLista = z
  .object({
    nome_lista: z.string().trim().min(1, 'Informe o nome da lista'),
    data: z.string().min(1, 'Informe a data'),
    total_questoes: z
      .number({ message: 'Informe o total de questões' })
      .int('Use um número inteiro')
      .positive('Deve ser maior que zero'),
    questoes_erradas: z.string(),
    topico: z.string(),
  })
  .refine(
    (v) =>
      parsearQuestoesErradas(v.questoes_erradas).every(
        (numero) => numero <= v.total_questoes,
      ),
    {
      message: 'Há questão errada com número acima do total',
      path: ['questoes_erradas'],
    },
  )

export type FormularioRegistroLista = z.infer<typeof schemaRegistroLista>

export const schemaConfigMedia = z
  .object({
    tipo: z.enum(['ponderada', 'manual']),
    nota_manual: z.union([z.number().min(0, 'Nota inválida'), z.nan()]),
    observacao: z.string(),
  })
  .refine((v) => v.tipo === 'ponderada' || !Number.isNaN(v.nota_manual), {
    message: 'Média manual exige a nota',
    path: ['nota_manual'],
  })

export type FormularioConfigMedia = z.infer<typeof schemaConfigMedia>

export const schemaFluxograma = z
  .object({
    materia_id: z.string().uuid('Selecione a matéria'),
    dia_semana: z.number().int().min(0).max(6),
    horario_inicio: z.string().min(1, 'Informe o início'),
    horario_fim: z.string().min(1, 'Informe o fim'),
  })
  .refine((v) => v.horario_fim > v.horario_inicio, {
    message: 'O fim deve ser depois do início',
    path: ['horario_fim'],
  })

export type FormularioFluxograma = z.infer<typeof schemaFluxograma>
