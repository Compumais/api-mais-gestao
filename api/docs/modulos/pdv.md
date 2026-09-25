# PDV

## Propósito no produto

Terminais, venda de frente de caixa (incluindo gourmet/mesa), fechamento, atalhos, catálogo e atualização do instalador do PDV híbrido. A NFC-e em si está no módulo de emissão; aqui fica a venda e o vínculo com o caixa.

## Pastas e entrypoints

| Plugin | Prefixo | Auth |
| --- | --- | --- |
| `src/controllers/http/terminal-pdv/rotas.ts` | `/terminais-pdv`, `GET /empresas/:id/pdv-fiscal` | `verifyJwt` |
| `src/controllers/http/venda-pdv-gourmet/rotas.ts` | `/vendas-pdv-gourmet` (+ `identidade-local`, `/:id/cancelar`) | `verifyJwt` |
| `src/controllers/http/venda-pdv-item/rotas.ts` | `/vendas-pdv-item` | `verifyJwt` |
| `src/controllers/http/fechamento-caixa/rotas.ts` | `/fechamentos-caixa` | `verifyJwt` |
| `src/controllers/http/atalho-pdv/rotas.ts` | `GET\|PUT /atalhos-pdv` | `verifyJwt` |
| `src/controllers/http/conta-mesa/rotas.ts` | `/contas-mesa` (+ `/:id/fatia-itens`) | `verifyJwt` + módulo `gourmet` |
| `src/controllers/http/conta-mesa-item/rotas.ts` | `/contas-mesa-item` | `verifyJwt` (sem `requireModulo` no arquivo lido) |
| `src/controllers/http/pdv-updates/rotas.ts` | `GET /pdv/updates/version.json`, `GET /pdv/updates/:arquivo` | público, sem JWT |

Services: `src/service/terminal-pdv/`, `venda-pdv-gourmet/`, `venda-pdv-item/`, `fechamento-caixa/`, `atalho-pdv/`, `conta-mesa/`, `conta-mesa-item/`, `pdv-updates/`.

Schema: `drizzle/tables/terminal-pdv.ts`, `vendas-pdv-gourmet.ts`, `venda-pdv-item.ts`, `venda-pdv-pagamento.ts`, `fechamento-caixa.ts`, `atalho-pdv.ts`, `conta-mesa.ts`, `conta-mesa-item.ts`.

Reconciliação fiscal do caixa: `src/repositories/reconciliacao-nfce-pdv-repositories.ts` e `POST /nfce/pdv/reconciliar`.

Garçom pode usar vendas, itens, mesas, fechamento, saldos e movimentos (`verificar-acesso-garcom.ts`).

## Contratos externos

PDV Electron (híbrido): catálogo `GET /produtos/catalogo-pdv`, venda com `identidade-local` (idempotência do sync), baixa `POST /estoque/baixa-venda`, NFC-e e auto-update público.

Web usa as mesmas rotas de gestão (listar vendas, fechar caixa). POS Android: não confirmado nas rotas.

Auto-update: o PDV baixa manifesto e artefato sem login. O handler restringe o nome do arquivo; não transformar `/:arquivo` em download arbitrário do servidor.

## Configuração crítica

- `PDV_UPDATES_PATH` — diretório de `version.json` e Setup. Comentário no `.env.example`: padrão operacional `/opt/mais-gestao/pdv-updates`. O service também tem fallback embutido (`src/service/pdv-updates/obter-manifesto-update-pdv.ts`).
- Módulo SaaS `gourmet` na conta mesa. Itens de mesa e grupos gourmet não repetem esse hook.

## Invariantes

- `GET /vendas-pdv-gourmet/identidade-local` existe para o PDV não duplicar venda já sincronizada. Não remover.
- Cancelamento de venda não fiscal é rota própria (`POST /vendas-pdv-gourmet/:id/cancelar`), distinta de cancelar NFC-e. Marca `cancelada` na venda e some da listagem padrão.
- Homologação NFC-e (`ambiente = 2`): não gera financeiro/caixa nem baixa de estoque; vendas com NFC-e de homologação ficam fora do histórico operacional `/vendas-pdv` e do fechamento de caixa.
- Fechamento de caixa consolida o período do terminal. Apagar fechamento não desfaz venda nem nota.
- Pagamentos ficam em `venda-pdv-pagamento` e podem gerar lançamento (ver `src/util/lancamento-pagamento-pdv.test.ts`).
- `GET /empresas/:id/pdv-fiscal` devolve a configuração que o terminal precisa para emitir. Está com `logLevel: silent`.
- Fatia de conta (`fechar-fatia-itens`) rejeita fatia inválida (`FATIA_INVALIDA`).

## O que quebra se alterar ou apagar

- Sync offline do PDV (identidade local, reconciliação NFC-e, contingência).
- Auto-update: instaladores deixam de ser servidos se a rota pública ganhar JWT ou o path sumir.
- Caixa cego/fechamento e atalhos de tela.
- Gourmet: mesa some para o plano, mas item de mesa continuaria acessível se só a conta mesa tiver o módulo — não “corrigir” isso sem decisão de produto; o código está assim.
- Estoque, se a baixa de venda ou a complementação fiscal for removida.

## Dependências de outros módulos da API

Produtos, estoque, emissão NFC-e, financeiro (pagamento), empresas, usuários (garçom).

## Testes relacionados

- `src/service/venda-pdv-gourmet/cancelar-venda-nao-fiscal-pdv.test.ts`
- `src/service/nfce-emissao/reconciliar-nfce-pdv.test.ts`
- `src/service/nfce-emissao/retransmitir-nfce-venda-pdv.test.ts`
- `src/service/estoque/complementar-baixa-fiscal-venda-pdv.test.ts`
- `src/util/lancamento-pagamento-pdv.test.ts`
