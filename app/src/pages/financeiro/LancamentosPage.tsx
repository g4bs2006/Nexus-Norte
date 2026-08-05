import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, Wallet, X } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatarMoeda } from '@/lib/datas'
import { FORMAS_PAGAMENTO } from '@/lib/formasPagamento'
import { totaisDoPeriodo } from '@/features/financeiro/calculos'
import {
  useCategorias,
  useLancamentosDetalhados,
} from '@/features/financeiro/hooks'
import {
  PRESETS,
  intervaloDoPreset,
  type PresetPeriodo,
} from '@/features/financeiro/periodos'
import { ListaLancamentos } from '@/features/financeiro/componentes/ListaLancamentos'
import { DialogLancamento } from '@/features/financeiro/componentes/DialogLancamento'

/** Sentinela: `SelectItem` do Radix recusa valor vazio. */
const TODAS = 'todas'

/**
 * Lista filtrável de lançamentos (resolução 10.23).
 *
 * Página própria e não um card no painel: o Financeiro já é a tela mais densa do
 * app, e uma lista com cinco filtros somada a ela ficaria impraticável no celular.
 * O painel mantém um resumo com os últimos lançamentos apontando para cá.
 *
 * Responde três perguntas que a grade de categorias não responde: "o que gastei
 * hoje", "quanto gastei com X em Y período" e "onde está aquele lançamento".
 */
export default function LancamentosPage() {
  const hoje = useMemo(() => new Date(), [])

  const [preset, setPreset] = useState<PresetPeriodo>('mes')
  const [intervalo, setIntervalo] = useState(() =>
    intervaloDoPreset('mes', hoje),
  )
  const [categoriaId, setCategoriaId] = useState('')
  const [natureza, setNatureza] = useState<'' | 'receita' | 'despesa'>('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [busca, setBusca] = useState('')

  const categorias = useCategorias()

  const filtro = useMemo(
    () => ({
      de: intervalo.de,
      ate: intervalo.ate,
      ...(categoriaId ? { categoriaId } : {}),
      ...(natureza ? { natureza } : {}),
      ...(formaPagamento ? { formaPagamento } : {}),
      ...(busca.trim() ? { busca } : {}),
    }),
    [intervalo, categoriaId, natureza, formaPagamento, busca],
  )

  const lancamentos = useLancamentosDetalhados(filtro)
  const lista = useMemo(() => lancamentos.data ?? [], [lancamentos.data])
  const totais = useMemo(() => totaisDoPeriodo(lista), [lista])

  function trocarPreset(valor: PresetPeriodo) {
    setPreset(valor)
    // 'livre' não recalcula: o usuário vai digitar as datas
    if (valor !== 'livre') setIntervalo(intervaloDoPreset(valor, hoje))
  }

  /** Mudar as datas à mão implica período livre — o preset deixou de valer. */
  function trocarData(campo: 'de' | 'ate', valor: string) {
    setPreset('livre')
    setIntervalo((atual) => ({ ...atual, [campo]: valor }))
  }

  const temFiltroExtra =
    categoriaId !== '' ||
    natureza !== '' ||
    formaPagamento !== '' ||
    busca.trim() !== ''

  function limparFiltros() {
    setCategoriaId('')
    setNatureza('')
    setFormaPagamento('')
    setBusca('')
  }

  return (
    <>
      <PageHeader
        titulo="Lançamentos"
        descricao="Tudo que entrou e saiu, com filtro por período."
        pilar="financeiro"
        icone={Wallet}
        acoes={
          <div className="flex items-center gap-2">
            <DialogLancamento categorias={categorias.data ?? []} hoje={hoje} />
            <Button asChild variant="ghost" size="sm">
              <Link to="/financeiro">
                <ArrowLeft className="size-4" />
                Painel
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Período</Label>
                <Select value={preset} onValueChange={trocarPreset}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((item) => (
                      <SelectItem key={item.valor} value={item.valor}>
                        {item.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="filtro-de">
                  De
                </Label>
                <Input
                  id="filtro-de"
                  type="date"
                  value={intervalo.de}
                  onChange={(evento) => trocarData('de', evento.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="filtro-ate">
                  Até
                </Label>
                <Input
                  id="filtro-ate"
                  type="date"
                  value={intervalo.ate}
                  onChange={(evento) => trocarData('ate', evento.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select
                  value={categoriaId === '' ? TODAS : categoriaId}
                  onValueChange={(valor) =>
                    setCategoriaId(valor === TODAS ? '' : valor)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODAS}>Todas</SelectItem>
                    {(categorias.data ?? []).map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={natureza === '' ? TODAS : natureza}
                  onValueChange={(valor) =>
                    setNatureza(
                      valor === TODAS ? '' : (valor as 'receita' | 'despesa'),
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODAS}>Entradas e saídas</SelectItem>
                    <SelectItem value="despesa">Só saídas</SelectItem>
                    <SelectItem value="receita">Só entradas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Forma de pagamento</Label>
                <Select
                  value={formaPagamento === '' ? TODAS : formaPagamento}
                  onValueChange={(valor) =>
                    setFormaPagamento(valor === TODAS ? '' : valor)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODAS}>Todas</SelectItem>
                    {FORMAS_PAGAMENTO.map((forma) => (
                      <SelectItem key={forma.valor} value={forma.valor}>
                        {forma.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs" htmlFor="filtro-busca">
                  Buscar na descrição
                </Label>
                <div className="relative">
                  <Search
                    aria-hidden
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                  />
                  <Input
                    id="filtro-busca"
                    className="pl-8"
                    placeholder="Ex: mercado"
                    value={busca}
                    onChange={(evento) => setBusca(evento.target.value)}
                  />
                </div>
              </div>
            </div>

            {temFiltroExtra && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground -ml-2 text-xs"
                onClick={limparFiltros}
              >
                <X className="size-3.5" />
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {lancamentos.isError && (
          <Card className="border-status-risco/40">
            <CardContent className="text-status-risco text-sm">
              Erro ao carregar: {lancamentos.error.message}
            </CardContent>
          </Card>
        )}

        {/* Totais do que está filtrado, não do mês — precisa casar com a lista */}
        <Card>
          <CardContent className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Saídas</p>
              <p className="metric-sm sm:metric-md">
                {formatarMoeda(totais.saidas)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Entradas</p>
              <p className="metric-sm sm:metric-md text-status-ok">
                {formatarMoeda(totais.entradas)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                {totais.quantidade}{' '}
                {totais.quantidade === 1 ? 'lançamento' : 'lançamentos'}
              </p>
              <p className="metric-sm sm:metric-md">
                {totais.saldo < 0 ? '−' : ''}
                {formatarMoeda(Math.abs(totais.saldo))}
              </p>
            </div>
          </CardContent>
        </Card>

        <ListaLancamentos
          lancamentos={lista}
          categorias={categorias.data ?? []}
          hoje={hoje}
          carregando={lancamentos.isPending}
        />
      </div>
    </>
  )
}
