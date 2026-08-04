import { describe, expect, it } from 'vitest'
import {
  construirEventos,
  eventosAvaliacoes,
  eventosContas,
  eventosFluxograma,
  eventosMarcos,
  eventosSono,
  eventosComPrazo,
  type FontesCalendario,
} from './eventos'

// 2026-08-03 (segunda) a 2026-08-09 (domingo)
const SEMANA = { de: '2026-08-03', ate: '2026-08-09' }

const MATERIAS = new Map([['m1', 'Cálculo II']])
const TREINOS = new Map([['t1', 'Treino A']])

describe('eventosAvaliacoes', () => {
  const base = { id: 'a1', nome: 'P1', nota: null, materia_id: 'm1' }

  it('cria evento de dia inteiro com nome da matéria', () => {
    const eventos = eventosAvaliacoes(
      [{ ...base, data: '2026-08-05' }],
      SEMANA,
      MATERIAS,
    )

    expect(eventos).toHaveLength(1)
    expect(eventos[0]?.titulo).toBe('P1 — Cálculo II')
    expect(eventos[0]?.diaInteiro).toBe(true)
    expect(eventos[0]?.camada).toBe('estudos')
  })

  it('ignora avaliação sem data marcada', () => {
    expect(
      eventosAvaliacoes([{ ...base, data: null }], SEMANA, MATERIAS),
    ).toEqual([])
  })

  it('ignora avaliação fora do intervalo', () => {
    expect(
      eventosAvaliacoes([{ ...base, data: '2026-09-01' }], SEMANA, MATERIAS),
    ).toEqual([])
  })

  it('usa só o nome quando a matéria não é conhecida', () => {
    const eventos = eventosAvaliacoes(
      [{ ...base, materia_id: 'desconhecida', data: '2026-08-05' }],
      SEMANA,
      MATERIAS,
    )
    expect(eventos[0]?.titulo).toBe('P1')
  })
})

describe('eventosFluxograma', () => {
  const aula = {
    id: 'f1',
    dia_semana: 1,
    horario_inicio: '08:00:00',
    horario_fim: '10:00:00',
    materia_id: 'm1',
    treino_id: null,
  }
  const treino = {
    id: 'f2',
    dia_semana: 3,
    horario_inicio: '18:00:00',
    horario_fim: '19:30:00',
    materia_id: null,
    treino_id: 't1',
  }

  it('classifica a camada pela FK preenchida', () => {
    const eventos = eventosFluxograma(
      [aula, treino],
      [],
      SEMANA,
      MATERIAS,
      TREINOS,
    )

    expect(eventos.map((e) => [e.titulo, e.camada])).toEqual([
      ['Cálculo II', 'estudos'],
      ['Treino A', 'treino'],
    ])
  })

  it('monta horários ISO com data e hora', () => {
    const eventos = eventosFluxograma([aula], [], SEMANA, MATERIAS, TREINOS)

    expect(eventos[0]?.inicio).toBe('2026-08-03T08:00:00')
    expect(eventos[0]?.fim).toBe('2026-08-03T10:00:00')
    expect(eventos[0]?.diaInteiro).toBe(false)
  })

  it('omite ocorrência cancelada', () => {
    const eventos = eventosFluxograma(
      [aula],
      [{ fluxograma_id: 'f1', data: '2026-08-03', status: 'cancelado' }],
      SEMANA,
      MATERIAS,
      TREINOS,
    )
    expect(eventos).toEqual([])
  })

  it('marca ocorrência remarcada no título', () => {
    const eventos = eventosFluxograma(
      [aula],
      [{ fluxograma_id: 'f1', data: '2026-08-03', status: 'remarcado' }],
      SEMANA,
      MATERIAS,
      TREINOS,
    )
    expect(eventos[0]?.titulo).toBe('Cálculo II (remarcado)')
  })
})

describe('eventosContas', () => {
  const base = {
    id: 'l1',
    descricao: 'Aluguel',
    valor: 1800,
    data: '2026-08-03',
    categoria_id: 'cat-aluguel',
    data_vencimento: null as string | null,
    categoria_tipo: 'fixo' as string | null,
    categoria_natureza: 'despesa',
  }

  it('usa data_vencimento quando existe', () => {
    const eventos = eventosContas(
      [{ ...base, data_vencimento: '2026-08-07' }],
      SEMANA,
    )
    expect(eventos[0]?.inicio).toBe('2026-08-07')
  })

  it('cai em data quando não há vencimento (resolução 10.2)', () => {
    const eventos = eventosContas([base], SEMANA)
    expect(eventos[0]?.inicio).toBe('2026-08-03')
  })

  it('ignora despesa variável', () => {
    expect(
      eventosContas([{ ...base, categoria_tipo: 'variavel' }], SEMANA),
    ).toEqual([])
  })

  it('ignora receita', () => {
    expect(
      eventosContas(
        [{ ...base, categoria_natureza: 'receita', categoria_tipo: null }],
        SEMANA,
      ),
    ).toEqual([])
  })

  it('filtra pelo vencimento, não pela data do lançamento', () => {
    // Lançamento dentro da semana, mas vencimento fora dela
    const eventos = eventosContas(
      [{ ...base, data_vencimento: '2026-09-10' }],
      SEMANA,
    )
    expect(eventos).toEqual([])
  })
})

describe('eventosSono', () => {
  it('estende o bloco para o dia seguinte quando cruza a meia-noite', () => {
    const eventos = eventosSono(
      [
        {
          id: 's1',
          dia_semana: 1,
          hora_dormir_alvo: '23:30:00',
          hora_acordar_alvo: '07:15:00',
        },
      ],
      { de: '2026-08-03', ate: '2026-08-03' },
    )

    expect(eventos[0]?.inicio).toBe('2026-08-03T23:30:00')
    expect(eventos[0]?.fim).toBe('2026-08-04T07:15:00')
  })

  it('mantém no mesmo dia quando não cruza a meia-noite', () => {
    const eventos = eventosSono(
      [
        {
          id: 's2',
          dia_semana: 1,
          hora_dormir_alvo: '13:00:00',
          hora_acordar_alvo: '14:00:00',
        },
      ],
      { de: '2026-08-03', ate: '2026-08-03' },
    )

    expect(eventos[0]?.inicio).toBe('2026-08-03T13:00:00')
    expect(eventos[0]?.fim).toBe('2026-08-03T14:00:00')
  })

  it('gera um bloco por dia correspondente no intervalo', () => {
    const eventos = eventosSono(
      [
        {
          id: 's3',
          dia_semana: 1,
          hora_dormir_alvo: '23:00:00',
          hora_acordar_alvo: '07:00:00',
        },
      ],
      { de: '2026-08-03', ate: '2026-08-17' },
    )

    expect(eventos).toHaveLength(3)
  })
})

describe('eventosMarcos', () => {
  it('inclui o nome do projeto no título', () => {
    const eventos = eventosMarcos(
      [
        {
          id: 'mp1',
          nome: 'Entregar MVP',
          data_prevista: '2026-08-06',
          projeto_id: 'proj-nexus',
          projeto_nome: 'Nexus',
        },
      ],
      SEMANA,
    )

    expect(eventos[0]?.titulo).toBe('Entregar MVP — Nexus')
    expect(eventos[0]?.camada).toBe('projetos')
  })

  it('ignora marco sem data prevista', () => {
    expect(
      eventosMarcos(
        [
          {
            id: 'mp2',
            nome: 'X',
            data_prevista: null,
            projeto_id: 'p',
            projeto_nome: 'Y',
          },
        ],
        SEMANA,
      ),
    ).toEqual([])
  })
})

describe('construirEventos', () => {
  it('agrega todas as camadas e gera ids únicos', () => {
    const fontes: FontesCalendario = {
      avaliacoes: [
        {
          id: 'a1',
          nome: 'P1',
          data: '2026-08-05',
          nota: null,
          materia_id: 'm1',
        },
      ],
      fluxograma: [
        {
          id: 'f1',
          dia_semana: 1,
          horario_inicio: '08:00:00',
          horario_fim: '10:00:00',
          materia_id: 'm1',
          treino_id: null,
        },
      ],
      excecoes: [],
      contas: [
        {
          id: 'l1',
          descricao: 'Aluguel',
          valor: 1800,
          data: '2026-08-04',
          data_vencimento: null,
          categoria_id: 'cat-aluguel',
          categoria_tipo: 'fixo',
          categoria_natureza: 'despesa',
        },
      ],
      planejamentoSono: [
        {
          id: 's1',
          dia_semana: 2,
          hora_dormir_alvo: '23:00:00',
          hora_acordar_alvo: '07:00:00',
        },
      ],
      marcos: [
        {
          id: 'mp1',
          nome: 'Marco',
          data_prevista: '2026-08-06',
          projeto_id: 'proj-nexus',
          projeto_nome: 'Nexus',
        },
      ],
      nomePorMateria: MATERIAS,
      nomePorTreino: TREINOS,
    }

    const eventos = construirEventos(fontes, SEMANA)
    const camadas = new Set(eventos.map((e) => e.camada))

    expect(camadas).toEqual(
      new Set(['estudos', 'financeiro', 'sono', 'projetos']),
    )
    expect(new Set(eventos.map((e) => e.id)).size).toBe(eventos.length)
  })

  it('devolve vazio quando não há nada nas fontes', () => {
    const vazio: FontesCalendario = {
      avaliacoes: [],
      fluxograma: [],
      excecoes: [],
      contas: [],
      planejamentoSono: [],
      marcos: [],
      nomePorMateria: new Map(),
      nomePorTreino: new Map(),
    }

    expect(construirEventos(vazio, SEMANA)).toEqual([])
  })
})

// --- tipo, rota e filtro de prazos (eventos clicáveis + painel) -------------

describe('tipo e rota dos eventos', () => {
  it('prova aponta para a matéria', () => {
    const eventos = eventosAvaliacoes(
      [
        {
          id: 'a1',
          nome: 'P1',
          nota: null,
          materia_id: 'm1',
          data: '2026-08-05',
        },
      ],
      SEMANA,
      MATERIAS,
    )
    expect(eventos[0]?.tipo).toBe('prova')
    expect(eventos[0]?.rota).toBe('/estudos/m1')
  })

  it('separa aula de treino pelo tipo, não só pela camada', () => {
    const eventos = eventosFluxograma(
      [
        {
          id: 'f1',
          dia_semana: 1,
          horario_inicio: '08:00:00',
          horario_fim: '10:00:00',
          materia_id: 'm1',
          treino_id: null,
        },
        {
          id: 'f2',
          dia_semana: 1,
          horario_inicio: '19:00:00',
          horario_fim: '20:00:00',
          materia_id: null,
          treino_id: 't1',
        },
      ],
      [],
      { de: '2026-08-03', ate: '2026-08-03' },
      MATERIAS,
      TREINOS,
    )

    expect(eventos.map((e) => [e.tipo, e.rota])).toEqual([
      ['aula', '/estudos/m1'],
      // Treino não tem sub-página própria
      ['treino', '/treino'],
    ])
  })

  it('conta aponta para a categoria', () => {
    const eventos = eventosContas(
      [
        {
          id: 'l1',
          descricao: 'Aluguel',
          valor: 1800,
          data: '2026-08-03',
          data_vencimento: null,
          categoria_id: 'cat-aluguel',
          categoria_tipo: 'fixo',
          categoria_natureza: 'despesa',
        },
      ],
      SEMANA,
    )
    expect(eventos[0]?.tipo).toBe('conta')
    expect(eventos[0]?.rota).toBe('/financeiro/categorias/cat-aluguel')
  })

  it('marco aponta para o projeto', () => {
    const eventos = eventosMarcos(
      [
        {
          id: 'mp1',
          nome: 'Deploy',
          data_prevista: '2026-08-06',
          projeto_id: 'proj-1',
          projeto_nome: 'Nexus',
        },
      ],
      SEMANA,
    )
    expect(eventos[0]?.tipo).toBe('marco')
    expect(eventos[0]?.rota).toBe('/projetos/proj-1')
  })

  it('sono não tem rota — é contexto, não destino', () => {
    const eventos = eventosSono(
      [
        {
          id: 's1',
          dia_semana: 1,
          hora_dormir_alvo: '23:00:00',
          hora_acordar_alvo: '07:00:00',
        },
      ],
      { de: '2026-08-03', ate: '2026-08-03' },
    )
    expect(eventos[0]?.tipo).toBe('sono')
    expect(eventos[0]?.rota).toBeUndefined()
  })
})

describe('eventosComPrazo', () => {
  const HOJE = new Date(2026, 7, 4) // 2026-08-04

  const prova = {
    id: 'p',
    titulo: 'P1',
    inicio: '2026-08-06',
    diaInteiro: true,
    camada: 'estudos' as const,
    tipo: 'prova' as const,
  }
  const aula = {
    id: 'a',
    titulo: 'Cálculo II',
    inicio: '2026-08-04T08:00:00',
    diaInteiro: false,
    camada: 'estudos' as const,
    tipo: 'aula' as const,
  }
  const conta = {
    id: 'c',
    titulo: 'Aluguel',
    inicio: '2026-08-02',
    diaInteiro: true,
    camada: 'financeiro' as const,
    tipo: 'conta' as const,
  }

  it('mantém só prova, conta e marco — descarta rotina', () => {
    const prazos = eventosComPrazo([prova, aula, conta], HOJE)
    expect(prazos.map((e) => e.tipo)).toEqual(['conta', 'prova'])
  })

  it('ordena do mais urgente para o mais distante, com atraso primeiro', () => {
    const prazos = eventosComPrazo([prova, conta], HOJE)
    expect(prazos.map((e) => e.dias)).toEqual([-2, 2])
  })

  it('calcula dias negativos para o que já passou', () => {
    const prazos = eventosComPrazo([conta], HOJE)
    expect(prazos[0]?.dias).toBe(-2)
  })

  it('devolve vazio quando só há rotina', () => {
    expect(eventosComPrazo([aula], HOJE)).toEqual([])
  })
})
