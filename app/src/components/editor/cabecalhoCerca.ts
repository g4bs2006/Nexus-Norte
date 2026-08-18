import { LINGUAGENS, filtrarLinguagens, rotularInfo, type Linguagem } from './linguagens'
import { ICONE_COPIAR, ICONE_OK, ICONE_QUEBRA } from './icones'

/**
 * O cabeçalho da cerca de código: linguagem, copiar, quebra de linha.
 *
 * ## Sem React, de propósito
 *
 * Mesma razão do wikilink em `views.tsx`, com um agravante: este elemento mora
 * DENTRO de uma node view, e um `createRoot` por bloco significa uma árvore
 * React nova — sem os providers do app — cujo commit assíncrono acontece fora do
 * ciclo do ProseMirror. A prévia já paga esse preço porque precisa (o mermaid é
 * React); três botões e uma lista não precisam.
 *
 * O que sobra é DOM direto, e o `atualizar` existe para não remontá-lo: o chip
 * troca de texto quando a linguagem muda, e o resto do cabeçalho fica de pé.
 *
 * ## O seletor mora no `body`
 *
 * A lista é posicionada em coordenadas de viewport e pendurada no `document.
 * body`, e não dentro do bloco. Dentro, o `overflow-x: auto` do `<pre>` a
 * cortaria — o mesmo motivo pelo qual `MenuSimbolos` é `fixed`.
 */

export interface CabecalhoCerca {
  elemento: HTMLElement
  /** Redesenha o chip quando a linguagem do nó mudou. */
  atualizar: (info: string) => void
  destruir: () => void
}

interface Opcoes {
  /** Travado (celular) esconde o que muda o documento; copiar continua valendo. */
  editavel: boolean
  aoTrocarLinguagem: (chave: string) => void
  /** Lido na hora do clique: o texto do bloco muda entre montar e copiar. */
  lerCodigo: () => string
  aoAlternarQuebra: (quebrar: boolean) => void
  /**
   * Devolve o foco ao editor. **Não é cortesia, é o que mantém o editor vivo.**
   *
   * O campo de busca do seletor tira o foco do ProseMirror para poder receber a
   * digitação. Quando o seletor fecha, o `<input>` sai do DOM e o foco cai no
   * `body` — e a partir dali o ProseMirror não recebe mais `keydown` nenhum:
   * Enter para de quebrar linha, as letras param de entrar, tudo morre até se
   * clicar de volta no texto.
   *
   * Escolher uma linguagem já devolvia o foco por outro caminho
   * (`aoTrocarLinguagem` chama `view.focus()`), e era isso que fazia o defeito
   * parecer aleatório: quem escolhia saía com cor E com o editor funcionando;
   * quem desistia com Escape, clicava fora ou apenas ROLAVA a nota com o
   * seletor aberto saía sem cor e sem editor.
   */
  devolverFoco: () => void
}

export function criarCabecalhoCerca(opcoes: Opcoes): CabecalhoCerca {
  const elemento = document.createElement('div')
  elemento.className = 'bloco-cerca-cabecalho'
  /*
   * Fora da região editável, como a prévia. Sem isto o cursor entra no chip e o
   * ProseMirror passa a ter que decidir o que é uma seleção dentro de um botão.
   */
  elemento.contentEditable = 'false'

  /*
   * Nenhum clique no cabeçalho mexe na seleção do editor.
   *
   * O cabeçalho é `contentEditable="false"` e mora logo acima da primeira linha
   * do código — mira-se na linha e acerta-se ele. Sem esta guarda o ProseMirror
   * lê o clique como seleção do NÓ inteiro, e com um nó selecionado o `Enter`
   * não tem parágrafo de código onde inserir a quebra: o `newlineInCode` recusa,
   * o `splitBlock` assume e nasce um bloco novo em vez de uma linha nova.
   *
   * Os botões já se defendiam um a um; a faixa vazia entre eles, não. Vale para
   * o `mousedown` porque é ele que move a seleção — o `click` chega tarde.
   */
  elemento.addEventListener('mousedown', (evento) => evento.preventDefault())

  /* ---- chip da linguagem ------------------------------------------------- */

  const chip = document.createElement('button')
  chip.type = 'button'
  chip.className = 'cerca-chip'
  chip.setAttribute('aria-haspopup', 'listbox')
  chip.setAttribute('aria-expanded', 'false')

  const rotulo = document.createElement('span')
  chip.append(rotulo)
  if (opcoes.editavel) {
    const seta = document.createElement('span')
    seta.className = 'cerca-chip-seta'
    seta.textContent = '⌄'
    chip.append(seta)
  }
  chip.disabled = !opcoes.editavel

  /* ---- ações ------------------------------------------------------------- */

  const acoes = document.createElement('div')
  acoes.className = 'cerca-acoes'

  const copiar = botaoIcone(ICONE_COPIAR, 'Copiar código')
  acoes.append(copiar)

  let quebrar = false
  const quebra = botaoIcone(ICONE_QUEBRA, 'Quebrar linhas longas')
  quebra.setAttribute('aria-pressed', 'false')
  acoes.append(quebra)

  elemento.append(chip, acoes)

  /* ---- copiar ------------------------------------------------------------ */

  let voltarIcone: ReturnType<typeof setTimeout> | null = null

  copiar.addEventListener('click', () => {
    /*
     * Lido AGORA, e não guardado na montagem: o cabeçalho sobrevive à edição do
     * bloco, então um código capturado uma vez copiaria a versão de antes.
     */
    void navigator.clipboard.writeText(opcoes.lerCodigo()).then(() => {
      copiar.innerHTML = ICONE_OK
      copiar.dataset.copiado = 'sim'
      if (voltarIcone) clearTimeout(voltarIcone)
      voltarIcone = setTimeout(() => {
        copiar.innerHTML = ICONE_COPIAR
        delete copiar.dataset.copiado
      }, 1400)
    })
  })

  /* ---- quebra de linha --------------------------------------------------- */

  /*
   * Estado da VISTA, não do documento — e é o único jeito honesto.
   *
   * Markdown não tem onde guardar "este bloco quebra linha": gravar no info
   * string produziria ```` ```python:wrap ````, que outro leitor de Markdown
   * mostraria como uma linguagem chamada `python:wrap`. A fonte de verdade é o
   * arquivo (README), então o que o arquivo não representa não persiste — o
   * botão vale enquanto a node view viver, e volta ao padrão ao reabrir a nota.
   */
  quebra.addEventListener('click', () => {
    quebrar = !quebrar
    quebra.setAttribute('aria-pressed', quebrar ? 'true' : 'false')
    opcoes.aoAlternarQuebra(quebrar)
  })

  /* ---- seletor de linguagem ---------------------------------------------- */

  let lista: HTMLElement | null = null
  let indice = 0
  let filtradas: Linguagem[] = [...LINGUAGENS]

  /**
   * Fecha o seletor e devolve o foco ao editor.
   *
   * `devolver` só é `false` na destruição da node view: ali o editor pode estar
   * sendo desmontado junto, e pedir foco para uma view morta não tem destino.
   *
   * A devolução é condicionada a o foco estar mesmo AQUI dentro. Sem essa
   * guarda, fechar por clique fora roubaria o foco de onde o usuário acabou de
   * clicar — outro bloco, a barra lateral, o campo de título.
   */
  function fechar(devolver = true) {
    if (!lista) return

    const tinhaOFoco = lista.contains(document.activeElement)

    lista.remove()
    lista = null
    chip.setAttribute('aria-expanded', 'false')
    document.removeEventListener('mousedown', aoClicarFora, true)
    window.removeEventListener('scroll', aoRolar, true)
    window.removeEventListener('resize', aoRolar)

    if (devolver && tinhaOFoco) opcoes.devolverFoco()
  }

  /*
   * Envelopado porque `fechar` tem parâmetro: passá-lo direto como listener
   * faria o `Event` chegar como `devolver` — inofensivo hoje (todo Event é
   * truthy), e uma armadilha no dia em que o padrão do parâmetro mudar.
   */
  const aoRolar = () => fechar()

  function aoClicarFora(evento: MouseEvent) {
    const alvo = evento.target as globalThis.Node | null
    if (!alvo) return
    if (lista?.contains(alvo) || chip.contains(alvo)) return
    fechar()
  }

  function pintarLista() {
    const corpo = lista?.querySelector('.cerca-seletor-itens')
    if (!corpo) return
    corpo.replaceChildren(
      ...filtradas.map((lingua, posicao) => {
        const item = document.createElement('button')
        item.type = 'button'
        item.role = 'option'
        item.className = 'cerca-seletor-item'
        item.dataset.selecionado = posicao === indice ? 'sim' : 'nao'
        item.setAttribute('aria-selected', posicao === indice ? 'true' : 'false')
        item.textContent = lingua.rotulo
        /*
         * `mousedown` e não `click`: o `click` chega depois do `blur`, e até lá
         * o `mousedown` no `document` já teria fechado a lista.
         */
        item.addEventListener('mousedown', (evento) => {
          evento.preventDefault()
          opcoes.aoTrocarLinguagem(lingua.chave)
          fechar()
        })
        return item
      }),
    )
    corpo
      .querySelector('[data-selecionado="sim"]')
      ?.scrollIntoView({ block: 'nearest' })
  }

  function abrir() {
    if (lista) return fechar()

    lista = document.createElement('div')
    lista.className = 'cerca-seletor'
    lista.role = 'listbox'

    const busca = document.createElement('input')
    busca.type = 'text'
    busca.className = 'cerca-seletor-busca'
    busca.placeholder = 'Buscar linguagem…'

    const itens = document.createElement('div')
    itens.className = 'cerca-seletor-itens'

    lista.append(busca, itens)
    document.body.append(lista)

    const caixa = chip.getBoundingClientRect()
    lista.style.left = `${caixa.left}px`
    /* Para cima quando não cabe embaixo — mesma regra do `MenuSimbolos`. */
    const cabeEmbaixo = window.innerHeight - caixa.bottom > 280
    if (cabeEmbaixo) lista.style.top = `${caixa.bottom + 4}px`
    else lista.style.bottom = `${window.innerHeight - caixa.top + 4}px`

    chip.setAttribute('aria-expanded', 'true')
    indice = 0
    filtradas = [...LINGUAGENS]
    pintarLista()
    busca.focus()

    busca.addEventListener('input', () => {
      filtradas = filtrarLinguagens(busca.value)
      indice = 0
      pintarLista()
    })

    busca.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        fechar()
        return
      }
      if (evento.key === 'ArrowDown') {
        evento.preventDefault()
        indice = (indice + 1) % Math.max(filtradas.length, 1)
        pintarLista()
        return
      }
      if (evento.key === 'ArrowUp') {
        evento.preventDefault()
        indice = (indice - 1 + filtradas.length) % Math.max(filtradas.length, 1)
        pintarLista()
        return
      }
      if (evento.key === 'Enter') {
        evento.preventDefault()
        const escolhida = filtradas[indice]
        if (escolhida) opcoes.aoTrocarLinguagem(escolhida.chave)
        fechar()
      }
    })

    /* `capture`, para fechar antes de o clique virar seleção no editor. */
    document.addEventListener('mousedown', aoClicarFora, true)
    /* Rolar move o chip e a lista ficaria órfã no meio da tela. */
    window.addEventListener('scroll', aoRolar, true)
    window.addEventListener('resize', aoRolar)
  }

  chip.addEventListener('mousedown', (evento) => {
    /* Sem isto o clique tira o foco do editor e leva a seleção junto. */
    evento.preventDefault()
    if (opcoes.editavel) abrir()
  })

  return {
    elemento,
    atualizar: (info) => {
      rotulo.textContent = rotularInfo(info)
    },
    destruir: () => {
      if (voltarIcone) clearTimeout(voltarIcone)
      /* Sem devolver o foco: a view está indo embora, e não há para onde. */
      fechar(false)
    },
  }
}

function botaoIcone(svg: string, titulo: string): HTMLButtonElement {
  const botao = document.createElement('button')
  botao.type = 'button'
  botao.className = 'cerca-acao'
  botao.title = titulo
  botao.setAttribute('aria-label', titulo)
  botao.innerHTML = svg
  /* Clicar numa ação não deve mexer no cursor de quem está escrevendo. */
  botao.addEventListener('mousedown', (evento) => evento.preventDefault())
  return botao
}
