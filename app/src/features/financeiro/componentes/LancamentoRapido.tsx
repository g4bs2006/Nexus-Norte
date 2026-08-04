import { useEffect, useRef, useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
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
 * interações pelo diálogo completo. Aqui são duas — digitar o valor e apertar
 * Enter. A data é hoje por implicação, e a categoria vem da última usada.
 *
 * O diálogo completo continua existindo para o caso raro que precisa de
 * vencimento, forma de pagamento ou data retroativa.
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

  async function salvar() {
    const numero = Number(valor.replace(',', '.'))
    if (!Number.isFinite(numero) || numero <= 0 || categoriaId === '') return

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
      <CardContent className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[9rem] flex-1">
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            R$
          </span>
          <Input
            ref={campoValor}
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Valor do gasto"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault()
                void salvar()
              }
            }}
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

        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CornerDownLeft className="size-3.5" />
          {criar.isPending ? 'salvando…' : 'Enter para lançar hoje'}
        </span>
      </CardContent>
    </Card>
  )
}
