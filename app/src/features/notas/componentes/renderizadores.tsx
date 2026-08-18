import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from '@/lib/queryClient'
import { Desenho } from './Desenho'

/**
 * O que cada construção da nota vira na tela.
 *
 * **Um lugar só, e hoje um consumidor só**: as node views do editor. Nasceu
 * para servir também à leitura (`Cerca`, `ConteudoNota`), porque editor e
 * leitura desenhando as mesmas coisas divergiriam na primeira linguagem nova —
 * e o risco morreu pela raiz quando a leitura virou o próprio editor travado
 * (ver `somenteLeitura` em `EditorMarkdownRico`). Os dois renderizadores foram
 * apagados: `ConteudoNota` no commit que fez a troca, `Cerca` depois, quando o
 * realce de sintaxe mostrou que um `<pre>` órfão só saberia mentir sobre como
 * a nota aparece.
 *
 * O kernel não importa nada disto: ele recebe estas funções por prop, porque
 * saber o que uma linguagem vira é conhecimento de Notas.
 */

/**
 * A cerca renderizada, ou `null` quando a linguagem não é nossa.
 *
 * **Hoje devolve `null` sempre.** Diagrama, gráfico e geometria foram
 * arquivados em 14/08 por travarem a página — ver `app/arquivado/`. A função
 * fica porque o contrato com o kernel não muda, e retomar é restaurar os ramos
 * aqui.
 *
 * `null` é resposta legítima: significa "isto é código, mostre como código" — e
 * a node view da cerca já sabe fazer isso, com cabeçalho de linguagem e realce
 * de sintaxe. É por isso que arquivar não quebrou nota nenhuma: uma cerca
 * ```` ```mermaid ```` continua Markdown válido, só aparece como código.
 */
export function renderizarBloco(
  _linguagem: string,
  _codigo: string,
): ReactNode | null {
  return null
}

/**
 * O desenho, embrulhado no `QueryClientProvider`.
 *
 * O embrulho é exigência de onde isto é montado: a node view usa `createRoot`,
 * que cria uma ÁRVORE REACT NOVA — fora da do app, e portanto sem nenhum
 * provider. Sem isto, `useDesenho` estouraria com "No QueryClient set" dentro
 * do editor, e só ali.
 *
 * O `queryClient` é singleton de módulo, então o cache continua sendo o mesmo:
 * salvar o desenho pelo editor invalida a leitura da página junto.
 */
export function renderizarDesenho(
  id: string,
  onRemoverDoTexto: () => void,
): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <Desenho id={id} onRemoverDoTexto={onRemoverDoTexto} />
    </QueryClientProvider>
  )
}
