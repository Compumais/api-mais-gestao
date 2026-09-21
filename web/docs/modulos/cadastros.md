# Cadastros

## Propósito

Pessoas e catálogo da empresa ativa: clientes, fornecedores, produtos, serviços, grupos, unidades e fatores de conversão. Esses cadastros alimentam venda, compra, fiscal e estoque. O front só envia o formulário validado.

## Rotas

Pastas em `src/app/(auth)/`:

- `/clientes`, `/clientes/novo`, `/clientes/[id]/editar`
- `/fornecedores`, `/fornecedores/novo`, `/fornecedores/[id]/editar`
- `/compradores` e `/comissionados` — listagens; **não** estão no `nav-constants.ts` (atalho de menu não confirmado). As queries chamam `entidadesService.listar` só com `idempresa` e paginação. Filtro de papel “comprador”/“comissionado” não aparece nesse `listar`.
- `/produtos`, `/produtos/novo`, `/produtos/[id]/editar`
- `/servicos`, `/servicos/novo`, `/servicos/[id]/editar`
- `/grupos`, `/grupos/novo`, `/grupos/[id]/editar`
- `/grupos-gourmet`, `/grupos-gourmet/novo`, `/grupos-gourmet/[id]/editar`
- `/cardapio-delivery` — config do cardápio público (módulo gourmet)
- `/unidade-medida`, `/unidade-medida/novo`, `/unidade-medida/[id]/editar`
- `/fator-conversao`, `/fator-conversao/novo`, `/fator-conversao/[id]/editar`
- `/meios-pagamento`, novo e `[id]/editar` — cadastro geral usado no financeiro e no PDV
- `/bancos`, `/bancos/[id]/editar`
- `/tipos-problema` — ver [vendas.md](vendas.md) (feature `ordem_servico`)

`/estoque` redireciona para `/produtos` (`estoque/page.tsx`).

## Services / hooks

- `src/services/entidades.service.ts` — clientes, fornecedores, compradores, comissionados. Query de edição: `["entidade", id]`. Listagens: `["entidades", empresa.id]` (forms) e chaves próprias `fornecedores`, `compradores`, `comissionados`.
- `src/services/produtos.service.ts` — `["produtos"]`, `["produto", id]`. Serviços também invalidam `["produtos"]` e `["servicos"]` (`servico-form.tsx`): serviço é produto no cache.
- `src/services/hierarquias.service.ts` — `["hierarquias"]`, `["hierarquia", id]` (grupos).
- `src/services/unidades-medida.service.ts` e `src/services/unidade-medida.service.ts` — `["unidades-medida"]`, `["unidade-medida", id]`.
- `src/services/fator-conversao.service.ts` — `["fatores-conversao"]` (também lida na importação de NF de compra).
- `src/services/grupos-gourmet.service.ts` — `["grupos-gourmet"]`.
- `src/services/cardapio-delivery.service.ts` — `["cardapio-delivery", empresa.id]`. Schema: `cardapio-delivery.schema.ts`.
- `src/services/bancos.service.ts`, `src/services/condicao-pagamento.service.ts`, `src/services/bandeira-cartao.service.ts`.
- `src/hooks/use-consulta-cnpj-entidade.ts` — consulta CNPJ no formulário de entidade. Não duplicar a regra cadastral da Receita no front.
- Schemas: `entidades.schema.ts`, `produtos.schema.ts`, `servicos.schema.ts`, `hierarquia.schema.ts`, `unidade-medida.schema.ts`, `fator-conversao.schema.ts`, `grupo-gourmet.schema.ts`, `condicao-pagamento.schema.ts`, `bancos.schema.ts`, `alterar-produtos-em-massa.schema.ts`.

Visibilidade de colunas: constantes `TABELA_CLIENTES`, `TABELA_FORNECEDORES`, `TABELA_PRODUTOS`, `TABELA_SERVICOS`, `TABELA_GRUPOS`, `TABELA_UNIDADE_MEDIDA`, `TABELA_FATOR_CONVERSAO`, `TABELA_CONDICOES_PAGAMENTO`, `TABELA_FORMAS_ERP`, `TABELA_BANDEIRAS_CARTAO` em `use-preferencias-ui-usuario.ts`.

## Estado compartilhado

Invalidar o prefixo errado deixa outra tela com cadastro velho:

- `["entidades"]` — formulário financeiro, NF de compra, PDV (`entidades-clientes-pdv` é chave à parte no diálogo de pagamento).
- `["produtos"]` — PDV (`/pdv` lista `["produtos", empresa.id, { inativo: 0 }]`), emissão de NF, OS, importação.
- `["hierarquias"]` — produto em massa e modal de importação de NF.
- `["unidades-medida"]` — produto, serviço, importação.
- `["cfops"]` — campo de CFOP no produto (`campo-cfop-produto.tsx`). Cadastro de CFOP em si está em [fiscal.md](fiscal.md).
- `["cests"]` — alteração em massa de produto.
- `["grupos-gourmet"]` — produto e cardápio gourmet.

## Permissões / guards

- Clientes: sem regra de prefixo. É o único cadastro do menu restrito (`filtrarCadastrosRestrito` deixa só `url === "/clientes"`).
- Fornecedores, catálogo, meios de pagamento: menu com `PERFIS_GESTAO` (`proprietario`, `admin`, `financeiro`). Guard de rota para esses prefixos: **não confirmado** em `REGRAS_ACESSO_ROTAS`.
- Bancos: menu `PERFIS_ADMIN` (`proprietario`, `admin`).
- `/grupos-gourmet`: guard `modulo: "gourmet"`.
- `/cardapio-delivery`: guard `modulo: "gourmet"`.
- `/produtos/relatorios`: guard só perfis de gestão. Detalhe em [estoque.md](estoque.md).

## O que não remover

- Zod de entidade (CPF/CNPJ e endereço) e de produto (NCM, CFOP, unidade, lote). A emissão e a entrada de nota leem esse cadastro.
- `idempresa` vindo da empresa ativa, não de um id fixo no form.
- Invalidação cruzada produto ↔ serviço.
- Consulta CNPJ como auxílio de preenchimento; não substituir o schema.

## Regressões típicas

- “Limpar” `["produtos"]` para uma chave mais específica e o PDV/NF continuam com lista antiga (eles invalidam o prefixo `["produtos"]`).
- Unificar compradores e clientes no mesmo cache sem o `idempresa`: as duas telas chamam o mesmo service com chaves diferentes.
- Remover fator de conversão do cadastro e quebrar a célula de conversão na importação de XML (`["fatores-conversao", idempresa, "importacao-nf"]`).
- Apagar grupos gourmet achando que é só cosmético: o módulo gourmet e o produto dependem da chave.
- Esquecer `exibircardapiodelivery` no produto: o cardápio público fica vazio mesmo com grupos gourmet.
