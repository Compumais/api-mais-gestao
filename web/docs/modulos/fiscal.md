# Fiscal (documentos e tributos)

## Propósito

Telas de NF-e de produto (modelo 55), NFC-e (65), NFS-e, NF de compra/entrada e parâmetros tributários (natureza, CFOP, regras, taxas, parametrização). O front valida formulário, mostra rejeição e dispara o service. Classificação fiscal, XML e SEFAZ são da API (e do gateway). O interceptor em `src/lib/axios.ts` repassa `relatorioFiscal` quando a API devolve esse campo — não descartar esse campo ao “simplificar” o erro.

## Rotas

Documentos:

- `/nota-fiscal-venda`, `/nota-fiscal-venda/nova`, `/nota-fiscal-venda/[id]`
- `/nota-fiscal-compra`, `/nota-fiscal-compra/nova`, `/nota-fiscal-compra/importar`, `/nota-fiscal-compra/captura-sefaz`, `/nota-fiscal-compra/rascunho/[id]`, `/nota-fiscal-compra/[id]/editar`
- `/nota-fiscal-servico`, `/nota-fiscal-servico/nova`, `/nota-fiscal-servico/[id]`
- `/nfce`, `/nfce/editar`
- `/nfce-pendentes`
- `/cfop`, `/cfop/novo`, `/cfop/[id]/editar`

Tributos — `src/app/(auth)/tributos` (layout só com `PageContainer`):

- `/tributos` — redirect para `/tributos/naturezas`
- `/tributos/naturezas`, `novo`, `[id]/editar`
- `/tributos/cfop-depara`
- `/tributos/parametrizacao`
- `/tributos/regras-fiscais`
- `/tributos/taxas`
- `/tributos/configuracao-fiscal`

Certificado A1 usado na emissão: `/certificados-digitais` (menu Administração).

Configuração de série/ambiente: abas `nfe`, `nfce`, `nfse` e `empresa-fiscal` em `/configuracoes` ([configuracoes.md](configuracoes.md)).

Relatórios fiscais: [relatorios.md](relatorios.md). Arquivos SINTEGRA/EFD: [contabilidade.md](contabilidade.md).

## Services / hooks

Emissão e documentos:

- `src/services/nfe-emissao.service.ts`, `src/services/nota-fiscal.service.ts`, `src/services/nfe-inbound.service.ts`
- `src/services/nfce.service.ts`, `src/hooks/use-nfce-detalhes.ts`, `src/hooks/use-nfce-ambiente-pdv.ts`
- `src/services/nfse-emissao.service.ts`, `src/services/servicos-nfse.service.ts`
- `src/services/nfe-configuracao.service.ts`, `src/services/nfce-configuracao.service.ts`, `src/services/nfse-configuracao.service.ts` — hook `use-nfe-configuracao.ts`
- `src/services/empresa-fiscal.service.ts`

Tributos e tabelas:

- `src/services/cfop.service.ts`, `src/services/cfop-depara.service.ts`, `src/services/regras-fiscais.service.ts`
- `src/services/parametrizacao-tributos.service.ts`, `src/services/taxauf.service.ts`
- `src/services/cest.service.ts`, `src/services/ibpt.service.ts`

Schemas (não apagar ao “enxugar” a tela): `nfe-emissao.schema.ts`, `nota-fiscal.schema.ts`, `nfse-emissao.schema.ts` (há teste), `nfse-configuracao.schema.ts`, `nfe-configuracao.schema.ts`, `nfce-configuracao.schema.ts`, `empresa-fiscal-config.schema.ts`, `cfop.schema.ts`, `cfop-depara.schema.ts`, `regra-fiscal.schema.ts`, `parametrizacao-tributos.schema.ts`, `taxauf.schema.ts`, `relatorio-fiscal.schema.ts`.

Textos de rejeição já mapeados: `src/constants/nfe-rejeicoes.ts`.

## Estado compartilhado

Chaves que outras telas leem:

- `["nfe-emitidas"]`, `["rascunhos-emissao-nfe", empresa.id]`
- `["notas-fiscais-compra"]`, `["rascunho-importacao-nf", id]` (importação também invalida hierarquia, fator e o rascunho)
- `["nfce", empresa.id]` — gourmet/PDV invalidam ao fechar venda
- `["nfce-config-pdv", empresa.id]`, `["nfce-series"]`, `["terminais-pdv"]`
- `["cfops"]` e variantes `["cfops", empresa.id, tipomovimento, "produto"]`, `["cfops-os-item"]`, `["cfops-config-os"]`. Natureza invalida `["cfops"]`.
- Na emissão, a tela lê `["produtos-emissao"]`, `["tipos-documento-financeiro"]`, `["condicoes-pagamento"]`, `["plano-contas", "receitas"]`, `["locais-estoque"]`, `["lotes-produto-item"]`
- Colunas: `TABELA_NOTA_FISCAL_PRODUTO`, `TABELA_NOTA_FISCAL_SERVICO`, `TABELA_NOTA_FISCAL_COMPRA`, `TABELA_NFCE`

Rascunho de importação é fluxo de várias etapas (`importar` → `rascunho/[id]` → pendências, fator, preço). Apagar o rascunho da UI no meio deixa a API com documento órfão; não há limpeza automática confirmada no front.

## Permissões / guards

- `/nota-fiscal-venda` e `/nfce` — feature `notas_fiscais`; perfis de gestão
- `/pedidos` também exige `notas_fiscais` ([vendas.md](vendas.md))
- `/nota-fiscal-servico` — módulo `nfse`; perfis de gestão
- `/nota-fiscal-compra`, `/tributos/*`, `/cfop` — no menu, `PERFIS_GESTAO`. Guard de prefixo para compra e tributos: **não confirmado** em `REGRAS_ACESSO_ROTAS`
- Garçom não acessa estas rotas (não estão em `GARCOM_ALLOWED_ROUTES`), exceto a NFC-e disparada dentro do fechamento de venda gourmet/PDV

## O que não remover

- Zod da emissão (itens, CFOP, destinatário, totais) e da NFS-e.
- Aviso de ambiente (`aviso-ambiente-nfe.tsx`) e a config de série em Configurações.
- Empresa ativa em toda query fiscal.
- Passos da entrada: captura SEFAZ, importar XML, rascunho, fator de conversão, vínculo de produto/grupo. São rotas separadas de propósito.
- `relatorioFiscal` no erro do axios.
- Mapeamento CFOP de/para e parametrização: a emissão e a entrada consultam isso na API; a tela é o único lugar em que o usuário grava.

## Regressões típicas

- Invalidar `["nfce"]` sem `idempresa` de um lado e com empresa do outro: a lista não atualiza depois do salão fechar conta.
- Trocar a chave `rascunho-importacao-nf` e o modal de pendência/preço/fator deixa de refetch.
- Apagar `/cfop` porque o menu aponta para `/tributos/naturezas`. A rota de CFOP ainda existe.
- Calcular ICMS/ST no componente. O front mostra o que a API devolve.
- Guardar certificado ou senha no `localStorage` a partir da tela de certificados.
