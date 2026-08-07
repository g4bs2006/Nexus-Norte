create table public.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data date not null,
  hora_inicio time null,
  hora_fim time null,
  created_at timestamptz not null default now(),
  constraint eventos_calendario_horario_coerente check (
    (hora_inicio is null and hora_fim is null)
    or (hora_inicio is not null and hora_fim is not null and hora_fim > hora_inicio)
  )
);
create index eventos_calendario_data_idx on public.eventos_calendario (data);
comment on table public.eventos_calendario is
  'Compromisso avulso sem pilar (dentista, reuniao...). Unica tabela que o Calendario possui de verdade -- todo o resto e agregado de outros pilares (plano 6.1).';
