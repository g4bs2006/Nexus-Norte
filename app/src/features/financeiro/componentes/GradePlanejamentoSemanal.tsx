import { useEffect, useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { deISO, formatarMoeda } from '@/lib/datas'
import { ORDEM_DIAS_SEMANA as ORDEM_DIAS } from '@/lib/fluxograma'
import { formatarDecimal, parseDecimal } from '@/lib/numeros'
import { cn } from '@/lib/utils'
import type { EntradaPlanejamento } from '../api'
import type { Categoria, PlanejamentoSemanal } from '../types'

function chave(categoriaId: string, dia: number): string {
  return `${categoriaId}:${dia}`
}

interface GradePlanejamentoSemanalProps {
  semanaInicio: string
  categorias: readonly Categoria[]
  planejamento: readonly PlanejamentoSemanal[]
  salvando: boolean
  onSalvar: (entradas: EntradaPlanejamento[]) => void
}

/**
 * Grade dia × categoria do ritual de domingo (plano 2.3).
 *
 * Só categorias de despesa entram: planejar receita por dia da semana não faz
 * sentido no fluxo do plano.
 */
export function GradePlanejamentoSemanal({
  semanaInicio,
  categorias,
  planejamento,
  salvando,
  onSalvar,
}: GradePlanejamentoSemanalProps) {
  const despesas = useMemo(
    () => categorias.filter((c) => c.natureza === 'despesa'),
    [categorias],
  )

  const [valores, setValores] = useState<Record<string, string>>({})

  // Recarrega a grade quando a semana ou os dados do servidor mudam. Sem isso,
  // trocar de semana mostraria os valores da semana anterior.
  useEffect(() => {
    const inicial: Record<string, string> = {}
    for (const linha of planejamento) {
      inicial[chave(linha.categoria_id, linha.dia_semana)] = formatarDecimal(
        linha.valor_planejado,
      )
    }
    setValores(inicial)
  }, [planejamento, semanaInicio])

  const total = useMemo(
    () =>
      Object.values(valores).reduce((soma, bruto) => {
        const numero = parseDecimal(bruto)
        return soma + (Number.isFinite(numero) ? numero : 0)
      }, 0),
    [valores],
  )

  function montarEntradas(): EntradaPlanejamento[] {
    const entradas: EntradaPlanejamento[] = []
    for (const [id, bruto] of Object.entries(valores)) {
      const [categoriaId, diaTexto] = id.split(':')
      const valor = parseDecimal(bruto)
      if (!categoriaId || diaTexto === undefined) continue
      if (!Number.isFinite(valor) || valor <= 0) continue
      entradas.push({
        categoria_id: categoriaId,
        dia_semana: Number(diaTexto),
        valor_planejado: valor,
      })
    }
    return entradas
  }

  const inicio = deISO(semanaInicio)

  if (despesas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planejamento da semana</CardTitle>
          <CardDescription>
            Cadastre categorias de despesa para planejar a semana.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Planejamento da semana</CardTitle>
        <CardDescription>
          Ritual de domingo — quanto pretende gastar por dia em cada categoria.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="text-muted-foreground sticky left-0 bg-inherit px-2 py-2 text-left text-xs font-normal">
                  Categoria
                </th>
                {ORDEM_DIAS.map((dia, indice) => (
                  <th
                    key={dia}
                    className="text-muted-foreground px-1 py-2 text-center text-xs font-normal"
                  >
                    <div className="capitalize">
                      {format(addDays(inicio, indice), 'EEEEEE')}
                    </div>
                    <div className="text-[10px] opacity-60">
                      {format(addDays(inicio, indice), 'dd/MM')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {despesas.map((categoria) => (
                <tr key={categoria.id}>
                  <td className="border-border max-w-[10rem] truncate border-t px-2 py-1.5 text-xs">
                    {categoria.nome}
                  </td>
                  {ORDEM_DIAS.map((dia) => {
                    const id = chave(categoria.id, dia)
                    return (
                      <td key={dia} className="border-border border-t p-0.5">
                        <Input
                          // `text`, não `number`: a vírgula do teclado brasileiro
                          // é inválida num campo numérico e chegaria como vazio
                          type="text"
                          inputMode="decimal"
                          value={valores[id] ?? ''}
                          onChange={(evento) =>
                            setValores((atual) => ({
                              ...atual,
                              [id]: evento.target.value,
                            }))
                          }
                          className={cn(
                            'h-8 w-20 border-transparent text-center text-xs tabular-nums',
                            'hover:border-border focus:border-ring shadow-none',
                          )}
                          placeholder="—"
                          aria-label={`${categoria.nome}, dia ${dia}`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Total planejado na semana:{' '}
            <span className="text-foreground tabular-nums">
              {formatarMoeda(total)}
            </span>
          </p>
          <Button
            size="sm"
            onClick={() => onSalvar(montarEntradas())}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar planejamento'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
