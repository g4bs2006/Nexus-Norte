# Atividades — entregas com prazo (design técnico)

**Data:** 2026-08-23
**Status:** proposto — par de
[`2026-08-23-atividades.md`](./2026-08-23-atividades.md) (plano de escopo).
Este doc especifica os contratos exatos para implementação; o plano decide o
quê, este decide o como.

## Problema

Entre `avaliacoes` (prova com nota/peso na média) e `registro_listas`
(registro pós-lista) não existe **entrega com prazo**: "entregar o trabalho
de Sinais sexta que vem". Hoje isso não tem onde morar — vira anotação solta
em nota, ou some. O parente mais próximo, `avaliacoes`, já carrega `data`
(resolução 10.14), mas é evento de **nota**, não de entrega: misturar os dois
bagunçaria a média e o calendário.

## Decisões de design

1. **Nota nunca mora na atividade.** `atividades.avaliacao_id` é ponteiro
   opcional para `avaliacoes`. Consequências: a regra de média (trigger
   `trg_atualizar_media_materia`) não muda uma linha; apagar avaliação faz a
   atividade perder o vínculo (`on delete set null`); apagar atividade nunca
   apaga avaliação.
2. **Status derivado na leitura.** `concluida_em` null = pendente (presença,
   não flag — padrão `conclusoes_fluxograma`); "atrasada" é calculada porque
   depende da passagem do tempo, sem nenhuma escrita na virada do dia — a
   mesma justificativa do momentum de Projetos (resolução 10.9).
3. **Período da matéria não filtra atividade.** `data_inicio`/`data_fim`
   cortam a rotina recorrente do fluxograma (10.38); atividade é data colada,
   como prova — aparece no calendário mesmo fora do semestre.
4. **`origem` prepara o email.** O enum `('manual','email')` nasce no CHECK
   desde já; a frente de captura de emails futura só preenche `origem` e
   `fonte_url`, sem migração de retrabalho.
5. **Atraso conta por dia.** `hora_entrega` posiciona o evento na agenda,
   mas a virada de "atrasada" acontece no fim do dia da `data_entrega`.
6. **Movimento no calendário é `'entidade'`** — arrastar a atividade na grade
   de mês grava a data nova direto na linha (mesmo contrato de
   `eventosAvaliacoes`, que emite `movimento: 'entidade'`).

## 1. Tipos (`features/estudos/types.ts`)

Após `npm run types:gen` (a migration precisa existir para `Tables<'atividades'>`
compilar), seguindo o padrão dos tipos existentes (estreitar colunas `text`
com CHECK):

```ts
export type OrigemAtividade = 'manual' | 'email'

/** Derivado na leitura — nunca gravado. */
export type StatusAtividade = 'pendente' | 'atrasada' | 'concluida'

export type Atividade = Omit<Tables<'atividades'>, 'origem'> & {
  origem: OrigemAtividade
}
```

## 2. Cálculos (`features/estudos/calculos.ts`)

Três funções puras novas; data de referência por parâmetro (convenção do
plano, seção 9). Comparações de data por string ISO, como
`dentroDoPeriodoMateria`.

```ts
statusAtividade(
  atividade: { dataEntrega: string; concluidaEm: string | null },
  hojeISO: string,
): StatusAtividade
// concluída vence atrasada (ordem das guardas); senão
// dataEntrega < hojeISO → 'atrasada'; senão 'pendente'.
// hojeISO é ISO date ('YYYY-MM-DD'), vinda de paraISO(new Date()).

proximaAtividade<T extends { dataEntrega: string; concluidaEm: string | null }>(
  atividades: readonly T[],
  hojeISO: string,
): { atividade: T; dias: number } | null
// Espelho de proximaAvaliacao (calculos.ts:203): ignora concluídas e datas
// passadas; menor data_entrega restante (hoje incluída, dias = 0);
// dias via differenceInCalendarDays. null sem candidatas.

atividadesAtrasadas(
  atividades: readonly { dataEntrega: string; concluidaEm: string | null }[],
  hojeISO: string,
): number
// Contagem de statusAtividade === 'atrasada' — alimenta o mini-card da Home.
```

Casos de teste (estilo dos 339 existentes em `calculos.test.ts`):

| Função | Casos |
| --- | --- |
| `statusAtividade` | concluída com data passada continua `concluida`; hoje = `pendente`; ontem sem conclusão = `atrasada`; amanhã = `pendente`; limite exato de dia |
| `proximaAtividade` | ignora passada; ignora concluída; inclui hoje (dias 0); escolhe a menor entre várias; null sem candidatas; null só com passadas/concluídas |
| `atividadesAtrasadas` | conta só atrasadas pendentes; zero com lista vazia |

## 3. Dados

### `features/estudos/api.ts` (CRUD — dono do dado)

```ts
listarAtividades(materiaId?: string): Promise<Atividade[]>
// Sem argumento: todas (hub e Home calculam em cima). Ordena data_entrega asc.

criarAtividade(nova: {
  materiaId: string; titulo: string; descricao?: string | null;
  dataEntrega: string; horaEntrega?: string | null; origem?: OrigemAtividade;
  fonteUrl?: string | null;
}): Promise<Atividade>

atualizarAtividade(id: string, patch: Partial<...>): Promise<Atividade>
excluirAtividade(id: string): Promise<void>
concluirAtividade(id: string): Promise<Atividade>   // concluida_em = now ISO
reabrirAtividade(id: string): Promise<Atividade>    // concluida_em = null

concluirComAvaliacao(
  id: string,
  opcao: { avaliacaoId: string } | { nova: { nome?: string; peso?: number } },
): Promise<Atividade>
// Duas escritas sequenciais com rollback: se o update da atividade falhar
// depois de criar a avaliação, apaga a avaliação criada (lição da 10.22).
// nova.nome default = título da atividade; data = data_entrega; nota = null.
```

### `features/estudos/hooks.ts`

Queries: `useAtividades(materiaId?: string)`. Mutations: `useCriarAtividade`,
`useAtualizarAtividade`, `useExcluirAtividade`, `useConcluirAtividade`,
`useReabrirAtividade`, `useConcluirComAvaliacao`. Todas invalidam
`['estudos']` e `['calendario']` (padrão `useMutationEstudos`).

## 4. Calendário

### `features/calendario/eventos.ts`

```ts
export interface FonteAtividade {
  id: string
  titulo: string
  data_entrega: string
  hora_entrega: string | null
  concluida_em: string | null
  materia_id: string
}
```

- `TipoEvento` ganha `| 'atividade'`; `TIPOS_IMPORTANTES` (linha 52) ganha
  `'atividade'` — é **prazo**, merece destaque na agenda como prova/conta.
- `ROTULO_TIPO` (linha 1177) ganha `atividade: 'Atividade'`.
- `FontesCalendario` ganha `atividades: readonly FonteAtividade[]`.

```ts
eventosAtividades(
  atividades: readonly FonteAtividade[],
  intervalo: Intervalo,
  nomePorMateria: ReadonlyMap<string, string>,
  corPorMateria: ReadonlyMap<string, string | null> = new Map(),
): EventoCalendario[]
```

Por linha, no padrão de `eventosAvaliacoes` (eventos.ts:379):

- `id: 'atividade:' + id`
- `titulo: materia ? titulo + ' — ' + materia : titulo`
- `inicio`: `data_entrega`; se `hora_entrega`, `data_entrega + 'T' + hora_entrega`
  (sem `fim` — entrega é ponto, não intervalo)
- `diaInteiro: hora_entrega === null`
- `camada: 'estudos'`, `tipo: 'atividade'`, `rota: '/estudos/' + materia_id`,
  `movimento: 'entidade'`
- `estado: concluida_em ? 'feito' : undefined`
- `cor` condicional quando a matéria tem cor

Em `construirEventos` (linha 1021), somar `...eventosAtividades(...)` ao
retorno — nenhuma reconciliação: atividade não compete com rotina (é prazo
único, sem irmã "realizada" — a conclusão é o próprio `estado: 'feito'`).

### `features/calendario/api.ts` + `hooks.ts`

- `atividadesNoIntervalo(de: string, ate: string)` — select
  `id, titulo, data_entrega, hora_entrega, concluida_em, materia_id`.
- `useFontesCalendario` ganha a query (mesmo tratamento de loading/disabled
  das fontes irmãs). `comCarga` **não** inclui atividade na faixa de carga:
  entrega é marca de prazo, não tempo comprometido.

### `componentes/DialogCriarNoDia.tsx`

Nova opção "Atividade" no menu de criar do dia: matéria (Select) + título +
hora opcional; usa `useCriarAtividade` de `features/estudos` (a página de
calendário é composição, pode importar feature).

## 5. Push (`app/supabase/functions/notificar/index.ts`)

Nova `candidatasEntrega(amanhaISO)` no padrão de `candidatasProva`
(index.ts:218):

```ts
supabase
  .from('atividades')
  .select('id, titulo, data_entrega, concluida_em, materia_id, materias(nome)')
  .eq('data_entrega', amanhaISO)
  .is('concluida_em', null)
```

→ `{ tipo: 'atividade', origemId: id, dataReferencia: amanhaISO,
titulo: 'Entrega amanhã', corpo: `${titulo} — ${nomeMateria}`,
rota: `/estudos/${materia_id}` }`. Entra na mesma janela diária das provas; o
dedup por `(tipo, origem_id, data_referencia)` já cobre o caso. O CHECK de
`notificacoes_enviadas.tipo` é ampliado na migration da feature.

## 6. UI

### `DialogAtividade` (novo, `features/estudos/componentes/`)

Formulário único criar/editar (padrão "um editor, não dois"): matéria
(Select; travada quando aberto de dentro da matéria), título, descrição,
data de entrega, hora opcional. Em edição: botão excluir com
`DialogConfirmarExclusao` dizendo o que se perde (título + data). Estado
manual, como os irmãos de Estudos — **não** adota RHF+Zod nesta feature
(os schemas mortos de `schemas.ts` seguem fora do escopo).

### `AbaAtividades` (nova 7ª aba da `MateriaDetalhePage`)

Lista agrupada por status, nessa ordem: **Atrasadas** (topo, destaque
vermelho), **Próximas** (contagem regressiva por item), **Concluídas**
(riscadas, no fim). Ações por item: check concluir / desfazer (reabre),
lápis editar, excluir. Item concluído ganha "Vincular avaliação…" → diálogo
com duas saídas: criar avaliação (nome = título, data = entrega) ou escolher
uma avaliação existente da matéria. Reabrir **mantém** o vínculo — a nota é
da avaliação, não da entrega.

### Hub `EstudosPage` — card "Entregas"

No padrão do card "Aulas de hoje": atrasadas em destaque no topo (com botão
de concluir), próximas entregas com dias restantes, link para a matéria.
Sem entregas próximas: linha "Nenhuma entrega próxima" (o vazio é resposta).
Fonte: `useAtividades()` sem filtro + `statusAtividade`/`proximaAtividade`.

### Home — mini-card Estudos

O valor principal (matérias em risco) não muda. Sub-linhas novas: "N
entregas atrasadas" (aciona `atencao`/`risco`) e "Próxima: título em Xd"
via `proximaAtividade`. Clique navega para a matéria.

## 7. Fora de escopo (deliberado)

- **Email** — `origem`/`fonte_url` nascem preparados; nada de captura.
- Deep-link `?aba=atividades` na rota (o evento do calendário abre a matéria
  na aba default; param de aba é follow-up barato, não entra no MVP).
- Push de atrasada (só o gatilho "1 dia antes", como decidido).
- `CardMateria` continua sem contagem de entrega (o card "Entregas" do hub
  responde; duas contagens no mesmo grid duplicariam a informação).

## 8. Rascunho da resolução 10.XX (vai para `plano.md` na implementação)

> **10.XX Atividades — entregas com prazo (feature Estudos)** — descoberta em uso.
> Entre prova (nota na média) e lista (registro pós-fato) não havia lugar para
> "entregar X até dia Y". Nova tabela `atividades`, com `data_entrega` obrigatória,
> `hora_entrega` opcional (informativa — atraso conta por dia), `concluida_em`
> como presença (null = pendente; apagar = reabrir) e `avaliacao_id` opcional:
> entregar pode criar/vincular uma avaliação, mas **nota nunca mora na atividade**
> — a média segue território exclusivo de `avaliacoes`. Status derivado na leitura
> (atrasada = pendente com data passada), sem trigger novo — mesma regra do
> momentum (10.9). Período da matéria não filtra atividade (data colada, como
> prova). `origem ('manual'|'email')` e `fonte_url` preparam a captura futura de
> emails sem retrabalho de schema. Integrações: prazo sólido no calendário
> (`tipo 'atividade'`, destaque como prova), card "Entregas" no hub, mini-card
> Estudos na Home e push 1 dia antes (`tipo 'atividade'` no dedup).
