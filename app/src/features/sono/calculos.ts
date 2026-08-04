/**
 * Cálculos de sono. Funções puras (plano, seção 9).
 */

/** `23:30:00` → minutos desde a meia-noite. */
function paraMinutos(hora: string): number {
  const [h = '0', m = '0'] = hora.split(':')
  return Number(h) * 60 + Number(m)
}

/**
 * Horas de sono entre duas horas do dia, tratando a virada da meia-noite.
 *
 * Espelha a coluna gerada `registro_sono.horas_calculadas`, para que a meta
 * planejada seja calculada com a mesma regra do valor realizado.
 */
export function horasEntre(dormir: string, acordar: string): number {
  const minutos = (paraMinutos(acordar) - paraMinutos(dormir) + 1440) % 1440
  return minutos / 60
}

/** `7.75` → `7h45` */
export function formatarHoras(horas: number): string {
  const total = Math.round(horas * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}h${String(m).padStart(2, '0')}`
}
