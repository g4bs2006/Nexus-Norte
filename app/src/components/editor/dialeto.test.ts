import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { remarkDialeto } from './dialeto'
import {
  extrairLinks,
  extrairReferenciasDesenho,
  extrairTopicos,
} from '@/features/notas/markdown'

/**
 * Round-trip do dialeto: o texto tem que voltar igual ao que entrou.
 *
 * Este arquivo existe por causa de um bug real, medido em 14/08: o remark
 * ESCAPA colchete duplo ao serializar, então `[[series-de-taylor]]` voltava
 * como `\[\[series-de-taylor]]`. Como `extrairLinks` não reconhece o escapado
 * — e não deve mesmo, `\[` é escape de Markdown —, editar uma nota no editor
 * rico apagava os links e os desenhos dela.
 *
 * Os testes abaixo são o que impede isso de voltar. Se algum falhar com
 * `\[\[`, o escape voltou e o grafo está sendo destruído a cada salvamento.
 */

const processador = unified()
  .use(remarkParse)
  .use(remarkDialeto)
  .use(remarkStringify)

/** Markdown → mdast → Markdown, que é o caminho que o editor faz ao salvar. */
function daVolta(texto: string): string {
  return String(processador.processSync(texto)).trim()
}

describe('round-trip do wikilink', () => {
  it('não escapa os colchetes — a regressão que motivou este arquivo', () => {
    const volta = daVolta('ver [[series-de-taylor]] aqui')
    expect(volta).not.toContain('\\[')
    expect(volta).toBe('ver [[series-de-taylor]] aqui')
  })

  it('preserva o texto exibido', () => {
    expect(daVolta('ver [[limites|o que vimos]] aqui')).toBe(
      'ver [[limites|o que vimos]] aqui',
    )
  })

  it('sobrevive a duas voltas, que é o que salvar duas vezes faz', () => {
    const uma = daVolta('ver [[limites]] aqui')
    expect(daVolta(uma)).toBe(uma)
  })

  it('preserva vários links na mesma linha', () => {
    expect(daVolta('[[a]] e [[b]] e [[c]]')).toBe('[[a]] e [[b]] e [[c]]')
  })

  it('preserva link dentro de item de lista', () => {
    expect(daVolta('* um [[a]]\n* dois')).toBe('* um [[a]]\n* dois')
  })
})

describe('round-trip do desenho', () => {
  const id = '3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607'

  it('não escapa a referência', () => {
    const volta = daVolta(`antes ![[desenho:${id}]] depois`)
    expect(volta).not.toContain('\\[')
    expect(volta).toBe(`antes ![[desenho:${id}]] depois`)
  })

  it('sobrevive a duas voltas', () => {
    const uma = daVolta(`![[desenho:${id}]]`)
    expect(daVolta(uma)).toBe(uma)
  })

  it('deixa embed com uuid torto virar texto, sem quebrar', () => {
    // Não precisa voltar idêntico — precisa NÃO virar nó de desenho e não
    // derrubar o parse.
    expect(() => daVolta('![[desenho:nao-e-uuid]]')).not.toThrow()
  })
})

describe('round-trip do destaque', () => {
  it('preserva ==destaque==', () => {
    expect(daVolta('isto ==cai na prova== com certeza')).toBe(
      'isto ==cai na prova== com certeza',
    )
  })

  it('sobrevive a duas voltas', () => {
    const uma = daVolta('==importante==')
    expect(daVolta(uma)).toBe(uma)
  })

  it('convive com negrito na mesma linha', () => {
    expect(daVolta('**forte** e ==destacado==')).toBe(
      '**forte** e ==destacado==',
    )
  })

  it('deixa == solto em paz', () => {
    expect(daVolta('a == b')).toBe('a == b')
  })
})

describe('round-trip do tópico', () => {
  /*
   * O teste que existia aqui usava `#taylor` NO MEIO da linha — justamente o
   * caso que sempre funcionou. No início do parágrafo o remark escapa a
   * cerquilha (`\#taylor`) para que ela não seja relida como heading, e
   * `extrairTopicos` deixava de achar o tópico. Só o caso de início pega isso.
   */
  it('não escapa a cerquilha no início do parágrafo', () => {
    const volta = daVolta('#regra-da-cadeia cai na prova')
    expect(volta).not.toContain('\\#')
    expect(volta).toBe('#regra-da-cadeia cai na prova')
  })

  it('preserva tópico no meio da linha', () => {
    expect(daVolta('topico #taylor no texto')).toBe('topico #taylor no texto')
  })

  it('sobrevive a duas voltas, que é o que salvar duas vezes faz', () => {
    const uma = daVolta('#limites e #derivadas')
    expect(daVolta(uma)).toBe(uma)
  })

  it('heading continua heading, e não vira tópico', () => {
    expect(daVolta('# Título de verdade')).toBe('# Título de verdade')
  })

  it('âncora de URL não vira tópico', () => {
    const url = 'veja <https://exemplo.com/pagina#secao> ali'
    expect(daVolta(url)).toContain('#secao')
  })

  it('`#2` numa enumeração não vira vocabulário', () => {
    expect(daVolta('item #2 da lista')).toBe('item #2 da lista')
  })
})

describe('o que o dialeto não pode estragar', () => {
  it('fórmula continua intacta', () => {
    expect(daVolta('formula $x^2$ inline')).toBe('formula $x^2$ inline')
  })

  it('link normal de markdown não vira wikilink', () => {
    expect(daVolta('[texto](https://exemplo.com)')).toBe(
      '[texto](https://exemplo.com)',
    )
  })

  it('cerca de código passa sem ser tocada', () => {
    const cerca = '```mermaid\ngraph TD; A-->B\n```'
    expect(daVolta(cerca)).toBe(cerca)
  })

  it('colchete simples segue sendo colchete', () => {
    expect(daVolta('array\\[0]')).toContain('[0]')
  })
})

/**
 * O contrato entre as duas pontas.
 *
 * Os testes acima provam que o texto volta igual. Estes provam o que realmente
 * importa: depois da volta, os EXTRATORES ainda enxergam o que enxergavam. É
 * essa a asserção que faltava — o dialeto e os extratores tinham cópias da
 * mesma gramática, cada lado testado sozinho, e ninguém testava o encontro.
 *
 * Se algum destes falhar, uma nota salva pelo editor está perdendo aresta do
 * grafo ou vocabulário, sem erro nenhum na tela.
 *
 * **Sobre a regra de dependência:** este arquivo importa de `features/notas`, o
 * que o kernel não pode fazer. É deliberado e vale só aqui — um teste de
 * contrato precisa das duas pontas por definição, e o `grep` que confere a
 * regra olha código de produção. `dialeto.ts` segue sem importar feature
 * nenhuma; a gramática que os dois lados compartilham mora em `gramatica.ts`,
 * no kernel, e é a feature que lê dela.
 */
describe('contrato com os extratores de features/notas', () => {
  it('menção sobrevive à volta e continua sendo aresta do grafo', () => {
    const volta = daVolta('ver [[series-de-taylor]] aqui')
    expect(extrairLinks(volta)).toEqual(['series-de-taylor'])
  })

  it('menção com rótulo idem', () => {
    const volta = daVolta('ver [[limites|o que vimos]] aqui')
    expect(extrairLinks(volta)).toEqual(['limites'])
  })

  it('tópico no início do parágrafo continua sendo vocabulário', () => {
    const volta = daVolta('#regra-da-cadeia cai na prova')
    expect(extrairTopicos(volta).map((t) => t.slug)).toEqual([
      'regra-da-cadeia',
    ])
  })

  it('tópico no meio da linha idem', () => {
    const volta = daVolta('isto #taylor vale')
    expect(extrairTopicos(volta).map((t) => t.slug)).toEqual(['taylor'])
  })

  it('desenho embutido continua sendo referência', () => {
    const id = '3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607'
    const volta = daVolta(`antes ![[desenho:${id}]] depois`)
    expect(extrairReferenciasDesenho(volta)).toEqual([id])
  })

  it('tudo junto, que é como uma nota real se parece', () => {
    const nota = [
      '#calculo-2 revisão de hoje',
      '',
      'A [[regra-da-cadeia]] aparece em [[derivadas|derivação composta]].',
      '',
      'Fórmula: $f(g(x))$ e o tópico #derivadas fecha.',
    ].join('\n')

    const volta = daVolta(nota)
    expect(extrairLinks(volta).sort()).toEqual(['derivadas', 'regra-da-cadeia'])
    expect(extrairTopicos(volta).map((t) => t.slug).sort()).toEqual([
      'calculo-2',
      'derivadas',
    ])
    expect(volta).not.toContain('\\[')
    expect(volta).not.toContain('\\#')
  })
})
