# PDV (retaguarda web)

## Propósito

Venda rápida no browser, histórico e fechamento de caixa. O app Electron em `pdv/` é outro pacote: esta área é só o Next. O download do instalador aparece em Configurações, aba `pdv`.

## Rotas

- `/pdv` — `src/app/(pdv)/pdv/page.tsx` (grupo `(pdv)`, não `(auth)`)
- `/vendas-pdv` — histórico, dentro de `(auth)`
- `/fechamentos-caixa` — dentro de `(auth)`
- NFC-e pendente de caixa: `/nfce-pendentes` (consulta fiscal; ver [fiscal.md](fiscal.md))

Layout `(pdv)`: `ProtectedRoute` + `CaixaPdvProvider` + `CaixaBloqueioOverlay`.

## Services / hooks

- `src/hooks/use-caixa-pdv.tsx` — contexto do turno. Services: `fechamento-caixa.service.ts`, `venda-pdv-gourmet.service.ts`, `venda-pdv-item.service.ts`, `conta-mesa.service.ts`
- `src/services/terminal-pdv.service.ts`, `src/services/pdv-updates.service.ts`
- `src/services/produtos.service.ts` — a página `/pdv` lista `["produtos", empresa.id, { inativo: 0 }]`
- `src/hooks/use-nfce-ambiente-pdv.ts` — `["nfce-config-pdv", empresa.id]`
- `src/services/nfce.service.ts` — vendas que emitem cupom
- Pagamento: `src/components/pdv/pagamento-pdv-dialog.tsx` lê `["tipos-documento-financeiro-pdv-aprazo"]`, `["entidades-clientes-pdv"]`, `["condicoes-pagamento-pdv"]`
- Schema de terminal: `terminal-pdv.schema.ts`
- Número do PDV: `getNumeropdv` em `src/lib/gourmet-utils.ts` (usado pelo caixa)

## Estado compartilhado

- `["caixa-pdv-aberto", empresa.id, numeropdv]` — abrir/fechar invalida o prefixo `["caixa-pdv-aberto"]` e `["fechamentos-caixa"]`.
- O **mesmo** `CaixaPdvProvider` envolve `/gourmet`. Fechar o caixa numa tela destrava ou bloqueia a outra.
- Overlay de caixa bloqueia a venda com o caixa fechado (`caixa-bloqueio-overlay` no layout).
- Histórico `/vendas-pdv` e fechamentos leem o que o caixa gravou. Chave de listagem de fechamento: conferir `["fechamentos-caixa"]` (invalidação confirmada; a query da página inclui empresa e filtros).

## Permissões / guards

- Garçom pode `/pdv`, `/vendas-pdv` e `/fechamentos-caixa` (`GARCOM_ALLOWED_ROUTES`).
- Não há feature específica de PDV em `REGRAS_ACESSO_ROTAS`.
- Terminais e séries NFC-e são configurados em `/configuracoes` (aba NFC-e e seção de terminais, queries `["terminais-pdv"]`, `["nfce-series"]`).

## O que não remover

- Provider de caixa no layout `(pdv)` e no `(gourmet)`.
- Checagem de empresa antes de listar produto.
- Ambiente NFC-e (`use-nfce-ambiente-pdv`) na hora de emitir. Homologação vs produção não é detalhe visual.
- Diálogo de pagamento ligado a condição, cliente e tipo de documento a prazo.

## Regressões típicas

- Mover `/pdv` para dentro de `(auth)` e ganhar sidebar/abas em cima da venda, ou perder o `CaixaPdvProvider`.
- Invalidar caixa só com `empresa.id` diferente do `numeropdv` e o overlay continua no turno errado.
- Tratar venda web e venda Electron como o mesmo código. O service de update (`pdv-updates.service.ts`) e a aba de download são a ponte; a lógica do caixa local do Electron não mora aqui.
