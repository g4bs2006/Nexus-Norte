-- =============================================================================
-- Remarcação de ocorrência do fluxograma (resolução 10.19)
--
-- `excecoes_fluxograma` já distinguia 'cancelado' de 'remarcado', mas
-- 'remarcado' não tinha PARA ONDE: só dizia "este dia saiu do padrão". Sem
-- destino, o calendário não conseguia mover a ocorrência e a UI não tinha o que
-- perguntar ao usuário — o status existia sem significado utilizável.
--
-- As três colunas são anuláveis porque 'cancelado' não as usa. Os CHECKs abaixo
-- são o que impede os estados incoerentes; sem eles a regra ficaria só no
-- formulário, e qualquer escrita fora da UI poderia gravar um 'remarcado' sem
-- destino que a expansão da recorrência descartaria em silêncio.
-- =============================================================================

alter table public.excecoes_fluxograma
  add column nova_data date,
  add column novo_horario_inicio time,
  add column novo_horario_fim time;

-- Coerência entre status e destino
alter table public.excecoes_fluxograma
  add constraint excecoes_fluxograma_destino_coerente check (
    case status
      when 'remarcado' then nova_data is not null
      when 'cancelado' then
        nova_data is null
        and novo_horario_inicio is null
        and novo_horario_fim is null
      else false
    end
  );

-- Horário parcial não faz sentido: ou os dois, ou nenhum (herda o do padrão)
alter table public.excecoes_fluxograma
  add constraint excecoes_fluxograma_horario_completo check (
    (novo_horario_inicio is null) = (novo_horario_fim is null)
  );

alter table public.excecoes_fluxograma
  add constraint excecoes_fluxograma_horario_ordem check (
    novo_horario_inicio is null or novo_horario_fim > novo_horario_inicio
  );

-- A leitura busca exceções pela data ORIGINAL e pela nova, para que uma
-- ocorrência empurrada de 31/07 para 02/08 apareça ao olhar agosto
create index if not exists idx_excecoes_fluxograma_nova_data
  on public.excecoes_fluxograma (nova_data)
  where nova_data is not null;

comment on column public.excecoes_fluxograma.nova_data is
  'Destino da remarcação. Nulo quando status = cancelado.';
