import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { useExcluirCompromisso } from '../hooks'
import { DialogCompromisso } from './DialogCompromisso'
import type { CompromissoDetalhado } from '../projecao'
import type { Categoria } from '../types'

interface ListaCompromissosProps {
  compromissos: readonly CompromissoDetalhado[]
  categorias: readonly Categoria[]
}

interface GrupoCompromissosProps {
  titulo: string
  icone: typeof ArrowUpRight
  compromissos: readonly CompromissoDetalhado[]
  categorias: readonly Categoria[]
  entrada: boolean
  onExcluir: (id: string) => void
  excluindo: boolean
}

/**
 * Um dos dois grupos (Receita/Despesa). Separados por seção — não só por
 * cor — porque a lista mistura os dois com o mesmo peso visual, e o
 * projeto evita depender só de cor pra passar informação (mesma regra da
 * agenda do Calendário).
 */
function GrupoCompromissos({
  titulo,
  icone: Icone,
  compromissos,
  categorias,
  entrada,
  onExcluir,
  excluindo,
}: GrupoCompromissosProps) {
  if (compromissos.length === 0) return null

  return (
    <div>
      <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
        <Icone className={cn('size-3.5', entrada && 'text-financeiro')} />
        {titulo}
      </h3>
      <ul className="divide-border divide-y">
        {compromissos.map((compromisso) => (
          <li
            key={compromisso.id}
            className="flex items-center justify-between gap-3 py-2.5 last:pb-0"
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
                className={cn(
                  'text-sm tabular-nums',
                  entrada && 'text-financeiro',
                )}
              >
                {entrada ? '+' : '−'}
                {formatarMoeda(compromisso.valor)}
              </span>
              <DialogCompromisso
                categorias={categorias}
                compromisso={compromisso}
              />
              <DialogConfirmarExclusao
                titulo="Excluir compromisso"
                mensagem={`"${compromisso.descricao}" deixa de entrar na projeção dos meses futuros. Não afeta lançamentos já registrados.`}
                onConfirmar={() => onExcluir(compromisso.id)}
                pendente={excluindo}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Lista dos compromissos recorrentes cadastrados (resolução 10.43). */
export function ListaCompromissos({
  compromissos,
  categorias,
}: ListaCompromissosProps) {
  const excluir = useExcluirCompromisso()

  const receitas = compromissos.filter(
    (c) => c.categoria_natureza === 'receita',
  )
  const despesas = compromissos.filter(
    (c) => c.categoria_natureza === 'despesa',
  )

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">Compromissos recorrentes</CardTitle>
        <DialogCompromisso categorias={categorias} />
      </CardHeader>
      <CardContent className="space-y-4">
        {compromissos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Salário, aluguel, assinaturas — o que se repete todo mês, com
            valor e dia razoavelmente certos.
          </p>
        ) : (
          <>
            <GrupoCompromissos
              titulo="Receita"
              icone={ArrowUpRight}
              compromissos={receitas}
              categorias={categorias}
              entrada
              onExcluir={(id) => excluir.mutate(id)}
              excluindo={excluir.isPending}
            />
            <GrupoCompromissos
              titulo="Despesa"
              icone={ArrowDownRight}
              compromissos={despesas}
              categorias={categorias}
              entrada={false}
              onExcluir={(id) => excluir.mutate(id)}
              excluindo={excluir.isPending}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
