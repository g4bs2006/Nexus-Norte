import { format } from 'date-fns'
import { deISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import type { CelulaAderencia } from '../planejador'

const CLASSE_NIVEL: Record<CelulaAderencia['nivel'], string> = {
  futuro: 'bg-transparent border border-border/60',
  'sem-rotina': 'bg-muted',
  ok: 'bg-status-ok',
  falha: 'bg-status-risco',
}

const ROTULO_NIVEL: Record<CelulaAderencia['nivel'], string> = {
  futuro: 'ainda não chegou',
  'sem-rotina': 'sem rotina prevista',
  ok: 'rotina em dia',
  falha: 'rotina sem check',
}

interface HeatmapAderenciaProps {
  celulas: readonly CelulaAderencia[]
  /** Dia tocado/clicado — pra quem chama mostrar o detalhe abaixo da grade. */
  onSelecionar?: (celula: CelulaAderencia) => void
  selecionado?: string
}

/**
 * Grade de um ano, um quadrado por dia (resolução 10.48.8).
 *
 * CSS grid puro, sem Recharts — 365 divs é barato o bastante, e um gráfico de
 * verdade não ganharia nada aqui: o que importa é o padrão visual da
 * distribuição, não comparar valores exatos.
 *
 * Alinhado por semana (domingo no topo), no mesmo idioma de heatmap de
 * contribuição que já é familiar — células em branco completam a primeira
 * semana para o primeiro dia cair na linha certa.
 *
 * `title` sozinho não serve: tooltip por hover não existe no toque, que é
 * onde este app é mais usado. Cada célula também é um `<button>` — toque ou
 * teclado chamam `onSelecionar`, e quem chama decide onde mostrar o detalhe
 * (não faz sentido popover flutuante em cima de um quadrado de 10px).
 */
export function HeatmapAderencia({
  celulas,
  onSelecionar,
  selecionado,
}: HeatmapAderenciaProps) {
  if (celulas.length === 0) return null

  const primeiroDiaSemana = deISO(celulas[0]!.data).getDay()
  const preenchimento = Array.from({ length: primeiroDiaSemana }, () => null)

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateRows: 'repeat(7, 0.7rem)',
          gridAutoFlow: 'column',
          gridAutoColumns: '0.7rem',
        }}
      >
        {preenchimento.map((_, indice) => (
          <span key={`vazio-${indice}`} aria-hidden />
        ))}
        {celulas.map((celula) => {
          const rotulo = `${format(deISO(celula.data), 'dd/MM/yyyy')} — ${ROTULO_NIVEL[celula.nivel]}`
          return (
            <button
              key={celula.data}
              type="button"
              title={rotulo}
              aria-label={rotulo}
              aria-pressed={celula.data === selecionado}
              onClick={() => onSelecionar?.(celula)}
              className={cn(
                'rounded-[2px] transition-[outline] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                CLASSE_NIVEL[celula.nivel],
                celula.data === selecionado &&
                  'outline-foreground outline-2 outline-offset-1',
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
