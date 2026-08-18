import { describe, expect, it } from 'vitest'
import { lerFormulaColada } from './colarFormula'

describe('lerFormulaColada', () => {
  it('reconhece a fórmula inline e devolve só o LaTeX', () => {
    expect(lerFormulaColada('$x^2$')).toEqual({ latex: 'x^2', bloco: false })
    expect(lerFormulaColada('$\\int_0^\\infty e^{-x^2}dx$')).toEqual({
      latex: '\\int_0^\\infty e^{-x^2}dx',
      bloco: false,
    })
  })

  it('reconhece a fórmula de bloco', () => {
    expect(lerFormulaColada('$$a^2 + b^2 = c^2$$')).toEqual({
      latex: 'a^2 + b^2 = c^2',
      bloco: true,
    })
  })

  it('tolera espaço e quebra de linha em volta', () => {
    /* Copiar de um PDF quase sempre traz espaço junto. */
    expect(lerFormulaColada('  \n $x^2$ \n ')).toEqual({
      latex: 'x^2',
      bloco: false,
    })
    expect(lerFormulaColada('$$\n  E = mc^2\n$$')).toEqual({
      latex: 'E = mc^2',
      bloco: true,
    })
  })

  it('NÃO transforma texto que só contém cifrões', () => {
    /*
     * O caso que decidiu a regra "é exatamente uma fórmula": aqui existe um
     * `$…$` válido no meio, e varrer o texto atrás dele produziria uma fórmula
     * com "200 e o livro" dentro.
     */
    expect(lerFormulaColada('o curso custa $200 e o livro $35')).toBeNull()
    expect(lerFormulaColada('preço: $50')).toBeNull()
    expect(lerFormulaColada('texto comum, sem cifrão')).toBeNull()
  })

  it('NÃO transforma um parágrafo que contém uma fórmula', () => {
    /* Quem cola um parágrafo quer o parágrafo. */
    expect(lerFormulaColada('a integral $\\int x$ aparece aqui')).toBeNull()
  })

  it('recusa a fórmula vazia', () => {
    /*
     * `$$` colado não é fórmula nenhuma — e virar um nó vazio deixaria no
     * arquivo exatamente o lixo que o `toMarkdown` de `mathInlineEditavel`
     * existe para não gravar.
     */
    expect(lerFormulaColada('$$')).toBeNull()
    expect(lerFormulaColada('$ $')).toBeNull()
    expect(lerFormulaColada('$$   $$')).toBeNull()
  })
})
