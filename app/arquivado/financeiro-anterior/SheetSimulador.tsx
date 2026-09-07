import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
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
import { Slider } from '@/components/ui/slider'
import { EIXO, ESTILO_TOOLTIP } from '@/components/Grafico'
import { useDebounced } from '@/hooks/useDebounced'
import { deISO, formatarMoeda, mesDeISO, rotuloMes } from '@/lib/datas'
import { MESES_MEDIA_VARIAVEL } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  aplicarCortes,
  calcularParcelas,
  categoriasElegiveisParaMediaVariavel,
  estimativaVariavelPorCategoria,
  horizonteCompromissoHipotetico,
  horizonteSimulacao,
  mesesComHistorico,
  projetarFluxoCaixa,
  resumirCenario,
} from '../projecao'
import { DialogCompromisso } from './DialogCompromisso'
import { DialogParcelada } from './DialogParcelada'
import type { ResumoMensal } from '../api'
import type { Categoria } from '../types'
import type {
  CompromissoDetalhado,
  LancamentoParaProjecao,
  ParceladaDetalhada,
  ResumoCenario,
  Veredicto,
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

const VEREDICTO_INFO: Record<
  Veredicto,
  { emoji: string; rotulo: string; classe: string }
> = {
  cabe: { emoji: '🟢', rotulo: 'Cabe', classe: 'text-status-ok' },
  aperta: { emoji: '🟡', rotulo: 'Aperta', classe: 'text-status-atencao' },
  nao_cabe: { emoji: '🔴', rotulo: 'Não cabe', classe: 'text-status-risco' },
}

function BadgeVeredicto({ veredicto }: { veredicto: Veredicto }) {
  const info = VEREDICTO_INFO[veredicto]
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-medium', info.classe)}>
      <span aria-hidden>{info.emoji}</span>
      {info.rotulo}
    </span>
  )
}

interface PontoGrafico {
  mes: string
  base: number
  cenario: number
  faixaBase: number
  faixaAltura: number
}

/**
 * Simulador "e se" (resoluções 10.44 e 10.47) — responde tanto "se eu
 * comprar X em Nx" quanto "se eu assinar/ganhar Y por mês", comparando
 * cenários lado a lado e convertendo o resultado num veredicto.
 *
 * Vive inteiramente em estado local: sem `useMutation`, sem tocar no
 * Supabase — só os botões "Registrar de verdade" escrevem alguma coisa.
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
  const [tipo, setTipo] = useState<'compra' | 'compromisso'>('compra')

  // --- Compra parcelada ------------------------------------------------
  const [descricaoCompra, setDescricaoCompra] = useState('Compra simulada')
  const [categoriaIdCompra, setCategoriaIdCompra] = useState('')
  const [valorTotal, setValorTotal] = useState(Number.NaN)
  const [numeroParcelas, setNumeroParcelas] = useState(1)
  const [jurosMensal, setJurosMensal] = useState(0)
  const [primeiraParcela, setPrimeiraParcela] = useState(hoje)

  // --- Compromisso hipotético (10.47.4) ---------------------------------
  const [descricaoCompromisso, setDescricaoCompromisso] =
    useState('Assinatura simulada')
  const [categoriaIdCompromisso, setCategoriaIdCompromisso] = useState('')
  const [valorCompromisso, setValorCompromisso] = useState(Number.NaN)
  const [diaMesCompromisso, setDiaMesCompromisso] = useState(1)
  const [dataInicioCompromisso, setDataInicioCompromisso] = useState(hoje)
  const [dataFimCompromisso, setDataFimCompromisso] = useState('')

  // --- Cortes por categoria variável (10.47.5) --------------------------
  const [cortesBrutos, setCortesBrutos] = useState<Record<string, number>>({})
  const cortes = useDebounced(cortesBrutos, 150)

  const categoriasDespesa = useMemo(
    () => categorias.filter((c) => c.natureza === 'despesa'),
    [categorias],
  )

  const categoriasVariaveis = useMemo(
    () => categoriasElegiveisParaMediaVariavel(categorias, compromissos),
    [categorias, compromissos],
  )

  const janela = useMemo(
    () => mesesResumo.slice(-MESES_MEDIA_VARIAVEL),
    [mesesResumo],
  )

  const estimativaVariavel = useMemo(
    () => estimativaVariavelPorCategoria(resumo, categoriasVariaveis, janela),
    [resumo, categoriasVariaveis, janela],
  )

  const categoriaPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  )

  // Só entram como slider categorias com média > 0 — corte sobre 0 não muda
  // nada e só confundiria a tela.
  const categoriasComSlider = useMemo(
    () =>
      Object.keys(estimativaVariavel.media).filter(
        (id) => estimativaVariavel.media[id]! > 0,
      ),
    [estimativaVariavel],
  )

  const mediaCortada = useMemo(
    () => aplicarCortes(estimativaVariavel.media, cortes),
    [estimativaVariavel, cortes],
  )
  const piorCortado = useMemo(
    () => aplicarCortes(estimativaVariavel.pior, cortes),
    [estimativaVariavel, cortes],
  )

  const historicoCurto = mesesComHistorico(resumo, janela) < MESES_MEDIA_VARIAVEL

  const compraValida =
    categoriaIdCompra !== '' && !Number.isNaN(valorTotal) && valorTotal > 0
  const compromissoValido =
    categoriaIdCompromisso !== '' &&
    !Number.isNaN(valorCompromisso) &&
    valorCompromisso > 0 &&
    dataInicioCompromisso !== ''

  const horizonte =
    tipo === 'compra'
      ? horizonteSimulacao(compraValida ? numeroParcelas : null)
      : horizonteCompromissoHipotetico(
          hoje,
          compromissoValido && dataFimCompromisso !== ''
            ? dataFimCompromisso
            : null,
        )

  const parametrosBase = {
    hoje,
    meses: horizonte,
    compromissos,
    parcelas: parceladas,
    lancamentosRealizados: lancamentosDoMes,
  }

  const linhaBaseMedia = useMemo(
    () =>
      projetarFluxoCaixa({ ...parametrosBase, mediaVariavelPorCategoria: mediaCortada }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hoje, horizonte, compromissos, parceladas, lancamentosDoMes, mediaCortada],
  )

  // --- Cenários de compra (10.47.3): à vista, Nx sem juros, Nx com juros --
  const cenariosCompra = useMemo(() => {
    if (!compraValida) return []
    const base = (parcelas: number, juros: number): ParceladaDetalhada => ({
      id: 'sim-compra',
      descricao: descricaoCompra,
      categoria_id: categoriaIdCompra,
      categoria_natureza: 'despesa',
      valor_total: valorTotal,
      numero_parcelas: parcelas,
      data_primeira_parcela: primeiraParcela,
      juros_mensal: juros,
      created_at: hoje,
    })

    const lista: { rotulo: string; compra: ParceladaDetalhada }[] = [
      { rotulo: 'À vista', compra: base(1, 0) },
    ]
    if (numeroParcelas > 1) {
      lista.push({
        rotulo: `${numeroParcelas}x sem juros`,
        compra: base(numeroParcelas, 0),
      })
      if (jurosMensal > 0) {
        lista.push({
          rotulo: `${numeroParcelas}x com juros`,
          compra: base(numeroParcelas, jurosMensal),
        })
      }
    }
    return lista
  }, [
    compraValida,
    descricaoCompra,
    categoriaIdCompra,
    valorTotal,
    numeroParcelas,
    jurosMensal,
    primeiraParcela,
    hoje,
  ])

  const resultadosCompra = useMemo(
    () =>
      cenariosCompra.map((cenario) => {
        const projecaoMedia = projetarFluxoCaixa({
          ...parametrosBase,
          mediaVariavelPorCategoria: mediaCortada,
          compraHipotetica: cenario.compra,
        })
        return {
          ...cenario,
          projecaoMedia,
          resumo: resumirCenario(cenario.rotulo, projecaoMedia, cenario.compra),
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cenariosCompra, hoje, horizonte, compromissos, parceladas, lancamentosDoMes, mediaCortada],
  )

  // O cenário mais específico configurado — é o que vai no gráfico e na
  // frase-resumo. À vista se só 1 parcela; "Nx com juros" se houver juros;
  // senão "Nx sem juros". A ordem de push em `cenariosCompra` já garante
  // que é sempre o último.
  const cenarioPrimario = resultadosCompra.at(-1)

  const projecaoPrimarioPessimista = useMemo(() => {
    if (!cenarioPrimario) return null
    return projetarFluxoCaixa({
      ...parametrosBase,
      mediaVariavelPorCategoria: piorCortado,
      compraHipotetica: cenarioPrimario.compra,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cenarioPrimario, hoje, horizonte, compromissos, parceladas, lancamentosDoMes, piorCortado])

  // --- Compromisso hipotético (10.47.4) ---------------------------------
  const categoriaEscolhidaCompromisso = categoriaPorId.get(categoriaIdCompromisso)

  const compromissoHipotetico: CompromissoDetalhado | undefined =
    compromissoValido && categoriaEscolhidaCompromisso
      ? {
          id: 'sim-compromisso',
          descricao: descricaoCompromisso,
          categoria_id: categoriaIdCompromisso,
          categoria_natureza: categoriaEscolhidaCompromisso.natureza,
          valor: valorCompromisso,
          dia_mes: diaMesCompromisso,
          data_inicio: dataInicioCompromisso,
          data_fim: dataFimCompromisso === '' ? null : dataFimCompromisso,
          created_at: hoje,
        }
      : undefined

  const projecaoCompromissoMedia = useMemo(
    () =>
      projetarFluxoCaixa({
        ...parametrosBase,
        mediaVariavelPorCategoria: mediaCortada,
        compromissoHipotetico,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compromissoHipotetico, hoje, horizonte, compromissos, parceladas, lancamentosDoMes, mediaCortada],
  )
  const projecaoCompromissoPessimista = useMemo(
    () =>
      projetarFluxoCaixa({
        ...parametrosBase,
        mediaVariavelPorCategoria: piorCortado,
        compromissoHipotetico,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compromissoHipotetico, hoje, horizonte, compromissos, parceladas, lancamentosDoMes, piorCortado],
  )
  const resumoCompromisso = compromissoHipotetico
    ? resumirCenario('Com o compromisso', projecaoCompromissoMedia, null)
    : undefined

  // --- Gráfico (comum aos dois tipos, sobre a linha de base) ------------
  const projecaoCenarioAtivo =
    tipo === 'compra' ? cenarioPrimario?.projecaoMedia : projecaoCompromissoMedia
  const projecaoPessimistaAtiva =
    tipo === 'compra' ? projecaoPrimarioPessimista : projecaoCompromissoPessimista
  const simulacaoValida = tipo === 'compra' ? compraValida : compromissoValido

  const dadosGrafico: PontoGrafico[] = linhaBaseMedia.map((baseMes, indice) => {
    const cenarioMes = projecaoCenarioAtivo?.[indice]
    const pessimistaMes = projecaoPessimistaAtiva?.[indice]
    const cenario = cenarioMes?.saldoAcumulado ?? baseMes.saldoAcumulado
    const pessimista = pessimistaMes?.saldoAcumulado ?? cenario
    return {
      mes: rotuloMes(baseMes.mes),
      base: baseMes.saldoAcumulado,
      cenario,
      faixaBase: Math.min(cenario, pessimista),
      faixaAltura: Math.abs(cenario - pessimista),
    }
  })

  const veredictoAtivo: Veredicto | undefined =
    tipo === 'compra' ? cenarioPrimario?.resumo.veredicto : resumoCompromisso?.veredicto

  const resumoAtivo: ResumoCenario | undefined =
    tipo === 'compra' ? cenarioPrimario?.resumo : resumoCompromisso

  function fraseResumo(): string {
    if (tipo === 'compra') {
      if (!cenarioPrimario) {
        return 'Preencha os campos da compra para ver o efeito na projeção.'
      }
      const parcelas = calcularParcelas(cenarioPrimario.compra)
      const parcelaTipica = parcelas[0]?.valor ?? 0
      const ultima = parcelas.at(-1)
      let frase =
        parcelas.length === 1
          ? `${formatarMoeda(parcelaTipica)} à vista.`
          : `${formatarMoeda(parcelaTipica)}/mês pelos próximos ${parcelas.length} meses (última parcela em ${rotuloMes(ultima?.mes ?? '')}).`
      if (cenarioPrimario.resumo.ficaNegativo) {
        frase += ` O saldo acumulado fica negativo em ${rotuloMes(cenarioPrimario.resumo.mesDoPiorSaldo)}.`
      }
      return frase
    }

    if (!compromissoHipotetico || !resumoCompromisso) {
      return 'Preencha os campos do compromisso para ver o efeito na projeção.'
    }
    const tipoTexto =
      compromissoHipotetico.categoria_natureza === 'receita'
        ? 'de receita extra'
        : 'de despesa extra'
    let frase = `${formatarMoeda(compromissoHipotetico.valor)}/mês ${tipoTexto}`
    frase += compromissoHipotetico.data_fim
      ? ` até ${rotuloMes(mesDeISO(deISO(compromissoHipotetico.data_fim)))}.`
      : ', sem data de término definida.'
    if (resumoCompromisso.ficaNegativo) {
      frase += ` O saldo acumulado fica negativo em ${rotuloMes(resumoCompromisso.mesDoPiorSaldo)}.`
    }
    return frase
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">Simular</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Simular</DialogTitle>
          <DialogDescription>
            Nada aqui é gravado até você confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
            <Button
              type="button"
              size="sm"
              variant={tipo === 'compra' ? 'default' : 'ghost'}
              onClick={() => setTipo('compra')}
            >
              Compra parcelada
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipo === 'compromisso' ? 'default' : 'ghost'}
              onClick={() => setTipo('compromisso')}
            >
              Compromisso novo
            </Button>
          </div>

          {tipo === 'compra' ? (
            <>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input
                  value={descricaoCompra}
                  onChange={(e) => setDescricaoCompra(e.target.value)}
                />
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={categoriaIdCompra} onValueChange={setCategoriaIdCompra}>
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
                  <Label>Juros mensal (%)</Label>
                  <CampoDecimal
                    placeholder="0"
                    valor={jurosMensal}
                    onValorChange={setJurosMensal}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Mês da primeira parcela</Label>
                <Input
                  type="date"
                  value={primeiraParcela}
                  onChange={(e) => setPrimeiraParcela(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input
                  value={descricaoCompromisso}
                  onChange={(e) => setDescricaoCompromisso(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor mensal</Label>
                  <CampoDecimal
                    placeholder="0,00"
                    valor={valorCompromisso}
                    onValorChange={setValorCompromisso}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Dia do mês</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={diaMesCompromisso}
                    onChange={(e) =>
                      setDiaMesCompromisso(Number(e.target.value) || 1)
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={categoriaIdCompromisso}
                  onValueChange={setCategoriaIdCompromisso}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        {categoria.nome}{' '}
                        <span className="text-muted-foreground">
                          ({categoria.natureza === 'receita' ? 'receita' : 'despesa'})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Início</Label>
                  <Input
                    type="date"
                    value={dataInicioCompromisso}
                    onChange={(e) => setDataInicioCompromisso(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fim (opcional)</Label>
                  <Input
                    type="date"
                    value={dataFimCompromisso}
                    onChange={(e) => setDataFimCompromisso(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {categoriasComSlider.length > 0 && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">E se eu reduzir…</p>
              {categoriasComSlider.map((categoriaId) => {
                const categoria = categoriaPorId.get(categoriaId)
                if (!categoria) return null
                const percentual = cortesBrutos[categoriaId] ?? 0
                return (
                  <div key={categoriaId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span>{categoria.nome}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {percentual > 0 ? `−${percentual}%` : 'sem corte'}
                      </span>
                    </div>
                    <Slider
                      value={[percentual]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([valor]) =>
                        setCortesBrutos((atual) => ({
                          ...atual,
                          [categoriaId]: valor ?? 0,
                        }))
                      }
                    />
                  </div>
                )
              })}
            </div>
          )}

          {simulacaoValida && (
            <>
              <div className="bg-muted/40 space-y-1.5 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  {veredictoAtivo && <BadgeVeredicto veredicto={veredictoAtivo} />}
                </div>
                <p>{fraseResumo()}</p>
                {historicoCurto && (
                  <p className="text-muted-foreground text-xs">
                    Histórico curto — o gasto variável estimado tem confiança
                    menor.
                  </p>
                )}
              </div>

              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={dadosGrafico} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
                  {/* Faixa de incerteza (10.47.6) só na linha do cenário —
                      é a que carrega a compra/compromisso hipotético. */}
                  <Area
                    type="monotone"
                    dataKey="faixaBase"
                    stackId="banda"
                    stroke="none"
                    fill="transparent"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="faixaAltura"
                    stackId="banda"
                    stroke="none"
                    fill="var(--status-risco)"
                    fillOpacity={0.12}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="base"
                    name="Sem a simulação"
                    stroke="var(--muted-foreground)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cenario"
                    name="Com a simulação"
                    stroke="var(--status-risco)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {tipo === 'compra' && resultadosCompra.length > 0 && (
                <div className="space-y-1 overflow-x-auto">
                  <div className="text-muted-foreground grid grid-cols-4 gap-2 text-xs">
                    <span>Cenário</span>
                    <span className="text-right">Total pago</span>
                    <span className="text-right">Pior mês</span>
                    <span className="text-right">Veredicto</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 py-1 text-sm">
                    <span className="text-muted-foreground">Base</span>
                    <span className="text-right tabular-nums">—</span>
                    <span className="text-right tabular-nums">
                      {formatarMoeda(resumirCenario('Base', linhaBaseMedia, null).piorSaldoAcumulado)}
                    </span>
                    <span className="text-right">
                      <BadgeVeredicto
                        veredicto={resumirCenario('Base', linhaBaseMedia, null).veredicto}
                      />
                    </span>
                  </div>
                  {resultadosCompra.map(({ rotulo, resumo }) => (
                    <div key={rotulo} className="grid grid-cols-4 gap-2 py-1 text-sm">
                      <span>{rotulo}</span>
                      <span className="text-right tabular-nums">
                        {formatarMoeda(resumo.totalPago)}
                      </span>
                      <span
                        className={
                          'text-right tabular-nums ' +
                          (resumo.ficaNegativo ? 'text-status-risco' : '')
                        }
                      >
                        {formatarMoeda(resumo.piorSaldoAcumulado)}
                      </span>
                      <span className="text-right">
                        <BadgeVeredicto veredicto={resumo.veredicto} />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {tipo === 'compromisso' && resumoAtivo && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Pior saldo (sem)
                    </p>
                    <p className="tabular-nums">
                      {formatarMoeda(
                        resumirCenario('Base', linhaBaseMedia, null).piorSaldoAcumulado,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Pior saldo (com)
                    </p>
                    <p
                      className={
                        'tabular-nums ' +
                        (resumoAtivo.ficaNegativo ? 'text-status-risco' : '')
                      }
                    >
                      {formatarMoeda(resumoAtivo.piorSaldoAcumulado)}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {tipo === 'compra' ? (
            <DialogParcelada
              categorias={categorias}
              valoresIniciais={
                compraValida
                  ? {
                      descricao: descricaoCompra,
                      categoria_id: categoriaIdCompra,
                      valor_total: valorTotal,
                      numero_parcelas: numeroParcelas,
                      data_primeira_parcela: primeiraParcela,
                      juros_mensal: jurosMensal,
                    }
                  : undefined
              }
              trigger={
                <Button type="button" disabled={!compraValida}>
                  Registrar essa compra de verdade
                </Button>
              }
            />
          ) : (
            <DialogCompromisso
              categorias={categorias}
              valoresIniciais={
                compromissoValido
                  ? {
                      descricao: descricaoCompromisso,
                      categoria_id: categoriaIdCompromisso,
                      valor: valorCompromisso,
                      dia_mes: diaMesCompromisso,
                      data_inicio: dataInicioCompromisso,
                      data_fim: dataFimCompromisso,
                    }
                  : undefined
              }
              trigger={
                <Button type="button" disabled={!compromissoValido}>
                  Registrar esse compromisso de verdade
                </Button>
              }
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
