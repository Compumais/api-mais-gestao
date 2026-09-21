# Impressão

## Propósito no caixa

Imprime DANFC-e, cupom não fiscal, comprovante de caixa e pedido de produção (cozinha) nas impressoras do Windows ou em rede (porta crua, default de seed `9100`). A falha de impressão não desfaz a venda: `imprimirCupomNaoFiscalSeguro` engole o erro.

## Onde vive

- **Main:** `electron/impressora/` (`danfce.ts`, `danfce-xml.ts`, `danfce-layout.ts`, `danfce-html.ts`, `escpos.ts`, `destino.ts`, `producao.ts`, `pedido-producao-layout.ts`, `comprovante-caixa.ts`, `cupom-pagamentos.ts`, `fonte-impressao.ts`).
- **Renderer:** escolhe impressora na config; não monta ESC/POS.
- **SQL:** destino por grupo em `impressora_grupo_gourmet` (`impressora_nome`, `destino`, `host`, `porta`). O restante é chave em `config`.

Rejeição de NFC-e: a local-api imprime cupom não fiscal e não dispara produção/pedido quando `fiscal.modo === "erro"`.

## Contrato com a API

Nenhum POST de impressão. O QR e a URL de consulta saem de `electron/fiscal/nfce-portais.ts` (UF do emitente). Emitente offline vem de `emitente_danfce_json`, preenchido em `sincronizarFiscalPdv`.

## Dados locais que não podem ser apagados no schema

`impressora_grupo_gourmet` e as colunas de destino. Sem isso todo grupo cai na impressora única.

Para reimprimir DANFC-e de contingência o XML precisa continuar em `nfce_local.xml` ou em `userData/xml-nfce`.

## Comportamento offline/outbox

Impressão não entra na outbox. Simplificar o sync não muda a impressora. O que muda é a falta de XML/QR se a NFC-e deixar de ser gravada localmente: o operador fica sem via do consumidor até a autorização.

Cupom não fiscal imprime com os dados da `venda` e de `pagamento` locais.

## Configuração crítica

- Cupom/DANFC-e: `impressora_nome`, `impressora_tipo` (`sistema`, `rede` ou arquivo — o tipo arquivo aparece em `destino.ts`), `impressora_host`, `impressora_porta`, `impressora_fonte`.
- Produção: `impressao_producao_modo`, `impressao_producao_imprimir_grupo`, `impressao_producao_formato_item` (seed `quantidade`), `impressora_pedido_tipo`, `impressora_pedido_nome`, `impressora_pedido_host`, `impressora_pedido_porta`.
- `pix_chave` no comprovante.
- `emitente_danfce_json`.

Não há fila de reimpressão automática se a impressora estiver desligada no momento do fechamento (**não confirmado** spool persistente além do que o Windows guarda).

## O que quebra na operação da loja se remover

- DANFC-e: a venda pode existir e a NFC-e autorizar, mas o cliente não recebe o cupom fiscal. Em vários estados isso impede a operação legal do caixa. O código trata a impressão como obrigatória na prática do fluxo, embora o `catch` não reverta a venda.
- Mapa por grupo gourmet: pedido sai na impressora errada ou em nenhuma.
- Comprovante de fechamento: o operador não confere o turno no papel. O `caixa_turno` continua gravado.
