# LAN e POS

## Propósito no caixa

O PDV principal expõe HTTP na rede local para o POS Android (`POSmaisgestao/`) e para outro PDV em modo secundário. Caixa, NFC-e e outbox continuam neste desktop. O tablet não abre o Postgres e não chama a API no lugar do PDV.

## Onde vive

- **Main:** `electron/lan-api/server.ts` (sobe em `electron/main.ts` com `startLanServer` / `restartLanServer` depois do `initDb`), `firewall.ts`, `imagens.ts`, `qr-pos.ts`, `ips.ts`, `config-pos.ts`.
- **Fachada:** os handlers chamam `localApi` (`electron/local-api/index.ts`).
- **Renderer:** `src/ui/components/pos-connection-dialog.tsx` mostra IP, porta e QR. Não implementa o servidor.
- **SQL:** nenhum schema só da LAN. Identidade e token de terminal usam `config` (`pdv_identificador` e o registro em `electron/pdv-secundario/registro.ts`).

Escuta `0.0.0.0` na porta `lan_porta`. Seed: habilitada (`lan_habilitada = 1`) e porta `5050`.

Rotas públicas (sem Bearer): `GET /pos/health`, `POST /pos/login`, `GET /pos/pdv/identidade`, `GET /pos/pdv/terminais`, `POST /pos/pdv/handshake`.

O restante exige Bearer. O token vale se for token de terminal (`tokenTerminalValido`) ou o token da `sessao` do operador.

Rotas confirmadas no servidor (além das públicas): `GET /pos/pdv/config-negocio`, `GET /pos/pdv/catalogo`, `POST /pos/vendas/rapida`, `GET /pos/vendas`, `POST /pos/nfce/sincronizar`, `GET /pos/vendas/:id`, retransmitir, inutilizar, cancelar e cancelar não fiscal. Há mais rotas de mesa/conta no mesmo arquivo; não duplique a lista sem reler `server.ts`.

`GET /pos/pdv/catalogo` devolve o cache local, não a API.

## Contrato com a API

A LAN não é a API. O POS fala com o PDV. O PDV fala com a API pela outbox quando a venda é gravada no principal.

`POST /pos/login` usa o mesmo login de e-mail da retaguarda (através da local-api). Sem internet o login novo falha; sessão já aberta no desktop segue.

Firewall: `garantirRegraFirewall` tenta liberar a porta. Falha de firewall deixa o POS sem conexão e o caixa local intacto.

## Dados locais que não podem ser apagados no schema

Os da venda, mesa e catálogo, porque a LAN grava neles via `localApi`. Não crie tabela paralela de venda para o POS.

Token de terminal e `pdv_identificador` em `config`. Apagar o identificador faz o handshake tratar o aparelho como outro terminal.

## Comportamento offline/outbox

POS offline em relação à nuvem continua vendendo se alcançar o PDV na LAN. A fila é a do desktop principal.

Simplificar a LAN para o POS chamar a API direto tira a venda do Postgres do caixa: NFC-e, numeração e turno deixam de ser únicos.

Desligar `lan_habilitada` no principal isola POS e PDVs secundários. O caixa deste computador segue.

## Configuração crítica

- `lan_habilitada`, `lan_porta`.
- `pdv_modo` precisa ser `principal` para servir. Com `secundario`, `startLanServer` fecha o servidor e devolve `motivo: "PDV secundário não expõe API LAN"`.
- `pdv_identificador`.
- Tokens de aparelho no principal: chaves `pdv_terminais` e `pos_terminais_lan` (`electron/pdv-secundario/registro.ts`).

Não documente o token devolvido no handshake.

## O que quebra na operação da loja se remover

- Servidor LAN: maquininha e PDV secundário param de lançar mesa e venda. O balcão neste PC segue.
- Autenticação Bearer: qualquer um na rede opera o caixa.
- Catálogo pela LAN: o POS vende preço/produto velho ou nenhum, conforme o cache.
- Duplicar numeração NFC-e no POS: dois emissores para o mesmo `numeropdv`. O desenho atual deixa a NFC-e no PDV.
