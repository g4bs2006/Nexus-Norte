# Financeiro: caixa, eventos e Horizonte

Arquitetura aprovada na conversa: substituição direta, histórico de lançamentos descartável, sem importador CSV. Preservar os demais pilares e categorias. Reset financeiro é operação explícita separada da migration estrutural, evitando repetir o reset em ambientes já atualizados. Não usar CASCADE no reset.

## Contratos

- `data` continua competência. `data_caixa` é snapshot calculado no insert e quando data, forma de pagamento ou cartão mudarem; edição do cartão nunca reprocessa lançamentos.
- `cartoes`: id, nome, dia_fechamento, dia_vencimento, created_at. Ciclo (fechamento anterior, fechamento atual]; vencimento <= fechamento pertence ao mês seguinte. Clamp de dias ao fim do mês.
- `eventos_financeiros_previstos`: id, descricao, categoria_id, data_inicio, dia_mes, termino_tipo (`indefinido`, `data`, `parcelas`), data_fim, valor, valor_total, numero_parcelas, juros_mensal, created_at. Eventos expressam datas de caixa; parcelas têm valor_total e quantidade; demais têm valor por ocorrência. Sem tabelas filhas. Constraints de período, término e valores. Valores monetários calculados em centavos.
- `lancamentos.evento_id` FK restrict + `competencia_evento` date, ambas nulas ou ambas preenchidas. Competência da ocorrência é sua data original de vencimento, não a data efetiva do pagamento. Categoria do lançamento deve corresponder ao evento. Múltiplos pagamentos são permitidos: saldo previsto restante = max(0, previsto - soma vinculada). Pagamento excedente permanece real integralmente.
- Eventos vencidos não pagos são apresentados como pendentes e projetados para hoje, identificados como vencidos; não somar novamente no histórico. Ocorrências anteriores ao saldo de referência são excluídas: a reconciliação é o novo marco de caixa; a UI explica este recorte.
- Faturas são agrupamentos dos lançamentos por cartão e data_caixa, sem tabela própria e sem lançamento adicional de fatura. Créditos futuros já registrados entram como movimentos conhecidos, sem depender do corte hoje.
- Reconciliação: saldo no início do dia informado; empate de data resolvido por created_at e id. Sem referência, mostrar pedido de saldo inicial e saldo relativo explicitamente. Sem histórico, orçamento variável mensal manual (default zero, aviso visível). Média dos 3 meses fechados é sugestão, nunca precisão implícita. Diário usa dias do mês de cada dia projetado, e hoje desconta gastos variáveis reais não vinculados já ocorridos.
- Janela inicial 60 dias, seletor 30/60/90/180. Colchões editáveis, inicialmente 0, solicitando configuração antes de interpretar conforto. Configurações persistidas no navegador por ser single-user; referência persistida no banco.
- Dia carrega movimentos discriminados (`real`, `previsto`, `variavel`, `simulacao`) e origem agregada `real | projetado | misto`. Retirada é simulada uma única vez; propagação pela recorrência do saldo, sem persistência.
- Projeção mensal e simulador consomem o mesmo motor de eventos/caixa. Manter visão de seis meses e comparação de cenários, cortes e variante pessimista. Sugestão de investimento permanece na regra atual.

## Superfícies

Financeiro: saldo hoje, menor saldo até a próxima receita, mini-timeline expansível com tabela/lista diária e detalhe dos movimentos, referência de saldo e simulação de retirada. Planejamento: um formulário de evento, lista unificada, cartões e projeção mensal. Lançamento: cartão obrigatório no crédito, prévia da data de caixa, vínculo com ocorrência. Calendário e notificações passam a ler eventos unificados. Ritual semanal aponta para revisão do Horizonte; grade financeira antiga arquivada.

## Validação

Testar ciclos de cartão em fechamento, mês curto e virada do ano; centavos/PMT; eventos finitos; pagamento antecipado, parcial e excedente; fatura futura sem duplicação; saldo inicial e propagação; variável em meses diferentes; simulação imutável; fronteiras do semáforo. Executar Vitest, typecheck real (`tsc -b`), lint, build e verificar UI quando houver navegador e servidor disponíveis. Migration e reset remoto só podem ser declarados aplicados com evidência do banco correto.
