# Vendas (pedidos e ordens de serviço)

## Propósito

Pedido de venda / DAV e ordem de serviço da empresa ativa. Emissão de NF-e a partir do pedido e faturamento da OS chamam a API; o front não monta XML nem baixa estoque sozinho.

## Rotas

Pedidos — `src/app/(auth)/pedidos`:

- `/pedidos`
- `/pedidos/novo`
- `/pedidos/[id]`
- Atalho do menu PDV: `/pedidos?origem=POS` (mesma página, query de origem)

Ordens — `src/app/(auth)/ordens-servico`:

- `/ordens-servico`
- `/ordens-servico/nova`
- `/ordens-servico/[id]`

Tipos de problema (cadastro da OS):

- `/tipos-problema`, `/tipos-problema/novo`, `/tipos-problema/[id]/editar`

Modelos de impressão de pedido e de OS ficam em Configurações ([configuracoes.md](configuracoes.md)).

## Services / hooks

- `src/services/dav.service.ts`, schema `src/schemas/dav.schema.ts`
- `src/services/ordem-servico.service.ts`, hook `src/hooks/use-ordem-servico.ts`
- `src/services/tipo-problema.service.ts`, schema `tipo-problema.schema.ts`
- `src/services/modelo-impressao-pedido.service.ts`, `src/services/modelo-impressao-os.service.ts`
- Hooks de modelo: `use-modelo-impressao-pedido.ts`, `use-modelo-impressao-os.ts`
- Editor de pedido: `(auth)/pedidos/components/pedido-editor.tsx` (empresa ativa)

Chaves da OS (`ordemServicoQueryKeys` e prefixos invalidos em `use-ordem-servico.ts`):

- `["ordens-servico", ...]`
- detalhe, `["ordem-servico-itens", id]`, `["ordem-servico-eventos", id]`, `["ordem-servico-faturamentos", id]`, `["ordem-servico-lotes", id]`
- config: `ordemServicoQueryKeys.config(idempresa)`
- tipos: `["tipos-ordem-servico-evento", idempresa]`
- busca de item: `["produtos-os-busca", ...]`, `["cfops-os-item", idempresa]`

Colunas: `TABELA_ORDENS_SERVICO`, `TABELA_TIPOS_PROBLEMA`.

## Estado compartilhado

- Salvar OS invalida a lista e o detalhe/itens/eventos/faturamentos/lotes daquele id. Outra aba aberta no mesmo id depende disso (keep-alive).
- Item de OS lê produtos e CFOP. Mudar o cadastro sem invalidar `["produtos"]` / `["cfops"]` deixa o modal desatualizado.
- Configuração da OS (`/configuracoes?tab=ordem-servico`, form `ordem-servico-form.tsx`, query `["cfops-config-os", idempresa]`) altera o padrão usado na abertura da OS.
- Pedido da maquininha é filtro `origem=POS` na mesma lista de `/pedidos`, não uma rota nova.

## Permissões / guards

Em `REGRAS_ACESSO_ROTAS`:

- `/pedidos` — feature `notas_fiscais`; perfis `proprietario`, `admin`, `financeiro`, `usuario`
- `/ordens-servico` e `/tipos-problema` — feature `ordem_servico`; os mesmos perfis de operação

Menu repete feature + `PERFIS_OPERACAO`. Garçom **não** está nessa lista: `/pedidos` e `/ordens-servico` não entram em `GARCOM_ALLOWED_ROUTES`.

## O que não remover

- Schemas `dav.schema.ts` e `ordem-servico.schema.ts` (há teste em `ordem-servico.schema.test.ts`).
- Blocos de lote e CFOP do item da OS.
- Query `origem` na listagem de pedidos.
- Empresa ativa no editor. Sem ela a página não deve gravar em outra empresa.

## Regressões típicas

- Fundir pedido de venda com pedido de compra (`["pedidos-compra"]`).
- Invalidar só `["ordens-servico"]` e esquecer itens/faturamentos: a ficha aberta fica com totais velhos.
- Tirar a feature `ordem_servico` do guard e o menu some, ou o inverso: a rota continua bloqueada se a feature sair do plano (`["meu-plano"]`).
- Apagar tipos de problema como “cadastro morto”: a OS e a regra de rota apontam para eles.
