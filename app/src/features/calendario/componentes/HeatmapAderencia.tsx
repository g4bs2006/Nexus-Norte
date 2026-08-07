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
 */
export function HeatmapAderencia({ celulas }: HeatmapAderenciaProps) {
  if (celulas.length === 0) return null

  const primeiroDiaSemana = deISO(celulas[0]!.data).getDay()
  const preenchimento = Array.from({ length: primeiroDiaSemana }, () => null)

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateRows: 'repeat(7, 0.65rem)',
          gridAutoFlow: 'column',
          gridAutoColumns: '0.65rem',
        }}
      >
        {preenchimento.map((_, indice) => (
          <span key={`vazio-${indice}`} aria-hidden />
        ))}
        {celulas.map((celula) => (
          <span
            key={celula.data}
            title={`${format(deISO(celula.data), 'dd/MM/yyyy')} — ${ROTULO_NIVEL[celula.nivel]}`}
            className={cn('rounded-[2px]', CLASSE_NIVEL[celula.nivel])}
          />
        ))}
      </div>
    </div>
  )
}
