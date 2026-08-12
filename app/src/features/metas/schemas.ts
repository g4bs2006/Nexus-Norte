import { z } from 'zod'

/**
 * Schema de validação do formulário de Metas.
 *
 * Um único formulário serve os 4 tipos; campos que só fazem sentido para um
 * tipo (valor_alvo/unidade para numérica, frequencia_alvo para hábito) são
 * validados condicionalmente via `.refine()`, mesma técnica usada em
 * financeiro/schemas.ts. `pilarLink`/`entidadeId` representam o vínculo
 * opcional com um pilar — a submissão (DialogMeta) converte esse par no campo
 * de FK real (categoria_id/materia_id/tipo_treino_id/projeto_id).
 */

export function textoOuNulo(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

export const PILARES_LINK = [
  '',
  'financeiro',
  'estudos',
  'treino',
  'projetos',
  'corporal',
] as const

export const schemaMeta = z
  .object({
    tipo: z.enum(['numerica', 'marco', 'habito', 'livre']),
    titulo: z.string().trim().min(1, 'Informe um título'),
    descricao: z.string(),
    data_alvo: z.string(),

    pilarLink: z.enum(PILARES_LINK),
    entidadeId: z.string(),

    valor_alvo: z.union([
      z.number().positive('O alvo deve ser maior que zero'),
      z.nan(),
    ]),
    unidade: z.string(),

    frequencia_alvo: z.union([
      z.number().int().positive('Informe quantas vezes por semana'),
      z.nan(),
    ]),
    // Liga/desliga: hábito todo santo dia (7x/semana) em vez de uma frequência
    // configurável. Não é uma coluna própria — DialogMeta traduz para
    // frequencia_alvo=7 na submissão, então o schema só cobra frequencia_alvo
    // quando a meta NÃO é diária (o refine abaixo).
    diaria: z.boolean(),
  })
  .refine(
    (v) =>
      v.tipo !== 'numerica' ||
      (!Number.isNaN(v.valor_alvo) && v.unidade.trim() !== ''),
    { message: 'Informe o alvo e a unidade', path: ['valor_alvo'] },
  )
  .refine(
    (v) =>
      v.tipo !== 'habito' || v.diaria || !Number.isNaN(v.frequencia_alvo),
    {
      message: 'Informe quantas vezes por semana',
      path: ['frequencia_alvo'],
    },
  )
  .refine(
    (v) =>
      v.pilarLink === '' ||
      v.pilarLink === 'corporal' || // sem entidade para escolher — é o histórico de peso, não um item
      v.entidadeId !== '',
    { message: 'Selecione o item vinculado', path: ['entidadeId'] },
  )

export type FormularioMeta = z.infer<typeof schemaMeta>
