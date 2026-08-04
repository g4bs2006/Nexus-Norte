-- =============================================================================
-- Fase 2 — Estudos (plano, seção 3.1 / 3.2 + resoluções 10.3, 10.5, 10.6, 10.7)
--
-- Resolução 10.14 (nova): `avaliacoes` não tinha coluna de data, mas
-- `dias_para_proxima_avaliacao` (3.2) e as provas no Calendário (6.1) dependem
-- dela. Adicionada `data date null` (null = avaliação sem data marcada).
-- =============================================================================

create table public.materias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  professor text,
  carga_horaria_total int check (carga_horaria_total > 0),
  limite_faltas int not null default 0 check (limite_faltas >= 0),
  semestre text,
  -- Campo-resumo mantido por trigger (plano 3.2 + resolução 10.9).
  -- Null quando não há nota lançada nem nota manual definida.
  media_atual numeric,
  created_at timestamptz not null default now()
);

comment on column public.materias.media_atual is
  'Campo-resumo mantido por trigger. Recalculado ao mexer em avaliacoes ou em config_calculo_media.';

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  tipo text not null check (
    tipo in ('lista', 'livro', 'anotacao', 'ementa', 'prova_anterior')
  ),
  nome text not null,
  -- Caminho no bucket documentos-estudos (resolução 10.10)
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index documentos_materia_idx on public.documentos (materia_id, tipo);

create table public.faltas (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  data date not null,
  motivo text
);

create index faltas_materia_idx on public.faltas (materia_id, data desc);

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  nome text not null,
  peso numeric not null check (peso > 0),
  -- Null = ainda não realizada / sem nota lançada
  nota numeric check (nota >= 0),
  -- Resolução 10.14: null = data ainda não marcada
  data date,
  created_at timestamptz not null default now()
);

create index avaliacoes_materia_idx on public.avaliacoes (materia_id);
create index avaliacoes_data_idx on public.avaliacoes (data)
  where data is not null;

create table public.config_calculo_media (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null unique references public.materias (id) on delete cascade,
  tipo text not null check (tipo in ('ponderada', 'manual')),
  nota_manual numeric check (nota_manual >= 0),
  observacao text,

  -- Média manual exige a nota; ponderada não usa nota_manual
  constraint config_media_coerente check (
    (tipo = 'manual' and nota_manual is not null)
    or (tipo = 'ponderada' and nota_manual is null)
  )
);

create table public.registro_listas (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  nome_lista text not null,
  data date not null,
  total_questoes int not null check (total_questoes > 0),
  -- Resolução 10.7: array nativo em vez de texto "4,7"
  questoes_erradas int[] not null default '{}',
  topico text,
  created_at timestamptz not null default now()
);

create index registro_listas_materia_idx
  on public.registro_listas (materia_id, data desc);

create table public.sessoes_estudo (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  data date not null,
  duracao_minutos int not null check (duracao_minutos > 0),
  -- Meta de referência do dia, guardada junto para preservar o histórico:
  -- mudar a meta hoje não deve reescrever o julgamento de sessões passadas.
  meta_diaria_minutos int check (meta_diaria_minutos > 0),
  created_at timestamptz not null default now()
);

create index sessoes_estudo_materia_idx
  on public.sessoes_estudo (materia_id, data desc);
create index sessoes_estudo_data_idx on public.sessoes_estudo (data desc);

-- =============================================================================
-- Fluxograma semanal (resoluções 10.5 e 10.6 + nota 10.13)
--
-- Criado aqui, não na Fase 0: com FKs reais depende de `materias`. A Fase 3
-- torna materia_id nullable, adiciona treino_id e o check constraint final.
--
-- Guarda o PADRÃO semanal; a expansão em ocorrências datadas é feita no
-- cliente (resolução 10.5).
-- =============================================================================

create table public.fluxograma_semanal (
  id uuid primary key default gen_random_uuid(),
  -- 0 = domingo … 6 = sábado (convenção de Date.getDay())
  dia_semana smallint not null check (dia_semana between 0 and 6),
  materia_id uuid not null references public.materias (id) on delete cascade,
  horario_inicio time not null,
  horario_fim time not null,

  constraint fluxograma_horario_valido check (horario_fim > horario_inicio)
);

create index fluxograma_dia_idx on public.fluxograma_semanal (dia_semana);

-- Exceções pontuais: cancelar/remarcar uma ocorrência sem afetar as outras
-- semanas (resolução 10.5).
create table public.excecoes_fluxograma (
  id uuid primary key default gen_random_uuid(),
  fluxograma_id uuid not null
    references public.fluxograma_semanal (id) on delete cascade,
  data date not null,
  status text not null check (status in ('cancelado', 'remarcado')),

  unique (fluxograma_id, data)
);

-- =============================================================================
-- Campo-resumo media_atual via trigger (plano 3.2)
-- =============================================================================

create or replace function public.calcular_media_materia(p_materia_id uuid)
returns numeric
language plpgsql
stable
as $$
declare
  v_tipo text;
  v_nota_manual numeric;
  v_media numeric;
begin
  select tipo, nota_manual
    into v_tipo, v_nota_manual
    from public.config_calculo_media
   where materia_id = p_materia_id;

  -- Sem configuração explícita, o padrão é média ponderada (plano 3.2)
  if v_tipo = 'manual' then
    return v_nota_manual;
  end if;

  -- Ponderada apenas sobre avaliações com nota lançada: incluir as pendentes
  -- como zero puxaria a média para baixo e faria toda matéria começar
  -- reprovada.
  select sum(nota * peso) / sum(peso)
    into v_media
    from public.avaliacoes
   where materia_id = p_materia_id
     and nota is not null;

  return v_media;
end;
$$;

create or replace function public.trg_atualizar_media_materia()
returns trigger
language plpgsql
as $$
declare
  v_materia_id uuid;
begin
  v_materia_id := coalesce(new.materia_id, old.materia_id);

  update public.materias
     set media_atual = public.calcular_media_materia(v_materia_id)
   where id = v_materia_id;

  -- UPDATE que troca a matéria precisa recalcular a antiga também
  if tg_op = 'UPDATE' and old.materia_id is distinct from new.materia_id then
    update public.materias
       set media_atual = public.calcular_media_materia(old.materia_id)
     where id = old.materia_id;
  end if;

  return null;
end;
$$;

create trigger avaliacoes_media
after insert or update or delete on public.avaliacoes
for each row execute function public.trg_atualizar_media_materia();

-- Mudar o modo de cálculo (ponderada <-> manual) também muda a média
create trigger config_media_atualiza_media
after insert or update or delete on public.config_calculo_media
for each row execute function public.trg_atualizar_media_materia();

-- =============================================================================
-- Storage: bucket de documentos (resolução 10.10)
--
-- Bucket privado. Sem autenticação, o acesso é liberado ao role `anon` via
-- policy explícita — storage.objects tem RLS habilitado por padrão, então sem
-- policy o upload falharia. Mesma dívida técnica registrada em 10.8.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('documentos-estudos', 'documentos-estudos', false)
on conflict (id) do nothing;

create policy "anon acessa documentos-estudos"
  on storage.objects
  for all
  to anon
  using (bucket_id = 'documentos-estudos')
  with check (bucket_id = 'documentos-estudos');
