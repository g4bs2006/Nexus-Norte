// supabase/functions/notificar/index.ts
//
// Verifica os três gatilhos de notificação (discussão em uso, 06/08) e manda
// push pra toda inscrição salva. Invocada pelo pg_cron a cada 5 minutos —
// ver a migration de agendamento.
//
// Timezone: o app inteiro assume horário do Brasil implicitamente (o
// navegador do usuário já está nesse fuso). Aqui, sem navegador, calculamos
// "agora no Brasil" subtraindo 3h fixas de UTC — o Brasil não observa horário
// de verão desde 2019, então isso é exato hoje. Se voltar a existir, esta
// conta precisa revisão.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!
// Segredo compartilhado com o pg_cron (guardado no Vault, não em código) —
// `verify_jwt` fica desligado no deploy porque quem chama é o próprio banco,
// não um usuário logado; este header é a autenticação real.
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

/** UTC - 3h. Ver nota de timezone no topo do arquivo. */
function agoraNoBrasil(): Date {
  return new Date(Date.now() - 3 * 60 * 60 * 1000)
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10)
}

function paraHora(data: Date): string {
  return data.toISOString().slice(11, 19)
}

interface Candidata {
  tipo: 'aula_treino' | 'conta' | 'prova' | 'meta'
  origemId: string
  dataReferencia: string
  titulo: string
  corpo: string
  rota: string
}

/**
 * Aulas e treinos do fluxograma a 15-20 min de começar (janela alinhada ao
 * cron de 5 em 5 min: roda toda vez, então uma janela de 5 min não deixa
 * buraco nem duplica).
 *
 * Simplificação assumida: cobre o padrão semanal e os dois desvios mais
 * comuns (cancelado, remarcado PARA hoje). Não cobre remarcação em cadeia
 * (remarcar de novo o que já foi remarcado) — caso raro o bastante pra não
 * valer a complexidade agora.
 */
async function candidatasAulaTreino(agora: Date): Promise<Candidata[]> {
  const hojeISO = paraISO(agora)
  const diaSemana = agora.getUTCDay() // getUTCDay() porque `agora` já foi deslocado pro fuso do Brasil
  const janelaInicio = paraHora(new Date(agora.getTime() + 15 * 60 * 1000))
  const janelaFim = paraHora(new Date(agora.getTime() + 20 * 60 * 1000))

  const [{ data: fluxograma }, { data: excecoes }, { data: materias }, { data: treinos }] =
    await Promise.all([
      supabase
        .from('fluxograma_semanal')
        .select('id, dia_semana, horario_inicio, horario_fim, materia_id, treino_id')
        .eq('dia_semana', diaSemana),
      supabase
        .from('excecoes_fluxograma')
        .select(
          'fluxograma_id, data, status, nova_data, novo_horario_inicio, novo_horario_fim',
        )
        .or(`data.eq.${hojeISO},nova_data.eq.${hojeISO}`),
      supabase.from('materias').select('id, nome, data_inicio, data_fim'),
      supabase.from('treinos').select('id, nome, tipos_treino(nome)'),
    ])

  const materiaPorId = new Map((materias ?? []).map((m) => [m.id, m]))
  const treinoPorId = new Map((treinos ?? []).map((t) => [t.id, t]))
  const canceladoHoje = new Set(
    (excecoes ?? [])
      .filter((e) => e.status === 'cancelado' && e.data === hojeISO)
      .map((e) => e.fluxograma_id),
  )
  const remarcadoParaFora = new Set(
    (excecoes ?? [])
      .filter((e) => e.status === 'remarcado' && e.data === hojeISO)
      .map((e) => e.fluxograma_id),
  )
  const remarcadoParaHoje = (excecoes ?? []).filter(
    (e) => e.status === 'remarcado' && e.nova_data === hojeISO,
  )

  const candidatas: Candidata[] = []

  function dentroDoPeriodo(materiaId: string | null): boolean {
    if (!materiaId) return true
    const materia = materiaPorId.get(materiaId)
    if (!materia) return true
    if (materia.data_inicio && hojeISO < materia.data_inicio) return false
    if (materia.data_fim && hojeISO > materia.data_fim) return false
    return true
  }

  /**
   * Nome (matéria ou treino, com o tipo do treino entre parênteses — "Push
   * (Hipertrofia)") e o corpo com os dois horários, não só o de início.
   */
  function nomeECorpo(
    regra: { materia_id: string | null; treino_id: string | null },
    horarioInicio: string,
    horarioFim: string | null | undefined,
  ): { nome: string; corpo: string } {
    const ehAula = regra.materia_id !== null
    let nome: string
    if (ehAula) {
      nome = materiaPorId.get(regra.materia_id as string)?.nome ?? 'Aula'
    } else {
      const treino = regra.treino_id ? treinoPorId.get(regra.treino_id) : undefined
      const tipoNome = (
        treino?.tipos_treino as unknown as { nome: string } | null
      )?.nome
      nome = treino ? (tipoNome ? `${treino.nome} (${tipoNome})` : treino.nome) : 'Treino'
    }
    const periodo = horarioFim
      ? `das ${horarioInicio.slice(0, 5)} às ${horarioFim.slice(0, 5)}`
      : `às ${horarioInicio.slice(0, 5)}`
    return { nome, corpo: `${nome} · ${periodo}` }
  }

  for (const regra of fluxograma ?? []) {
    if (canceladoHoje.has(regra.id) || remarcadoParaFora.has(regra.id)) {
      continue
    }
    if (!dentroDoPeriodo(regra.materia_id)) continue
    const horario = regra.horario_inicio
    if (horario < janelaInicio || horario >= janelaFim) continue

    const ehAula = regra.materia_id !== null
    const { corpo } = nomeECorpo(regra, horario, regra.horario_fim)

    candidatas.push({
      tipo: 'aula_treino',
      origemId: regra.id,
      dataReferencia: hojeISO,
      titulo: ehAula ? 'Aula em 15 minutos' : 'Treino em 15 minutos',
      corpo,
      rota: ehAula ? `/estudos/${regra.materia_id}` : '/treino',
    })
  }

  // Ocorrências remarcadas PARA hoje: podem cair num dia da semana que a
  // regra normalmente não cobre, então entram por um caminho à parte.
  for (const excecao of remarcadoParaHoje) {
    const regra = (fluxograma ?? []).find((r) => r.id === excecao.fluxograma_id)
    const horario = excecao.novo_horario_inicio ?? regra?.horario_inicio
    if (!regra || !horario) continue
    if (horario < janelaInicio || horario >= janelaFim) continue

    const ehAula = regra.materia_id !== null
    const horarioFim = excecao.novo_horario_fim ?? regra.horario_fim
    const { corpo } = nomeECorpo(regra, horario, horarioFim)

    candidatas.push({
      tipo: 'aula_treino',
      origemId: regra.id,
      dataReferencia: hojeISO,
      titulo: ehAula ? 'Aula em 15 minutos (remarcada)' : 'Treino em 15 minutos (remarcado)',
      corpo,
      rota: ehAula ? `/estudos/${regra.materia_id}` : '/treino',
    })
  }

  return candidatas
}

/**
 * Conta a vencer, prova e prazo de meta rodam só na janela das 8h — o mesmo
 * cron de 5 em 5 min serve os quatro gatilhos; este trio só age quando o
 * relógio cai nesse intervalo, aproximando "uma vez por dia" sem precisar de
 * um segundo agendamento.
 */
function dentroDaJanelaDasOito(agora: Date): boolean {
  const minutosDoDia = agora.getUTCHours() * 60 + agora.getUTCMinutes()
  return minutosDoDia >= 8 * 60 && minutosDoDia < 8 * 60 + 5
}

async function candidatasContaAVencer(agora: Date): Promise<Candidata[]> {
  const hojeISO = paraISO(agora)
  const { data: lancamentos } = await supabase
    .from('lancamentos')
    .select('id, descricao, valor, data, data_vencimento, categoria_id, categorias!inner(nome, natureza, tipo)')
    .eq('categorias.natureza', 'despesa')
    .eq('categorias.tipo', 'fixo')

  return (lancamentos ?? []).flatMap((lancamento) => {
    const vencimento = lancamento.data_vencimento ?? lancamento.data
    if (vencimento !== hojeISO) return []
    const nomeCategoria = (lancamento.categorias as unknown as { nome: string }).nome
    return [
      {
        tipo: 'conta' as const,
        origemId: lancamento.id,
        dataReferencia: hojeISO,
        titulo: 'Conta vence hoje',
        corpo: `${lancamento.descricao ?? nomeCategoria} — R$ ${lancamento.valor.toFixed(2)}`,
        rota: '/financeiro/lancamentos',
      },
    ]
  })
}

async function candidatasProva(amanhaISO: string): Promise<Candidata[]> {
  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('id, nome, data, nota, materia_id, materias(nome)')
    .eq('data', amanhaISO)
    .is('nota', null)

  return (avaliacoes ?? []).map((avaliacao) => ({
    tipo: 'prova' as const,
    origemId: avaliacao.id,
    dataReferencia: amanhaISO,
    titulo: 'Prova amanhã',
    corpo: `${avaliacao.nome} — ${(avaliacao.materias as unknown as { nome: string } | null)?.nome ?? 'Matéria'}`,
    rota: `/estudos/${avaliacao.materia_id}`,
  }))
}

async function candidatasMeta(amanhaISO: string): Promise<Candidata[]> {
  const { data: metas } = await supabase
    .from('metas')
    .select('id, titulo, data_alvo, concluida')
    .eq('data_alvo', amanhaISO)
    .eq('concluida', false)

  return (metas ?? []).map((meta) => ({
    tipo: 'meta' as const,
    origemId: meta.id,
    dataReferencia: amanhaISO,
    titulo: 'Meta vence amanhã',
    corpo: meta.titulo,
    rota: '/',
  }))
}

/** Filtra o que já foi notificado (mesma chave tipo+origem+data). */
async function semDuplicar(candidatas: Candidata[]): Promise<Candidata[]> {
  if (candidatas.length === 0) return []
  const { data: jaEnviadas } = await supabase
    .from('notificacoes_enviadas')
    .select('tipo, origem_id, data_referencia')
  const enviadas = new Set(
    (jaEnviadas ?? []).map((e) => `${e.tipo}@${e.origem_id}@${e.data_referencia}`),
  )
  return candidatas.filter(
    (c) => !enviadas.has(`${c.tipo}@${c.origemId}@${c.dataReferencia}`),
  )
}

async function enviarPush(candidatas: Candidata[]): Promise<void> {
  if (candidatas.length === 0) return

  const { data: inscricoes } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')

  for (const candidata of candidatas) {
    for (const inscricao of inscricoes ?? []) {
      const payload = JSON.stringify({
        title: candidata.titulo,
        body: candidata.corpo,
        rota: candidata.rota,
      })
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
          },
          payload,
        )
      } catch (erro) {
        // 404/410: a inscrição não existe mais do lado do navegador
        // (desinstalou o app, limpou dados) — remove pra não tentar de novo.
        const status = (erro as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', inscricao.id)
        } else {
          console.error('Falha ao enviar push', candidata.tipo, erro)
        }
      }
    }

    // Registra ANTES de garantir que todas as inscrições tiveram sucesso: se
    // uma inscrição falhar, o mesmo aviso tentar de novo no próximo tick
    // mandaria pra quem já recebeu também. Dado o volume (um usuário, poucos
    // dispositivos), o risco de perder um aviso por falha pontual de rede é
    // aceito em troca de nunca duplicar.
    await supabase.from('notificacoes_enviadas').insert({
      tipo: candidata.tipo,
      origem_id: candidata.origemId,
      data_referencia: candidata.dataReferencia,
    })
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Não autorizado', { status: 401 })
  }

  const agora = agoraNoBrasil()
  const amanhaISO = paraISO(new Date(agora.getTime() + 24 * 60 * 60 * 1000))

  const candidatas = [...(await candidatasAulaTreino(agora))]

  if (dentroDaJanelaDasOito(agora)) {
    candidatas.push(
      ...(await candidatasContaAVencer(agora)),
      ...(await candidatasProva(amanhaISO)),
      ...(await candidatasMeta(amanhaISO)),
    )
  }

  const novas = await semDuplicar(candidatas)
  await enviarPush(novas)

  return new Response(
    JSON.stringify({ verificadas: candidatas.length, enviadas: novas.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
