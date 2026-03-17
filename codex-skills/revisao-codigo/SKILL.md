---
name: revisao-codigo
description: Revisão de código e PR review com foco em corretude, segurança, performance, legibilidade e testes. Use quando o pedido envolver "revisar código", "code review", "revisar PR/MR", "analisar diff/commit", "auditar segurança", "apontar melhorias", "refatorar com sugestões", ou quando for necessário produzir um checklist de revisão + comentários por arquivo/linha.
---

# Revisão de Código

## Objetivo

Produzir uma revisão objetiva e acionável: identificar riscos e bugs, sugerir melhorias, e quando fizer sentido propor patches pequenos e seguros.

## Antes de revisar (coletar contexto)

- Identificar a unidade de mudança: PR/MR, branch, commit(s) ou lista de arquivos.
- Entender o comportamento esperado: requisito, ticket, descrição do PR, exemplos de entrada/saída.
- Ler instruções do repo (ex.: `AGENTS.md`, `README`, convenções de lint/format/test).

## Workflow recomendado

1) Mapear o escopo
- Listar arquivos alterados e tipo de mudança (feature, bugfix, refactor, infra).
- Identificar áreas sensíveis: auth, pagamentos, permissões, dados pessoais, jobs, migrações, integrações.

2) Checar corretude
- Fluxos principais e alternativos; validações; valores nulos/undefined; datas/timezones; concorrência; idempotência.
- Tratamento de erro: mensagens, códigos, retries, timeouts, circuit breaker (se aplicável).

3) Checar segurança (mínimo)
- Entrada do usuário: validação/sanitização, injeção (SQL/NoSQL), SSRF, path traversal, deserialização.
- Autenticação/autorização: quem pode fazer o quê, escopo de permissões, checagens no servidor.
- Segredos: evitar logar tokens/chaves/PII; conferir variáveis de ambiente e arquivos de configuração.

4) Checar performance e confiabilidade
- N+1, loops com I/O, queries sem índice/paginação, alocações grandes, processamento síncrono pesado.
- Cache, rate limit, backoff; limites (payload, paginação); observabilidade (logs/métricas/tracing).

5) Checar legibilidade e manutenção
- Nomes e responsabilidades; funções longas; duplicação; complexidade acidental.
- APIs internas consistentes; tipos/contratos claros; comentários apenas quando agregam.

6) Checar testes e DX
- Testes cobrindo caminhos críticos e bordas; mocks coerentes; determinismo (tempo/aleatoriedade).
- Se não houver testes, sugerir pelo menos 1 teste de regressão para o bug/risco mais provável.

## Como apresentar achados (formato)

Use uma lista priorizada. Para cada item:

- **Prioridade**: P0 (bloqueia), P1 (alto), P2 (médio), P3 (baixo/nit)
- **Confiança**: baixa/média/alta (ou 0–1)
- **Local**: arquivo e linha (quando possível)
- **Problema**: 1–2 frases
- **Impacto**: o que pode quebrar / risco
- **Sugestão**: ação concreta; incluir patch pequeno quando for claro e seguro

Se o ambiente suportar comentários inline, preferir um comentário por achado com referência precisa de arquivo/linha (ex.: via diretiva `::code-comment{...}`).

## Comandos úteis (sugestões)

- `git status`, `git diff`, `git diff --name-only`
- `rg "TODO|FIXME|HACK"`, `rg "eval\(|exec\(|SELECT \*"` (ajustar ao stack)
- Rodar testes/lint/format do projeto quando disponível
