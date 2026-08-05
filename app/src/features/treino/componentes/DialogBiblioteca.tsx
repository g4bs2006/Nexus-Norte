import { useState } from 'react'
import { Check, Library, Pencil, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  useAtualizarExercicioBase,
  useAtualizarTipoTreino,
  useBiblioteca,
  useCriarExercicioBase,
  useCriarTipoTreino,
  useExcluirExercicioBase,
  useExcluirTipoTreino,
  useTiposTreino,
} from '../hooks'

/**
 * Biblioteca de exercícios e tipos de treino (resolução 10.18).
 *
 * É aqui que nome e grupo muscular se editam: corrigir num lugar vale para todos
 * os treinos que usam o exercício. Antes, o mesmo movimento em dois treinos eram
 * duas entradas independentes que divergiam.
 *
 * Um diálogo com duas abas em vez de dois botões separados: são listas curtas,
 * gerenciadas em conjunto e raramente visitadas.
 */
export function DialogBiblioteca() {
  const [aberto, setAberto] = useState(false)

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Library className="size-4" />
          Biblioteca
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Biblioteca</DialogTitle>
          <DialogDescription>
            Nome e grupo muscular vivem aqui. Corrigir neste lugar vale para
            todos os treinos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="exercicios">
          <TabsList>
            <TabsTrigger value="exercicios">Exercícios</TabsTrigger>
            <TabsTrigger value="tipos">Tipos de treino</TabsTrigger>
          </TabsList>

          <TabsContent value="exercicios" className="mt-4">
            <AbaExercicios />
          </TabsContent>

          <TabsContent value="tipos" className="mt-4">
            <AbaTipos />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// --- Exercícios -------------------------------------------------------------

function AbaExercicios() {
  const biblioteca = useBiblioteca()
  const criar = useCriarExercicioBase()
  const atualizar = useAtualizarExercicioBase()
  const excluir = useExcluirExercicioBase()

  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nomeEdit, setNomeEdit] = useState('')
  const [grupoEdit, setGrupoEdit] = useState('')

  const lista = biblioteca.data ?? []

  async function adicionar() {
    if (nome.trim() === '') return
    await criar.mutateAsync({
      nome: nome.trim(),
      grupo_muscular: grupo.trim() === '' ? null : grupo.trim().toLowerCase(),
    })
    setNome('')
    setGrupo('')
  }

  async function salvarEdicao(id: string) {
    if (nomeEdit.trim() === '') return
    await atualizar.mutateAsync({
      id,
      dados: {
        nome: nomeEdit.trim(),
        grupo_muscular:
          grupoEdit.trim() === '' ? null : grupoEdit.trim().toLowerCase(),
      },
    })
    setEditandoId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[9rem] flex-1 space-y-1.5">
          <Label className="text-xs" htmlFor="bib-nome">
            Novo exercício
          </Label>
          <Input
            id="bib-nome"
            className="h-8"
            placeholder="Ex: Supino Reto"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') void adicionar()
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="bib-grupo">
            Grupo muscular
          </Label>
          <Input
            id="bib-grupo"
            className="h-8 w-32"
            placeholder="peito"
            value={grupo}
            onChange={(evento) => setGrupo(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') void adicionar()
            }}
          />
        </div>
        <Button
          size="sm"
          onClick={() => void adicionar()}
          disabled={criar.isPending}
        >
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      {lista.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {biblioteca.isPending
            ? 'Carregando…'
            : 'Nenhum exercício na biblioteca.'}
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {lista.map((item) => {
            const emEdicao = editandoId === item.id
            return (
              <li key={item.id} className="py-2 first:pt-0">
                {emEdicao ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="h-8 min-w-[8rem] flex-1"
                      value={nomeEdit}
                      onChange={(e) => setNomeEdit(e.target.value)}
                      aria-label="Nome do exercício"
                      autoFocus
                    />
                    <Input
                      className="h-8 w-28"
                      value={grupoEdit}
                      onChange={(e) => setGrupoEdit(e.target.value)}
                      placeholder="grupo"
                      aria-label="Grupo muscular"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-status-ok size-9 sm:size-7"
                      aria-label="Salvar"
                      onClick={() => void salvarEdicao(item.id)}
                      disabled={atualizar.isPending}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground size-9 sm:size-7"
                      aria-label="Cancelar"
                      onClick={() => setEditandoId(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{item.nome}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.grupo_muscular ?? 'sem grupo'}
                        {item.usos > 0 && (
                          <>
                            {' '}
                            · em {item.usos} treino{item.usos === 1 ? '' : 's'}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground size-9 sm:size-7"
                        aria-label={`Editar ${item.nome}`}
                        onClick={() => {
                          setEditandoId(item.id)
                          setNomeEdit(item.nome)
                          setGrupoEdit(item.grupo_muscular ?? '')
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {/*
                        A FK é `on delete restrict`: excluir em uso falharia com
                        erro do Postgres. Melhor desabilitar e dizer por quê.
                      */}
                      {item.usos > 0 ? (
                        <span
                          className="text-muted-foreground w-7 text-center text-[10px] leading-tight"
                          title={`Em uso em ${item.usos} treino(s) — remova de lá primeiro`}
                        >
                          em uso
                        </span>
                      ) : (
                        <DialogConfirmarExclusao
                          titulo="Excluir da biblioteca"
                          mensagem={`"${item.nome}" será removido. Recordes deste exercício também serão apagados.`}
                          pendente={excluir.isPending}
                          onConfirmar={() => excluir.mutateAsync(item.id)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// --- Tipos de treino --------------------------------------------------------

function AbaTipos() {
  const tipos = useTiposTreino()
  const criar = useCriarTipoTreino()
  const atualizar = useAtualizarTipoTreino()
  const excluir = useExcluirTipoTreino()

  const [nome, setNome] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nomeEdit, setNomeEdit] = useState('')

  const lista = tipos.data ?? []

  async function adicionar() {
    if (nome.trim() === '') return
    await criar.mutateAsync({ nome: nome.trim() })
    setNome('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs" htmlFor="tipo-nome">
            Novo tipo
          </Label>
          <Input
            id="tipo-nome"
            className="h-8"
            placeholder="Ex: Força, Resistência"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') void adicionar()
            }}
          />
        </div>
        <Button
          size="sm"
          onClick={() => void adicionar()}
          disabled={criar.isPending}
        >
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      {lista.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {tipos.isPending ? 'Carregando…' : 'Nenhum tipo cadastrado.'}
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {lista.map((item) => (
            <li
              key={item.id}
              className={cn(
                'flex items-center justify-between gap-3 py-2 first:pt-0',
              )}
            >
              {editandoId === item.id ? (
                <>
                  <Input
                    className="h-8 flex-1"
                    value={nomeEdit}
                    onChange={(e) => setNomeEdit(e.target.value)}
                    aria-label="Nome do tipo"
                    autoFocus
                  />
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-status-ok size-9 sm:size-7"
                      aria-label="Salvar"
                      disabled={atualizar.isPending}
                      onClick={() => {
                        if (nomeEdit.trim() === '') return
                        void atualizar
                          .mutateAsync({
                            id: item.id,
                            dados: { nome: nomeEdit.trim() },
                          })
                          .then(() => setEditandoId(null))
                      }}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground size-9 sm:size-7"
                      aria-label="Cancelar"
                      onClick={() => setEditandoId(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.nome}</p>
                    {item.usos > 0 && (
                      <p className="text-muted-foreground text-xs">
                        em {item.usos} treino{item.usos === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground size-9 sm:size-7"
                      aria-label={`Editar ${item.nome}`}
                      onClick={() => {
                        setEditandoId(item.id)
                        setNomeEdit(item.nome)
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {/*
                      Aqui a FK é `on delete set null`: excluir um tipo em uso
                      apenas desclassifica os treinos, sem destruir nada.
                    */}
                    <DialogConfirmarExclusao
                      titulo="Excluir tipo"
                      mensagem={
                        item.usos > 0
                          ? `${item.usos} treino${item.usos === 1 ? '' : 's'} ficará sem tipo. Nenhum treino é apagado.`
                          : `"${item.nome}" será removido.`
                      }
                      pendente={excluir.isPending}
                      onConfirmar={() => excluir.mutateAsync(item.id)}
                    />
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
