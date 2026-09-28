import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutosaveNota, type TextoNota } from './autosave'

const inicial = { titulo: 'Nota', conteudo: 'Primeiro parágrafo' }
function armazenamento() {
  const dados = new Map<string, string>()
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => { dados.set(chave, valor) },
    removeItem: (chave: string) => { dados.delete(chave) },
  }
}
function adiada() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => { resolve = r })
  return { promise, resolve }
}
beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

describe('proteção das notas', () => {
  it('recupera os últimos caracteres antes do debounce, inclusive após recarregar', () => {
    const storage = armazenamento()
    const salvar = vi.fn(async () => {})
    const sessao = new AutosaveNota('a', inicial, salvar, storage)
    sessao.editar({ conteudo: 'Primeiro parágrafo\nÚltima frase!' })
    const reaberta = new AutosaveNota('a', inicial, salvar, storage)
    expect(reaberta.getSnapshot().conteudo).toBe('Primeiro parágrafo\nÚltima frase!')
    expect(reaberta.getSnapshot().estado).toBe('pendente')
    expect(salvar).not.toHaveBeenCalled()
  })
  it('sair imediatamente força o envio e não cancela a última alteração', async () => {
    const salvar = vi.fn(async () => {})
    const sessao = new AutosaveNota('a', inicial, salvar, armazenamento())
    sessao.editar({ conteudo: 'Última tecla' })
    await sessao.flush()
    expect(salvar).toHaveBeenCalledExactlyOnceWith({ titulo: 'Nota', conteudo: 'Última tecla' }, inicial)
    expect(sessao.getSnapshot().estado).toBe('salvo')
  })
  it('serializa envios lentos e só confirma salvo depois da versão mais recente', async () => {
    const primeira = adiada()
    const segunda = adiada()
    const salvar = vi.fn().mockReturnValueOnce(primeira.promise).mockReturnValueOnce(segunda.promise)
    const storage = armazenamento()
    const sessao = new AutosaveNota('a', inicial, salvar, storage)
    sessao.editar({ conteudo: 'Versão 1' })
    const final = sessao.flush()
    await Promise.resolve()
    sessao.editar({ conteudo: 'Versão 2' })
    await vi.advanceTimersByTimeAsync(800)
    expect(salvar).toHaveBeenCalledTimes(1)
    primeira.resolve()
    await Promise.resolve()
    expect(salvar).toHaveBeenCalledTimes(2)
    expect(sessao.getSnapshot().estado).toBe('salvando')
    expect(new AutosaveNota('a', inicial, salvar, storage).getSnapshot().conteudo).toBe('Versão 2')
    segunda.resolve()
    await final
    expect(sessao.getSnapshot().estado).toBe('salvo')
    expect(salvar.mock.calls[1]![1].conteudo).toBe('Versão 1')
  })
  it('voltar ao texto original durante envio também gera uma gravação', async () => {
    const envio = adiada()
    const salvar = vi.fn().mockReturnValueOnce(envio.promise).mockResolvedValue(undefined)
    const sessao = new AutosaveNota('a', inicial, salvar, armazenamento())
    sessao.editar({ conteudo: 'Mudança desfeita' })
    const final = sessao.flush()
    await Promise.resolve()
    sessao.editar({ conteudo: inicial.conteudo })
    envio.resolve()
    await final
    expect(salvar).toHaveBeenCalledTimes(2)
    expect(salvar.mock.calls[1]![0]).toEqual(inicial)
  })
  it('mantém rascunho em erro de rede e tenta novamente sem outra tecla', async () => {
    const salvar = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const storage = armazenamento()
    const sessao = new AutosaveNota('a', inicial, salvar, storage)
    sessao.editar({ conteudo: 'Texto offline' })
    await sessao.flush()
    expect(sessao.getSnapshot().estado).toBe('erro')
    expect(new AutosaveNota('a', inicial, salvar, storage).getSnapshot().conteudo).toBe('Texto offline')
    await vi.advanceTimersByTimeAsync(5000)
    expect(salvar).toHaveBeenCalledTimes(2)
    expect(sessao.getSnapshot().estado).toBe('salvo')
  })
  it('restaura e envia rascunho recuperado sem exigir nova edição', async () => {
    const storage = armazenamento()
    new AutosaveNota('a', inicial, async () => {}, storage).editar({ conteudo: 'Recuperado' })
    const salvar = vi.fn(async () => {})
    const sessao = new AutosaveNota('a', inicial, salvar, storage)
    await sessao.flush()
    expect(salvar.mock.calls[0]).toBeDefined()
    expect(sessao.getSnapshot().conteudo).toBe('Recuperado')
  })
  it('não mistura rascunhos ao trocar de nota', async () => {
    const storage = armazenamento()
    const salvar = vi.fn(async (_texto: TextoNota) => {})
    const a = new AutosaveNota('a', inicial, salvar, storage)
    const b = new AutosaveNota('b', { titulo: 'Outra', conteudo: 'Outro texto' }, salvar, storage)
    a.editar({ conteudo: 'Texto da A' })
    b.editar({ conteudo: 'Texto da B' })
    await Promise.all([a.flush(), b.flush()])
    expect(a.getSnapshot().conteudo).toBe('Texto da A')
    expect(b.getSnapshot().conteudo).toBe('Texto da B')
  })
  it('salva exclusão completa do conteúdo e preserva rascunho vazio', async () => {
    const storage = armazenamento()
    const salvar = vi.fn(async () => {})
    const sessao = new AutosaveNota('a', inicial, salvar, storage)
    sessao.editar({ conteudo: '' })
    expect(new AutosaveNota('a', inicial, salvar, storage).getSnapshot().conteudo).toBe('')
    await sessao.flush()
    expect(sessao.getSnapshot().estado).toBe('salvo')
  })
  it('falha do armazenamento não interrompe digitação nem simula sucesso', async () => {
    const storage = armazenamento()
    storage.setItem = () => { throw new Error('QuotaExceededError') }
    const sessao = new AutosaveNota('a', inicial, async () => {}, storage)
    expect(() => sessao.editar({ conteudo: 'Texto preservado em memória' })).not.toThrow()
    expect(sessao.getSnapshot().estado).toBe('erro')
    await sessao.flush()
    expect(sessao.getSnapshot().estado).toBe('salvo')
  })
  it('renomeação compartilha a fila e não sobrescreve conteúdo digitado durante o envio', async () => {
    const envio = adiada()
    const salvar = vi.fn().mockReturnValueOnce(envio.promise).mockResolvedValue(undefined)
    const sessao = new AutosaveNota('a', inicial, salvar, armazenamento())
    sessao.editar({ titulo: 'Novo título' })
    const final = sessao.flush()
    await Promise.resolve()
    sessao.editar({ conteudo: 'Texto novo durante renomeação' })
    envio.resolve()
    await final
    expect(salvar.mock.calls[1]![0]).toEqual({ titulo: 'Novo título', conteudo: 'Texto novo durante renomeação' })
  })
})

