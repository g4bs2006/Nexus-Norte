import { describe, expect, it } from 'vitest'
import { ORDEM_DIAS_SEMANA, agruparPorDiaSemana, horaCurta, minutosDe } from './fluxograma'

describe('ORDEM_DIAS_SEMANA', () => {
  it('começa no domingo e termina no sábado', () => {
    expect(ORDEM_DIAS_SEMANA).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  // Garante o que as grades assumem: a coluna de índice N é o dia_semana N.
  // Sem isso, derivar a data de uma coluna como `inicio + indice` erra.
  it('o índice de cada dia é o próprio dia_semana', () => {
    ORDEM_DIAS_SEMANA.forEach((dia, indice) => {
      expect(dia).toBe(indice)
    })
  })
})

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

describe('minutosDe', () => {
  it('converte HH:MM em minutos', () => {
    expect(minutosDe('08:00')).toBe(480)
  })

  it('ignora os segundos de HH:MM:SS', () => {
    expect(minutosDe('08:00:00')).toBe(480)
  })

  it('meia-noite é zero minutos', () => {
    expect(minutosDe('00:00')).toBe(0)
  })

  it('soma os minutos quando não são redondos', () => {
    expect(minutosDe('09:30')).toBe(570)
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
