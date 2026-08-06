-- =============================================================================
-- Agendamento das notificações push (discussão em uso, 06/08)
--
-- `pg_cron` chama a Edge Function `notificar` a cada 5 minutos via `pg_net`
-- (HTTP assíncrono dentro do próprio Postgres — não precisa de servidor
-- externo nenhum). O segredo de autenticação NÃO está neste arquivo: vem de
-- `vault.decrypted_secrets` em tempo de execução. Este arquivo é seguro pra
-- versionar — não contém nenhum valor sensível, só a referência pelo nome.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'notificar-push',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://sqxudasfvxmdfqjtdpmx.supabase.co/functions/v1/notificar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
