# Mais Gestão

Monorepo da plataforma SaaS multi-empresa **Mais Gestão** para controle financeiro, contábil, comercial, estoque e fiscal. Os pacotes principais são:

- `api/`: API Node.js/Fastify e migrações Drizzle/PostgreSQL;
- `web/`: aplicação Next.js (App Router);
- `aplicativos/pdv/`: PDV desktop híbrido (Electron + React + PostgreSQL local);
- `aplicativos/POSmaisgestao/`: aplicativo Android POS para maquininhas;
- `aplicativos/NFeMaisGestao/`: aplicativo Android nativo para NF-e;
- `aplicativos/estacao-balanca/`: estação Flutter (Windows/Android) de pesagem Prix e lançamento em comandas via LAN do PDV;
- `aplicativos/POSselfpay/`: aplicativo Flutter de autoatendimento (self-pay);
- `packages/nfe-emissao-shared/`: schemas e utilitários de cálculo fiscal de emissão NF-e compartilhados entre pacotes;
- `api_Nfe/`: gateways fiscais PHP (`nfe-gateway` para SEFAZ NF-e/NFC-e e `nfse-gateway` para emissão municipal NFS-e);
- `infra/`: arquivos e referências de infraestrutura.

Cada pacote possui documentação própria quando necessário. Para visão arquitetural e contratos entre pacotes, consulte [`docs/sistema/visao-geral.md`](docs/sistema/visao-geral.md), [`docs/sistema/contratos-entre-pacotes.md`](docs/sistema/contratos-entre-pacotes.md), [`docs/sistema/pontos-criticos.md`](docs/sistema/pontos-criticos.md) e [`docs/sistema/indice-modulos.md`](docs/sistema/indice-modulos.md). Para detalhes de infraestrutura, consulte também [`infra/README.md`](infra/README.md).

## Mapa de Módulos por Pacote

### 1. Backend (`api/`)

Arquitetura em camadas (`controllers/http` → `service` → `repositories` → `drizzle/schema.ts`), com autenticação Better Auth e isolamento multi-empresa (`x-empresa-id`). Documentação detalhada em [`api/AGENTS.md`](api/AGENTS.md) e [`api/docs/modulos/README.md`](api/docs/modulos/README.md):

| Domínio | Módulos documentados (`api/docs/modulos/`) | Escopo principal |
| --- | --- | --- |
| Plataforma, Auth e Tenancy | [`plataforma-auth.md`](api/docs/modulos/plataforma-auth.md), [`empresas-tenancy.md`](api/docs/modulos/empresas-tenancy.md), [`admin-ia-conteudo.md`](api/docs/modulos/admin-ia-conteudo.md) | Login/sessão Better Auth, vínculo usuário–empresa, planos SaaS, painel Super Admin, banco de imagens e chaves de IA. |
| Financeiro, Centro de Custos e Contábil | [`financeiro.md`](api/docs/modulos/financeiro.md), [`centro-custo.md`](api/docs/modulos/centro-custo.md), [`contabilidade.md`](api/docs/modulos/contabilidade.md) | Contas a pagar/receber, baixas parciais e multi-meio, contas correntes, conciliação, árvore de centros de custo, rateios, orçamento (`budget_centro_custo`), plano de contas e integração Domínio. |
| Cadastros, Estoque e Produção | [`entidades.md`](api/docs/modulos/entidades.md), [`produtos.md`](api/docs/modulos/produtos.md), [`estoque.md`](api/docs/modulos/estoque.md), [`producao.md`](api/docs/modulos/producao.md), [`cadastros-auxiliares.md`](api/docs/modulos/cadastros-auxiliares.md) | Clientes, fornecedores, catálogo e variações, saldos por local, lotes, custo médio, ficha técnica com explosão de estoque e tabelas auxiliares. |
| Comercial e PDV | [`vendas-dav.md`](api/docs/modulos/vendas-dav.md), [`ordem-servico.md`](api/docs/modulos/ordem-servico.md), [`pdv.md`](api/docs/modulos/pdv.md) | Pedidos (DAV), ordens de serviço, sync de vendas/caixa/comandas do PDV e distribuição de auto-update (`/pdv/updates/*`). |
| Fiscal, Compras e Automação | [`compras-entrada-nfe.md`](api/docs/modulos/compras-entrada-nfe.md), [`emissao-fiscal.md`](api/docs/modulos/emissao-fiscal.md), [`obrigacoes-fiscais.md`](api/docs/modulos/obrigacoes-fiscais.md), [`relatorios-dashboard.md`](api/docs/modulos/relatorios-dashboard.md), [`automacao-email.md`](api/docs/modulos/automacao-email.md) | Entrada de XML/DF-e, emissão NF-e/NFC-e/NFS-e via gateways PHP, certificados A1, regras fiscais, SINTEGRA, SPED EFD, relatórios e jobs/alertas. |

### 2. Aplicação Web (`web/`)

Frontend Next.js 16 + React 19 + TanStack React Query + Tailwind 4 + shadcn/ui. Consome a API exclusivamente via `web/src/services/` e `web/src/hooks/`. Documentação em [`web/AGENTS.md`](web/AGENTS.md) e [`web/docs/modulos/README.md`](web/docs/modulos/README.md):

| Domínio | Módulos documentados (`web/docs/modulos/`) | Escopo principal |
| --- | --- | --- |
| Acesso e Público | [`publico.md`](web/docs/modulos/publico.md), [`acesso.md`](web/docs/modulos/acesso.md), [`assinatura.md`](web/docs/modulos/assinatura.md) | Landing, login, cotação pública, cardápio delivery, sessão, `EmpresaProvider`, guards de rota por perfil/plano, abas keep-alive e checkout de planos. |
| Operação Comercial e Estoque | [`dashboard.md`](web/docs/modulos/dashboard.md), [`cadastros.md`](web/docs/modulos/cadastros.md), [`estoque.md`](web/docs/modulos/estoque.md), [`compras.md`](web/docs/modulos/compras.md), [`vendas.md`](web/docs/modulos/vendas.md) | Dashboard gerencial, produtos (com banco de imagens e variações), clientes/fornecedores, movimentação de estoque, produção, cotações, DAV e OS. |
| PDV Web e Gourmet | [`pdv.md`](web/docs/modulos/pdv.md), [`gourmet.md`](web/docs/modulos/gourmet.md) | Frente de caixa web (`(pdv)`), fechamento de caixa, módulo gourmet (`(gourmet)`) e atendimento de garçom (`(garcom)`). |
| Financeiro, Centro de Custos e Contábil | [`financeiro.md`](web/docs/modulos/financeiro.md), [`centro-custo.md`](web/docs/modulos/centro-custo.md), [`contabilidade.md`](web/docs/modulos/contabilidade.md), [`relatorios.md`](web/docs/modulos/relatorios.md) | Contas a pagar/receber (resumo, timeline e histórico de baixas), árvore e orçamento de centros de custo, plano de contas, SINTEGRA, EFD e relatórios. |
| Fiscal, Configurações e Super | [`fiscal.md`](web/docs/modulos/fiscal.md), [`configuracoes.md`](web/docs/modulos/configuracoes.md), [`ajuda.md`](web/docs/modulos/ajuda.md), [`super-admin.md`](web/docs/modulos/super-admin.md) | Emissão NF-e/NFC-e/NFS-e, entrada de notas, tributos/CFOP, certificados digitais, parâmetros da empresa e painel Super (`(super)`). |

### 3. PDV Desktop (`aplicativos/pdv/`)

Aplicação Electron + React + Vite com banco PostgreSQL 17 local (`pdv_local`) e sincronização assíncrona via fila `outbox` idempotente. Documentação em [`aplicativos/pdv/AGENTS.md`](aplicativos/pdv/AGENTS.md) e [`aplicativos/pdv/docs/modulos/README.md`](aplicativos/pdv/docs/modulos/README.md):

- **Base local e sincronização:** [`banco-local.md`](aplicativos/pdv/docs/modulos/banco-local.md), [`sessao-configuracao.md`](aplicativos/pdv/docs/modulos/sessao-configuracao.md), [`sync-outbox.md`](aplicativos/pdv/docs/modulos/sync-outbox.md), [`backup.md`](aplicativos/pdv/docs/modulos/backup.md) e [`atualizacao-installer.md`](aplicativos/pdv/docs/modulos/atualizacao-installer.md).
- **Caixa, venda e NFC-e:** [`catalogo.md`](aplicativos/pdv/docs/modulos/catalogo.md), [`caixa.md`](aplicativos/pdv/docs/modulos/caixa.md), [`venda-pagamento.md`](aplicativos/pdv/docs/modulos/venda-pagamento.md), [`fiscal-nfce.md`](aplicativos/pdv/docs/modulos/fiscal-nfce.md) (emissão online e contingência `tpEmis=9`) e [`impressao.md`](aplicativos/pdv/docs/modulos/impressao.md).
- **Gourmet, LAN e periféricos:** [`mesas-gourmet-delivery.md`](aplicativos/pdv/docs/modulos/mesas-gourmet-delivery.md), [`lan-pos.md`](aplicativos/pdv/docs/modulos/lan-pos.md) (API LAN `:5050`), [`servico-lan.md`](aplicativos/pdv/docs/modulos/servico-lan.md) (execução em segundo plano `--lan-service` sem UI), [`pdv-secundario.md`](aplicativos/pdv/docs/modulos/pdv-secundario.md) e [`integracoes-perifericos.md`](aplicativos/pdv/docs/modulos/integracoes-perifericos.md) (SiTef, balança e Tecnibra).

### 4. Aplicativos Mobile, Estações, Pacotes e Gateways

- **POS Android ([`aplicativos/POSmaisgestao/`](aplicativos/POSmaisgestao/AGENTS.md)):** App Java/Android para maquininhas com suporte aos modos `cloud` (API) e `pdv_local` (LAN `:5050` do PDV). Módulos em [`aplicativos/POSmaisgestao/docs/modulos/README.md`](aplicativos/POSmaisgestao/docs/modulos/README.md): `app-shell`, `autenticacao`, `configuracao-build`, `pagamento`, `venda-fiscal`, `mesas-comandas`, `integracao-api`, `persistencia-offline` e `perifericos`.
- **NFe Mais Gestão Android ([`aplicativos/NFeMaisGestao/`](aplicativos/NFeMaisGestao/README.md)):** App Android nativo (Java) com wizard de emissão NF-e em 7 etapas, consulta, cancelamento, inutilização, DANFE, produtos e clientes.
- **Estação Balança ([`aplicativos/estacao-balanca/`](aplicativos/estacao-balanca/README.md)):** App Flutter (Windows/Android) integrado à balança Toledo Prix (`Prt3`) e à API LAN do PDV (`:5050`) para pesagem em KG e lançamento em comandas com leitor de código de barras.
- **POS Self-Pay ([`aplicativos/POSselfpay/`](aplicativos/POSselfpay/README.md)):** Aplicação Flutter para terminal de autoatendimento.
- **Pacote Compartilhado NF-e ([`packages/nfe-emissao-shared/`](packages/nfe-emissao-shared/package.json)):** Schemas Zod e funções puras de cálculo/normalização de emissão NF-e (totais fiscais, distribuição de descontos, `indPres`, pagamentos e contexto de reemissão).
- **Gateways Fiscais (`api_Nfe/`):** `api_Nfe/nfe-gateway/` (PHP `sped-nfe`, porta `8088`, comunicação SEFAZ para NF-e/NFC-e e DF-e) e `api_Nfe/nfse-gateway/` (PHP, porta `8089`, emissão municipal de NFS-e).

## Deploy de produção é manual

> **Não existe deploy automatizado em uso na produção.** Um `git push` apenas
> atualiza o repositório remoto e **não implanta** a alteração na VPS.

Após o commit e o push, acesse a VPS no clone do monorepo e rode o script
completo (API + Web, na ordem certa, com `next build`):

```bash
cd /caminho/do/clone
./up.sh
```

O `up.sh` faz pull fast-forward, instala dependências, aplica migrations,
compila a API, recarrega o PM2 `api-mais-gestao` e só então publica a Web com
`pnpm run build:live` (processo `web-mais-gestao`). Não republica PDV/POS.

Detalhes e variáveis (`SKIP_PULL`, `SKIP_MIGRATE`, `MIGRATE_SQL`) estão no
cabeçalho de [`up.sh`](./up.sh). Os passos abaixo descrevem o mesmo fluxo,
caso precise executá-lo à mão.

Arquivos em `.github/workflows/`, inclusive workflows com nome de deploy,
**não representam o fluxo operacional atual de produção** e não devem ser
usados como evidência de que a aplicação foi implantada.

### Ordem segura

Antes de iniciar, confirme a branch e o commit que serão publicados, preserve
as variáveis de ambiente existentes na VPS e tenha um backup válido do banco
quando a versão alterar o schema.

#### 1. Atualizar o código

No checkout do monorepo existente na VPS:

```bash
git checkout main
git pull --ff-only origin main
```

Confirme que o commit esperado está presente antes de prosseguir.

#### 2. Aplicar a migration específica da versão

Se o commit publicado incluir migration, aplique **o arquivo específico
exigido por essa versão antes de atualizar ou reiniciar a API**. Identifique o
arquivo na alteração revisada; não execute uma migration genérica ou
desconhecida por suposição.

Exemplo para PostgreSQL executado pelo Compose atual, sem expor credenciais:

```bash
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'psql --single-transaction -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "api/drizzle/<migration-especifica-da-versao>.sql"
```

Substitua o placeholder pelo arquivo confirmado para a versão. Se o ambiente
de produção não usa esse Compose para o banco, use o cliente PostgreSQL já
configurado na VPS, mantendo transação e interrupção em caso de erro. Não
prossiga com a API se a migration falhar.

#### 3. Instalar, compilar e reiniciar a API

```bash
cd api
pnpm install --frozen-lockfile
pnpm run build
```

Após o build terminar com sucesso, reinicie a API pelo gerenciador realmente
configurado na VPS:

```bash
<comando-de-reinicio-do-processo-da-api>
```

O nome e o gerenciador do processo da API não estão definidos de forma
confiável neste README. Consulte a configuração ativa na VPS (por exemplo,
PM2, systemd ou Docker Compose) e substitua o placeholder pelo comando
correto; não crie nem presuma um nome de processo.

Verifique o status, os logs e o endpoint de saúde da API antes de atualizar o
frontend.

#### 4. Instalar, compilar e recarregar a web

Continuando a partir da pasta `api/` usada na etapa anterior:

```bash
cd ../web
pnpm install --frozen-lockfile
pnpm run build:live
```

`build:live` valida o processo `web-mais-gestao`, compila em staging e, somente
após o build terminar, para brevemente o processo, publica `.next` e o reinicia.
Isso impede que o processo antigo tente carregar chunks do build novo.

#### 5. Validar a publicação

- confira o commit em execução na VPS;
- valide o health check e os logs da API;
- valide a aplicação web e os logs do PM2;
- registre manualmente quem publicou, quando e qual commit foi implantado.

