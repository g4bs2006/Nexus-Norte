import { useEffect, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
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
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { formatarDecimal, parseDecimal } from '@/lib/numeros'
import {
  useAtualizarExercicio,
  useBiblioteca,
  useCriarExercicio,
  useCriarExercicioBase,
} from '../hooks'
import type { ExercicioComBase } from '../types'

interface DialogExercicioProps {
  treinoId: string
  treinoNome: string
  /** Se passado, o dialog abre em modo de edição. */
  exercicio?: ExercicioComBase
}

/**
 * Adiciona ou edita um exercício dentro de um treino.
 *
 * Depois da resolução 10.18, o exercício é ESCOLHIDO da biblioteca em vez de
 * digitado: nome e grupo muscular vivem lá, e este formulário cuida apenas dos
 * ALVOS daquele treino (séries, reps, carga, descanso). O mesmo movimento pode
 * ter alvos diferentes em treinos diferentes, mas é o mesmo exercício — é isso
 * que faz o PR e a progressão se unificarem.
 */
export function DialogExercicio({
  treinoId,
  treinoNome,
  exercicio,
}: DialogExercicioProps) {
  const modoEdicao = Boolean(exercicio)
  const [aberto, setAberto] = useState(false)

  const criar = useCriarExercicio()
  const atualizar = useAtualizarExercicio()
  const criarBase = useCriarExercicioBase()
  const biblioteca = useBiblioteca()

  const [baseId, setBaseId] = useState('')
  const [series, setSeries] = useState('3')
  const [reps, setReps] = useState('')
  const [carga, setCarga] = useState('')
  const [descanso, setDescanso] = useState('')

  /**
   * Busca aberta. Fica aberta enquanto não houver escolha, e o botão "Trocar"
   * reabre — assim a lista não ocupa espaço depois que o exercício já está
   * definido.
   */
  const [buscando, setBuscando] = useState(false)

  // Criação rápida sem sair do diálogo
  const [criandoNovo, setCriandoNovo] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoGrupo, setNovoGrupo] = useState('')

  const lista = biblioteca.data ?? []
  const selecionado = lista.find((item) => item.id === baseId)

  useEffect(() => {
    if (!aberto) return

    setCriandoNovo(false)
    setBuscando(false)
    setNovoNome('')
    setNovoGrupo('')

    if (exercicio) {
      setBaseId(exercicio.exercicio_base_id)
      setSeries(String(exercicio.series))
      setReps(exercicio.reps_alvo !== null ? String(exercicio.reps_alvo) : '')
      setCarga(formatarDecimal(exercicio.carga_alvo))
      setDescanso(
        exercicio.descanso_segundos !== null
          ? String(exercicio.descanso_segundos)
          : '',
      )
    } else {
      setBaseId('')
      setSeries('3')
      setReps('')
      setCarga('')
      setDescanso('')
    }
  }, [aberto, exercicio])

  function numeroOuNulo(valor: string): number | null {
    // `parseDecimal` aceita a vírgula do teclado: carga de 87,5 kg vinha vazia
    const numero = parseDecimal(valor)
    return Number.isFinite(numero) ? numero : null
  }

  const pendente = criar.isPending || atualizar.isPending

  /** Cria na biblioteca e já seleciona, para o fluxo não quebrar no meio. */
  async function criarESelecionar() {
    if (novoNome.trim() === '') return
    const novo = await criarBase.mutateAsync({
      nome: novoNome.trim(),
      grupo_muscular:
        novoGrupo.trim() === '' ? null : novoGrupo.trim().toLowerCase(),
    })
    setBaseId(novo.id)
    setCriandoNovo(false)
    setBuscando(false)
    setNovoNome('')
    setNovoGrupo('')
  }

  async function submeter() {
    const seriesNumero = Number(series)
    if (baseId === '' || !Number.isInteger(seriesNumero) || seriesNumero <= 0) {
      return
    }

    const dados = {
      treino_id: treinoId,
      exercicio_base_id: baseId,
      series: seriesNumero,
      reps_alvo: numeroOuNulo(reps),
      carga_alvo: numeroOuNulo(carga),
      descanso_segundos: numeroOuNulo(descanso),
    }

    if (modoEdicao && exercicio) {
      await atualizar.mutateAsync({ id: exercicio.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }

    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {modoEdicao ? (
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground size-9 sm:size-7"
            aria-label={`Editar ${exercicio?.nome}`}
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="text-xs">
            <Plus className="size-3.5" />
            Exercício
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao
              ? `Editar ${exercicio?.nome}`
              : `Exercício em ${treinoNome}`}
          </DialogTitle>
          <DialogDescription>
            Nome e grupo vêm da biblioteca. Aqui você define os alvos deste
            treino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {criandoNovo ? (
            <div className="border-border space-y-3 rounded-md border border-dashed p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="novo-ex-nome">Nome do exercício</Label>
                  <Input
                    id="novo-ex-nome"
                    autoFocus
                    placeholder="Ex: Supino Reto"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void criarESelecionar()
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="novo-ex-grupo">Grupo muscular</Label>
                  <Input
                    id="novo-ex-grupo"
                    placeholder="Ex: peito"
                    value={novoGrupo}
                    onChange={(e) => setNovoGrupo(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => void criarESelecionar()}
                  disabled={criarBase.isPending}
                >
                  {criarBase.isPending ? 'Criando…' : 'Criar e usar'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCriandoNovo(false)}
                >
                  Cancelar
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Fica disponível para todos os treinos.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>Exercício</Label>
                <div className="flex items-center gap-1">
                  {/* Saída de "Trocar" sem escolher outro */}
                  {buscando && selecionado && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto py-0.5 text-xs"
                      onClick={() => setBuscando(false)}
                    >
                      Manter atual
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-auto py-0.5 text-xs"
                    onClick={() => setCriandoNovo(true)}
                  >
                    <Plus className="size-3" />
                    Novo na biblioteca
                  </Button>
                </div>
              </div>

              {/*
                Já escolhido: mostra a escolha e recolhe a busca. Manter a lista
                aberta empurraria os alvos (séries, reps, carga) para fora da
                tela no celular.
              */}
              {selecionado && !buscando ? (
                <div className="border-border flex items-center gap-2 rounded-md border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {selecionado.nome}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {selecionado.grupo_muscular ?? 'grupo não definido'} ·
                      edite na Biblioteca para mudar em todos os treinos
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-xs"
                    onClick={() => setBuscando(true)}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <Command className="border-border rounded-md border p-0" loop>
                  <CommandInput
                    autoFocus
                    placeholder={
                      biblioteca.isPending
                        ? 'Carregando…'
                        : 'Escreva para filtrar…'
                    }
                  />
                  <CommandList className="max-h-56">
                    <CommandEmpty>
                      <span className="text-muted-foreground text-sm">
                        Nenhum exercício com esse nome.
                      </span>
                    </CommandEmpty>
                    {lista.map((item) => (
                      <CommandItem
                        key={item.id}
                        // O valor é o nome porque é o que o cmdk filtra; o id
                        // vai pelo closure do onSelect
                        value={item.nome}
                        keywords={
                          item.grupo_muscular ? [item.grupo_muscular] : []
                        }
                        data-checked={item.id === baseId}
                        onSelect={() => {
                          setBaseId(item.id)
                          setBuscando(false)
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {item.nome}
                        </span>
                        {item.grupo_muscular && (
                          <span className="text-muted-foreground shrink-0 text-xs capitalize">
                            {item.grupo_muscular}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              )}
            </div>
          )}

          {/* 2×2 no mobile: quatro colunas davam ~65px por campo */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="ex-series">Séries</Label>
              <Input
                id="ex-series"
                type="number"
                min="1"
                step="1"
                className="tabular-nums"
                value={series}
                onChange={(evento) => setSeries(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-reps">Reps</Label>
              <Input
                id="ex-reps"
                type="number"
                min="1"
                step="1"
                placeholder="—"
                className="tabular-nums"
                value={reps}
                onChange={(evento) => setReps(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-carga">Carga</Label>
              <Input
                id="ex-carga"
                // `text`, não `number`: 87,5 no teclado do celular é vírgula, e
                // vírgula num campo numérico chega como vazio
                type="text"
                inputMode="decimal"
                placeholder="—"
                className="tabular-nums"
                value={carga}
                onChange={(evento) => setCarga(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-descanso">Descanso</Label>
              <Input
                id="ex-descanso"
                type="number"
                min="0"
                step="15"
                // A unidade sai do rótulo e vem para o placeholder: sem ela,
                // digitar 2 querendo minutos gravaria 2 segundos
                placeholder="seg"
                className="tabular-nums"
                value={descanso}
                onChange={(evento) => setDescanso(evento.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => void submeter()}
            disabled={pendente || baseId === ''}
          >
            {pendente ? 'Salvando…' : modoEdicao ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
