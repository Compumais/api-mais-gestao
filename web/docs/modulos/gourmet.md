# Gourmet e garçom

## Propósito

Mesas, comanda e venda rápida de salão, mais o app enxuto do garçom. Caixa é o mesmo contexto do PDV web.

## Rotas

Grupo `(gourmet)` — layout com caixa e overlay:

- `/gourmet` — mapa de mesas
- `/gourmet/conta/[id]`
- `/gourmet/venda-rapida`

Grupo `(garcom)` — sem overlay de caixa:

- `/garcom`
- `/garcom/comanda/[id]`

Cadastro de grupo de cardápio: `/grupos-gourmet` ([cadastros.md](cadastros.md)).

Configuração do cardápio público: `/cardapio-delivery` — só módulo gourmet. O cliente abre `/cardapio/[slug]` (rota pública, ver [publico.md](publico.md)). Pedidos vão para o PDV Electron (`electron/sync/pedidos-cardapio.ts`), que chama o ingest local e imprime na cozinha.

## Services / hooks

- `src/services/conta-mesa.service.ts`, `src/services/conta-mesa-item.service.ts`
- `src/services/grupos-gourmet.service.ts`
- `src/services/cardapio-delivery.service.ts` e `src/schemas/cardapio-delivery.schema.ts` — config autenticada do cardápio público
- `src/hooks/use-fechar-venda.ts` — fecha conta, invalida mesas e NFC-e
- `src/hooks/use-produtos-garcom.ts`
- `src/hooks/use-caixa-pdv.tsx` no layout gourmet
- Schemas: `conta-mesa.schema.ts`, `conta-mesa-item.schema.ts`, `fechar-conta.schema.ts`, `grupo-gourmet.schema.ts`
- Util: `src/lib/gourmet-utils.ts`, `src/lib/garcom-utils.ts`
- `guardCaixa` em `(gourmet)/gourmet/page.tsx` impede abrir mesa/venda sem caixa (além do overlay)

Chaves confirmadas:

- `["contas-mesa", empresa.id, { status }]` e prefixo `["contas-mesa"]`
- `["conta-mesa", id]`, `["conta-mesa-itens", id]`
- `["nfce", idempresa]` no fechamento (`use-fechar-venda.ts`)
- `["grupos-gourmet"]`
- `["cardapio-delivery", empresa.id]`

## Estado compartilhado

Fechar venda invalida mesas, itens da conta e a lista de NFC-e. A consulta `/nfce` depende dessa invalidação para mostrar o cupom novo.

Garçom e gourmet leem as mesmas contas. Abrir mesa no diálogo do garçom invalida `["contas-mesa"]`.

Caixa aberto é compartilhado com `/pdv` ([pdv.md](pdv.md)).

## Permissões / guards

`REGRAS_ACESSO_ROTAS`:

- `/gourmet` — módulo `gourmet`; perfis `proprietario`, `admin`, `garcom`
- `/garcom` — módulo `gourmet`; os mesmos perfis
- `/grupos-gourmet` — módulo `gourmet` (sem lista de perfil na regra)
- `/cardapio-delivery` — módulo `gourmet` (sem lista de perfil na regra)

Exceção em `isRouteAllowedForGarcom`: path **igual** a `/gourmet` retorna falso; path `/gourmet/...` (conta, venda rápida) retorna verdadeiro. O garçom entra pelo `/garcom`, não pelo mapa `/gourmet`.

Quem não é garçom e não tem o módulo no `["meu-plano"]` é desviado para a home.

## O que não remover

- Zod de fechar conta (pagamentos).
- Invalidação de `["nfce", idempresa]` ao fechar venda.
- `guardCaixa` + overlay. Os dois existem; tirar um deixa a mesa abrir com caixa fechado ou o inverso, conforme a tela.
- Módulo `gourmet` no plano. Sem ele o menu e o guard escondem o salão e o cardápio delivery.
- Checkbox `exibircardapiodelivery` no produto (aba gourmet). Sem grupo gourmet + flag o item não entra no cardápio público.

## Regressões típicas

- Liberar `/gourmet` para o perfil garçom “para simplificar” e furar `isRouteAllowedForGarcom`.
- Colocar `CaixaPdvProvider` no layout do garçom sem alinhar com o overlay: hoje o garçom não monta esse provider.
- Fechar conta sem invalidar itens: a comanda aberta em outra aba (keep-alive) continua com consumo antigo.
