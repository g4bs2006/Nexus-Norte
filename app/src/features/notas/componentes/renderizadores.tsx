import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from '@/lib/queryClient'
import { Desenho } from './Desenho'

/**
 * O que cada construção da nota vira na tela.
 *
 * **Um lugar só, usado por dois consumidores**: a leitura (`Cerca`,
 * `ConteudoNota`) e as node views do editor. Era o risco óbvio de ter editor e
 * leitura desenhando as mesmas coisas — duas listas divergiriam na primeira
 * linguagem nova.
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
 * `null` é resposta legítima: significa "isto é código, mostre como código".
 * Quem chama decide como — a leitura desenha um `<pre>`, e o editor já tem o
 * dele, editável. É por isso que arquivar não quebrou nota nenhuma: uma cerca
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
