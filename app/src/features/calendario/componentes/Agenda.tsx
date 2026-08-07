import { format } from 'date-fns'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { DialogEventoLivre } from '@/features/eventos/componentes/DialogEventoLivre'
import type { EventoLivre } from '@/features/eventos/api'
import { formatarCarga, ordenarDoDia, type DiaCarga } from '../carga'
import {
  COR_CAMADA,
  ROTULO_TIPO,
  ehImportante,
  type EventoCalendario,
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
                  {formatarCarga(dia.minutosRotina)}
                </p>
              )}
              {/* Tempo livre (resolução 10.48.1) — "quinta tem 3h20" */}
              {dia.minutosLivres > 0 && (
                <p className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
                  {formatarCarga(dia.minutosLivres)} livres
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
}: {
  evento: EventoCalendario
  esmaecido: boolean
  /** Só presente quando `evento.tipo === 'evento'`. */
  eventoLivre?: EventoLivre
}) {
  const prazo = ehImportante(evento)
  const cor = COR_CAMADA[evento.camada]
  const hora = evento.diaInteiro ? null : evento.inicio.slice(11, 16)
  const feito = evento.estado === 'feito'
  const cancelado = evento.estado === 'cancelado'

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
            cancelado && 'opacity-40',
          )}
          style={{ backgroundColor: cor }}
        />
      )}

      {hora && (
        <span
          className={cn(
            'text-muted-foreground shrink-0 font-mono text-xs tabular-nums',
            cancelado && 'line-through',
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
          // Riscado e apagado: estava previsto e não aconteceu
          cancelado && 'text-muted-foreground line-through',
        )}
      >
        {evento.titulo}
      </span>

      {/*
        Rótulo em texto, não só o risco: "cancelado" precisa ser legível por leitor
        de tela e por quem não percebe o `line-through`. Fica no fim da linha para
        não empurrar o nome do compromisso.
      */}
      {cancelado && (
        <span className="text-muted-foreground shrink-0 text-[10px] tracking-wide uppercase">
          cancelado
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
