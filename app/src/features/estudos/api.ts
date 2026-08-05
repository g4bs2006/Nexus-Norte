import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type {
  Avaliacao,
  ConfigCalculoMedia,
  Documento,
  Falta,
  FluxogramaAula,
  Materia,
  RegistroLista,
  SessaoEstudo,
} from './types'

/** Bucket definido na migration da Fase 2 (resolução 10.10). */
export const BUCKET_DOCUMENTOS = 'documentos-estudos'

function lancarSeErro<T>(resultado: {
  data: T | null
  error: { message: string } | null
}): T {
  if (resultado.error) throw new Error(resultado.error.message)
  if (resultado.data === null) throw new Error('Consulta sem retorno')
  return resultado.data
}

// --- Matérias ---------------------------------------------------------------

export async function listarMaterias(): Promise<Materia[]> {
  return lancarSeErro(await supabase.from('materias').select('*').order('nome'))
}

export async function criarMateria(
  dados: TablesInsert<'materias'>,
): Promise<void> {
  const { error } = await supabase.from('materias').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarMateria(
  id: string,
  dados: TablesUpdate<'materias'>,
): Promise<void> {
  const { error } = await supabase.from('materias').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirMateria(id: string): Promise<void> {
  const { error } = await supabase.from('materias').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Avaliações -------------------------------------------------------------

export async function listarAvaliacoes(): Promise<Avaliacao[]> {
  return lancarSeErro(
    await supabase.from('avaliacoes').select('*').order('data', {
      ascending: true,
      nullsFirst: false,
    }),
  )
}

export async function criarAvaliacao(
  dados: TablesInsert<'avaliacoes'>,
): Promise<void> {
  const { error } = await supabase.from('avaliacoes').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarAvaliacao(
  id: string,
  dados: TablesUpdate<'avaliacoes'>,
): Promise<void> {
  const { error } = await supabase.from('avaliacoes').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirAvaliacao(id: string): Promise<void> {
  const { error } = await supabase.from('avaliacoes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Config de cálculo da média --------------------------------------------

export async function obterConfigMedia(
  materiaId: string,
): Promise<ConfigCalculoMedia | null> {
  const { data, error } = await supabase
    .from('config_calculo_media')
    .select('*')
    .eq('materia_id', materiaId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as ConfigCalculoMedia | null
}

/**
 * Grava o modo de cálculo. `ponderada` é o padrão implícito, então escolhê-la
 * remove a linha de configuração em vez de gravar — mantém o banco sem
 * registros redundantes e alinhado ao fallback da função `calcular_media_materia`.
 */
export async function salvarConfigMedia(
  materiaId: string,
  config: {
    tipo: 'ponderada' | 'manual'
    nota_manual: number | null
    observacao: string | null
  },
): Promise<void> {
  if (config.tipo === 'ponderada') {
    const { error } = await supabase
      .from('config_calculo_media')
      .delete()
      .eq('materia_id', materiaId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('config_calculo_media').upsert(
    {
      materia_id: materiaId,
      tipo: 'manual',
      nota_manual: config.nota_manual,
      observacao: config.observacao,
    },
    { onConflict: 'materia_id' },
  )
  if (error) throw new Error(error.message)
}

// --- Faltas -----------------------------------------------------------------

export async function listarFaltas(): Promise<Falta[]> {
  return lancarSeErro(
    await supabase
      .from('faltas')
      .select('*')
      .order('data', { ascending: false }),
  )
}

export async function criarFalta(dados: TablesInsert<'faltas'>): Promise<void> {
  const { error } = await supabase.from('faltas').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarFalta(
  id: string,
  dados: TablesUpdate<'faltas'>,
): Promise<void> {
  const { error } = await supabase.from('faltas').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirFalta(id: string): Promise<void> {
  const { error } = await supabase.from('faltas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Sessões de estudo ------------------------------------------------------

export async function listarSessoes(
  de?: string,
  ate?: string,
): Promise<SessaoEstudo[]> {
  let consulta = supabase.from('sessoes_estudo').select('*')
  if (de) consulta = consulta.gte('data', de)
  if (ate) consulta = consulta.lte('data', ate)
  return lancarSeErro(await consulta.order('data', { ascending: false }))
}

export async function criarSessao(
  dados: TablesInsert<'sessoes_estudo'>,
): Promise<void> {
  const { error } = await supabase.from('sessoes_estudo').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarSessao(
  id: string,
  dados: TablesUpdate<'sessoes_estudo'>,
): Promise<void> {
  const { error } = await supabase
    .from('sessoes_estudo')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirSessao(id: string): Promise<void> {
  const { error } = await supabase.from('sessoes_estudo').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Registro de listas -----------------------------------------------------

export async function listarRegistroListas(
  materiaId: string,
): Promise<RegistroLista[]> {
  return lancarSeErro(
    await supabase
      .from('registro_listas')
      .select('*')
      .eq('materia_id', materiaId)
      .order('data', { ascending: false }),
  )
}

export async function criarRegistroLista(
  dados: TablesInsert<'registro_listas'>,
): Promise<void> {
  const { error } = await supabase.from('registro_listas').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarRegistroLista(
  id: string,
  dados: TablesUpdate<'registro_listas'>,
): Promise<void> {
  const { error } = await supabase
    .from('registro_listas')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirRegistroLista(id: string): Promise<void> {
  const { error } = await supabase.from('registro_listas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Documentos (Storage) ---------------------------------------------------

export async function listarDocumentos(
  materiaId: string,
): Promise<Documento[]> {
  const resultado = await supabase
    .from('documentos')
    .select('*')
    .eq('materia_id', materiaId)
    .order('created_at', { ascending: false })
  return lancarSeErro(resultado) as Documento[]
}

export interface NovoDocumento {
  materiaId: string
  tipo: Documento['tipo']
  arquivo: File
}

/**
 * Envia o arquivo ao bucket e registra o metadado.
 *
 * O caminho inclui um sufixo aleatório para não colidir quando dois arquivos
 * têm o mesmo nome. Se a inserção do metadado falhar, o arquivo já enviado é
 * removido — evita objetos órfãos no bucket.
 */
export async function enviarDocumento({
  materiaId,
  tipo,
  arquivo,
}: NovoDocumento): Promise<void> {
  const sufixo = crypto.randomUUID().slice(0, 8)
  const caminho = `${materiaId}/${sufixo}-${arquivo.name}`

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(caminho, arquivo)
  if (erroUpload) throw new Error(erroUpload.message)

  const { error } = await supabase.from('documentos').insert({
    materia_id: materiaId,
    tipo,
    nome: arquivo.name,
    storage_path: caminho,
  })

  if (error) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([caminho])
    throw new Error(error.message)
  }
}

/** Bucket privado: o acesso é feito por URL assinada temporária. */
export async function urlDocumento(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(storagePath, 60 * 10)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function excluirDocumento(
  id: string,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.from('documentos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  // O arquivo é removido depois do metadado: um objeto órfão é menos danoso
  // que um registro apontando para arquivo inexistente.
  await supabase.storage.from(BUCKET_DOCUMENTOS).remove([storagePath])
}

// --- Fluxograma semanal -----------------------------------------------------

/**
 * Aulas no fluxograma.
 *
 * A partir da Fase 3 a tabela guarda aulas E treinos (resolução 10.6), então o
 * filtro por `materia_id not null` é obrigatório — sem ele, treinos apareceriam
 * como aulas nos checks de Estudos.
 */
export async function listarFluxograma(): Promise<FluxogramaAula[]> {
  const resultado = await supabase
    .from('fluxograma_semanal')
    .select('*')
    .not('materia_id', 'is', null)
    .order('dia_semana')
    .order('horario_inicio')
  return lancarSeErro(resultado) as FluxogramaAula[]
}

export async function criarFluxograma(
  dados: TablesInsert<'fluxograma_semanal'>,
): Promise<void> {
  const { error } = await supabase.from('fluxograma_semanal').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarFluxograma(
  id: string,
  dados: TablesUpdate<'fluxograma_semanal'>,
): Promise<void> {
  const { error } = await supabase
    .from('fluxograma_semanal')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirFluxograma(id: string): Promise<void> {
  const { error } = await supabase
    .from('fluxograma_semanal')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Conclusões do fluxograma (resolução 10.15) -----------------------------

/** Ids de fluxograma concluídos em uma data. Presença = concluído. */
export async function listarConclusoes(data: string): Promise<string[]> {
  const { data: linhas, error } = await supabase
    .from('conclusoes_fluxograma')
    .select('fluxograma_id')
    .eq('data', data)
  if (error) throw new Error(error.message)
  return (linhas ?? []).map((linha) => linha.fluxograma_id)
}

/** Marca (insere) ou desmarca (remove) a conclusão de um item no dia. */
export async function definirConclusao(
  fluxogramaId: string,
  data: string,
  concluido: boolean,
): Promise<void> {
  if (concluido) {
    const { error } = await supabase
      .from('conclusoes_fluxograma')
      .upsert(
        { fluxograma_id: fluxogramaId, data },
        { onConflict: 'fluxograma_id,data' },
      )
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase
    .from('conclusoes_fluxograma')
    .delete()
    .eq('fluxograma_id', fluxogramaId)
    .eq('data', data)
  if (error) throw new Error(error.message)
}
