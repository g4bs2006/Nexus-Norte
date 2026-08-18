/**
 * Ícones inline dos controles que vivem DENTRO do editor.
 *
 * SVG como string, e não `lucide-react`, porque quem monta estes controles é
 * node view — DOM imperativo, fora da árvore React. Montar um `createRoot` por
 * bloco de código e por fórmula só para desenhar um ícone é o que o comentário
 * do wikilink em `views.tsx` já recusou uma vez.
 *
 * Moram aqui, e não em cada arquivo, porque o cabeçalho da cerca e a fórmula
 * usam o MESMO par copiar/confirmado: duas cópias divergiriam no primeiro
 * ajuste de traço, e aí a mesma ação teria dois desenhos na mesma página.
 *
 * `stroke="currentColor"` em todos: quem posiciona decide a cor pelo `color`,
 * que é como o estado "copiado" fica verde sem um segundo SVG.
 */

export const ICONE_COPIAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'

export const ICONE_OK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'

export const ICONE_QUEBRA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h13a3 3 0 0 1 0 6h-4"/><path d="m14 15-2 3 2 3"/><path d="M3 18h4"/></svg>'
