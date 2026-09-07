# Financeiro Caixa — estado da entrega

## Implementação e validação

- Branch local: `codex/financeiro-horizonte`; sem commit ou push nesta entrega.
- Horizonte diário, eventos unificados, cartões, vínculo por ocorrência, saldo de referência e simulação implementados.
- Projeção mensal usa a agregação do motor diário; calendário e notificações usam a expansão/conciliação compartilhada.
- `npm test`: 28 arquivos, 651 testes aprovados.
- Typecheck e build de produção aprovados. Lint executado sem erros, com avisos de React no projeto. Build mantém avisos de chunks grandes e configuração PWA depreciada.
- SQL de preflight executado em transação com rollback antes da migração, incluindo ciclo do cartão, snapshot preservado e validação dos vínculos.
- Navegador: Financeiro e Planejamento carregados com o banco migrado; simulação de 600 em 3x comparada com à vista e 6x; campo de parcelas apagado sem queda da tela. Nenhum lançamento ou cenário de teste foi salvo pela interface.

## Banco remoto

Projeto verificado: `sqxudasfvxmdfqjtdpmx` (Nexus Norte).

Migration `20260906000001` aplicada e registrada junto ao reset em uma transação. Os 70 lançamentos antigos foram excluídos conforme autorização; não foi criado backup de recuperação nem importador CSV. Uma eventual reconstrução do histórico depende dos arquivos do usuário.

Conferência antes/depois: lançamentos 70 → 0; padrões 6 recorrentes + 2 parcelamentos → 8 eventos; categorias 17 → 17; matérias 6 → 6; treinos 6 → 6; projetos 2 → 2.

Função `notificar` atualizada para versão 9, status ACTIVE, preservando a autenticação existente por segredo do cron. O envio efetivo de push não foi disparado manualmente para teste.

## Limites e próximo passo

- O frontend público **não foi publicado**. A versão anterior do site ainda consulta tabelas substituídas: usar a versão local até publicar este código.
- Referência de saldo e cartões devem ser preenchidos pelo usuário; não inventados. Sem referência, a interface mostra valores relativos a zero.
- Orçamento e colchões são configurações locais do navegador. Sem histórico, informar orçamento manual.
- Home mantém o resumo anterior por competência, conforme o recorte da especificação; o Horizonte está no Financeiro.
- QA visual feito no viewport disponível, não em uma matriz completa de dispositivos. Persistência dos contratos verificada no SQL; não foi feito um ciclo completo de CRUD pela interface com dados reais.
- As superfícies substituídas estão em `app/arquivado/financeiro-anterior`; os testes históricos de cálculo continuam preservados.
