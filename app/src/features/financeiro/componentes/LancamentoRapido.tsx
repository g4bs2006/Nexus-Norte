import { useEffect, useRef, useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { paraISO } from '@/lib/datas'
import { useUIStore } from '@/stores/ui'
import { useCriarLancamento } from '../hooks'
import type { Categoria } from '../types'

interface LancamentoRapidoProps {
  categorias: readonly Categoria[]
  hoje: Date
}

/**
 * Lançamento em uma linha (Bloco D do brief).
 *
 * Lançar um gasto é a ação mais repetida do sistema e era a mais custosa: seis
 * interações pelo diálogo completo. Aqui são duas — digitar o valor e confirmar.
 * A data é hoje por implicação, e a categoria vem da última usada.
 *
 * O diálogo completo continua existindo para o caso raro que precisa de
 * vencimento, forma de pagamento ou data retroativa.
 *
 * **Por que existe um `<form>` e um botão de salvar.** Antes o único jeito de
 * lançar era apertar Enter, com o input solto numa `<div>` e um `onKeyDown`. No
 * celular isso não salvava nunca: `inputMode="decimal"` abre o teclado numérico,
 * que não tem tecla de retorno, então o `Enter` não tinha de onde ser emitido — e
 * sem `<form>` o navegador também não pode oferecer a tecla de ação ("Ir"), que
 * depende de submissão implícita. Não havia botão nenhum, então o aparelho onde o
 * lançamento mais acontece era o único sem saída. O `<form>` restaura a
 * submissão implícita onde a tecla existe; o botão é a affordance real no mobile.
 */
export function LancamentoRapido({ categorias, hoje }: LancamentoRapidoProps) {
  const criar = useCriarLancamento()
  const campoValor = useRef<HTMLInputElement>(null)

  const ultima = useUIStore((estado) => estado.ultimaCategoriaLancamento)
  const setUltima = useUIStore((estado) => estado.setUltimaCategoriaLancamento)

  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')

  // Só despesas: receita entra pelo diálogo, é evento raro e datado
  const despesas = categorias.filter((c) => c.natureza === 'despesa')

  // Escolhe a categoria inicial quando as categorias chegam ou a lembrada sai
  useEffect(() => {
    if (despesas.length === 0) return
    const aindaExiste = despesas.some((c) => c.id === categoriaId)
    if (aindaExiste) return

    const lembrada = despesas.find((c) => c.id === ultima)
    setCategoriaId(lembrada?.id ?? despesas[0]?.id ?? '')
  }, [despesas, categoriaId, ultima])

  // Aceita a vírgula do teclado brasileiro. `NaN` quando não dá número.
  const numero = valor.trim() === '' ? Number.NaN : Number(valor.replace(',', '.'))
  const podeSalvar = Number.isFinite(numero) && numero > 0 && categoriaId !== ''

  async function salvar() {
    if (!podeSalvar) return

    await criar.mutateAsync({
      valor: numero,
      categoria_id: categoriaId,
      data: paraISO(hoje),
      descricao: null,
      forma_pagamento: null,
      data_vencimento: null,
    })

    setUltima(categoriaId)
    setValor('')
    // Mantém o foco: lançar dois ou três gastos seguidos é o caso comum
    campoValor.current?.focus()
  }

  if (despesas.length === 0) return null

  return (
    <Card>
      <CardContent>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(evento) => {
            evento.preventDefault()
            void salvar()
          }}
        >
          <div className="relative min-w-[9rem] flex-1">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              R$
            </span>
            <Input
              ref={campoValor}
              inputMode="decimal"
              // Rotula a tecla de ação como "Ir" nos teclados que têm uma. Só
              // tem efeito porque agora existe um form para submeter.
              enterKeyHint="go"
              placeholder="0,00"
              aria-label="Valor do gasto"
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
              className="metric-sm h-9 pl-9"
            />
          </div>

          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="h-9 w-[11rem]" aria-label="Categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {despesas.map((categoria) => (
                <SelectItem key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/*
            Botão no mobile, dica de teclado no desktop: são a mesma ação por
            caminhos diferentes, e "Enter" só é verdade onde há tecla de Enter.
            44px de alvo — a régua do HIG para o polegar.
          */}
          <Button
            type="submit"
            className="h-11 flex-1 sm:hidden"
            disabled={!podeSalvar || criar.isPending}
          >
            {criar.isPending ? 'Lançando…' : 'Lançar hoje'}
          </Button>

          <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
            <CornerDownLeft className="size-3.5" />
            {criar.isPending ? 'salvando…' : 'Enter para lançar hoje'}
          </span>
        </form>
      </CardContent>
    </Card>
  )
}
