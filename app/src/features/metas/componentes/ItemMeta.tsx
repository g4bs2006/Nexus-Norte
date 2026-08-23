import { useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsDown,
  ChevronsUp,
  Clock,
  FolderInput,
  MoreHorizontal,
  RotateCcw,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { deISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import type { CategoriaMeta, Meta } from '../types'
import { DialogEncerrarMeta } from './DialogEncerrarMeta'
import { DialogMeta } from './DialogMeta'

/** Ações de reordenação. Ausente quando a lista não é reordenável. */
export interface AcoesMover {
  podeSubir: boolean
  podeDescer: boolean
  onSubir: () => void
  onDescer: () => void
  onMoverParaTopo: () => void
  onMoverParaFim: () => void
  categorias: CategoriaMeta[]
  categoriaAtualId: string | null
  onMoverParaCategoria: (destinoId: string | null) => void
}

interface ItemMetaProps {
  meta: Meta
  /** Se o check diário desta meta já foi marcado hoje. */
  marcadoHoje?: boolean
  onAlternarCheckDiario?: (feito: boolean) => void
  onAlternarConclusao?: (concluida: boolean) => void
  onExcluir?: () => void
  mover?: AcoesMover
}

/**
 * Uma meta na lista do painel.
 *
 * **Dois controles, duas coisas.** A versão anterior usava um único checkbox
 * para duas ações incompatíveis: se a meta tinha check diário, marcar registrava
 * o dia; se não, concluía a meta. Isso quebrava de duas formas — meta com check
 * diário *e* prazo exibia o selo "Diário" mas o checkbox a encerrava de vez, e
 * uma meta diária já concluída ficava com o checkbox travado (desmarcar limpava
 * só o check de hoje, `concluida` continuava `true`). Agora o checkbox é sempre
 * conclusão da meta, e o selo "Diário" é o botão do check de hoje.
 *
 * **Alvos de toque.** O gatilho do menu tem 44px no celular e volta a 28px de
 * `sm:` para cima, mesma régua de `DialogConfirmarExclusao`. O checkbox de
 * conclusão é a ação mais usada do item e continua com a caixa visual de 16px,
 * mas o alvo de toque real é o bloco de título inteiro — mesma ideia do
 * `<label>` de `CheckDia`, cujo comentário lembra que 16px isolados é fricção
 * de sobra pra abandonar o hábito de marcar.
 */
export function ItemMeta({
  meta,
  marcadoHoje,
  onAlternarCheckDiario,
  onAlternarConclusao,
  onExcluir,
  mover,
}: ItemMetaProps) {
  const [encerrarAberto, setEncerrarAberto] = useState(false)

  const feitoHoje = Boolean(marcadoHoje)
  const outrasCategorias = (mover?.categorias ?? []).filter(
    (categoria) => categoria.id !== mover?.categoriaAtualId,
  )

  return (
    <>
      <div
        className={cn(
          'group border-border/50 bg-card/60 hover:bg-accent/40 relative flex items-start justify-between gap-2.5 rounded-lg border px-2.5 py-2 text-xs transition-colors',
          meta.concluida && 'bg-muted/20 opacity-60',
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Checkbox
            id={`meta-concluir-${meta.id}`}
            checked={meta.concluida}
            onCheckedChange={(marcado) =>
              onAlternarConclusao?.(Boolean(marcado))
            }
            aria-label={
              meta.concluida
                ? `Reabrir meta ${meta.titulo}`
                : `Concluir meta ${meta.titulo}`
            }
            className="border-border mt-0.5 size-4 shrink-0 rounded-xs"
          />

          {/*
            `label` associado ao checkbox pelo id: o botão "Diário" aqui dentro
            continua isolado (botão é elemento labelable, o clique nele não
            propaga para o checkbox), mas título, badge de prazo e descrição
            passam a valer como alvo de toque de "concluir meta".
          */}
          <label
            htmlFor={`meta-concluir-${meta.id}`}
            className="min-w-0 flex-1 space-y-0.5"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'text-foreground font-medium break-words',
                  meta.concluida && 'text-muted-foreground line-through',
                )}
              >
                {meta.titulo}
              </span>

              {/*
                O selo do check diário é o próprio botão do dia: preenchido
                quando hoje já foi marcado, contornado quando não.
              */}
              {meta.no_check_diario && !meta.concluida && (
                <button
                  type="button"
                  onClick={() => onAlternarCheckDiario?.(!feitoHoje)}
                  disabled={!onAlternarCheckDiario}
                  aria-pressed={feitoHoje}
                  title={
                    feitoHoje
                      ? 'Check de hoje feito — toque para desmarcar'
                      : 'Marcar o check de hoje'
                  }
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1 rounded px-2 font-medium transition-colors sm:h-5 sm:px-1.5',
                    'text-[11px] disabled:pointer-events-none',
                    feitoHoje
                      ? 'bg-status-ok/15 text-status-ok'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {feitoHoje ? (
                    <Check className="size-3" />
                  ) : (
                    <Zap className="size-3" />
                  )}
                  <span>Diário</span>
                </button>
              )}

              {meta.data_alvo && !meta.concluida && (
                <span className="text-muted-foreground bg-muted/60 flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px]">
                  <Clock className="size-3" />
                  <span>até {format(deISO(meta.data_alvo), 'dd/MM')}</span>
                </span>
              )}
            </div>

            {meta.descricao && (
              <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                {meta.descricao}
              </p>
            )}
          </label>
        </div>

        {/*
          Visível sempre no toque, revelado no hover a partir de `sm:` — no
          celular não existe hover, e um menu escondido é um menu inexistente.
        */}
        <div className="shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Ações da meta ${meta.titulo}`}
                className="text-muted-foreground hover:text-foreground size-11 sm:size-7"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DialogMeta
                meta={meta}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Editar meta
                  </DropdownMenuItem>
                }
              />

              {mover && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!mover.podeSubir}
                    onClick={mover.onSubir}
                  >
                    <ArrowUp className="mr-1.5 size-3.5" />
                    <span>Mover para cima</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!mover.podeDescer}
                    onClick={mover.onDescer}
                  >
                    <ArrowDown className="mr-1.5 size-3.5" />
                    <span>Mover para baixo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!mover.podeSubir}
                    onClick={mover.onMoverParaTopo}
                  >
                    <ChevronsUp className="mr-1.5 size-3.5" />
                    <span>Mover para o topo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!mover.podeDescer}
                    onClick={mover.onMoverParaFim}
                  >
                    <ChevronsDown className="mr-1.5 size-3.5" />
                    <span>Mover para o fim</span>
                  </DropdownMenuItem>

                  <DropdownMenuLabel className="text-muted-foreground flex items-center gap-1.5 pt-2 text-[11px] font-normal">
                    <FolderInput className="size-3" />
                    <span>Mover para</span>
                  </DropdownMenuLabel>
                  {mover.categoriaAtualId !== null && (
                    <DropdownMenuItem
                      onClick={() => mover.onMoverParaCategoria(null)}
                    >
                      Sem categoria
                    </DropdownMenuItem>
                  )}
                  {outrasCategorias.map((categoria) => (
                    <DropdownMenuItem
                      key={categoria.id}
                      onClick={() => mover.onMoverParaCategoria(categoria.id)}
                    >
                      <span
                        aria-hidden
                        className="mr-1.5 size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: categoria.cor || undefined }}
                      />
                      <span className="truncate">{categoria.nome}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator />
              {!meta.concluida ? (
                <DropdownMenuItem
                  onClick={() => setEncerrarAberto(true)}
                  className="text-status-ok focus:text-status-ok font-medium"
                >
                  <Check className="mr-1.5 size-3.5" />
                  <span>Encerrar meta</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onAlternarConclusao?.(false)}
                  className="font-medium"
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  <span>Reabrir meta</span>
                </DropdownMenuItem>
              )}

              {onExcluir && (
                <DialogConfirmarExclusao
                  titulo="Excluir meta"
                  mensagem={`"${meta.titulo}" será removida permanentemente.`}
                  onConfirmar={onExcluir}
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-status-risco focus:text-status-risco"
                    >
                      Excluir meta
                    </DropdownMenuItem>
                  }
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DialogEncerrarMeta
        meta={meta}
        aberto={encerrarAberto}
        onOpenChange={setEncerrarAberto}
      />
    </>
  )
}
