import { Link } from 'react-router-dom'
import { format, isToday, isYesterday } from 'date-fns'
import { NotebookPen, Pencil, Pin, PinOff } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { EstadoVazio } from '@/components/EstadoVazio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useExcluirNota, useFixarNota } from '../hooks'
import { DialogNota } from './DialogNota'
import type { NotaListada } from '../types'

interface AbaNotasProps {
  materiaId: string
  notas: readonly NotaListada[]
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
 * Desde 14/08 a lista é PONTO DE ENTRADA, não lugar de trabalho: o título leva
 * para `/notas/:slug`, que é a nota em largura de leitura com o painel de
 * backlinks. Escrever numa aba dentro de um card dentro de uma página era o
 * que fazia a nota parecer um campo de ficha.
 *
 * Editar pelo diálogo continua existindo para o retoque rápido — corrigir uma
 * frase sem sair da matéria é fluxo real.
 */
export function AbaNotas({
  materiaId,
  notas,
  particularidades,
  dataPorSessao,
}: AbaNotasProps) {
  const fixar = useFixarNota()
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
                        <Link
                          to={`/notas/${nota.slug}`}
                          className="hover:text-estudos truncate text-sm font-medium"
                        >
                          {nota.titulo}
                        </Link>
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
                        disabled={fixar.isPending}
                        onClick={() =>
                          fixar.mutate({ id: nota.id, fixada: !nota.fixada })
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
                        mensagem={`"${nota.titulo}" será apagada. Quem aponta para ela fica com um link quebrado, e o texto do link continua lá.`}
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
                    <p className="text-muted-foreground line-clamp-3 text-sm whitespace-pre-wrap">
                      {nota.conteudo}
                    </p>
                  )}

                  {nota.topicos.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {nota.topicos.map((topico) => (
                        <Badge
                          key={topico.id}
                          variant="secondary"
                          className="font-normal"
                        >
                          {topico.nome}
                        </Badge>
                      ))}
                    </div>
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
