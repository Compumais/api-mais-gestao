# Entidades

## Propósito no produto

Cadastro de pessoas da empresa: clientes, fornecedores e demais papéis usados em financeiro, nota, pedido e PDV. A mesma pasta de repositório concentra a checagem de pertencimento do usuário à empresa.

## Pastas e entrypoints

- Rotas: `src/controllers/http/entidades/rotas.ts` — CRUD `/entidades` com `verifyJwt`.
- Services: `src/service/entidades/` (criar, buscar, atualizar, excluir, listar, importar).
- Repository: `src/repositories/entidade-repositories.ts`.
- Função compartilhada: `verificarUsuarioPertenceEmpresa` (consulta `usuario_empresa`).
- Schema: `drizzle/tables/entidade.ts`, `drizzle/tables/usuario-empresa.ts`.
- Conta contábil da entidade fica no módulo de contabilidade (`/entidades-conta-contabil`).

## Contratos externos

ERP web. PDV e vendas resolvem cliente por entidade já cadastrada. POS Android: não confirmado.

Consulta de CNPJ: `src/lib/opencnpj-client.ts`, env `OPENCNPJ_BASE_URL` (default `https://api.opencnpj.org`). Onde o controller chama esse client: não confirmado além da existência do client e de `src/util/mapear-opencnpj-org-cnpj.ts`.

## Configuração crítica

`OPENCNPJ_BASE_URL`. Sem ela o default público continua. Não é segredo de tenant.

## Invariantes

- Entidade pertence a `idempresa`. Listagem filtra empresas do usuário; array vazio de empresas não pode ir para `inArray` (rule de repository).
- Exclusão precisa respeitar vínculos (financeiro, nota, pedido). O service deve recusar se houver dependência; não apagar em cascata sem ler o service de exclusão.
- `verificarUsuarioPertenceEmpresa` é usada por quase todos os módulos. Não mover a regra para o controller nem torná-la opcional.
- Zod no controller de entidades. Documento (CPF/CNPJ) e papéis são dados de negócio do service.

## O que quebra se alterar ou apagar

- Isolamento multi-empresa (a função de pertencimento mora neste repository).
- Emissão e compra que exigem destinatário/emitente.
- Importação de entidades (`src/service/entidades/importar-entidades.ts`).
- Relatórios e dashboard de clientes.

## Dependências de outros módulos da API

Empresas e usuários (vínculo). Consumido por financeiro, notas, DAV, PDV, contabilidade.

## Testes relacionados

- `src/service/entidades/listar-entidades.test.ts`
- `src/service/entidades/buscar-entidade.test.ts`
- `src/util/validar-usuario-empresa.test.ts`
