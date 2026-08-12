import { setDefaultOptions } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Define pt-BR como locale padrão do date-fns e domingo como início da semana.
 *
 * Sem isso, todo `format()` com nome de dia ou mês sairia em inglês, e
 * `startOfWeek` sem argumento cairia num default que pode divergir de
 * `lib/datas.ts` — foi o que aconteceu enquanto a semana começava na segunda.
 *
 * Importado uma única vez em `main.tsx`, antes de qualquer render.
 */
setDefaultOptions({ locale: ptBR, weekStartsOn: 0 })
