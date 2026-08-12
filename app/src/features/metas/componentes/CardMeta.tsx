// app/src/features/metas/componentes/CardMeta.tsx
import { useRef } from 'react'
import { Pencil } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { BarraProgresso } from '@/components/BarraProgresso'
import { CampoDecimal } from '@/components/CampoDecimal'
import { CheckDia } from '@/components/CheckDia'
import { Button } from '@/components/ui/button'
import { paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { checkinsNaSemana, progressoNumerico, streakAtual } from '../calculos'
import {
  useAlternarCheckin,
  useAtualizarMeta,
  useCheckinsMeta,
  useProgressoMeta,
} from '../hooks'
import { CLASSE_BG_PILAR, CLASSE_COR_PILAR, pilarDaMeta, type Meta } from '../types'
import { DialogMeta } from './DialogMeta'

interface CardMetaProps {
  meta: Meta
  hoje: Date
  /**
   * Exclusão opcional — só a lista completa (`DialogListaMetas`) oferece.
   * Passar aqui, e não posicionar o gatilho por fora do card, é o que evita o
   * botão flutuar fora da borda em grades com colunas mais largas que o card.
   */
  onExcluir?: () => void | Promise<void>
  excluindo?: boolean
}

/**
 * Card compacto de uma meta — a forma varia por `meta.tipo`.
 *
 * Sem largura fixa: quem posiciona (carrossel da Home ou grade do modal "Ver
 * todas") controla a largura por fora. Um card com `w-40` embutido cabia bem
 * no carrossel e sobrava espaço morto nas colunas mais largas da grade — e é
 * nesse espaço morto que o botão de excluir, antes posicionado `absolute` no
 * wrapper em vez do card, ficava flutuando.
 */
export function CardMeta({ meta, hoje, onExcluir, excluindo }: CardMetaProps) {
  // Guarda o valor digitado entre teclas; só grava no blur, como o campo fazia
  // antes de trocar para CampoDecimal — CampoDecimal chama onValorChange a cada
  // tecla, e mutar a cada tecla faria uma requisição por caractere digitado.
  const valorDigitadoRef = useRef(meta.valor_atual_manual)
  const link = pilarDaMeta(meta)
  const classeCor = link ? CLASSE_COR_PILAR[link.pilar] : 'text-foreground'
  const classeListra = link ? CLASSE_BG_PILAR[link.pilar] : 'bg-transparent'
  const usaLinkNumerico = meta.tipo === 'numerica' && link !== null

  const progresso = useProgressoMeta(meta.id, usaLinkNumerico)
  const checkins = useCheckinsMeta(meta.id, meta.tipo === 'habito')
  const alternarCheckin = useAlternarCheckin()
  const atualizar = useAtualizarMeta()

  const hojeISO = paraISO(hoje)

  return (
    <div className="group border-border bg-card relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-lg border p-3">
      {/* Listra de identidade do pilar — mesmo motivo de MiniCard.tsx: qual
          pilar é a meta lê antes do detalhe, num rastreio rápido da grade. */}
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-[3px]', classeListra)}
      />

      <div className="flex items-start justify-between gap-1">
        <span className={cn('truncate text-sm font-medium', classeCor)}>
          {meta.titulo}
        </span>
        {/* Ações só aparecem no hover/foco em telas com mouse — no toque
            (sem hover) ficam sempre visíveis, mesma régua do
            DialogConfirmarExclusao para não depender de gesto que não existe. */}
        <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <DialogMeta
            meta={meta}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                aria-label="Editar meta"
              >
                <Pencil className="size-3" />
              </Button>
            }
          />
          {onExcluir && (
            <DialogConfirmarExclusao
              titulo="Excluir meta"
              mensagem={`"${meta.titulo}" será removida permanentemente.`}
              pendente={excluindo}
              onConfirmar={onExcluir}
              classeTrigger="text-muted-foreground hover:text-status-risco size-6 shrink-0"
            />
          )}
        </div>
      </div>

      {meta.tipo === 'numerica' &&
        (() => {
          const valorAtual = usaLinkNumerico
            ? (progresso.data ?? null)
            : meta.valor_atual_manual
          const percentual = progressoNumerico(valorAtual, meta.valor_alvo)
          return (
            <>
              <BarraProgresso
                valor={percentual ?? 0}
                rotulo={`Progresso de ${meta.titulo}`}
              />
              <div className="flex items-center gap-1">
                <span className="metric-sm text-muted-foreground">
                  {valorAtual === null ? '—' : valorAtual} /{' '}
                  {meta.valor_alvo ?? '—'} {meta.unidade ?? ''}
                </span>
                {!usaLinkNumerico && (
                  <CampoDecimal
                    valor={meta.valor_atual_manual}
                    onValorChange={(valor) => {
                      valorDigitadoRef.current = Number.isNaN(valor)
                        ? null
                        : valor
                    }}
                    onBlur={() => {
                      atualizar.mutate({
                        id: meta.id,
                        dados: { valor_atual_manual: valorDigitadoRef.current },
                      })
                    }}
                    className="h-6 w-16 px-1 text-xs"
                    aria-label={`Atualizar valor de ${meta.titulo}`}
                  />
                )}
              </div>
            </>
          )
        })()}

      {meta.tipo === 'marco' && (
        <>
          <CheckDia
            id={`meta-concluida-${meta.id}`}
            marcado={meta.concluida}
            onAlternar={(concluida) => {
              atualizar.mutate({ id: meta.id, dados: { concluida } })
            }}
          >
            Concluída
          </CheckDia>
          <span className="text-muted-foreground text-xs">
            {meta.data_alvo ? `Prazo ${meta.data_alvo}` : 'Sem prazo'}
          </span>
        </>
      )}

      {meta.tipo === 'habito' &&
        (() => {
          const lista = checkins.data ?? []
          const streak = streakAtual(lista, hoje)
          const semana = checkinsNaSemana(lista, hoje)
          const marcadoHoje = lista.some((c) => c.data === hojeISO && c.feito)
          return (
            <>
              <CheckDia
                id={`meta-habito-${meta.id}`}
                marcado={marcadoHoje}
                onAlternar={(feito) => {
                  alternarCheckin.mutate({ metaId: meta.id, data: hojeISO, feito })
                }}
              >
                Hoje
              </CheckDia>
              <span className="text-muted-foreground text-xs">
                {streak} dia{streak === 1 ? '' : 's'} · {semana}/
                {meta.frequencia_alvo ?? '—'} na semana
              </span>
            </>
          )
        })()}

      {meta.tipo === 'livre' && (
        <CheckDia
          id={`meta-concluida-${meta.id}`}
          marcado={meta.concluida}
          onAlternar={(concluida) => {
            atualizar.mutate({ id: meta.id, dados: { concluida } })
          }}
        >
          Concluída
        </CheckDia>
      )}
    </div>
  )
}
