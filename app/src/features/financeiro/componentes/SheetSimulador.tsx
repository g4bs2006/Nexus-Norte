import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CampoDecimal } from '@/components/CampoDecimal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EIXO, ESTILO_TOOLTIP } from '@/components/grafico'
import { formatarMoeda, rotuloMes } from '@/lib/datas'
import { MESES_MEDIA_VARIAVEL } from '@/lib/constants'
import {
  mediaVariavelPorCategoria,
  projetarFluxoCaixa,
} from '../projecao'
import { DialogParcelada } from './DialogParcelada'
import type { ResumoMensal } from '../api'
import type { Categoria } from '../types'
import type {
  CompromissoDetalhado,
  LancamentoParaProjecao,
  ParceladaDetalhada,
} from '../projecao'

interface SheetSimuladorProps {
  categorias: readonly Categoria[]
  compromissos: readonly CompromissoDetalhado[]
  parceladas: readonly ParceladaDetalhada[]
  resumo: readonly ResumoMensal[]
  mesesResumo: readonly string[]
  lancamentosDoMes: readonly LancamentoParaProjecao[]
  hoje: string
}

const HORIZONTE_SIMULACAO = 6

/**
 * Simulador "e se" (resolução 10.44) — responde "se eu comprar X em Nx, o
 * quanto isso afeta minha vida financeira?".
 *
 * Roda `projetarFluxoCaixa` duas vezes (com e sem a compra hipotética) e
 * compara. Vive inteiramente em estado local: sem `useMutation`, sem tocar no
 * Supabase — só o botão "Registrar de verdade" escreve alguma coisa.
 */
export function SheetSimulador({
  categorias,
  compromissos,
  parceladas,
  resumo,
  mesesResumo,
  lancamentosDoMes,
  hoje,
}: SheetSimuladorProps) {
  const [aberto, setAberto] = useState(false)
  const [descricao, setDescricao] = useState('Compra simulada')
  const [categoriaId, setCategoriaId] = useState('')
  const [valorTotal, setValorTotal] = useState(Number.NaN)
  const [numeroParcelas, setNumeroParcelas] = useState(1)
  const [primeiraParcela, setPrimeiraParcela] = useState(hoje)

  const categoriasDespesa = useMemo(
    () => categorias.filter((c) => c.natureza === 'despesa'),
    [categorias],
  )

  const categoriasVariaveis = useMemo(
    () =>
      new Set(
        categorias
          .filter((c) => c.natureza === 'despesa' && c.tipo === 'variavel')
          .map((c) => c.id),
      ),
    [categorias],
  )

  const mediaVariavel = useMemo(() => {
    const janela = mesesResumo.slice(-MESES_MEDIA_VARIAVEL)
    return mediaVariavelPorCategoria(resumo, categoriasVariaveis, janela)
  }, [resumo, categoriasVariaveis, mesesResumo])

  const compraValida =
    categoriaId !== '' && !Number.isNaN(valorTotal) && valorTotal > 0

  const compraHipotetica = compraValida
    ? {
        id: 'hipotetica',
        descricao,
        categoria_id: categoriaId,
        categoria_natureza: 'despesa' as const,
        valor_total: valorTotal,
        numero_parcelas: numeroParcelas,
        data_primeira_parcela: primeiraParcela,
        juros_mensal: 0,
        created_at: hoje,
      }
    : undefined

  const parametrosComuns = {
    hoje,
    meses: HORIZONTE_SIMULACAO,
    compromissos,
    lancamentosRealizados: lancamentosDoMes,
    mediaVariavelPorCategoria: mediaVariavel,
  }

  const linhaBase = useMemo(
    () => projetarFluxoCaixa({ ...parametrosComuns, parcelas: parceladas }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hoje, compromissos, parceladas, lancamentosDoMes, mediaVariavel],
  )

  const cenario = useMemo(
    () =>
      projetarFluxoCaixa({
        ...parametrosComuns,
        parcelas: parceladas,
        compraHipotetica,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hoje, compromissos, parceladas, lancamentosDoMes, mediaVariavel, compraHipotetica],
  )

  const dadosGrafico = linhaBase.map((base, indice) => ({
    mes: rotuloMes(base.mes),
    base: base.saldoAcumulado,
    cenario: cenario[indice]?.saldoAcumulado ?? base.saldoAcumulado,
  }))

  const saldoFinalBase = linhaBase.at(-1)?.saldoAcumulado ?? 0
  const saldoFinalCenario = cenario.at(-1)?.saldoAcumulado ?? 0
  const diferenca = saldoFinalCenario - saldoFinalBase
  const primeiroMesNegativoCenario = cenario.find((m) => m.saldoAcumulado < 0)

  const resumoFrase = compraValida
    ? primeiroMesNegativoCenario
      ? `Reduz o saldo em ~${formatarMoeda(Math.abs(diferenca) / HORIZONTE_SIMULACAO)}/mês; em ${rotuloMes(primeiroMesNegativoCenario.mes)} o saldo acumulado ficaria negativo.`
      : `Reduz o saldo projetado em ${formatarMoeda(Math.abs(diferenca))} ao longo de ${HORIZONTE_SIMULACAO} meses, sem levar o acumulado a negativo.`
    : 'Preencha os campos da compra para ver o efeito na projeção.'

  const historicoCurto = mesesResumo.length < MESES_MEDIA_VARIAVEL

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">Simular</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Simular uma compra</DialogTitle>
          <DialogDescription>
            "Se eu comprar isso em Nx, o quanto afeta minha vida financeira?"
            Nada aqui é gravado até você confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor total</Label>
              <CampoDecimal
                placeholder="0,00"
                valor={valorTotal}
                onValorChange={setValorTotal}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Parcelas</Label>
              <Input
                type="number"
                min={1}
                value={numeroParcelas}
                onChange={(e) => setNumeroParcelas(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categoriasDespesa.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Mês da primeira parcela</Label>
            <Input
              type="date"
              value={primeiraParcela}
              onChange={(e) => setPrimeiraParcela(e.target.value)}
            />
          </div>

          {compraValida && (
            <>
              <div className="bg-muted/40 rounded-lg p-3 text-sm">
                <p>{resumoFrase}</p>
                {historicoCurto && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Histórico curto ({mesesResumo.length} mês(es)) — o gasto
                    variável estimado tem confiança menor.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Saldo projetado (sem)
                  </p>
                  <p className="tabular-nums">{formatarMoeda(saldoFinalBase)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    Saldo projetado (com)
                  </p>
                  <p
                    className={
                      'tabular-nums ' +
                      (saldoFinalCenario < 0 ? 'text-status-risco' : '')
                    }
                  >
                    {formatarMoeda(saldoFinalCenario)}
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={dadosGrafico} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={EIXO.tick} stroke={EIXO.stroke} />
                  <YAxis
                    tick={EIXO.tick}
                    stroke={EIXO.stroke}
                    width={56}
                    tickFormatter={(valor: number) =>
                      valor >= 1000 || valor <= -1000
                        ? `${Math.round(valor / 1000)}k`
                        : String(valor)
                    }
                  />
                  <Tooltip
                    contentStyle={ESTILO_TOOLTIP}
                    formatter={(valor) => formatarMoeda(Number(valor ?? 0))}
                  />
                  <Line
                    type="monotone"
                    dataKey="base"
                    name="Sem a compra"
                    stroke="var(--muted-foreground)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cenario"
                    name="Com a compra"
                    stroke="var(--status-risco)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogParcelada
            categorias={categorias}
            valoresIniciais={
              compraValida
                ? {
                    descricao,
                    categoria_id: categoriaId,
                    valor_total: valorTotal,
                    numero_parcelas: numeroParcelas,
                    data_primeira_parcela: primeiraParcela,
                    juros_mensal: 0,
                  }
                : undefined
            }
            trigger={
              <Button type="button" disabled={!compraValida}>
                Registrar essa compra de verdade
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
