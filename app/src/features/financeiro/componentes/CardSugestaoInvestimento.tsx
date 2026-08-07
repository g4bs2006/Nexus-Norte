import { useState } from 'react'
import { PiggyBank } from 'lucide-react'
import { CampoDecimal } from '@/components/CampoDecimal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatarMoeda, rotuloMes } from '@/lib/datas'
import {
  useAceitarSugestao,
  useRecusarSugestao,
  useSugestoesPendentes,
} from '../hooks'
import { DialogRegraInvestimento } from './DialogRegraInvestimento'

/**
 * Sugestões de aporte pendentes (resolução 10.45).
 *
 * Geradas pelo cron da Edge Function `notificar`; aqui só a decisão do
 * usuário — aceitar grava o aporte de verdade, recusar tira da lista sem
 * voltar a sugerir aquele mês.
 */
export function CardSugestaoInvestimento() {
  const sugestoes = useSugestoesPendentes()
  const aceitar = useAceitarSugestao()
  const recusar = useRecusarSugestao()
  const [editando, setEditando] = useState<string | null>(null)
  const [valorAjustado, setValorAjustado] = useState(Number.NaN)

  const lista = sugestoes.data ?? []
  if (lista.length === 0) return null

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <PiggyBank className="text-financeiro size-4" />
            Sugestão de investimento
          </p>
          <DialogRegraInvestimento />
        </div>

        {lista.map((sugestao) => {
          const emEdicao = editando === sugestao.id
          return (
            <div
              key={sugestao.id}
              className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm">
                  Aportar{' '}
                  {emEdicao ? (
                    <CampoDecimal
                      className="inline-flex w-28"
                      valor={valorAjustado}
                      onValorChange={setValorAjustado}
                    />
                  ) : (
                    <strong>{formatarMoeda(sugestao.valor_sugerido)}</strong>
                  )}{' '}
                  em {rotuloMes(sugestao.mes_referencia)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={recusar.isPending}
                  onClick={() => recusar.mutate(sugestao.id)}
                >
                  Recusar
                </Button>
                <Button
                  size="sm"
                  disabled={aceitar.isPending}
                  onClick={() => {
                    if (!emEdicao) {
                      setEditando(sugestao.id)
                      setValorAjustado(sugestao.valor_sugerido)
                      return
                    }
                    aceitar.mutate({
                      sugestaoId: sugestao.id,
                      aporte: {
                        tipo: 'aporte',
                        valor: Number.isNaN(valorAjustado)
                          ? sugestao.valor_sugerido
                          : valorAjustado,
                        data: sugestao.mes_referencia,
                        descricao: 'Sugestão de investimento aceita',
                      },
                    })
                    setEditando(null)
                  }}
                >
                  {emEdicao ? 'Confirmar' : 'Aceitar'}
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
