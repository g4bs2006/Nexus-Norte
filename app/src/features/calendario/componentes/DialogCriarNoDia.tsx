import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { deISO } from '@/lib/datas'
import { useCriarAvaliacao, useCriarSessao, useMaterias } from '@/features/estudos/hooks'
import { useCriarMarco, useProjetos } from '@/features/projetos/hooks'
import { useCriarFluxogramaLivre } from '@/features/fluxograma/hooks'
import { useCriarEventoLivre } from '@/features/eventos/hooks'
import { useCriarTreinoAgendado, useTreinos } from '@/features/treino/hooks'

type Tipo = 'estudo' | 'treino' | 'trabalho' | 'marco' | 'avaliacao' | 'evento'

/**
 * Opções de matéria com o swatch da cor — o mesmo sinal que a agenda usa.
 *
 * Função e não componente porque devolve uma lista de `SelectItem`: o Radix
 * espera os itens como filhos diretos do `SelectContent`, e um componente no
 * meio quebraria essa relação.
 */
function opcoesMateria(
  materias: readonly { id: string; nome: string; cor: string | null }[],
) {
  return materias.map((materia) => (
    <SelectItem key={materia.id} value={materia.id}>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: materia.cor ?? 'var(--estudos)' }}
        />
        {materia.nome}
      </span>
    </SelectItem>
  ))
}

const OPCOES: { valor: Tipo; rotulo: string }[] = [
  { valor: 'estudo', rotulo: 'Sessão de estudo' },
  { valor: 'treino', rotulo: 'Treino' },
  { valor: 'trabalho', rotulo: 'Bloco de trabalho' },
  { valor: 'marco', rotulo: 'Marco de projeto' },
  { valor: 'avaliacao', rotulo: 'Avaliação' },
  { valor: 'evento', rotulo: 'Evento avulso' },
]

interface DialogCriarNoDiaProps {
  /** Data clicada, ISO — entra pré-preenchida e editável (10.48.2). */
  data: string
  /**
   * Horário sugerido pelo arrasto na grade de Horas (estilo Google Agenda,
   * chat 2026-08-14) — `HH:mm`. Sem eles, os campos de horário nascem no
   * chute padrão de sempre ('09:00'–'10:00').
   */
  horarioInicial?: string
  horarioFinal?: string
  /**
   * Controle externo do aberto/fechado — usado quando este diálogo nasce do
   * arrasto na grade, sem um botão que o dispare. Sem eles, o diálogo
   * controla o próprio estado com o gatilho padrão.
   */
  open?: boolean
  onOpenChange?: (aberto: boolean) => void
  /** `null` esconde o gatilho padrão — quem abre de fora não precisa dele. */
  trigger?: React.ReactNode | null
}

/**
 * Criar a partir do calendário (resolução 10.48.2).
 *
 * Antes o fluxo era de mão única: tudo nascia no pilar e aparecia no
 * calendário. Este dialog não duplica formulário nenhum de verdade — cada
 * opção é um recorte mínimo que chama o `useMutation` que o pilar já usa.
 *
 * "Bloco de trabalho" é o caso diferente dos outros: não existe uma
 * data única de trabalho, existe um padrão semanal (`fluxograma_semanal`).
 * Clicar numa quinta cria o bloco pra toda quinta, com o dia da semana já
 * resolvido a partir da data clicada — é o mesmo dado que `DialogFluxogramaLivre`
 * grava, só chegando por outra porta.
 *
 * "Treino" grava em `treinos_agendados` (chat 2026-08-14): é a marcação, não
 * a execução — série e carga continuam só em `/treino`, no fluxo real
 * (`DialogExecucao`). Antes disto a opção só linkava para lá, porque a
 * marcação vivia num padrão semanal (fluxograma) que não fazia sentido criar
 * num formulário de um dia só; com data própria, o recorte mínimo passou a
 * caber aqui como os outros.
 *
 * "Evento avulso" é o único caso que nasce só aqui: `eventos_calendario` não
 * pertence a nenhum pilar (resolução "criar eventos", ago/2026).
 */
export function DialogCriarNoDia({
  data,
  horarioInicial,
  horarioFinal,
  open,
  onOpenChange,
  trigger,
}: DialogCriarNoDiaProps) {
  const [abertoInterno, setAbertoInterno] = useState(false)
  const aberto = open ?? abertoInterno
  const setAberto = onOpenChange ?? setAbertoInterno
  const [tipo, setTipo] = useState<Tipo>('estudo')
  const [dataEditavel, setDataEditavel] = useState(data)

  const [materiaId, setMateriaId] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState(30)
  /*
   * Hora da sessão de estudo, separada de `horarioInicio` de propósito: aquele
   * nasce '09:00' porque trabalho e evento com horário precisam de um chute
   * razoável. Sessão não — vazio grava nulo e vira dia inteiro, que é melhor que
   * uma hora inventada (mesma regra da 10.24 e do campo em `AbaSessoes`).
   */
  const [horaEstudo, setHoraEstudo] = useState('')
  const [rotulo, setRotulo] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('09:00')
  const [horarioFim, setHorarioFim] = useState('10:00')
  const [treinoId, setTreinoId] = useState('')
  const [projetoId, setProjetoId] = useState('')
  const [nomeMarco, setNomeMarco] = useState('')
  const [nomeAvaliacao, setNomeAvaliacao] = useState('')
  const [pesoAvaliacao, setPesoAvaliacao] = useState(1)
  const [tituloEvento, setTituloEvento] = useState('')
  const [descricaoEvento, setDescricaoEvento] = useState('')
  const [eventoDiaInteiro, setEventoDiaInteiro] = useState(true)

  const materias = useMaterias()
  const projetos = useProjetos()
  const treinos = useTreinos()

  const criarSessao = useCriarSessao()
  const criarFluxogramaLivre = useCriarFluxogramaLivre()
  const criarMarco = useCriarMarco()
  const criarAvaliacao = useCriarAvaliacao()
  const criarEvento = useCriarEventoLivre()
  const criarTreinoAgendado = useCriarTreinoAgendado()

  // Preenche data e horário sugeridos a cada abertura — sem isto, reabrir
  // com um horário arrastado diferente manteria o do arrasto anterior.
  useEffect(() => {
    if (!aberto) return
    setDataEditavel(data)
    if (horarioInicial) setHorarioInicio(horarioInicial)
    if (horarioFinal) setHorarioFim(horarioFinal)
  }, [aberto, data, horarioInicial, horarioFinal])

  const pendente =
    criarSessao.isPending ||
    criarFluxogramaLivre.isPending ||
    criarMarco.isPending ||
    criarAvaliacao.isPending ||
    criarEvento.isPending ||
    criarTreinoAgendado.isPending

  async function submeter() {
    if (tipo === 'evento') {
      if (!tituloEvento.trim()) return
      await criarEvento.mutateAsync({
        titulo: tituloEvento.trim(),
        descricao: descricaoEvento.trim() || null,
        data: dataEditavel,
        hora_inicio: eventoDiaInteiro ? null : horarioInicio,
        hora_fim: eventoDiaInteiro ? null : horarioFim,
      })
    } else if (tipo === 'estudo') {
      if (!materiaId) return
      await criarSessao.mutateAsync({
        materia_id: materiaId,
        data: dataEditavel,
        hora_inicio: horaEstudo === '' ? null : `${horaEstudo}:00`,
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
    } else if (tipo === 'treino') {
      if (!treinoId || horarioFim <= horarioInicio) return
      await criarTreinoAgendado.mutateAsync({
        treino_id: treinoId,
        data: dataEditavel,
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
    <Dialog open={aberto} onOpenChange={setAberto}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="ghost" className="text-muted-foreground h-7 gap-1 text-xs">
              <Plus className="size-3.5" />
              Adicionar
            </Button>
          )}
        </DialogTrigger>
      )}
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
                  <SelectContent>{opcoesMateria(materias.data ?? [])}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Início (opcional)</Label>
                  <Input
                    type="time"
                    value={horaEstudo}
                    onChange={(e) => setHoraEstudo(e.target.value)}
                  />
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
              </div>
              <p className="text-muted-foreground text-xs">
                Sem hora, a sessão aparece no topo do dia. Com hora, ocupa o
                horário na agenda — o fim sai da duração.
              </p>
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

          {tipo === 'treino' && (
            <>
              <div className="space-y-1.5">
                <Label>Treino</Label>
                <Select value={treinoId} onValueChange={setTreinoId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(treinos.data ?? []).map((treino) => (
                      <SelectItem key={treino.id} value={treino.id}>
                        {treino.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(treinos.data ?? []).length === 0 && (
                  <p className="text-muted-foreground text-[11px]">
                    Nenhum treino cadastrado ainda — crie um em /treino.
                  </p>
                )}
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
                  <SelectContent>{opcoesMateria(materias.data ?? [])}</SelectContent>
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

          {tipo === 'evento' && (
            <>
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  autoFocus
                  placeholder="Dentista"
                  value={tituloEvento}
                  onChange={(e) => setTituloEvento(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={eventoDiaInteiro}
                  onCheckedChange={(checado) =>
                    setEventoDiaInteiro(checado === true)
                  }
                />
                <Label className="!mt-0">Dia inteiro</Label>
              </div>
              {!eventoDiaInteiro && (
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
              )}
              <div className="space-y-1.5">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  rows={2}
                  value={descricaoEvento}
                  onChange={(e) => setDescricaoEvento(e.target.value)}
                />
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
