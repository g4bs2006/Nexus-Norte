import { useEffect, useState } from 'react'

/**
 * Acompanha uma media query em JavaScript.
 *
 * Existe para os casos em que o breakpoint precisa mudar uma **prop**, não uma
 * classe — o FullCalendar recebe `dayMaxEvents` como número, e não há CSS que
 * faça isso. Para tudo que é aparência, o breakpoint do Tailwind é melhor: não
 * custa render nem espera a hidratação.
 */
export function useMediaQuery(consulta: string): boolean {
  const [combina, setCombina] = useState(
    () => window.matchMedia(consulta).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(consulta)
    // Sincroniza no efeito também: a consulta pode ter mudado entre renders
    setCombina(media.matches)

    function aoMudar(evento: MediaQueryListEvent) {
      setCombina(evento.matches)
    }

    media.addEventListener('change', aoMudar)
    return () => media.removeEventListener('change', aoMudar)
  }, [consulta])

  return combina
}
