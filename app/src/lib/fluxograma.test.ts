import { describe, expect, it } from 'vitest'
import { ORDEM_DIAS_SEMANA, agruparPorDiaSemana, horaCurta } from './fluxograma'

describe('horaCurta', () => {
  it('trunca HH:MM:SS para HH:MM', () => {
    expect(horaCurta('08:00:00')).toBe('08:00')
  })

  it('trunca HH:MM:SS mesmo com minutos diferentes', () => {
    expect(horaCurta('09:30:45')).toBe('09:30')
  })

  it('preserva horários já no formato HH:MM', () => {
    expect(horaCurta('17:45')).toBe('17:45')
  })
})

interface ItemTeste {
  id: string
  dia_semana: number
  horario_inicio: string
}

describe('agruparPorDiaSemana', () => {
  it('agrupa itens por dia da semana', () => {
    const itens: ItemTeste[] = [
      { id: '1', dia_semana: 1, horario_inicio: '09:00' },
      { id: '2', dia_semana: 3, horario_inicio: '10:00' },
      { id: '3', dia_semana: 1, horario_inicio: '14:00' },
    ]

    const resultado = agruparPorDiaSemana(itens)

    expect(resultado.has(1)).toBe(true)
    expect(resultado.has(3)).toBe(true)
    expect(resultado.get(1)).toEqual([
      { id: '1', dia_semana: 1, horario_inicio: '09:00' },
      { id: '3', dia_semana: 1, horario_inicio: '14:00' },
    ])
    expect(resultado.get(3)).toEqual([
      { id: '2', dia_semana: 3, horario_inicio: '10:00' },
    ])
  })

  it('ordena itens do mesmo dia por horário de início', () => {
    const itens: ItemTeste[] = [
      { id: '1', dia_semana: 2, horario_inicio: '14:00' },
      { id: '2', dia_semana: 2, horario_inicio: '09:00' },
      { id: '3', dia_semana: 2, horario_inicio: '11:30' },
    ]

    const resultado = agruparPorDiaSemana(itens)

    expect(resultado.get(2)).toEqual([
      { id: '2', dia_semana: 2, horario_inicio: '09:00' },
      { id: '3', dia_semana: 2, horario_inicio: '11:30' },
      { id: '1', dia_semana: 2, horario_inicio: '14:00' },
    ])
  })

  it('não inclui dias que não têm itens', () => {
    const itens: ItemTeste[] = [
      { id: '1', dia_semana: 1, horario_inicio: '09:00' },
      { id: '2', dia_semana: 5, horario_inicio: '10:00' },
    ]

    const resultado = agruparPorDiaSemana(itens)

    expect(resultado.has(1)).toBe(true)
    expect(resultado.has(2)).toBe(false)
    expect(resultado.has(3)).toBe(false)
    expect(resultado.has(5)).toBe(true)
  })

  it('retorna vazio para lista de itens vazia', () => {
    const itens: ItemTeste[] = []

    const resultado = agruparPorDiaSemana(itens)

    expect(resultado.size).toBe(0)
  })
})

describe('ORDEM_DIAS_SEMANA', () => {
  it('tem sete dias em ordem segunda a domingo', () => {
    expect(ORDEM_DIAS_SEMANA).toEqual([1, 2, 3, 4, 5, 6, 0])
  })
})
