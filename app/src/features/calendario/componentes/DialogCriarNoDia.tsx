import { useState } from 'react'
import { Plus } from 'lucide-react'
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
import { deISO } from '@/lib/datas'
import { useCriarAvaliacao, useCriarSessao, useMaterias } from '@/features/estudos/hooks'
import { useCriarMarco, useProjetos } from '@/features/projetos/hooks'
import { useCriarFluxogramaLivre } from '@/features/fluxograma/hooks'

type Tipo = 'estudo' | 'trabalho' | 'marco' | 'avaliacao'

const OPCOES: { valor: Tipo; rotulo: string }[] = [
  { valor: 'estudo', rotulo: 'Sessão de estudo' },
  { valor: 'trabalho', rotulo: 'Bloco de trabalho' },
  { valor: 'marco', rotulo: 'Marco de projeto' },
  { valor: 'avaliacao', rotulo: 'Avaliação' },
]

interface DialogCriarNoDiaProps {
  /** Data clicada, ISO — entra pré-preenchida e editável (10.48.2). */
  data: string
  trigger?: React.ReactNode
}

/**
 * Criar a partir do calendário (resolução 10.48.2).
 *
 * Antes o fluxo era de mão única: tudo nascia no pilar e aparecia no
 * calendário. Este dialog não duplica formulário nenhum de verdade — cada
 * opção é um recorte mínimo que chama o `useMutation` que o pilar já usa.
 *
 * "Bloco de trabalho" é o caso diferente dos outros três: não existe uma
 * data única de trabalho, existe um padrão semanal (`fluxograma_semanal`).
 * Clicar numa quinta cria o bloco pra toda quinta, com o dia da semana já
 * resolvido a partir da data clicada — é o mesmo dado que `DialogFluxogramaLivre`
 * grava, só chegando por outra porta.
 */
export function DialogCriarNoDia({ data, trigger }: DialogCriarNoDiaProps) {
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<Tipo>('estudo')
  const [dataEditavel, setDataEditavel] = useState(data)

  const [materiaId, setMateriaId] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState(30)
  const [rotulo, setRotulo] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('09:00')
  const [horarioFim, setHorarioFim] = useState('10:00')
  const [projetoId, setProjetoId] = useState('')
  const [nomeMarco, setNomeMarco] = useState('')
  const [nomeAvaliacao, setNomeAvaliacao] = useState('')
  const [pesoAvaliacao, setPesoAvaliacao] = useState(1)

  const materias = useMaterias()
  const projetos = useProjetos()

  const criarSessao = useCriarSessao()
  const criarFluxogramaLivre = useCriarFluxogramaLivre()
  const criarMarco = useCriarMarco()
  const criarAvaliacao = useCriarAvaliacao()

  function abrir(novoEstado: boolean) {
    setAberto(novoEstado)
    if (novoEstado) setDataEditavel(data)
  }

  const pendente =
    criarSessao.isPending ||
    criarFluxogramaLivre.isPending ||
    criarMarco.isPending ||
    criarAvaliacao.isPending

  async function submeter() {
    if (tipo === 'estudo') {
      if (!materiaId) return
      await criarSessao.mutateAsync({
        materia_id: materiaId,
        data: dataEditavel,
        duracao_minutos: duracaoMinutos,
      })
    } else if (tipo === 'trabalho') {
      if (!rotulo.trim()) return
      await criarFluxogramaLivre.mutateAsync({
        rotulo: rotulo.trim(),
        dia_semana: deISO(dataEditavel).getDay(),
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
      })
    } else if (tipo === 'marco') {
      if (!projetoId || !nomeMarco.trim()) return
      await criarMarco.mutateAsync({
        projeto_id: projetoId,
        nome: nomeMarco.trim(),
        data_prevista: dataEditavel,
      })
    } else {
      if (!materiaId || !nomeAvaliacao.trim()) return
      await criarAvaliacao.mutateAsync({
        materia_id: materiaId,
        nome: nomeAvaliacao.trim(),
        peso: pesoAvaliacao,
        data: dataEditavel,
      })
    }
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="ghost" className="text-muted-foreground h-7 gap-1 text-xs">
            <Plus className="size-3.5" />
            Adicionar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar ao dia</DialogTitle>
          <DialogDescription>
            Cada opção cria no pilar de verdade — nada fica só no calendário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>O que é</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPCOES.map((opcao) => (
                  <SelectItem key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input
              type="date"
              value={dataEditavel}
              onChange={(e) => setDataEditavel(e.target.value)}
            />
            {tipo === 'trabalho' && (
              <p className="text-muted-foreground text-[11px]">
                Bloco recorrente: vale toda{' '}
                {deISO(dataEditavel).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                })}
                , não só esta data.
              </p>
            )}
          </div>

          {tipo === 'estudo' && (
            <>
              <div className="space-y-1.5">
                <Label>Matéria</Label>
                <Select value={materiaId} onValueChange={setMateriaId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(materias.data ?? []).map((materia) => (
                      <SelectItem key={materia.id} value={materia.id}>
                        {materia.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={duracaoMinutos}
                  onChange={(e) => setDuracaoMinutos(Number(e.target.value) || 1)}
                />
              </div>
            </>
          )}

          {tipo === 'trabalho' && (
            <>
              <div className="space-y-1.5">
                <Label>Rótulo</Label>
                <Input
                  autoFocus
                  placeholder="Trabalho"
                  value={rotulo}
                  onChange={(e) => setRotulo(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={horarioFim}
                    onChange={(e) => setHorarioFim(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {tipo === 'marco' && (
            <>
              <div className="space-y-1.5">
                <Label>Projeto</Label>
                <Select value={projetoId} onValueChange={setProjetoId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(projetos.data ?? []).map((projeto) => (
                      <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nome do marco</Label>
                <Input value={nomeMarco} onChange={(e) => setNomeMarco(e.target.value)} />
              </div>
            </>
          )}

          {tipo === 'avaliacao' && (
            <>
              <div className="space-y-1.5">
                <Label>Matéria</Label>
                <Select value={materiaId} onValueChange={setMateriaId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(materias.data ?? []).map((materia) => (
                      <SelectItem key={materia.id} value={materia.id}>
                        {materia.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input
                    value={nomeAvaliacao}
                    onChange={(e) => setNomeAvaliacao(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Peso</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={pesoAvaliacao}
                    onChange={(e) => setPesoAvaliacao(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => void submeter()} disabled={pendente}>
            {pendente ? 'Salvando…' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
