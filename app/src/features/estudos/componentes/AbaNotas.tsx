import { format, isToday, isYesterday } from 'date-fns'
import { NotebookPen, Pencil, Pin, PinOff } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { EstadoVazio } from '@/components/EstadoVazio'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAtualizarNota, useExcluirNota } from '../hooks'
import { DialogNota } from './DialogNota'
import type { NotaEstudo } from '../types'

interface AbaNotasProps {
  materiaId: string
  notas: readonly NotaEstudo[]
  /**
   * Particularidades da matéria — continua sendo campo da ficha, e é exibida
   * aqui porque é onde se procura por ela. Editar segue pelo cadastro: é
   * referência estável, não anotação do dia.
   */
  particularidades: string | null
  /** Data de cada sessão vinculada, para rotular a nota que nasceu numa sessão. */
  dataPorSessao: ReadonlyMap<string, string>
}

/**
 * Aba Notas — a lista de notas da matéria.
 *
 * Substitui os dois blocos de texto só-leitura que a versão de 12/08 tinha, e
 * que mandavam "edite a matéria para adicionar": a nota era coluna de
 * `materias`, então escrever exigia abrir o cadastro. Agora nota é entidade, e a
 * aba é a superfície de escrita.
 *
 * Fixadas primeiro, depois a que mudou por último — mesma ordem que a query já
 * pede ao banco, mantida aqui de propósito. Ordenar de novo no cliente
 * garantiria a ordem mesmo se a query mudasse, mas esconderia o fato de que ela
 * vem ordenada; a lista é renderizada na ordem recebida.
 */
export function AbaNotas({
  materiaId,
  notas,
  particularidades,
  dataPorSessao,
}: AbaNotasProps) {
  const atualizar = useAtualizarNota()
  const excluir = useExcluirNota()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          {notas.length === 0
            ? 'Nenhuma nota ainda'
            : `${notas.length} ${notas.length === 1 ? 'nota' : 'notas'}`}
        </p>
        <DialogNota materiaId={materiaId} />
      </div>

      {notas.length === 0 ? (
        <EstadoVazio
          icone={NotebookPen}
          classeCor="text-estudos"
          classeFundo="bg-estudos/10"
          titulo="Sem notas nesta matéria"
          descricao="Resumo de aula, fórmulas, dúvidas para levar ao professor — cada assunto em uma nota."
          acao={<DialogNota materiaId={materiaId} />}
        />
      ) : (
        <ul className="space-y-3">
          {notas.map((nota) => (
            <li key={nota.id}>
              <Card className={cn(nota.fixada && 'border-estudos/40')}>
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {nota.fixada && (
                          <Pin
                            aria-hidden
                            className="text-estudos size-3.5 shrink-0"
                          />
                        )}
                        <p className="truncate text-sm font-medium">
                          {nota.titulo}
                        </p>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        {rotuloData(nota.atualizada_em)}
                        {nota.sessao_id &&
                          dataPorSessao.has(nota.sessao_id) &&
                          ` · sessão de ${format(
                            new Date(`${dataPorSessao.get(nota.sessao_id)}T00:00:00`),
                            'dd/MM',
                          )}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground size-11 sm:size-7"
                        aria-label={nota.fixada ? 'Desfixar nota' : 'Fixar nota'}
                        disabled={atualizar.isPending}
                        onClick={() =>
                          atualizar.mutate({
                            id: nota.id,
                            dados: { fixada: !nota.fixada },
                          })
                        }
                      >
                        {nota.fixada ? (
                          <PinOff className="size-3.5" />
                        ) : (
                          <Pin className="size-3.5" />
                        )}
                      </Button>
                      <DialogNota
                        materiaId={materiaId}
                        nota={nota}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground size-11 sm:size-7"
                            aria-label="Editar nota"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <DialogConfirmarExclusao
                        titulo="Excluir nota"
                        mensagem={`"${nota.titulo}" será apagada. Não há como recuperar.`}
                        onConfirmar={() => excluir.mutate(nota.id)}
                        pendente={excluir.isPending}
                      />
                    </div>
                  </div>

                  {nota.conteudo.trim() === '' ? (
                    <p className="text-muted-foreground/70 text-sm italic">
                      Sem conteúdo ainda.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                      {nota.conteudo}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card className="bg-muted/30 shadow-none">
        <CardContent className="space-y-1.5">
          <p className="text-sm font-medium">Particularidades</p>
          {particularidades ? (
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {particularidades}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Email do professor, política de faltas — informação estável. Edite
              a matéria para preencher.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * "hoje", "ontem" ou a data. Numa nota o que importa é quando ela mudou, e
 * "hoje" responde isso mais rápido que `13/08/2026`.
 */
function rotuloData(iso: string): string {
  const data = new Date(iso)
  if (isToday(data)) return `editada hoje, ${format(data, 'HH:mm')}`
  if (isYesterday(data)) return `editada ontem, ${format(data, 'HH:mm')}`
  return `editada em ${format(data, "dd/MM/yyyy',' HH:mm")}`
}
