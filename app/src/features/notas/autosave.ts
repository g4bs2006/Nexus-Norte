export type EstadoSalvamento = 'salvo' | 'pendente' | 'salvando' | 'erro'
export type TextoNota = { titulo: string; conteudo: string }
type Snapshot = TextoNota & { estado: EstadoSalvamento }
type Armazenamento = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const iguais = (a: TextoNota, b: TextoNota) => a.titulo === b.titulo && a.conteudo === b.conteudo

/** Uma fila por nota, independente da vida da página React. */
export class AutosaveNota {
  private gravado: TextoNota
  private snapshot: Snapshot
  private ouvintes = new Set<() => void>()
  private timer?: ReturnType<typeof setTimeout>
  private emCurso?: Promise<void>
  private descartada = false
  private erroLocal = false
  private chave: string
  private salvar: (texto: TextoNota, anterior: TextoNota) => Promise<void | TextoNota>
  private storage: Armazenamento

  constructor(id: string, inicial: TextoNota,
    salvar: (texto: TextoNota, anterior: TextoNota) => Promise<void | TextoNota>, storage: Armazenamento) {
    this.salvar = salvar
    this.storage = storage
    this.chave = `nexus:rascunho-nota:v1:${id}`
    this.gravado = inicial
    let texto = inicial
    try {
      const raw = storage.getItem(this.chave)
      const salvo: unknown = raw === null ? null : JSON.parse(raw)
      if (salvo && typeof salvo === 'object' && 'titulo' in salvo &&
        'conteudo' in salvo && typeof salvo.titulo === 'string' &&
        typeof salvo.conteudo === 'string') texto = salvo as TextoNota
    } catch { this.erroLocal = true }
    this.snapshot = { ...texto, estado: iguais(texto, inicial) ? 'salvo' : 'pendente' }
  }
  getSnapshot = () => this.snapshot
  temOuvintes = () => this.ouvintes.size > 0
  descartar = () => {
    this.descartada = true
    clearTimeout(this.timer)
    try { this.storage.removeItem(this.chave) } catch { /* Exclusão explícita. */ }
  }
  subscribe = (ouvinte: () => void) => {
    this.ouvintes.add(ouvinte)
    return () => { this.ouvintes.delete(ouvinte) }
  }
  private publicar(estado: EstadoSalvamento) {
    this.snapshot = { ...this.snapshot, estado }
    this.ouvintes.forEach((ouvinte) => ouvinte())
  }
  private persistir() {
    try {
      this.storage.setItem(this.chave, JSON.stringify({
        titulo: this.snapshot.titulo, conteudo: this.snapshot.conteudo,
      }))
      this.erroLocal = false
    } catch { this.erroLocal = true }
  }
  editar = (texto: Partial<TextoNota>) => {
    if (this.descartada) return
    const proximo = { ...this.snapshot, ...texto }
    if (iguais(proximo, this.snapshot)) return
    this.snapshot = proximo
    // Síncrono: a navegação não pode acontecer antes da cópia local.
    this.persistir()
    this.publicar(this.erroLocal ? 'erro' : 'pendente')
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), 700)
  }
  temPendencia = () => !iguais(this.snapshot, this.gravado) || !!this.emCurso
  flush = (): Promise<void> => {
    clearTimeout(this.timer)
    if (this.descartada) return Promise.resolve()
    if (this.emCurso) return this.emCurso
    if (iguais(this.snapshot, this.gravado)) {
      try {
        const raw = this.storage.getItem(this.chave)
        if (raw && iguais(JSON.parse(raw), this.gravado)) this.storage.removeItem(this.chave)
      } catch { /* Não há texto pendente de confirmação. */ }
      this.publicar('salvo')
      return Promise.resolve()
    }
    this.emCurso = Promise.resolve().then(async () => {
      let enviada = this.gravado
      while (!iguais(this.snapshot, this.gravado)) {
        const texto = { titulo: this.snapshot.titulo, conteudo: this.snapshot.conteudo }
        enviada = texto
        this.publicar('salvando')
        try {
          const confirmado = await this.salvar(texto, this.gravado) ?? texto
          if (iguais(this.snapshot, texto)) this.snapshot = { ...this.snapshot, ...confirmado }
          this.gravado = confirmado
        } catch {
          this.publicar('erro')
          // Mantém o rascunho e tenta novamente mesmo após sair da página.
          this.timer = setTimeout(() => void this.flush(), 5000)
          return
        }
      }
      try {
        const raw = this.storage.getItem(this.chave)
        // Não apaga um rascunho diferente escrito por outra aba.
        if (raw && (iguais(JSON.parse(raw), this.gravado) || iguais(JSON.parse(raw), enviada))) {
          this.storage.removeItem(this.chave)
        }
      } catch { /* O servidor já confirmou esta versão. */ }
      this.publicar('salvo')
    }).finally(() => { this.emCurso = undefined })
    return this.emCurso
  }
}
