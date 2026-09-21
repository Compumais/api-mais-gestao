# Estoque e produção

## Propósito

Consulta de saldo, ficha e ordem de produção, exportação para balança (MGV) e relatórios de cadastro/estoque de produto. Baixa de estoque na venda não é calculada no front: o client só exibe o retorno (`src/lib/avaliar-resultado-baixa-estoque.ts`, `src/lib/estoque-venda.ts`).

## Rotas

- `/estoque` — redirect para `/produtos`
- `/fichas-producao`, `/fichas-producao/novo`, `/fichas-producao/[id]/editar`
- `/producoes`
- `/ferramentas/exportar-mgv`
- `/fator-conversao` — cadastro; efeito na NF de compra. Ver [cadastros.md](cadastros.md).
- Relatórios (menu Estoque e Produtos), página dinâmica `/produtos/relatorios/[tipo]`:
  - `/produtos/relatorios` (hub)
  - tipos citados no menu: `qualidade`, `cadastro`, `ean`, `precos`, `fiscal`, `comercial`, `compras`, `unidades`, `composicao`, `auditoria`, `estoque`, `inventario`, `movimentacoes`

## Services / hooks

- `src/services/saldo-estoque.service.ts` — hook `src/hooks/use-saldos-estoque.ts`, chave `["saldos-estoque", idempresa]`
- `src/services/movimento-estoque.service.ts`
- `src/services/estoque-gestao.service.ts`
- `src/services/local-estoque.service.ts` — `["locais-estoque", empresa.id]` na NF de venda
- `src/services/lotes.service.ts` — `["lotes-produto-item", idempresa, idproduto]` na NF; OS usa chaves de lote em `use-ordem-servico.ts`
- `src/services/ficha-producao.service.ts`, `src/services/producao.service.ts`
- `src/services/relatorios-produtos.service.ts` — `["relatorios-produtos", tipo, empresaId, search]`
- `src/services/mgv.service.ts`, `src/services/custo-produto.service.ts`
- Schemas: `ficha-producao.schema.ts`, `mgv.schema.ts`, `fator-conversao.schema.ts`

Comentário em `use-saldos-estoque.ts`: se não houver saldo controlado, a venda é permitida (produto sem controle). Não inverter isso no front.

## Estado compartilhado

- Saldo e lote são lidos na emissão de NF (`bloco-lotes-item-nfe.tsx`) e na OS. Invalidar só a tela de relatório não atualiza o item da nota.
- `["produtos"]` é o cadastro; relatório usa `["relatorios-produtos", ...]`. São caches diferentes.
- Preferências de coluna: `TABELA_FICHAS_PRODUCAO`, `TABELA_PRODUCOES`.

## Permissões / guards

- `/produtos/relatorios` (e filhos): perfis `proprietario`, `admin`, `financeiro` em `REGRAS_ACESSO_ROTAS`.
- Fichas, produções e relatórios de estoque no menu: `PERFIS_GESTAO`. Guard de rota específico para `/fichas-producao` e `/producoes`: **não confirmado**.
- Exportar MGV no menu: `PERFIS_ADMIN`.

## O que não remover

- `idempresa` na query de saldo e de relatório. A página de relatório mostra estado vazio sem empresa.
- Schema da ficha (componentes/quantidades). A produção consome essa estrutura via API.
- Leitura de lote na NF e na OS. Apagar o bloco de lote no front não desliga o controle no cadastro do produto.

## Regressões típicas

- Tratar `/estoque` como tela própria e remover o redirect: o menu de posição de estoque aponta para `/produtos/relatorios/estoque`, não para `/estoque`.
- Recalcular saldo no client “para ficar mais rápido”. O número exibido tem de vir do service.
- Exportar MGV sem a empresa ativa ou trocar o schema do arquivo: a balança consome o layout gerado pela API (`mgv.service` / `mgv.schema`).
