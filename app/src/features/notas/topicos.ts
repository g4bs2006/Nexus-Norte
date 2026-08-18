import { buscarTopicos } from './api'
import { gerarSlug } from './markdown'

/**
 * O catálogo do `#`, no formato que o editor do kernel entende.
 *
 * Mesma divisão de `simbolos.ts`: o editor devolve `{ chave, rotulo, amostra }`
 * e nada mais — ele não sabe o que é um tópico, e não deve saber. A ponte é a
 * CHAVE, que aqui é o slug, e a regra de como um nome vira slug continua em
 * `markdown.ts`, que é puro e testado.
 *
 * ## Por que o `#` ganhou menu
 *
 * A marcação nasce do texto, e é isso que a spec pede — um seletor à parte
 * faria o vocabulário viver fora da nota, e aí renomear a nota e renomear a
 * marcação seriam dois atos. Mas sem ver o que já existe, cada nota reinventa a
 * grafia: `#regra-da-cadeia` numa, `#regra-cadeia` na outra, `#RegraDaCadeia`
 * na terceira. O grafo lê os três como assuntos diferentes, e o vocabulário se
 * fragmenta exatamente onde deveria convergir.
 *
 * O menu não tira a marcação do texto — ela continua sendo `#slug` no Markdown,
 * legível e exportável. Só mostra o que já se usou antes de escrever de novo.
 */
export const fonteTopicos = async (termo: string) => {
  const achados = await buscarTopicos(termo)

  const itens = achados.map((topico) => ({
    chave: topico.slug,
    rotulo: topico.nome,
    amostra: '#',
  }))

  /*
   * Um tópico NOVO encabeça a lista quando o que se digitou ainda não existe.
   *
   * Sem isso o menu vira uma prisão: só daria para marcar vocabulário já usado,
   * e a primeira nota sobre um assunto novo não teria como nomeá-lo — o que
   * inverteria a regra da spec, fazendo o vocabulário deixar de ser derivado do
   * conteúdo para ser um cadastro prévio.
   */
  const slug = gerarSlug(termo)
  const jaExiste = itens.some((item) => item.chave === slug)
  if (termo.trim() === '' || jaExiste) return itens

  return [
    { chave: slug, rotulo: `Novo tópico: ${slug}`, amostra: '+' },
    ...itens,
  ]
}
