import { expect, it } from 'vitest'
import { eventosContas } from './eventos'

it('abre o Horizonte para fatura que reúne várias categorias', () => {
  const eventos = eventosContas([{ id: 'fatura:cartao:2026-09-10', descricao: 'Fatura', valor: 100, data: '2026-09-10', data_vencimento: '2026-09-10', categoria_id: 'primeira-categoria', categoria_tipo: 'fixo', categoria_natureza: 'despesa' }], { de: '2026-09-01', ate: '2026-09-30' })
  expect(eventos[0]?.rota).toBe('/financeiro')
})
