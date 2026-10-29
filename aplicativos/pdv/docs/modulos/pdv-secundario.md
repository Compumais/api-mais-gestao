# PDV secundário

## Propósito no caixa

Um segundo computador opera com o número de PDV dele, mas a venda, o caixa, a NFC-e e a outbox ficam no PDV principal. O secundário não é outro emissor fiscal.

## Onde vive

- **Main:** `electron/pdv-secundario/regras.ts` (o que copia e o que é local), `cliente.ts` (HTTP para o principal), `servico.ts` (conexão e sync periódico), `registro.ts` (handshake e token no principal), `operacoes-remoto.ts` (venda/NFC-e remotas).
- **Renderer:** `select-numero-pdv.tsx`, `aviso-secundario.tsx`, config de modo/host. Guards de caixa continuam valendo conforme o status que o principal devolve.
- **SQL:** o secundário tem Postgres local para config, cache de catálogo e identidade. A venda confirmada no código de `localApi.criarVendaRapida` vai para `/pos/vendas/rapida` do principal quando `pdv_modo = secundario`.

`ehSecundario()` lê `pdv_modo`. Default do seed: `principal`.

Número do secundário não pode colidir com o principal nem com outro terminal já conectado (`NumeroPdvDuplicadoError`). Terminais ocupados vêm de `GET /pos/pdv/terminais`.

`CHAVES_CONFIG_LOCAL` nunca é copiada do principal (impressora, certificado, SiTef, banco, token, `numeropdv`). `CHAVES_CONFIG_NEGOCIO` é mesclada (`mesclarConfigNegocio`).

O timer de 20 s chama `sincronizarSecundarioPeriodico` antes do `processarOutbox` local.

## Contrato com a API

Dois contratos:

1. Com o **principal**, na LAN (não é a API do ERP): `GET /pos/pdv/identidade`, `GET /pos/pdv/terminais`, `POST /pos/pdv/handshake`, `GET /pos/pdv/config-negocio`, `GET /pos/pdv/catalogo`, e as rotas de venda/NFC-e em `operacoes-remoto.ts`.
2. Com a **API do ERP**: no principal, pela outbox. No secundário, `enviarParaRetaguarda` e `transmitirTodasNfcePendentes` lançam erro pedindo para sincronizar no principal.

Login do operador ainda pode usar `api_url` no próprio processo (**o secundário também tem `api_url` em `CHAVES_CONFIG_NEGOCIO`**, então a URL é copiada). A venda não deve ser postada daqui.

## Dados locais que não podem ser apagados no schema

No principal: venda, caixa, `numeracao_nfce`, `outbox`. São a fonte.

No secundário: `pdv_identificador`, `pdv_principal_token`, `numeropdv`, `pdv_modo`, `pdv_principal_host`, `pdv_principal_porta`. Sem token o handshake precisa ser refeito. Sem identificador o principal vê um terminal novo e pode recusar o número.

Não apague no principal as chaves `pdv_terminais` e `pos_terminais_lan` (`electron/pdv-secundario/registro.ts`). `tokenTerminalValido` lê esses JSON. Sem elas o Bearer do secundário e do POS deixa de valer.

## Comportamento offline/outbox

Principal fora da LAN: `PrincipalOfflineError`. O secundário não abre um caixa fiscal paralelo. Não grave venda “temporária” no banco do secundário: ao voltar a rede haveria dois cupons ou um cupom sem número.

`processarOutbox` no secundário ainda roda. Se alguém enfileirar `criar_venda` lá, esse Postgres tenta falar com a API e fura a numeração do principal. O caminho suportado é não enfileirar venda no secundário.

Simplificar o secundário para “outro PDV completo com a mesma série” duplica NFC-e.

## Configuração crítica

- `pdv_modo` (`principal` | `secundario`).
- `pdv_principal_host`, `pdv_principal_porta` (default de porta no cliente: a mesma ideia da LAN, seed `5050`).
- `pdv_identificador`, `pdv_principal_token`.
- `numeropdv` local, escolhido entre os livres.
- `terminais_pdv_json` no principal (cache; também `GET /terminais-pdv` na API via `electron/sync/terminais-pdv.ts`).

Chaves de negócio copiadas incluem `emitir_nfce` e `api_url`. Chaves locais de certificado no secundário não emitem no lugar do principal.

## O que quebra na operação da loja se remover

- Handshake: o segundo caixa não autentica e não lança pedido.
- Trava de número duplicado: dois terminais emitem a mesma série.
- Atalho de venda no banco do secundário: o ERP recebe cupom fora do turno/número do principal, ou não recebe e o operador acha que vendeu.
- Copiar `CHAVES_CONFIG_LOCAL`: impressora, certificado e senha gerencial de uma máquina vazam ou apontam para hardware que não existe na outra.
