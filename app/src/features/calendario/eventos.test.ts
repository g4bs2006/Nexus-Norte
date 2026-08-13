import { describe, expect, it } from 'vitest'
import {
  COR_CAMADA,
  construirEventos,
  corDoEvento,
  eventosAvaliacoes,
  eventosCancelados,
  eventosContas,
  eventosExecucoesTreino,
  eventosFluxograma,
  eventosLivres,
  eventosMarcos,
  eventosRemarcadosNaOrigem,
  eventosSessoesEstudo,
  eventosSono,
  eventosComPrazo,
  type FontesCalendario,
} from './eventos'

// 2026-08-03 (segunda) a 2026-08-09 (domingo)
const SEMANA = { de: '2026-08-03', ate: '2026-08-09' }
/** Quarta da SEMANA. Dia 3 e 4 são passado; 6 em diante, futuro. */
const HOJE = '2026-08-05'

const MATERIAS = new Map([['m1', 'Cálculo II']])
const TREINOS = new Map([['t1', 'Treino A']])
/** `m1` escolheu cor; `m2` existe e deixou nulo — os dois casos importam. */
const CORES = new Map([
  ['m1', '#4a87c4'],
  ['m2', null],
])

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
    rotulo: null,
  }
  const treino = {
    id: 'f2',
    dia_semana: 3,
    horario_inicio: '18:00:00',
    horario_fim: '19:30:00',
    materia_id: null,
    treino_id: 't1',
    rotulo: null,
  }
  const trabalho = {
    id: 'f3',
    dia_semana: 1,
    horario_inicio: '09:00:00',
    horario_fim: '18:00:00',
    materia_id: null,
    treino_id: null,
    rotulo: 'Escritório',
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

  it('sem nenhuma FK preenchida, usa o rótulo livre — camada trabalho, sem rota (resolução 10.48.0)', () => {
    const eventos = eventosFluxograma(
      [trabalho],
      [],
      SEMANA,
      MATERIAS,
      TREINOS,
    )

    expect(eventos).toHaveLength(1)
    expect(eventos[0]?.titulo).toBe('Escritório')
    expect(eventos[0]?.camada).toBe('trabalho')
    expect(eventos[0]?.tipo).toBe('trabalho')
    expect(eventos[0]?.rota).toBeUndefined()
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

  it('move a ocorrência remarcada para a nova data e marca o título', () => {
    const eventos = eventosFluxograma(
      [aula],
      [
        {
          fluxograma_id: 'f1',
          data: '2026-08-03',
          status: 'remarcado',
          nova_data: '2026-08-06',
        },
      ],
      SEMANA,
      MATERIAS,
      TREINOS,
    )

    expect(eventos).toHaveLength(1)
    expect(eventos[0]?.titulo).toBe('Cálculo II (remarcado)')
    // Sai de segunda e cai na quinta, herdando o horário do padrão
    expect(eventos[0]?.inicio).toContain('2026-08-06')
    expect(eventos[0]?.inicio).toContain('08:00')
  })

  it('usa o horário próprio da remarcação quando há um', () => {
    const eventos = eventosFluxograma(
      [aula],
      [
        {
          fluxograma_id: 'f1',
          data: '2026-08-03',
          status: 'remarcado',
          nova_data: '2026-08-06',
          novo_horario_inicio: '14:00:00',
          novo_horario_fim: '16:00:00',
        },
      ],
      SEMANA,
      MATERIAS,
      TREINOS,
    )

    expect(eventos[0]?.inicio).toContain('14:00')
    expect(eventos[0]?.fim).toContain('16:00')
  })

  it('dá ids distintos para a mesma regra em datas diferentes', () => {
    // O id embute a data; sem isso a remarcada colidiria com a ocorrência do
    // padrão na semana seguinte e o FullCalendar descartaria uma delas.
    const eventos = eventosFluxograma(
      [aula],
      [
        {
          fluxograma_id: 'f1',
          data: '2026-08-03',
          status: 'remarcado',
          nova_data: '2026-08-05',
        },
      ],
      { de: '2026-08-03', ate: '2026-08-16' },
      MATERIAS,
      TREINOS,
    )

    const ids = eventos.map((evento) => evento.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  describe('período da matéria (discussão em uso, 06/08)', () => {
    it('omite a ocorrência antes do início do período', () => {
      const eventos = eventosFluxograma(
        [aula],
        [],
        SEMANA,
        MATERIAS,
        TREINOS,
        new Set(),
        new Map([['m1', { data_inicio: '2026-08-04', data_fim: null }]]),
      )
      // A única ocorrência de `aula` na semana é 03/08 (segunda) — antes do início
      expect(eventos).toEqual([])
    })

    it('omite a ocorrência depois do fim do período', () => {
      const eventos = eventosFluxograma(
        [aula],
        [],
        SEMANA,
        MATERIAS,
        TREINOS,
        new Set(),
        new Map([['m1', { data_inicio: null, data_fim: '2026-08-02' }]]),
      )
      expect(eventos).toEqual([])
    })

    it('mantém a ocorrência dentro do período', () => {
      const eventos = eventosFluxograma(
        [aula],
        [],
        SEMANA,
        MATERIAS,
        TREINOS,
        new Set(),
        new Map([
          ['m1', { data_inicio: '2026-08-01', data_fim: '2026-08-31' }],
        ]),
      )
      expect(eventos).toHaveLength(1)
    })

    it('não limita matéria ausente do mapa de período', () => {
      const eventos = eventosFluxograma(
        [aula],
        [],
        SEMANA,
        MATERIAS,
        TREINOS,
        new Set(),
        new Map(), // m1 não está aqui — sem período, sem limite
      )
      expect(eventos).toHaveLength(1)
    })

    it('não afeta treino, que não tem materia_id', () => {
      const eventos = eventosFluxograma(
        [treino],
        [],
        SEMANA,
        MATERIAS,
        TREINOS,
        new Set(),
        new Map([['t1', { data_inicio: '2099-01-01', data_fim: null }]]),
      )
      // A chave 't1' não é um materia_id — o filtro nunca olha para ela
      expect(eventos).toHaveLength(1)
    })
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

describe('eventosLivres', () => {
  it('vira dia inteiro quando não tem horário', () => {
    const eventos = eventosLivres(
      [
        {
          id: 'e1',
          titulo: 'Dentista',
          descricao: null,
          data: '2026-08-06',
          hora_inicio: null,
          hora_fim: null,
        },
      ],
      SEMANA,
    )

    expect(eventos).toHaveLength(1)
    expect(eventos[0]?.diaInteiro).toBe(true)
    expect(eventos[0]?.inicio).toBe('2026-08-06')
    expect(eventos[0]?.fim).toBeUndefined()
    expect(eventos[0]?.camada).toBe('evento')
    expect(eventos[0]?.tipo).toBe('evento')
    expect(eventos[0]?.origemId).toBe('e1')
  })

  it('carrega início e fim quando tem horário', () => {
    const eventos = eventosLivres(
      [
        {
          id: 'e2',
          titulo: 'Reunião',
          descricao: 'Alinhamento do projeto',
          data: '2026-08-06',
          hora_inicio: '14:00:00',
          hora_fim: '15:00:00',
        },
      ],
      SEMANA,
    )

    expect(eventos[0]?.diaInteiro).toBe(false)
    expect(eventos[0]?.inicio).toBe('2026-08-06T14:00:00')
    expect(eventos[0]?.fim).toBe('2026-08-06T15:00:00')
  })

  it('ignora evento fora do intervalo', () => {
    expect(
      eventosLivres(
        [
          {
            id: 'e3',
            titulo: 'Fora',
            descricao: null,
            data: '2026-08-20',
            hora_inicio: null,
            hora_fim: null,
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
          rotulo: null,
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
      execucoesTreino: [],
      sessoesEstudo: [],
      eventosLivres: [],
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
      execucoesTreino: [],
      sessoesEstudo: [],
      eventosLivres: [],
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
          rotulo: null,
        },
        {
          id: 'f2',
          dia_semana: 1,
          horario_inicio: '19:00:00',
          horario_fim: '20:00:00',
          materia_id: null,
          treino_id: 't1',
          rotulo: null,
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

// --- o que ACONTECEU, não o que estava previsto (resolução 10.31) ------------

describe('eventosExecucoesTreino', () => {
  const base = { id: 'e1', treino_id: 't1', data: '2026-08-05' }

  it('usa a hora informada pelo usuário, não o finalizado_em', () => {
    const [evento] = eventosExecucoesTreino(
      [
        {
          ...base,
          // 16:05 é quando o REGISTRO terminou; 11:00 é quando o treino foi
          finalizado_em: '2026-08-05T16:05:34Z',
          hora_inicio: '11:00:00',
          duracao_minutos: 45,
        },
      ],
      SEMANA,
      TREINOS,
    )

    expect(evento?.inicio).toBe('2026-08-05T11:00:00')
    expect(evento?.diaInteiro).toBe(false)
    expect(evento?.estado).toBe('feito')
    expect(evento?.titulo).toBe('Treino A')
  })

  it('sem hora informada vira dia inteiro em vez de inventar uma', () => {
    const [evento] = eventosExecucoesTreino(
      [
        {
          ...base,
          finalizado_em: '2026-08-05T16:05:34Z',
          hora_inicio: null,
          duracao_minutos: null,
        },
      ],
      SEMANA,
      TREINOS,
    )

    expect(evento?.diaInteiro).toBe(true)
    expect(evento?.inicio).toBe('2026-08-05')
  })

  it('ignora sessão não finalizada — treino abandonado no meio não é treino feito', () => {
    expect(
      eventosExecucoesTreino(
        [{ ...base, finalizado_em: null, hora_inicio: '11:00:00', duracao_minutos: null }],
        SEMANA,
        TREINOS,
      ),
    ).toEqual([])
  })

  it('ignora execução fora do intervalo', () => {
    expect(
      eventosExecucoesTreino(
        [
          {
            ...base,
            data: '2026-07-30',
            finalizado_em: '2026-07-30T20:00:00Z',
            hora_inicio: '18:00:00',
            duracao_minutos: 60,
          },
        ],
        SEMANA,
        TREINOS,
      ),
    ).toEqual([])
  })
})

describe('eventosSessoesEstudo', () => {
  it('é dia inteiro e leva a duração no título', () => {
    const [evento] = eventosSessoesEstudo(
      [{ id: 's1', materia_id: 'm1', data: '2026-08-04', duracao_minutos: 90 }],
      SEMANA,
      MATERIAS,
    )

    expect(evento?.titulo).toBe('Cálculo II · 90 min')
    expect(evento?.diaInteiro).toBe(true)
    expect(evento?.estado).toBe('feito')
    expect(evento?.camada).toBe('estudos')
    expect(evento?.rota).toBe('/estudos/m1')
  })
})

describe('eventosCancelados', () => {
  const regra = {
    id: 'f1',
    dia_semana: 3,
    horario_inicio: '18:00:00',
    horario_fim: '19:00:00',
    materia_id: null,
    treino_id: 't1',
    rotulo: null,
  }

  it('mostra o cancelado de um dia que já chegou', () => {
    const [evento] = eventosCancelados(
      [regra],
      [{ fluxograma_id: 'f1', data: '2026-08-05', status: 'cancelado' }],
      SEMANA,
      MATERIAS,
      TREINOS,
    )

    expect(evento?.estado).toBe('cancelado')
    expect(evento?.titulo).toBe('Treino A')
    expect(evento?.inicio).toBe('2026-08-05T18:00:00')
  })

  it('cancela um bloco de trabalho como qualquer outro (resolução 10.48.0)', () => {
    const regraTrabalho = {
      id: 'f3',
      dia_semana: 3,
      horario_inicio: '09:00:00',
      horario_fim: '18:00:00',
      materia_id: null,
      treino_id: null,
      rotulo: 'Escritório',
    }
    const [evento] = eventosCancelados(
      [regraTrabalho],
      [{ fluxograma_id: 'f3', data: '2026-08-05', status: 'cancelado' }],
      SEMANA,
      MATERIAS,
      TREINOS,
    )

    expect(evento?.estado).toBe('cancelado')
    expect(evento?.camada).toBe('trabalho')
    expect(evento?.titulo).toBe('Escritório')
  })

  /*
   * A 10.31 recortava em `<= hoje`. Caiu quando o Ritual Semanal e a página de
   * Treino passaram a cancelar dias à frente: ali o item sumia do calendário
   * sem deixar rastro, que é o defeito que a própria 10.31 tinha corrigido para
   * o passado.
   */
  it('mostra o cancelado de um dia que ainda não chegou', () => {
    const [evento] = eventosCancelados(
      [{ ...regra, dia_semana: 6 }],
      [{ fluxograma_id: 'f1', data: '2026-08-08', status: 'cancelado' }],
      SEMANA,
      MATERIAS,
      TREINOS,
    )

    expect(evento?.estado).toBe('cancelado')
    expect(evento?.inicio).toBe('2026-08-08T18:00:00')
    expect(HOJE < '2026-08-08').toBe(true)
  })

  it('ignora remarcado: a ocorrência não deixou de existir, só mudou de dia', () => {
    expect(
      eventosCancelados(
        [regra],
        [
          {
            fluxograma_id: 'f1',
            data: '2026-08-05',
            status: 'remarcado',
            nova_data: '2026-08-06',
          },
        ],
        SEMANA,
        MATERIAS,
        TREINOS,
      ),
    ).toEqual([])
  })
})

describe('eventosRemarcadosNaOrigem', () => {
  const regra = {
    id: 'f1',
    dia_semana: 3,
    horario_inicio: '18:00:00',
    horario_fim: '19:00:00',
    materia_id: null,
    treino_id: 't1',
    rotulo: null,
  }

  const remarcacao = {
    fluxograma_id: 'f1',
    data: '2026-08-05',
    status: 'remarcado' as const,
    nova_data: '2026-08-06',
  }

  it('deixa o rastro na data original, apontando o destino', () => {
    const [evento] = eventosRemarcadosNaOrigem(
      [regra],
      [remarcacao],
      SEMANA,
      MATERIAS,
      TREINOS,
    )

    expect(evento?.estado).toBe('remarcado')
    expect(evento?.remarcadoPara).toBe('2026-08-06')
    expect(evento?.inicio).toBe('2026-08-05T18:00:00')
    expect(evento?.titulo).toBe('Treino A')
  })

  it('não duplica quando a remarcação só muda o horário do mesmo dia', () => {
    expect(
      eventosRemarcadosNaOrigem(
        [regra],
        [
          {
            ...remarcacao,
            nova_data: '2026-08-05',
            novo_horario_inicio: '20:00:00',
            novo_horario_fim: '21:00:00',
          },
        ],
        SEMANA,
        MATERIAS,
        TREINOS,
      ),
    ).toEqual([])
  })

  it('ignora cancelado: quem trata dele é eventosCancelados', () => {
    expect(
      eventosRemarcadosNaOrigem(
        [regra],
        [{ fluxograma_id: 'f1', data: '2026-08-05', status: 'cancelado' }],
        SEMANA,
        MATERIAS,
        TREINOS,
      ),
    ).toEqual([])
  })

  it('não emite quando a data de origem está fora do intervalo visível', () => {
    expect(
      eventosRemarcadosNaOrigem(
        [regra],
        [{ ...remarcacao, data: '2026-07-29', nova_data: '2026-08-05' }],
        SEMANA,
        MATERIAS,
        TREINOS,
      ),
    ).toEqual([])
  })

  it('origem e destino convivem no mesmo intervalo, com ids distintos', () => {
    const eventos = construirEventos(
      {
        avaliacoes: [],
        fluxograma: [regra],
        excecoes: [remarcacao],
        contas: [],
        planejamentoSono: [],
        marcos: [],
        execucoesTreino: [],
        sessoesEstudo: [],
        eventosLivres: [],
        nomePorMateria: MATERIAS,
        nomePorTreino: TREINOS,
      },
      SEMANA,
    )

    const doTreino = eventos.filter((e) => e.camada === 'treino')
    expect(doTreino).toHaveLength(2)
    expect(new Set(doTreino.map((e) => e.id)).size).toBe(2)

    const origem = doTreino.find((e) => e.estado === 'remarcado')
    const destino = doTreino.find((e) => e.estado === undefined)
    expect(origem?.inicio.slice(0, 10)).toBe('2026-08-05')
    expect(destino?.inicio.slice(0, 10)).toBe('2026-08-06')
    expect(destino?.titulo).toBe('Treino A (remarcado)')
  })
})

describe('reconciliação entre previsto e realizado', () => {
  const regraTreino = {
    id: 'f1',
    dia_semana: 3,
    horario_inicio: '18:00:00',
    horario_fim: '19:00:00',
    materia_id: null,
    treino_id: 't1',
    rotulo: null,
  }

  const vazias = {
    avaliacoes: [],
    contas: [],
    planejamentoSono: [],
    marcos: [],
    sessoesEstudo: [],
    eventosLivres: [],
    nomePorMateria: MATERIAS,
    nomePorTreino: TREINOS,
  } as const

  it('previu e fez o MESMO treino: uma linha só, a realizada', () => {
    const eventos = construirEventos(
      {
        ...vazias,
        fluxograma: [regraTreino],
        excecoes: [],
        execucoesTreino: [
          {
            id: 'e1',
            treino_id: 't1',
            data: '2026-08-05',
            finalizado_em: '2026-08-05T20:00:00Z',
            hora_inicio: '18:00:00',
            duracao_minutos: 60,
          },
        ],
      },
      SEMANA,
    )

    const doTreino = eventos.filter((e) => e.camada === 'treino')
    expect(doTreino).toHaveLength(1)
    expect(doTreino[0]?.estado).toBe('feito')
  })

  it('previu um treino e fez OUTRO: as duas linhas aparecem', () => {
    const eventos = construirEventos(
      {
        ...vazias,
        nomePorTreino: new Map([
          ['t1', 'Legs'],
          ['t2', 'Pull'],
        ]),
        fluxograma: [regraTreino],
        excecoes: [],
        execucoesTreino: [
          {
            id: 'e1',
            treino_id: 't2',
            data: '2026-08-05',
            finalizado_em: '2026-08-05T16:05:00Z',
            hora_inicio: '11:00:00',
            duracao_minutos: 45,
          },
        ],
      },
      SEMANA,
    )

    const doTreino = eventos.filter((e) => e.camada === 'treino')
    expect(doTreino.map((e) => [e.titulo, e.estado])).toEqual(
      expect.arrayContaining([
        ['Legs', undefined],
        ['Pull', 'feito'],
      ]),
    )
  })

  /*
   * O caso real que motivou a 10.31: quarta prevista com Legs, Legs cancelado,
   * Pull registrado. Antes a agenda mostrava ZERO linhas de treino no dia.
   */
  it('cancelou o previsto e fez outro: mostra o feito E o cancelado', () => {
    const eventos = construirEventos(
      {
        ...vazias,
        nomePorTreino: new Map([
          ['t1', 'Legs'],
          ['t2', 'Pull'],
        ]),
        fluxograma: [regraTreino],
        excecoes: [
          { fluxograma_id: 'f1', data: '2026-08-05', status: 'cancelado' },
        ],
        execucoesTreino: [
          {
            id: 'e1',
            treino_id: 't2',
            data: '2026-08-05',
            finalizado_em: '2026-08-05T16:05:00Z',
            hora_inicio: '11:00:00',
            duracao_minutos: 45,
          },
        ],
      },
      SEMANA,
    )

    const doDia = eventos.filter((e) => e.inicio.startsWith('2026-08-05'))
    expect(doDia.map((e) => [e.titulo, e.estado])).toEqual([
      ['Pull', 'feito'],
      ['Legs', 'cancelado'],
    ])
  })
})

/**
 * Cor própria da matéria (`materias.cor`) chegando ao evento.
 *
 * O que se protege aqui é o fallback: `cor` ausente tem de continuar ausente no
 * evento, e não virar `null` ou `undefined` explícito — as views distinguem
 * "matéria escolheu cor" de "usa a cor da camada" pela presença do campo.
 */
describe('cor da matéria no evento', () => {
  const aula = {
    id: 'f1',
    dia_semana: 1,
    horario_inicio: '08:00:00',
    horario_fim: '10:00:00',
    materia_id: 'm1',
    treino_id: null,
    rotulo: null,
  }

  it('aula da matéria com cor carrega o hex', () => {
    const eventos = eventosFluxograma(
      [aula],
      [],
      SEMANA,
      MATERIAS,
      TREINOS,
      new Set(),
      new Map(),
      CORES,
    )
    expect(eventos[0]?.cor).toBe('#4a87c4')
  })

  it('matéria com cor nula não define o campo', () => {
    const eventos = eventosFluxograma(
      [{ ...aula, materia_id: 'm2' }],
      [],
      SEMANA,
      MATERIAS,
      TREINOS,
      new Set(),
      new Map(),
      CORES,
    )
    expect(eventos[0]).not.toHaveProperty('cor')
  })

  it('sem o mapa de cores, nenhum evento ganha cor — comportamento anterior', () => {
    const eventos = eventosFluxograma([aula], [], SEMANA, MATERIAS, TREINOS)
    expect(eventos[0]).not.toHaveProperty('cor')
  })

  it('treino não recebe cor de matéria', () => {
    const eventos = eventosFluxograma(
      [{ ...aula, materia_id: null, treino_id: 't1' }],
      [],
      SEMANA,
      MATERIAS,
      TREINOS,
      new Set(),
      new Map(),
      CORES,
    )
    expect(eventos[0]?.camada).toBe('treino')
    expect(eventos[0]).not.toHaveProperty('cor')
  })

  it('prova e sessão de estudo também carregam a cor', () => {
    const prova = eventosAvaliacoes(
      [{ id: 'a1', nome: 'P1', nota: null, materia_id: 'm1', data: '2026-08-05' }],
      SEMANA,
      MATERIAS,
      CORES,
    )
    expect(prova[0]?.cor).toBe('#4a87c4')

    const sessao = eventosSessoesEstudo(
      [{ id: 's1', materia_id: 'm1', data: '2026-08-05', duracao_minutos: 50 }],
      SEMANA,
      MATERIAS,
      CORES,
    )
    expect(sessao[0]?.cor).toBe('#4a87c4')
  })

  it('aula cancelada mantém a cor da matéria', () => {
    const eventos = eventosCancelados(
      [aula],
      [{ fluxograma_id: 'f1', data: '2026-08-03', status: 'cancelado' }],
      SEMANA,
      MATERIAS,
      TREINOS,
      CORES,
    )
    expect(eventos[0]?.estado).toBe('cancelado')
    expect(eventos[0]?.cor).toBe('#4a87c4')
  })
})

describe('corDoEvento', () => {
  it('prefere a cor do item quando existe', () => {
    expect(corDoEvento({ cor: '#c4554d', camada: 'estudos' })).toBe('#c4554d')
  })

  it('cai na cor da camada quando o item não tem cor', () => {
    expect(corDoEvento({ camada: 'estudos' })).toBe(COR_CAMADA.estudos)
    expect(corDoEvento({ camada: 'treino' })).toBe(COR_CAMADA.treino)
  })
})
