# Obrigações fiscais

## Propósito no produto

Gerar arquivos SINTEGRA e EFD (ICMS/IPI e Contribuições) a partir das notas e cadastros já gravados, e manter ajustes de apuração.

## Pastas e entrypoints

- `src/controllers/http/sintegra/rotas.ts` — `POST /sintegra/gerar` com `verifyJwt` e `preHandler` `resolveEmpresaContext`. Não usa `requireFeature` no arquivo lido.
- `src/controllers/http/efd-icms/rotas.ts` — `verifyJwt` + `requireFeature(sped_efd)`:
  - `POST /efd-icms/gerar`
  - `POST /efd-contribuicoes/gerar`
  - `GET|POST /efd/ajustes`, `DELETE /efd/ajustes/:id`
- Handlers de ajuste: `src/controllers/http/apuracao-efd/ajustes.ts`. Essa pasta não tem plugin próprio em `src/index.ts`; entra pelas rotas EFD.
- Services: `src/service/sintegra/` (registros, inclusive `registro-75.ts` e agregação de NFC-e), `src/service/efd-icms/`, `src/service/efd-contribuicoes/`, `src/service/apuracao-efd/`.
- Schema: `drizzle/tables/apuracao-efd-ajuste.ts`, `inventario-fiscal.ts`. Repositórios: `sintegra-repositories.ts`, `efd-icms-repositories.ts`, `apuracao-efd-ajuste-repositories.ts`.

Script npm `corrigir-itens-efd-nfe` aponta para `scripts/corrigir-itens-efd-nfe.ts`. Não é rota HTTP.

## Contratos externos

ERP web (download do arquivo gerado). Não há path de PDV. A geração não chama SEFAZ; lê o banco. POS Android: não confirmado.

## Configuração crítica

Feature SaaS `sped_efd` para EFD. SINTEGRA não passa por essa feature no código da rota. Não há env própria no código lido.

## Invariantes

- Arquivo é derivado de notas, produtos, entidades e inventário. Corrigir o arquivo “na mão” no gerador sem corrigir a nota reproduz o erro no próximo mês.
- Ajustes de apuração (`/efd/ajustes`) entram no arquivo. Apagar a tabela zera ajustes já lançados pelo contador.
- Agregação de NFC-e (`agregar-resumo-nfce`) resume cupons; mudar o agrupamento muda o registro enviado ao fisco.
- Validadores em `src/service/sintegra/validar-sintegra.ts` e testes de EFD existem para rejeitar layout inválido antes do download. Não remover a validação para “deixar gerar sempre”.
- Contexto de empresa no SINTEGRA é explícito no preHandler. Sem `idempresa` resolvido, a geração não tem tenant.

## O que quebra se alterar ou apagar

- Entrega mensal SINTEGRA e SPED do cliente.
- Inventário fiscal se a tabela ou o registro que o lê for removido.
- Itens de NF-e já corrigidos pelo script `corrigir-itens-efd-nfe` podem voltar a ser lidos errado se o gerador ignorar o campo corrigido.
- Feature `sped_efd`: tirar o hook libera EFD para plano sem o módulo; tirar a feature do catálogo bloqueia quem já contratou.

## Dependências de outros módulos da API

Emissão (notas autorizadas, canceladas, inutilizadas), produtos (registro 75 e cadastro), entidades, empresas fiscais, estoque/inventário.

## Testes relacionados

- `src/service/sintegra/gerar-sintegra.test.ts`
- `src/service/sintegra/formatador-campo.test.ts`
- `src/service/efd-icms/validar-efd-icms.test.ts`
