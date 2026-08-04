-- =============================================================================
-- Resolução 10.15 (nova) — descoberta na Fase 2
--
-- As seções 3.4 e 4.4 pedem check diário "derivado do fluxograma, com toggle de
-- concluído". A derivação resolve QUAIS itens aparecem no dia, mas o estado de
-- conclusão precisa ser persistido em algum lugar — e `checks_diarios` só tem
-- os campos do Financeiro.
--
-- Modelado como presença: existir a linha significa "concluído". Desmarcar
-- apaga a linha, em vez de gravar `false`. Assim a tabela só cresce com o que
-- de fato aconteceu, e não pré-gera registros para todo dia do calendário —
-- coerente com a decisão de não materializar a recorrência (resolução 10.5).
-- =============================================================================

create table public.conclusoes_fluxograma (
  id uuid primary key default gen_random_uuid(),
  fluxograma_id uuid not null
    references public.fluxograma_semanal (id) on delete cascade,
  data date not null,
  created_at timestamptz not null default now(),

  unique (fluxograma_id, data)
);

create index conclusoes_fluxograma_data_idx
  on public.conclusoes_fluxograma (data desc);

comment on table public.conclusoes_fluxograma is
  'Presença = concluído. Desmarcar remove a linha (resolução 10.15).';
