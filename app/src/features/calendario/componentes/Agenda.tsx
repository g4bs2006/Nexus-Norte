import { format } from 'date-fns'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deISO, formatarDuracao } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { DialogEventoLivre } from '@/features/eventos/componentes/DialogEventoLivre'
import type { EventoLivre } from '@/features/eventos/api'
import { DialogAgendarTreino } from '@/features/treino/componentes/DialogAgendarTreino'
import type { Treino } from '@/features/treino/types'
import { DialogAgendarSessao } from '@/features/estudos/componentes/DialogAgendarSessao'
import { DialogSessaoRealizada } from '@/features/estudos/componentes/DialogSessaoRealizada'
import type { Materia } from '@/features/estudos/types'
import { ordenarDoDia, type DiaCarga } from '../carga'
import {
  corDoEvento,
  ROTULO_TIPO,
  ehImportante,
  idRealEntidade,
  type EventoCalendario,
  type FonteSessaoEstudo,
  type FonteSessaoPlanejada,
  type FonteTreinoAgendado,
} from '../eventos'
import { DialogCriarNoDia } from './DialogCriarNoDia'

interface AgendaProps {
  dias: readonly DiaCarga[]
  /** Eventos por data, já filtrados pelas camadas visíveis. */
  eventosPorData: ReadonlyMap<string, readonly EventoCalendario[]>
  selecionado?: string
  /** Ref para a página rolar até o dia clicado na faixa. */
  refDia?: (data: string, elemento: HTMLLIElement | null) => void
  /**
   * Registro completo por id, só para eventos avulsos (`tipo === 'evento'`).
   * Sem ela, clicar num evento livre não teria como abrir o dialog de edição —
   * `EventoCalendario` carrega só o que a agenda desenha, não o registro
   * inteiro (descrição incluída).
   */
  eventosLivresPorId?: ReadonlyMap<string, EventoLivre>
  /**
   * Registro completo por id, para treino agendado (`tipo === 'treino'`,
   * `movimento === 'entidade'`) — mesmo motivo de `eventosLivresPorId`: o
   * evento não carrega `treino_id`/horário completo, só o já resolvido para
   * desenhar a linha.
   */
  treinosAgendadosPorId?: ReadonlyMap<string, FonteTreinoAgendado>
  /** Lista de treinos, para o Select do diálogo de editar treino agendado. */
  treinos?: readonly Treino[]
  /**
   * Registro completo por id, para sessão de estudo planejada (`tipo ===
   * 'estudo'`, `movimento === 'entidade'`, ainda sem `estado: 'feito'`) —
   * mesmo motivo de `treinosAgendadosPorId` (chat 2026-08-14).
   */
  sessoesPlanejadasPorId?: ReadonlyMap<string, FonteSessaoPlanejada>
  /** Lista de matérias, para o Select do diálogo de editar sessão planejada. */
  materias?: readonly Materia[]
  /** Registro completo por id, para sessão de estudo realizada (`tipo === 'estudo'`, `estado === 'feito'`). */
  sessoesRealizadasPorId?: ReadonlyMap<string, FonteSessaoEstudo>
}

/**
 * A agenda — uma linha por dia do período.
 *
 * Substitui a grade de mês como superfície principal. A grade é boa para
 * *agendar*, ou seja, achar espaço livre, e aqui nada é agendado em espaço livre:
 * a rotina está fixa no fluxograma e prova, conta e marco chegam com data colada.
 * A pergunta real é "o que vem, e onde aperta", e uma lista datada responde isso
 * sem obrigar o olho a varrer 35 quadrados.
 *
 * Cor marca a camada; **peso** marca a natureza. Rotina é filete sem
 * preenchimento; prazo é preenchimento sólido. É a distinção que `ehImportante`
 * já fazia no dado e que a grade jogava fora ao pintar tudo como bloco cheio.
 *
 * Dia vazio mantém a linha: "quarta está livre" é uma resposta, não uma ausência.
 */
export function Agenda({
  dias,
  eventosPorData,
  selecionado,
  refDia,
  eventosLivresPorId,
  treinosAgendadosPorId,
  treinos,
  sessoesPlanejadasPorId,
  materias,
  sessoesRealizadasPorId,
}: AgendaProps) {
  return (
    <ul className="divide-border divide-y">
      {dias.map((dia) => {
        const eventos = ordenarDoDia(eventosPorData.get(dia.data) ?? [])
        const data = deISO(dia.data)

        return (
          <li
            key={dia.data}
            // Corpo em bloco: no React 19 um ref callback que devolve valor é
            // interpretado como função de limpeza
            ref={(elemento) => {
              refDia?.(dia.data, elemento)
            }}
            className={cn(
              'flex scroll-mt-4 gap-3 py-3 sm:gap-4',
              dia.data === selecionado && 'bg-accent/40 -mx-2 rounded-md px-2',
            )}
          >
            {/* Coluna da data: mono tabular, porque é dado e tem de alinhar */}
            <div className="w-11 shrink-0 sm:w-14">
              <p
                className={cn(
                  'font-mono text-lg leading-none tabular-nums',
                  dia.ehHoje ? 'text-foreground' : 'text-muted-foreground',
                  dia.ehPassado && 'opacity-60',
                )}
              >
                {format(data, 'dd')}
              </p>
              <p
                className={cn(
                  'mt-1 text-[10px] tracking-wide uppercase',
                  dia.ehHoje
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {format(data, 'EEE')}
              </p>
              {dia.minutosRotina > 0 && (
                <p className="text-muted-foreground mt-1.5 font-mono text-[10px] tabular-nums">
                  {formatarDuracao(dia.minutosRotina)}
                </p>
              )}
              {/* Tempo livre (resolução 10.48.1) — "quinta tem 3h20" */}
              {dia.minutosLivres > 0 && (
                <p className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
                  {formatarDuracao(dia.minutosLivres)} livres
                </p>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              {eventos.length === 0 ? (
                <div className="flex items-center justify-between gap-2 py-1">
                  <p className="text-muted-foreground text-sm">
                    Nada previsto.
                  </p>
                  {/* Criar a partir do calendário (resolução 10.48.2) */}
                  <DialogCriarNoDia data={dia.data} />
                </div>
              ) : (
                <>
                  {eventos.map((evento) => (
                    <LinhaEvento
                      key={evento.id}
                      evento={evento}
                      esmaecido={dia.ehPassado}
                      eventoLivre={
                        evento.origemId
                          ? eventosLivresPorId?.get(evento.origemId)
                          : undefined
                      }
                      treinoAgendado={
                        evento.origemId
                          ? treinosAgendadosPorId?.get(evento.origemId)
                          : undefined
                      }
                      treinos={treinos}
                      sessaoPlanejada={
                        evento.origemId
                          ? sessoesPlanejadasPorId?.get(evento.origemId)
                          : undefined
                      }
                      sessaoRealizada={
                        evento.tipo === 'estudo' && evento.estado === 'feito'
                          ? sessoesRealizadasPorId?.get(idRealEntidade(evento))
                          : undefined
                      }
                      materias={materias}
                    />
                  ))}
                  <DialogCriarNoDia data={dia.data} />
                </>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function LinhaEvento({
  evento,
  esmaecido,
  eventoLivre,
  treinoAgendado,
  treinos,
  sessaoPlanejada,
  sessaoRealizada,
  materias,
}: {
  evento: EventoCalendario
  esmaecido: boolean
  /** Só presente quando `evento.tipo === 'evento'`. */
  eventoLivre?: EventoLivre
  /** Só presente quando `evento.tipo === 'treino'` (agendado, não realizado). */
  treinoAgendado?: FonteTreinoAgendado
  treinos?: readonly Treino[]
  /** Só presente quando `evento.tipo === 'estudo'` (planejada, não realizada). */
  sessaoPlanejada?: FonteSessaoPlanejada
  /** Só presente quando `evento.tipo === 'estudo'` e `evento.estado === 'feito'`. */
  sessaoRealizada?: FonteSessaoEstudo
  materias?: readonly Materia[]
}) {
  const prazo = ehImportante(evento)
  const cor = corDoEvento(evento)
  const hora = evento.diaInteiro ? null : evento.inicio.slice(11, 16)
  const feito = evento.estado === 'feito'
  const remarcado = evento.estado === 'remarcado'
  /*
   * Cancelado e remarcado dividem o tratamento visual — riscado e apagado, "não
   * acontece aqui" — e se separam só no rótulo do fim da linha, que é onde a
   * diferença mora: um não acontece, o outro acontece noutro dia.
   */
  const riscado = evento.estado === 'cancelado' || remarcado

  const conteudo = (
    <>
      {/*
        Marca de feito ANTES do filete: é a primeira coisa a ler na linha, porque
        responde "isto aconteceu" — que era justamente o que a agenda não dizia.
        Ícone e não só cor: nenhuma informação passa por cor sozinha.
      */}
      {feito && (
        <Check
          aria-hidden
          className="size-3.5 shrink-0"
          style={{ color: cor }}
        />
      )}
      {prazo ? (
        // Prazo: pastilha sólida com o tipo. É o que precisa ser visto primeiro
        <span
          className="shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase"
          style={{ backgroundColor: cor }}
        >
          {ROTULO_TIPO[evento.tipo]}
        </span>
      ) : (
        // Rotina: filete. Presente, sem competir
        <span
          aria-hidden
          className={cn(
            'h-4 w-0.5 shrink-0 rounded-full',
            // Cancelado não ganha a cor cheia do pilar: ele não aconteceu
            riscado && 'opacity-40',
          )}
          style={{ backgroundColor: cor }}
        />
      )}

      {hora && (
        <span
          className={cn(
            'text-muted-foreground shrink-0 font-mono text-xs tabular-nums',
            riscado && 'line-through',
          )}
        >
          {hora}
        </span>
      )}

      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          prazo && 'font-medium',
          evento.tipo === 'sono' && 'text-muted-foreground',
          // Riscado e apagado: estava previsto e não acontece aqui
          riscado && 'text-muted-foreground line-through',
        )}
      >
        {evento.titulo}
      </span>

      {/*
        Rótulo em texto, não só o risco: "cancelado" precisa ser legível por leitor
        de tela e por quem não percebe o `line-through`. Fica no fim da linha para
        não empurrar o nome do compromisso.

        No remarcado o rótulo carrega o destino — "→ 14/08" é o que transforma o
        risco em informação útil: a linha diz para onde a ocorrência foi, sem
        obrigar a caçá-la no resto do calendário.
      */}
      {riscado && (
        <span className="text-muted-foreground shrink-0 text-[10px] tracking-wide uppercase">
          {remarcado && evento.remarcadoPara
            ? `→ ${format(deISO(evento.remarcadoPara), 'dd/MM')}`
            : 'cancelado'}
        </span>
      )}
    </>
  )

  const classes = cn(
    'flex items-center gap-2 rounded-md py-1',
    esmaecido && 'opacity-60',
  )

  /*
   * Evento avulso não tem rota — clicar abre a edição, não navega. É a
   * única camada onde o clique numa linha da agenda faz outra coisa que não
   * ir para o pilar dono, porque aqui o dono é o próprio calendário.
   */
  if (evento.tipo === 'evento' && eventoLivre) {
    return (
      <DialogEventoLivre
        evento={eventoLivre}
        trigger={
          <button
            type="button"
            className={cn(
              classes,
              'hover:bg-accent/60 -mx-1.5 w-[calc(100%+0.75rem)] px-1.5 text-left',
            )}
          >
            {conteudo}
          </button>
        }
      />
    )
  }

  /*
   * Treino agendado (não realizado) também não navega — abre editar/excluir
   * direto aqui, mesmo motivo do evento avulso: ir para /treino só para
   * mudar um horário ou desmarcar não era intuitivo (chat 2026-08-14).
   */
  if (evento.tipo === 'treino' && evento.movimento === 'entidade' && treinoAgendado) {
    return (
      <DialogAgendarTreino
        agendado={treinoAgendado}
        treinos={treinos ?? []}
        trigger={
          <button
            type="button"
            className={cn(
              classes,
              'hover:bg-accent/60 -mx-1.5 w-[calc(100%+0.75rem)] px-1.5 text-left',
            )}
          >
            {conteudo}
          </button>
        }
      />
    )
  }

  /*
   * Sessão de estudo planejada (não executada) também não navega — mesmo
   * tratamento do treino agendado. `estado !== 'feito'` separa da sessão já
   * registrada.
   */
  if (
    evento.tipo === 'estudo' &&
    evento.movimento === 'entidade' &&
    evento.estado !== 'feito' &&
    sessaoPlanejada
  ) {
    return (
      <DialogAgendarSessao
        planejada={sessaoPlanejada}
        materias={materias ?? []}
        trigger={
          <button
            type="button"
            className={cn(
              classes,
              'hover:bg-accent/60 -mx-1.5 w-[calc(100%+0.75rem)] px-1.5 text-left',
            )}
          >
            {conteudo}
          </button>
        }
      />
    )
  }

  /*
   * Sessão de estudo realizada (estado === 'feito') — abre DialogSessaoRealizada
   * em vez de apenas navegar para a matéria.
   */
  if (
    evento.tipo === 'estudo' &&
    evento.estado === 'feito' &&
    sessaoRealizada
  ) {
    const nomeMateria =
      materias?.find((m) => m.id === sessaoRealizada.materia_id)?.nome ??
      'Estudo'

    return (
      <DialogSessaoRealizada
        sessao={sessaoRealizada}
        nomeMateria={nomeMateria}
        trigger={
          <button
            type="button"
            className={cn(
              classes,
              'hover:bg-accent/60 -mx-1.5 w-[calc(100%+0.75rem)] px-1.5 text-left',
            )}
          >
            {conteudo}
          </button>
        }
      />
    )
  }

  if (!evento.rota) {
    return <div className={classes}>{conteudo}</div>
  }

  return (
    <Link
      to={evento.rota}
      className={cn(classes, 'hover:bg-accent/60 -mx-1.5 px-1.5')}
    >
      {conteudo}
    </Link>
  )
}
