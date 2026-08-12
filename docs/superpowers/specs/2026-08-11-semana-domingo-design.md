# Semana começando no domingo — design

**Data:** 2026-08-11
**Status:** aprovado para planejamento
**Contexto:** segundo dos três specs decididos na conversa de 2026-08-09. O spec 1 (blocos
fixos) está entregue e deixou este item registrado em "Fora de escopo"
(`2026-08-09-blocos-fixos-design.md:192-213`). Este spec exige migration; o spec 3
(vigência da recorrência) continua adiado.

## Problema

O spec 1 virou o início da semana para domingo **apenas nas três vistas do Calendário**
(`GradeMes:151`, `CalendarioPage:95` e `:244`). O resto do sistema continua na segunda-feira,
por seis caminhos independentes:

- `lib/datas.ts:47` — `inicioSemana`, com `weekStartsOn: 1`
- `lib/locale.ts:14` — `setDefaultOptions({ weekStartsOn: 1 })`
- `features/financeiro/periodos.ts:51` — `startOfWeek(hoje, { weekStartsOn: 1 })` cru, a
  única cópia da regra fora do helper
- `features/metas/calculos.ts:32-33`, `pages/HomePage.tsx:101`, `pages/treino/TreinoPage.tsx:59`
  e `pages/financeiro/FinanceiroPage.tsx:65` — consumidores de `inicioSemana`

E a ordem de exibição dos dias está copiada como `[1, 2, 3, 4, 5, 6, 0]` em cinco arquivos,
apesar de o spec 1 ter criado `lib/fluxograma.ts` com `ORDEM_DIAS_SEMANA` e consolidado três
deles.

Conviver com duas semanas é o defeito que o commit `63f3544` já corrigiu numa escala menor:
um controle que promete uma coisa e a tela mostra outra. Trocar de aba não pode mudar onde
a semana começa.

## Decisão de escopo

**Vira em tudo, sem exceção** — ordem de exibição e fronteira da semana, incluindo o
`planejamento_semanal_financeiro` (com migration), o preset "Esta semana" da lista de
lançamentos, as metas semanais, a frequência de treino, a Home e o locale padrão. O sistema
passa a ter uma semana só.

**Isto revoga uma decisão escrita do spec 1.** Aquele spec argumentou que a ordem dos dias
do fluxograma ficaria em segunda-primeiro porque "o fluxograma é configuração de rotina, não
visualização de calendário" (`2026-08-09-blocos-fixos-design.md:107-110`). O argumento é
coerente, mas perde para o custo de manter duas ordens: elas se encontram dentro do
`GradePlanejamentoSemanal`, que é grade de rotina *e* de calendário ao mesmo tempo — deriva a
data de cada coluna de `inicio + indice` (`:125-135`). Uma constante só, domingo-primeiro.

## Consequência aceita: os contadores semanais zeram no domingo

Hoje o domingo é o **último** dia da semana, então metas semanais, frequência de treino e os
contadores da Home chegam nele no auge — 5/5. Depois da virada, o domingo é o **primeiro**
dia e abre em 0/5.

Não é bug e não tem mitigação: é o significado de mudar a fronteira. Está aqui para que a
primeira ocorrência não seja confundida com perda de dado.

## Restrição transversal: mobile

Toda alteração é desenhada separadamente para o celular. Neste spec isso muda exatamente uma
decisão concreta — a rolagem automática da grade do planejamento (seção 4) — e revela uma
exceção conhecida à régua de 44px (seção 6). O resto da mudança é de ordem e de âncora, sem
efeito de layout: as oito grades já iteram sobre uma constante, e muda a ordem, não a
quantidade nem o tamanho.

## 1. Ordem de exibição — uma constante só

`lib/fluxograma.ts:11` vira:

```ts
export const ORDEM_DIAS_SEMANA = [0, 1, 2, 3, 4, 5, 6] as const
```

O comentário acima dela registra a decisão nova e o porquê da revogação — sem isso, quem ler
o spec 1 depois vai achar que a constante regrediu por descuido.

As cinco cópias locais somem e passam a importar daqui:

| Arquivo | Linha |
|---|---|
| `pages/calendario/RitualSemanalPage.tsx` | 40 |
| `features/sono/componentes/DialogSono.tsx` | 34 |
| `features/treino/componentes/DialogFluxogramaTreino.tsx` | 26 |
| `features/estudos/componentes/DialogFluxograma.tsx` | 41 |
| `features/financeiro/componentes/GradePlanejamentoSemanal.tsx` | 23 |

Os três já consolidados pelo spec 1 — `GradeFluxograma`, `DialogFluxogramaLivre` e
`ListaBlocosFixos` — herdam a nova ordem sem nenhuma edição.

`DIAS_SEMANA` (`lib/constants.ts:101-109`) **não muda**: é indexado por `dia_semana` com
0 = domingo, então funciona nas duas ordens.

O comentário de `GradePlanejamentoSemanal:18-22` afirma que "`semana_inicio` é sempre a
segunda-feira". Vira falso com a migration da seção 3 e precisa ser **reescrito**, não
apagado — é a única documentação da relação entre a chave da tabela e o desenho da grade.

## 2. Fronteira da semana — um helper só

- `lib/datas.ts:46-48` — `inicioSemana` passa a `weekStartsOn: 0`; o comentário deixa de
  dizer "Segunda-feira".
- `lib/datas.ts:50-60` — `inicioSemanaCalendario` é **apagada**. Vira idêntica a
  `inicioSemana`, e seu comentário documenta uma divergência que deixa de existir. Manter as
  duas é garantir que voltem a divergir.
- `pages/calendario/CalendarioPage.tsx:31`, `:91` e `:244` — passam a importar `inicioSemana`.
- `features/financeiro/periodos.ts:51` — `startOfWeek(hoje, { weekStartsOn: 1 })` vira
  `inicioSemana(hoje)`. Deixar a cópia solta é garantir que o preset "Esta semana" divirja do
  resto na próxima mudança.
- `lib/locale.ts:14` — `weekStartsOn: 0`. O comentário de 8-10 é reescrito: o alerta continua
  válido, mas o motivo inverte.

Herdam a virada sem edição: `features/metas/calculos.ts:32-33`, `pages/financeiro/FinanceiroPage.tsx:65`,
`pages/HomePage.tsx:101` e `pages/treino/TreinoPage.tsx:59`.

**Decisão: `weekStartsOn` continua explícito nos helpers**, em vez de depender do default do
`locale.ts`. A redundância é intencional — o comentário em `locale.ts:8-10` existe porque um
default implícito já causou desalinhamento antes. Apagar a redundância removeria o para-raios.

**A virada é inteiramente cliente.** Nenhuma função, trigger ou view do Postgres depende do
início da semana: não há `date_trunc('week')` em nenhuma das 24 migrations. A única exceção é
a tabela da seção 3, e ela guarda a âncora como dado, não a calcula.

## 3. Migration do planejamento financeiro

`planejamento_semanal_financeiro` é a única tabela chaveada por semana
(`20260804000002_fase1_financeiro.sql:78-88`). Todo o resto do sistema deriva a semana de um
intervalo de datas na hora, então esta é a única migration necessária.

Arquivo novo `app/supabase/migrations/20260811000001_semana_comeca_no_domingo.sql`:

```sql
-- Semana passa a começar no domingo (spec 2). `semana_inicio` guarda o
-- primeiro dia da semana, então toda linha precisa da nova âncora.
--
-- O domingo não anda junto com o resto: numa semana ancorada na segunda M, o
-- domingo é M+6 e FECHA a semana; com semanas em domingo, esse mesmo dia ABRE
-- a semana M+6. Um `- 1 day` cego o jogaria sete dias para trás.
update public.planejamento_semanal_financeiro
set semana_inicio = case
  when dia_semana = 0 then semana_inicio + 6
  else semana_inicio - 1
end;
```

O spec 1 previa um `- interval '1 day'` simples e aceitava como ressalva que as entradas de
domingo ficassem uma semana fora do lugar. A ressalva era desnecessária: o `case` acerta
todas, e nenhuma entrada muda de dia real — o que foi planejado para o domingo dia 15
continua no domingo dia 15.

O `unique (semana_inicio, dia_semana, categoria_id)` sobrevive: a semana `M+6` passa a conter
o domingo vindo da semana antiga `M` e os dias 1–6 vindos da semana antiga `M+7` — chaves
distintas, sem colisão.

### Verificação

Rodar **antes e depois**; o total tem que ser idêntico (a migration move linhas, não cria nem
apaga):

```sql
select count(*) from public.planejamento_semanal_financeiro;
```

**Só `count(*)` é invariante.** `count(distinct semana_inicio)` pode mudar legitimamente: uma
semana que só tinha entrada de domingo se esvazia, e esse domingo pode aterrissar numa semana
que já existia. Comparar o número de semanas produziria alarme falso.

E, **só depois**, a checagem que prova que a âncora está correta — nenhuma linha pode ter
`semana_inicio` fora do domingo, e o dia real de cada entrada tem que continuar batendo com
seu `dia_semana`:

```sql
select count(*) from public.planejamento_semanal_financeiro
where extract(dow from semana_inicio) <> 0
   or extract(dow from semana_inicio + dia_semana) <> dia_semana;
-- esperado: 0
```

### Ordem de execução

A migration roda **antes** do deploy do cliente. Invertido, o app novo procura por domingos
numa tabela ainda chaveada em segundas e o planejamento existente some da tela até a migration
rodar.

A migration **não é idempotente** — rodar duas vezes desloca duas vezes. A segunda consulta de
verificação é o que detecta isso.

## 4. Ritual na semana atual

`RitualSemanalPage:61-65` passa a usar `inicioSemana(hoje)`, sem o `addDays(…, 7)`, e a
variável deixa de se chamar `proximaSemana`. O comentário de 61-62 ("Sempre a PRÓXIMA
semana") é reescrito com o motivo novo: com domingo abrindo a semana, o ritual feito no
domingo planeja de hoje até sábado — "próxima" e "atual" coincidem no domingo, e abrir no meio
da semana passa a corrigir a semana em curso em vez de pular para a seguinte.

O Ritual não tem seletor de semana; as setas de `:152` e `:161` navegam entre os quatro
passos. Não há nada além dessa linha para mudar na escolha da semana.

### Dias já vividos

Critério `paraISO(dia) < hojeISO`: opacidade reduzida, **campos continuam habilitados**. O
plano de um dia pode mudar depois do fato, e travar o campo impediria justamente a correção
que motiva abrir o ritual numa quarta.

Vale nos passos **Rotina**, **Estudo e treino** e **Financeiro**.

**Não vale no passo Sono.** `planejamento_sono` é chaveado só por `dia_semana`, sem data
(`20260804000001_fase0_base_transversal.sql:32`, com `unique` no dia). É configuração de
rotina permanente — não existe "domingo passado" ali.

### Decisão de mobile: rolar até hoje

`GradePlanejamentoSemanal` é uma tabela de sete colunas com `overflow-x-auto` e inputs de
`w-20` (`:118-119` e `:160`). Aberta numa quarta no celular, as colunas visíveis são domingo e
segunda — dias já vividos. O usuário abre o ritual e vê o que não pode mais planejar.

A célula de hoje ganha um `ref` e um efeito de montagem com
`scrollIntoView({ inline: 'start', block: 'nearest' })`.

O `block: 'nearest'` é obrigatório: sem ele o navegador rola a página verticalmente também,
jogando o cabeçalho do ritual para fora da tela. No desktop, onde a tabela não transborda, é
um no-op — nenhum código condicional de largura é necessário.

As grades dos passos Rotina e Estudo/Treino são listas verticais de dias: só o esmaecido, sem
rolagem automática.

## 5. Testes

Dois arquivos novos, ambos de função pura:

- `lib/datas.test.ts` — `inicioSemana` cai no domingo anterior a partir de uma quarta; devolve
  o próprio dia quando recebe um domingo; volta seis dias a partir de um sábado.
- `features/financeiro/periodos.test.ts` — o preset `'semana'` devolve domingo→sábado.

Um teste existente muda: `features/metas/calculos.test.ts:5` e `:42-52`. O comentário fixa "a
semana (seg-dom) vai de 08-03 a 08-09" e os casos rotulam `08-02` como "fora (semana
anterior)" e `08-09` como "domingo — dentro". Os dois invertem: com `HOJE = 2026-08-05`
(quarta), a semana passa a ser `08-02`→`08-08`. Reescrever os rótulos junto com as datas — um
teste cujo comentário mente é pior que teste nenhum.

Os testes de `carga`, `eventos`, `planejador`, `recorrencia` e `canceladas` não dependem da
fronteira da semana e devem passar sem edição. **Se algum quebrar, é sinal de acoplamento não
mapeado neste spec: investigar antes de ajustar o teste.**

## 6. Fora de escopo

Herdados do spec 1, sem mudança:

- **Cor para matérias** — precisa de `alter table` + regeneração de tipos.
- **Vigência da recorrência semanal** — `fluxograma_semanal` sem `data_inicio`/`data_fim`;
  toda regra é eterna nos dois sentidos e polui o Histórico. Próximo spec.
- **Recorrência para eventos avulsos** — `eventos_calendario` guarda data única; precisa de
  desenho próprio (RRULE de verdade *versus* regra de fluxograma com rótulo).
- **Promover Trabalho a pilar** — descartado; outro sistema cobre essa necessidade.

Novo, descoberto durante este design:

- **Altura dos inputs de `GradePlanejamentoSemanal`.** São `h-8` (32px), abaixo da régua de
  44px. Fica como está, deliberadamente: numa grade de sete colunas por categoria, 44px de
  altura por célula tornaria a tabela alta demais para uma tela de celular, e o alvo aqui é
  campo de digitação, não botão. Registrar como exceção conhecida em comentário, para não ser
  "corrigido" depois sem contexto.
