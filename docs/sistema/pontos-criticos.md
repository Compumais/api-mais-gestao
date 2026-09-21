# Pontos críticos

Configuração e fluxo que um agente não remove nem “simplifica”. Cada item diz por que existe, onde mora e o que acontece se sair.

## Multi-empresa e isolamento

**Por que existe.** O produto é SaaS multi-empresa. O README da API lista as tabelas `empresas` e `usuario_empresas` e a regra de validar se o usuário pode agir sobre a empresa.

**Onde mora.**

- Rotas: `api/src/controllers/http/empresas/`
- Checagem usada pelos services: `verificarUsuarioPertenceEmpresa` em `api/src/repositories/entidade-repositories.ts` (importada por plano de contas, financeiro, DAV, venda PDV, fechamento de caixa, emissão de NF-e, entre outros)
- Contexto privilegiado de acesso: `api/src/repositories/controle-acesso-contexto.ts` (`set_config('app.controle_acesso_autorizado', ...)` dentro de transação)
- Web: seleção de empresa nos hooks `web/src/hooks/use-empresa.ts` e `use-empresas-usuario.ts`

O desenho completo de RLS no PostgreSQL não foi confirmado neste levantamento. Não apague a checagem de pertencimento nem o `set_config` por não ter visto a policy.

**Se remover.** Um usuário passa a ler ou gravar dados de outra empresa. Emissão, estoque e financeiro vazam entre tenants.

## Better Auth

**Por que existe.** Autenticação e sessão do SaaS. O README da API exclui só `/health` e `/api/auth/*` da exigência de JWT. Papéis citados no mesmo README: proprietario e financeiro.

**Onde mora.**

- API: `api/src/lib/auth.ts` (caminho indicado no README da API) e `api/src/controllers/http/auth/`
- Web: dependência `better-auth` e regra em `web/.cursor/rules/front-end.mdc` e `security.mdc` (sessão centralizada, rota privada por layout ou middleware)
- POS: README descreve login Better Auth e seleção de empresa
- Variáveis (só nomes): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. `infra/README.md` alerta que `CLIENT_ORIGIN` é a URL do frontend; sem isso o login trava por CORS

**Se remover.** Login, sessão e o vínculo com a empresa deixam de existir. Trocar por outro autenticador sem pedido quebra web, POS e PDV ao mesmo tempo (o PDV exige internet na primeira autenticação).

## Migrations Drizzle

**Por que existe.** O schema do PostgreSQL da API é versionado. Produção aplica o arquivo da versão antes de reiniciar a API (README da raiz). O `up.sh` aplica migrations nesse fluxo.

**Onde mora.**

- SQL e journal: `api/drizzle/`
- Config: `api/drizzle.config.ts`
- Aplicação pendente: `api/package.json` script `db:migrate` → `api/scripts/aplicar-migrations-pendentes.ts`
- CI de testes sobe Postgres 17, não substitui a migration de produção

**Se remover.** A API sobe contra um schema velho ou o `up.sh` falha no meio. Não rode migration genérica “por suposição” e não apague arquivos SQL já aplicados. Não use `db:migrate:reset` como atalho de limpeza.

## Financeiro

**Por que existe.** É o núcleo descrito no README da API: plano de contas, contas a pagar e receber, contas correntes e lançamentos.

**Onde mora.** `api/src/controllers/http/financeiro/`, `financeirolancamento/`, `plano-contas/`, `conta-contabil/`, `contacorrente/`, `conta-corrente-lancamento/`, `centro-custo/`. Telas em `web/src/app/(auth)/contas-pagar/`, `contas-receber/`, `plano-contas/`, `contas-correntes/`, `movimentacoes/`. Services: `web/src/services/financeiro.service.ts` e afins.

**Se remover.** Some o razão do SaaS. Nota fiscal e PDV que geram título financeiro ficam sem destino. Auditoria relacionada está em `api/src/controllers/http/auditoria/` e na tabela `audit_logs` citada no README.

## Estoque e custo

**Por que existe.** Venda de PDV, nota de entrada e produção movimentam saldo. O README do PDV cita baixa em `/estoque/baixa-venda`.

**Onde mora.** `api/src/controllers/http/estoque/`, `saldo-estoque/`, `movimento-estoque/`, `local-estoque/`, `custo-produto/`. Serviços de custo em `api/src/service/custo-produto/`. Web: `web/src/app/(auth)/estoque/` e `web/src/services/movimento-estoque.service.ts`, `saldo-estoque.service.ts`, `custo-produto.service.ts`.

**Se remover.** Venda e entrada de nota deixam de baixar ou entrar mercadoria. Custo médio da compra deixa de alimentar a emissão e os relatórios.

## NF-e, NFC-e, NFS-e e obrigações

**Por que existe.** Emissão e escrituração não são um CRUD. A regra do monorepo manda olhar `api/`, `web/`, `pdv/` e `api_Nfe/` juntos. Skills fiscais ficam em `.cursor/skills/` (emissão, entrada, inteligência NF-e, SINTEGRA).

**Onde mora.**

- Emissão e documento: `api/src/controllers/http/nfe-emissao/`, `nfe-configuracao/`, `nfe-serie/`, `nfe-inbound/`, `nota-fiscal/`, `nfce/`, `nfce-configuracao/`, `nfse-emissao/`, `nfse-configuracao/`, `nfse-serie/`, `certificado-digital/`, `operacao-fiscal/`, `regra-fiscal/`, `parametrizacao-tributos/`, `cfop/`, `sintegra/`, `efd-icms/`
- Cliente SEFAZ: `api/src/lib/nfe-gateway-client.ts` e `api_Nfe/nfe-gateway/`
- NFS-e municipal: `api_Nfe/nfse-gateway/`
- PDV: `pdv/electron/fiscal/` (online, contingência, numeração, XML) e sync em `pdv/electron/sync/nfce-retaguarda.ts`, `reconciliar-nfce.ts`
- Web: `web/src/app/(auth)/nota-fiscal-venda/`, `nota-fiscal-compra/`, `nota-fiscal-servico/`, `nfce/`, `nfce-pendentes/`, `tributos/`, `certificados-digitais/`

**Se remover.** A API deixa de falar com a SEFAZ ou com a prefeitura. Contingência do PDV (`tpEmis=9` e `POST /nfce/contingencia/transmitir`) perde o caminho de transmissão. Numeração, XML e estoque divergem. Não substitua o gateway PHP por chamada SEFAZ escrita na API.

## Sync offline do PDV

**Por que existe.** O caixa opera com a API fora e envia a fila depois, em ordem, com idempotência.

**Onde mora.** `pdv/electron/db/schema.ts` (tabela `outbox`), `pdv/electron/sync/outbox.ts`, `pdv/electron/db/database.ts` (colunas e índice único), `pdv/electron/api/client.ts`. Testes: `pdv/package.json` script `test:nfce-sync`.

**Se remover.** Venda, caixa e NFC-e feitos offline não chegam na retaguarda, ou chegam duplicados. O PostgreSQL local não é cache descartável.

## Instalador e versão do PDV

**Por que existe.** O desktop Windows é distribuído por instalador, com PostgreSQL local embutido no fluxo Inno Setup, e se atualiza sozinho consultando a API.

**Onde mora.**

- Versão do app: `pdv/package.json` (`version`)
- Scripts: `pack:win`, `pack:iss`, `pack:release` em `pdv/package.json`
- Manifesto gerado: `pdv/installer/output/version.json` (README)
- Fallback na API: `api/src/data/pdv-updates/version.json` e rotas `api/src/controllers/http/pdv-updates/` (`GET /pdv/updates/version.json` e `GET /pdv/updates/:arquivo`)
- Checagem no app: `pdv/electron/update/verificar-update.ts`
- Publicação: `pdv/scripts/publicar-update-pdv.ps1`. Pasta na VPS citada: `/opt/mais-gestao/pdv-updates`

O README do PDV descreve a regra do setup: pacote mais antigo é recusado; mesma versão repara arquivos; versão mais nova atualiza o aplicativo e preserva o PostgreSQL e os dados. O `up.sh` não republica PDV nem POS.

**Se remover.** O PDV instalado não acha atualização, ou um setup novo apaga o banco do caixa. Não alinhe “simplificar” apagando `version.json`, a rota pública de update ou o bump do `pack:release`.

## CI por pacote

**Por que existe.** API e Web têm lint, build e (na API) teste com Postgres antes do merge. O filtro é por pasta, para o monorepo não tratar tudo como um único app.

**Onde mora.** `.github/workflows/ci.yml`. Biome na raiz: `biome.json`, scripts `check` e `format`.

**Se remover.** Mudança em `api/` ou `web/` entra sem build. Não estenda o CI “apagando o filtro de paths” de um jeito que misture install da API (npm) com o da Web (pnpm). PDV e POS fora desse arquivo é o estado confirmado, não um esquecimento para corrigir sem pedido.

## Deploy manual

**Por que existe.** Produção não acompanha o git sozinha. O README da raiz diz que push não implanta e que workflow com nome de deploy não é o fluxo operacional atual.

**Onde mora.** `up.sh` na raiz; detalhes em `README.md` e `infra/README.md`. Processos citados: PM2 `api-mais-gestao` e `web-mais-gestao`. Web de produção usa `pnpm run build:live`.

**Se remover.** O agente passa a achar que merge em `main` publica a VPS, ou reinicia a Web com `next build` solto e derruba chunks no ar. Não apague `build:live` nem troque a ordem migration → API → Web documentada no README.
