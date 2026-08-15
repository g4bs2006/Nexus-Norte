-- =============================================================================
-- Bucket de imagens das notas (plano de usabilidade — 15/08)
--
-- Colar um print no meio da nota vira `![](url)` no Markdown. Para isso a URL
-- precisa ser ESTÁVEL, e é aí que o bucket existente não serve.
--
-- `documentos-estudos` é privado, servido por URL assinada de 10 minutos. Numa
-- nota isso seria duplamente ruim:
--
--   - o link morre em 10 minutos e a nota passa a mostrar imagem quebrada;
--   - o `.md` exportado sai com URL morta — e a exportação é a única rede
--     contra perda de dado que o sistema tem (resolução 10.0). Entregá-la
--     furada anula o propósito dela.
--
-- Então este bucket é público. O caminho é por UUID, então a URL não se
-- adivinha, mas quem a tiver vê a imagem.
--
-- Sobre a postura de segurança: o sistema já roda sem autenticação, com RLS
-- desabilitado e a publishable key no bundle. Uma imagem em bucket público com
-- caminho UUID não é o elo fraco daqui — mas é uma porta a mais, e fica
-- registrado em vez de escondido.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imagens-notas',
  'imagens-notas',
  true,
  -- 10 MB: print de slide e foto de quadro cabem com folga, e o limite existe
  -- para um arrastar acidental de vídeo não virar upload de 200 MB.
  10485760,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- =============================================================================
-- Políticas
--
-- O Storage exige política mesmo com o bucket público: `public` libera a
-- LEITURA pela URL, não a escrita. Sem as duas de baixo, colar uma imagem
-- falharia com "new row violates row-level security policy".
--
-- São permissivas na mesma medida que o resto do sistema — não faria sentido
-- trancar o Storage num app onde as 47 tabelas estão abertas.
-- =============================================================================

drop policy if exists "imagens_notas_leitura" on storage.objects;
create policy "imagens_notas_leitura"
  on storage.objects for select
  using (bucket_id = 'imagens-notas');

drop policy if exists "imagens_notas_escrita" on storage.objects;
create policy "imagens_notas_escrita"
  on storage.objects for insert
  with check (bucket_id = 'imagens-notas');

-- Apagar a imagem é caso real: colou a errada, corrige. Sem isto ela ficaria
-- ocupando espaço para sempre depois de sair do texto.
drop policy if exists "imagens_notas_exclusao" on storage.objects;
create policy "imagens_notas_exclusao"
  on storage.objects for delete
  using (bucket_id = 'imagens-notas');
