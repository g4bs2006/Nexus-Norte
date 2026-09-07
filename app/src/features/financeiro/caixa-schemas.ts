import { z } from 'zod'

const dataISO = z.string().refine(valor => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000')) return false
  const data = new Date(`${valor}T00:00:00.000Z`)
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor
}, 'Informe uma data válida')
const dia = z.number().int().min(1).max(31)
export const schemaCartao = z.object({ nome: z.string().trim().min(1, 'Informe o nome'), dia_fechamento: dia, dia_vencimento: dia })
export const schemaEventoFinanceiro = z.object({
  descricao: z.string().trim().min(1, 'Informe uma descrição'), categoria_id: z.string().uuid('Selecione a categoria'),
  data_inicio: dataISO, dia_mes: dia, termino_tipo: z.enum(['indefinido', 'data', 'parcelas']),
  data_fim: z.string(), valor: z.number().positive('Informe um valor positivo'),
  numero_parcelas: z.number().int().min(1).max(600), juros_mensal: z.number().min(0).max(100),
}).refine(v => v.termino_tipo !== 'data' || (dataISO.safeParse(v.data_fim).success && v.data_fim >= v.data_inicio), { message: 'Informe um término válido igual ou posterior ao início', path: ['data_fim'] })
export type FormularioEventoFinanceiro = z.infer<typeof schemaEventoFinanceiro>
export function dadosEvento(v: FormularioEventoFinanceiro) {
  const parcelado = v.termino_tipo === 'parcelas'
  return { descricao: v.descricao, categoria_id: v.categoria_id, data_inicio: v.data_inicio, dia_mes: parcelado ? Number(v.data_inicio.slice(8, 10)) : v.dia_mes,
    termino_tipo: v.termino_tipo, data_fim: v.termino_tipo === 'data' ? v.data_fim : null,
    valor: parcelado ? null : v.valor, valor_total: parcelado ? v.valor : null,
    numero_parcelas: parcelado ? v.numero_parcelas : null, juros_mensal: parcelado ? v.juros_mensal : null }
}
