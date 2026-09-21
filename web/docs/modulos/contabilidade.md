# Contabilidade

## Propósito

Configuração contábil da empresa, plano de contas contábil, código reduzido e exportação de obrigações (SINTEGRA, EFD ICMS/IPI, EFD-Contribuições, XMLs). O leiaute do arquivo é gerado na API. O front escolhe período/competência e dispara o download.

## Rotas

- `/configuracao-contabilidade`
- `/conta-contabil`, `/conta-contabil/novo`
- `/codigo-reduzidos`
- `/contabilidade/sintegra`
- `/contabilidade/efd`
- `/contabilidade/efd-contribuicoes`
- `/contabilidade/apuracao-efd`
- `/contabilidade/exportar-xmls`
- Atalho de menu: `/configuracoes?tab=integracoes-contabeis` (Domínio). A aba mora em Configurações.

Plano de contas **gerencial** (`/plano-contas`) é [financeiro.md](financeiro.md), não esta pasta.

## Services / hooks

- `src/services/contabilidade.service.ts`
- `src/services/contabilidade-cadastro.service.ts` — `["contabilidade-cadastro", empresa.id]`
- `src/services/conta-contabil.service.ts` — hook `use-conta-contabil.ts`, chave `["conta-contabil"]`
- `src/services/sintegra.service.ts`
- `src/services/efd.service.ts` — ajustes `["efd-ajustes", empresa.id, competencia]`
- `src/services/dominio.service.ts` — hook `use-dominio-integracao.ts`
- Schemas: `conta-contabil.schema.ts`, `codigo-reduzido.schema.ts`, `dominio.schema.ts`

Código reduzido também lê `["conta-contabil", "sem-codigo", empresaId]` e `["conta-contabil", "proximo-codigo-reduzido", empresaId]`.

## Estado compartilhado

- Mutations de código reduzido invalidam `["conta-contabil"]`. A lista de contas e o diálogo de próximo código dependem do mesmo prefixo.
- Exportação não confirmou invalidate de notas ou financeiro: ela lê o período na hora. Mudar competência na apuração usa a chave com `competencia`; trocar o formato dessa string mistura ajustes de meses diferentes.
- Integração contábil na aba de configurações é outra query (Domínio). Não está no cache do SINTEGRA.

## Permissões / guards

- `/codigo-reduzidos`: perfis de gestão no guard.
- `/contabilidade/efd`, `/contabilidade/efd-contribuicoes`, `/contabilidade/apuracao-efd`: feature `sped_efd` + perfis de gestão.
- SINTEGRA e exportar XMLs: no menu, `PERFIS_GESTAO`, **sem** feature `sped_efd` na regra de rota (não confirmado guard extra).
- Configuração contábil: menu de gestão; guard de prefixo **não confirmado**.

## O que não remover

- Empresa ativa. As páginas de código reduzido e apuração abortam sem ela.
- Schema do código reduzido e da conta contábil.
- Feature `sped_efd` nas três rotas de EFD. SINTEGRA não usa essa feature no guard; não “alinhar” os dois sem decisão de produto — o código hoje diferencia.
- Competência na chave `efd-ajustes`.

## Regressões típicas

- Unificar `/plano-contas` (gerencial) com `/conta-contabil` (contábil). Serviços e chaves são outros.
- Gerar arquivo SINTEGRA/EFD no browser a partir das listas de nota. O service só pede o arquivo à API.
- Limpar `["conta-contabil"]` ao salvar um código e esquecer a variante `proximo-codigo-reduzido`: o próximo número fica repetido na tela.
