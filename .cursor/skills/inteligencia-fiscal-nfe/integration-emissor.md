# Integração com o emissor Mais Gestão

## Gancho

Após normalizar itens (GTIN, PIS/COFINS informado, CEST, lotes) e **antes** de montar o payload do gateway:

- [`api/src/service/nfe-emissao/preparar-payload-emissao-nfe-venda.ts`](../../../api/src/service/nfe-emissao/preparar-payload-emissao-nfe-venda.ts)
- Caminho de transmissão reusa o mesmo preparar, então o bloqueio vale para emitir e retransmitir.

Função: `avaliarEmissaoFiscalService` em `api/src/service/fiscal/`.

Fora do bloqueio: `emitir-nfe-homologacao-teste` (payload sintético).

## Defaults silenciosos

No fluxo real de venda **não** preencher CFOP `5102` nem CSOSN `102` quando o item não trouxer tributação. Ausência vira pendência e bloqueia.

Defaults permanecem só no payload de teste de homologação em `contexto-emissao-nfe.ts`.

## Persistência

Cada avaliação grava `auditoriafiscalnfe` (relatório JSON + classificação + id da nota quando já existir).

## Confirmação de regra

CRUD `/regras-fiscais`. `POST /regras-fiscais/:id/validar` exige fontes e responsável. Sem `status=validado` o motor não confirma ST/DIFAL.

Tela: `/tributos/regras-fiscais`.
