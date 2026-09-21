# Empresas, tenancy e planos

## Propósito no produto

Cadastro da empresa (tenant), dados fiscais da empresa, configurações, vínculo de usuários e comercialização SaaS (planos, módulos, assinatura Asaas).

## Pastas e entrypoints

Registrados em `src/index.ts`:

- `src/controllers/http/empresas/rotas.ts` — `/empresas` CRUD. Services: `src/service/empresa/`.
- `src/controllers/http/empresa-fiscal/rotas.ts` — `GET|PUT /empresas/:id/fiscal`.
- `src/controllers/http/configuracao/rotas.ts` — `/configuracoes`, seção, chaves de API e webhooks por empresa.
- `src/controllers/http/configuracao-usuario/rotas.ts` — `/configuracoes-usuario` e `/configuracoes-usuario/preferencias-ui`.
- `src/controllers/http/planos/rotas.ts` — `GET /planos/catalogo` (sem JWT); demais `/planos/*` com `verifyJwt`.
- `src/controllers/http/assinaturas/rotas.ts` — `/checkout/assinatura`, `/assinaturas/meu-plano`, `/assinaturas/cancelar`, `POST /webhook/asaas` (sem JWT).
- Admin de empresas e entitlement: `src/controllers/http/admin/rotas.ts` (ver módulo admin).

Schema: `drizzle/tables/empresas.ts`, `usuario-empresa.ts`, `empresa-fiscal.ts`, `configuracoes.ts`, `configuracoes-usuario.ts`, `planos-saas.ts`, `modulos-saas.ts`, `plano-saas-features.ts`, `features-saas.ts`, `assinaturas.ts`, `clientes-asaas.ts`, `usuario-modulos.ts`.

Ao criar empresa, `src/service/empresa/popular-dados-padrao-empresa.ts` popula plano de contas, CFOPs, taxas UF, parametrização de tributos, tipos de documento, conta caixa e fatores de conversão. Cada passo é idempotente se a empresa já tiver registros.

## Contratos externos

ERP web autenticado. Webhook Asaas é chamado pelo provedor de pagamento, não pelo front. PDV lê empresa/fiscal pelos endpoints de terminal e catálogo (módulo PDV), não por um cliente separado neste pacote. POS Android: não confirmado.

## Configuração crítica

- `ASAAS_API_URL`, `ASAAS_API_KEY` em `src/service/asaas/asaas.service.ts` (default de URL: sandbox Asaas).
- `ASAAS_WEBHOOK_TOKEN`: se definido, `POST /webhook/asaas` exige header `asaas-access-token`.
- Feature `gestao_multi_empresa` em `src/constants/saas-catalog.ts`.
- Header `x-empresa-id` (`HEADER_EMPRESA_ID`).

Não remover a população de dados padrão na criação da empresa: telas fiscais e financeiras assumem esses cadastros.

## Invariantes

- Empresa tem `idproprietario`. Usuário operacional precisa existir em `usuario_empresa` (`verificarUsuarioPertenceEmpresa`). Código 403 `EMPRESA_ACESSO_NEGADO` ou 404 `EMPRESA_NAO_ENCONTRADA`.
- Super não é barrado por `resolveEmpresaContext`.
- Limite `maxempresas` do proprietário é checado no service de criação (rule e `criar-empresa`).
- `requireFeature` / `requireModulo` consultam o plano efetivo (`src/service/planos/buscar-plano-efetivo.ts`). Sem feature: 403 `PLAN_FEATURE_REQUIRED`.
- Zod nos controllers de empresa fiscal, configuração de usuário e planos. Validação de formato fica no controller; regra no service.

## O que quebra se alterar ou apagar

- Tabela `usuario_empresa` ou a função `verificarUsuarioPertenceEmpresa`.
- `popularDadosPadraoEmpresa` (empresa nova sem CFOP, plano de contas, caixa).
- Webhook Asaas ou campos de ciclo (`plano_inicio_ciclo`, `plano_fim_ciclo`, `plano_proximo`) usados pelo job `verificar_ciclos_plano`.
- Catálogo `GET /planos/catalogo` (tela de contratação).
- Códigos de feature/módulo em `saas-catalog.ts` sem atualizar hooks `requireFeature` / `requireModulo`.

## Dependências de outros módulos da API

Plano de contas, CFOP, taxa UF, parametrização de tributos, tipos de documento, conta corrente, fatores de conversão (dados padrão). Auth (plano inicial do usuário). Jobs de ciclo de plano.

## Testes relacionados

- `src/service/empresa/atualizar-empresa.test.ts`
- `src/service/planocontas/criar-plano-contas-padrao.test.ts` (efeito colateral da empresa nova)
- `src/service/configuracao-usuario/preferencias-ui-usuario.test.ts`
