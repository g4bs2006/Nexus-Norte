# Financeiro Caixa Implementation Plan

**Goal:** substituir o planejamento fragmentado por eventos unificados e Horizonte diário.
**Architecture:** tabela persistida única, snapshots de caixa e motor puro compartilhado entre projeção e simulação.
**Tech Stack:** React, TypeScript, Supabase, Vitest.
**Spec:** `docs/superpowers/specs/2026-09-06-financeiro-caixa-design.md`.

## Global Constraints

Sem importador CSV. Histórico de lançamentos descartável mediante reset explícito. Preservar demais pilares. Categoria segue por competência. Fatura derivada. Português brasileiro e CampoDecimal nos valores.

## Task 1: schema e contrato de dados

- [ ] Migration: cartões, eventos unificados, referência, snapshot, FK ocorrência; remover tabelas antigas após conversão dos seus padrões para tabela única.
- [ ] Script separado de reset apenas de lançamentos, com DELETE para disparar campos-resumo; sem CASCADE.
- [ ] Tipos do banco compatíveis com migration e contratos de domínio novos.
- [ ] Verificar SQL contra banco local se runtime disponível; registrar limite quando não houver PostgreSQL.

## Task 2: motor puro

- [ ] Testes de ciclo, expansão, conciliação, Horizonte e simulação falhando antes da implementação.
- [ ] Implementar `calcularDataCaixa(data, cartao)`, `expandirEventos(eventos, de, ate)` e `projetarHorizonteDiario(params)`.
- [ ] Origem dos movimentos e faturas sem duplicação, saldo em centavos, orçamento mensal dividido pelo tamanho real do mês.
- [ ] Agregação mensal sobre o mesmo motor; testes focados verdes.

## Task 3: persistência e interface

- [ ] APIs/hooks novos e paginação de lançamentos usados no motor.
- [ ] Formulário único de evento, cadastro de cartão, lançamento com cartão/vínculo e referência de saldo.
- [ ] Horizonte responsivo, detalhe, seletor de janela, orçamento/colchões e retirada simulada.
- [ ] Adaptar projeção mensal/simulador, calendário, notificações, Home e ritual semanal; arquivar superfícies substituídas.

## Task 4: entrega e revisão

- [ ] Testes completos, lint, typecheck e build.
- [ ] Revisão de contratos e consumidores; correção de regressões.
- [ ] Aplicar migration/reset somente com acesso verificável ao projeto correto; registrar qualquer impedimento externo.
- [ ] Relatório final distingue implementação local, validação e banco remoto.
