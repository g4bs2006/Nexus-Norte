/** Motor compartilhado pelo navegador e pelo agendador de notificações. */
export interface EventoPrevisto {
  id: string; descricao: string; categoria_id: string; categoria_natureza: 'receita' | 'despesa'
  data_inicio: string; dia_mes: number; data_fim: string | null; termino_tipo: string
  valor: number | null; valor_total: number | null; numero_parcelas: number | null; juros_mensal: number | null
}
export interface OcorrenciaFinanceira {
  evento_id: string; data: string; valor: number; descricao: string; categoria_id: string; categoria_natureza: 'receita' | 'despesa'
}
const mesNumero = (data: string) => Number(data.slice(0,4)) * 12 + Number(data.slice(5,7)) - 1
function dataNoMes(mes: number, dia: number) {
  const ano = Math.floor(mes / 12), indice = mes % 12
  const ultimo = new Date(Date.UTC(ano, indice + 1, 0)).getUTCDate()
  return `${ano}-${String(indice + 1).padStart(2,'0')}-${String(Math.min(dia, ultimo)).padStart(2,'0')}`
}
export function expandirEventos(eventos: readonly EventoPrevisto[], de: string, ate: string): OcorrenciaFinanceira[] {
  const resultado: OcorrenciaFinanceira[] = []
  for (const e of eventos) {
    for (let mes = Math.max(mesNumero(de), mesNumero(e.data_inicio)); mes <= mesNumero(ate); mes++) {
      const data = dataNoMes(mes, e.dia_mes)
      if (data < de || data > ate || data < e.data_inicio || (e.data_fim && data > e.data_fim)) continue
      let valor = e.valor ?? 0
      if (e.termino_tipo === 'parcelas') {
        const indice = mes - mesNumero(e.data_inicio), quantidade = e.numero_parcelas ?? 0
        if (quantidade < 1 || indice >= quantidade) break
        const total = Math.round((e.valor_total ?? 0) * 100), juros = (e.juros_mensal ?? 0) / 100
        const parcela = Math.floor(total / quantidade)
        valor = juros > 0 ? Math.round(total * juros / (1 - (1 + juros) ** -quantidade)) / 100 : (parcela + (indice === quantidade - 1 ? total - parcela * quantidade : 0)) / 100
      }
      resultado.push({ evento_id: e.id, data, valor, descricao: e.descricao, categoria_id: e.categoria_id, categoria_natureza: e.categoria_natureza })
    }
  }
  return resultado.sort((a,b) => a.data.localeCompare(b.data) || a.evento_id.localeCompare(b.evento_id))
}
export function pendenciasEventos(eventos: readonly EventoPrevisto[], lancamentos: readonly { evento_id: string | null; competencia_evento: string | null; valor: number }[], de: string, ate: string) {
  const quitado = new Map<string, number>()
  for (const l of lancamentos) if (l.evento_id && l.competencia_evento) {
    const chave = `${l.evento_id}:${l.competencia_evento}`
    quitado.set(chave, (quitado.get(chave) ?? 0) + Math.round(l.valor * 100))
  }
  return expandirEventos(eventos,de,ate).flatMap(o => {
    const valor = Math.max(0, Math.round(o.valor * 100) - (quitado.get(`${o.evento_id}:${o.data}`) ?? 0)) / 100
    return valor > 0 ? [{ ...o, valor }] : []
  })
}
