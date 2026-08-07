import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/datas'
import { useExcluirParcelada } from '../hooks'
import { calcularParcelas } from '../projecao'
import { DialogParcelada } from './DialogParcelada'
import type { Categoria } from '../types'
import type { ParceladaDetalhada } from '../projecao'

interface ListaParceladasProps {
  parceladas: readonly ParceladaDetalhada[]
  categorias: readonly Categoria[]
}

/** Compras parceladas cadastradas (resolução 10.44). */
export function ListaParceladas({
  parceladas,
  categorias,
}: ListaParceladasProps) {
  const excluir = useExcluirParcelada()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">Compras parceladas</CardTitle>
        <DialogParcelada categorias={categorias} />
      </CardHeader>
      <CardContent>
        {parceladas.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma compra parcelada em aberto.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {parceladas.map((compra) => {
              const parcelas = calcularParcelas(compra)
              const valorParcela = parcelas[0]?.valor ?? 0
              return (
                <li
                  key={compra.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{compra.descricao}</p>
                    <p className="text-muted-foreground text-xs">
                      {compra.numero_parcelas}x de {formatarMoeda(valorParcela)}
                      {compra.juros_mensal > 0 &&
                        ` · ${compra.juros_mensal}% a.m.`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm tabular-nums">
                      {formatarMoeda(compra.valor_total)}
                    </span>
                    <DialogConfirmarExclusao
                      titulo="Excluir compra parcelada"
                      mensagem={`"${compra.descricao}" sai da projeção. Parcelas já pagas continuam nos lançamentos, se tiverem sido registradas separadamente.`}
                      onConfirmar={() => excluir.mutate(compra.id)}
                      pendente={excluir.isPending}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
