import { LINGUAGENS, filtrarLinguagens, rotularInfo, type Linguagem } from './linguagens'

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

/** Ícones inline: dois `path`, contra a alternativa de montar React por eles. */
const ICONE_COPIAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
const ICONE_OK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
const ICONE_QUEBRA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h13a3 3 0 0 1 0 6h-4"/><path d="m14 15-2 3 2 3"/><path d="M3 18h4"/></svg>'

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
}

export function criarCabecalhoCerca(opcoes: Opcoes): CabecalhoCerca {
  const elemento = document.createElement('div')
  elemento.className = 'bloco-cerca-cabecalho'
  /*
   * Fora da região editável, como a prévia. Sem isto o cursor entra no chip e o
   * ProseMirror passa a ter que decidir o que é uma seleção dentro de um botão.
   */
  elemento.contentEditable = 'false'

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

  function fechar() {
    lista?.remove()
    lista = null
    chip.setAttribute('aria-expanded', 'false')
    document.removeEventListener('mousedown', aoClicarFora, true)
    window.removeEventListener('scroll', fechar, true)
    window.removeEventListener('resize', fechar)
  }

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
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
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
      fechar()
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
