/**
 * A regra de movimento do sistema, num lugar só.
 *
 * **Sem animação que não comunique estado.** Rolagem animada passa nesse teste
 * quando existe para mostrar *de onde para onde* a tela andou — é o que evita o
 * salto que faz o usuário perder o lugar. Fora disso, é enfeite.
 *
 * `index.css` já derruba `animation-duration` e `transition-duration` sob
 * `prefers-reduced-motion: reduce`, mas `scrollIntoView({ behavior: 'smooth' })`
 * é JavaScript e passa por fora do CSS. Daí a checagem viver aqui.
 */
export function comportamentoRolagem(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}
