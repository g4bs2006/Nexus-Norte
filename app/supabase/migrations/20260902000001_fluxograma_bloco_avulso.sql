-- Bloco de trabalho avulso: a linha vale só para uma data, não toda semana
-- (chat 2026-09-02). Até aqui, todo bloco criado em fluxograma_semanal virava
-- padrão recorrente por dia_semana — inclusive o que nascia do arrasto na
-- grade de Horas, que parece "só hoje" e virava compromisso pra sempre.
--
-- `data`, quando preenchida, restringe a ocorrência a essa data específica.
-- `dia_semana` continua obrigatório (deriva da própria data) para não quebrar
-- o agrupamento por dia que a página de Blocos fixos já faz.
--
-- Restrito a bloco livre (rotulo not null): aula é recorrente por natureza e
-- já tem seu próprio caminho para uma data avulsa (sessoes_estudo_planejadas).
alter table public.fluxograma_semanal
  add column data date;

alter table public.fluxograma_semanal
  add constraint fluxograma_avulso_so_rotulo check (data is null or rotulo is not null);

comment on column public.fluxograma_semanal.data is
  'Bloco avulso (chat 2026-09-02): a linha vale só para esta data, não toda semana. Nula = padrão recorrente, o comportamento de sempre.';
