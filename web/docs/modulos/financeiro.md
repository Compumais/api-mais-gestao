# Financeiro

## Propósito

Contas a pagar e a receber, contas correntes, movimentação (incluindo OFX), plano de contas gerencial, budget, tipos de cobrança e meios de pagamento. Lançamento, saldo e conciliação são da API. O front valida o formulário e reflete o cache.

## Rotas

- `/contas-receber`, `/contas-receber/novo`, `/contas-receber/[id]/editar`
- `/contas-pagar`, `/contas-pagar/novo` (há também `(auth)/contas-pagar/[id]/page.tsx`)
- `/contas-correntes`, `/contas-correntes/novo`, `/contas-correntes/[id]/editar`
- `/movimentacoes`, `/movimentacoes/importar-ofx`
- `/plano-contas`, `/plano-contas/novo`
- `/budget`, `/budget/novo`, `/budget/[id]/editar`, `/budget/acompanhamento`
- `/tipos-cobranca`, `/tipos-cobranca/[id]/editar`
- `/meios-pagamento` — também cadastro geral ([cadastros.md](cadastros.md))
- `/bancos` — usado no formulário financeiro (`["bancos", empresa.id]`)

Menu: item “Conciliação” com `url: "#"` (sem rota).

Relatórios gerenciais com `?abrir=` ficam em [relatorios.md](relatorios.md). O dashboard lê saúde financeira e fluxo em chaves próprias ([dashboard.md](dashboard.md)).

## Services / hooks

- `src/services/financeiro.service.ts`
- `src/services/contas-correntes.service.ts`
- `src/services/conta-corrente-lancamento.service.ts` — hook `use-conta-corrente-lancamento.ts`
- `src/services/plano-contas.service.ts` — hook `use-plano-contas.ts`
- `src/services/tipo-cobranca.service.ts`, `src/services/tipo-documento-financeiro.service.ts`
- `src/services/condicao-pagamento.service.ts`, `src/services/budgets.service.ts`, `src/services/bancos.service.ts`
- Hook de formulário: `src/hooks/use-movimentacao-form.tsx`
- Schemas: `financeiro.schema.ts`, `contas-correntes.schema.ts`, `conta-corrente-lancamento.schema.ts`, `plano-contas.schema.ts`, `budget.schema.ts`, `tipo-cobranca.schema.ts`, `importacao-ofx.schema.ts`, `condicao-pagamento.schema.ts`

## Estado compartilhado

Prefixo **`["financeiro"]`** é o contrato entre telas:

- Lista a pagar: `["financeiro", "contas-pagar", ...]` (`QUERY_KEY_CONTAS_PAGAR`)
- Form: `["financeiro", financeiroId]`
- Mutations em pagar/receber chamam `invalidateQueries({ queryKey: ["financeiro"] })` — pega pagar, receber e o título aberto

Outras chaves lidas pelo financeiro e por nota/PDV:

- `["plano-contas", empresa.id, tipo]`, árvore `["plano-contas", "arvore", empresa.id]`, e `["plano-contas", "receitas"|"budget"|"servico", empresa.id]`
- `["tipos-cobranca", empresa.id, ...]`
- `["conta-corrente-lancamentos"]` (importação OFX invalida esse prefixo)
- `["bancos", empresa.id]`, `["entidades", empresa.id]`
- `["budgets"]`
- `["tipos-documento-financeiro", empresa.id]` na NF de venda e variante `...-pdv-aprazo` no PDV

Colunas: `TABELA_CONTAS_PAGAR`, `TABELA_CONTAS_RECEBER`, `TABELA_MOVIMENTACOES`, `TABELA_TIPOS_COBRANCA`.

## Permissões / guards

Menu financeiro: `PERFIS_GESTAO`.

Guard de rota só para:

- `/plano-contas`
- `/tipos-cobranca`

Perfis `proprietario`, `admin`, `financeiro`. `/contas-pagar`, `/contas-receber`, `/movimentacoes`, `/budget` e `/contas-correntes` **não** estão em `REGRAS_ACESSO_ROTAS`.

## O que não remover

- Schema Zod do título (valor, vencimento, pessoa, plano de contas, tipo de cobrança).
- Empresa ativa: as queries dão `enabled: !!empresa`.
- Invalidação do prefixo `["financeiro"]` inteiro depois de baixar/editar. Invalidar só `contas-pagar` deixa o receber e o dashboard (que não usa essa chave) inconsistentes entre si, e deixa o formulário aberto com o título velho.
- Árvore do plano de contas: depois de mutar, o código invalida e dá `refetchQueries` em `["plano-contas"]`. NF, budget e serviço leem fatias dessa chave.

## Regressões típicas

- Separar pagar e receber em caches que não compartilham `["financeiro"]`.
- Apagar tipos de cobrança ou condições e quebrar NF de venda e pagamento do PDV.
- Tratar “Conciliação” do menu como página: a URL é `#`.
- Importar OFX sem invalidar `["conta-corrente-lancamentos"]`: a grade de movimentação não mostra as linhas novas.
- Recalcular saldo ou DRE no front. Relatório e dashboard consomem endpoints próprios.
