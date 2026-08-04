import { setDefaultOptions } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Define pt-BR como locale padrão do date-fns e segunda-feira como início da
 * semana.
 *
 * Sem isso, todo `format()` com nome de dia ou mês sairia em inglês, e
 * `startOfWeek` cairia no domingo — desalinhando o cálculo de `semana_inicio`,
 * que o planejamento financeiro assume ser segunda.
 *
 * Importado uma única vez em `main.tsx`, antes de qualquer render.
 */
setDefaultOptions({ locale: ptBR, weekStartsOn: 1 })
