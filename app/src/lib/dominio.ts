/**
 * Tipos de domínio que mais de um pilar precisa.
 *
 * **Por que existe.** O `Status` do semáforo era declarado em
 * `features/financeiro/types.ts`, e o próprio comentário dele dizia "usado
 * pelos pilares" — um tipo sabidamente transversal morando dentro de um pilar.
 * O resultado é que `features/estudos/types.ts` importava de
 * `features/financeiro/types.ts` para reusar um union de três strings, criando
 * dependência entre dois pilares que não têm nada a ver um com o outro.
 *
 * A regra que este arquivo materializa: **o que duas features precisam sobe
 * para o kernel.** Nada de feature importando feature de lado.
 *
 * Só tipos e constantes puros aqui — sem React, sem ícones, sem Supabase.
 * `lib/pilares.ts` é o vizinho que tem o mesmo espírito mas importa
 * `lucide-react`, e é justamente por isso que não serve de casa para o
 * `Status`: arrastaria ícones para quem só quer três strings.
 */

/**
 * Semáforo compartilhado pelos pilares (🟢 / 🟡 / 🔴).
 *
 * `ok` — dentro do previsto. `atencao` — merece olhar, ainda dá tempo.
 * `risco` — já estourou ou vai estourar sem intervenção.
 */
export type Status = 'ok' | 'atencao' | 'risco'
