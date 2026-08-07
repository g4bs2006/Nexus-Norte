import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/datas'
import { useExcluirCompromisso } from '../hooks'
import { DialogCompromisso } from './DialogCompromisso'
import type { CompromissoDetalhado } from '../projecao'
import type { Categoria } from '../types'

interface ListaCompromissosProps {
  compromissos: readonly CompromissoDetalhado[]
  categorias: readonly Categoria[]
}

/** Lista dos compromissos recorrentes cadastrados (resolução 10.43). */
export function ListaCompromissos({
  compromissos,
  categorias,
}: ListaCompromissosProps) {
  const excluir = useExcluirCompromisso()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">Compromissos recorrentes</CardTitle>
        <DialogCompromisso categorias={categorias} />
      </CardHeader>
      <CardContent>
        {compromissos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Salário, aluguel, assinaturas — o que se repete todo mês, com
            valor e dia razoavelmente certos.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {compromissos.map((compromisso) => (
              <li
                key={compromisso.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{compromisso.descricao}</p>
                  <p className="text-muted-foreground text-xs">
                    Todo dia {compromisso.dia_mes}
                    {compromisso.data_fim && ` · até ${compromisso.data_fim}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={
                      'text-sm tabular-nums ' +
                      (compromisso.categoria_natureza === 'receita'
                        ? 'text-financeiro'
                        : '')
                    }
                  >
                    {formatarMoeda(compromisso.valor)}
                  </span>
                  <DialogCompromisso
                    categorias={categorias}
                    compromisso={compromisso}
                  />
                  <DialogConfirmarExclusao
                    titulo="Excluir compromisso"
                    mensagem={`"${compromisso.descricao}" deixa de entrar na projeção dos meses futuros. Não afeta lançamentos já registrados.`}
                    onConfirmar={() => excluir.mutate(compromisso.id)}
                    pendente={excluir.isPending}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
