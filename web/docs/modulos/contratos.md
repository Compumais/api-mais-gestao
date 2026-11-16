# Gestão de Contratos (Web)

## Rotas

- `/contratos` — listagem e CRUD
- `/contratos/novo`, `/contratos/[id]/editar`
- `/contratos/faturamento` — prévia e confirmação de lote
- `/contratos/faturamento/[id]` — detalhe/retomada do lote
- `/remessas-bancarias` — download CNAB e marcar enviada

## Services

- `web/src/services/contrato.service.ts`
- `web/src/services/remessa-bancaria.service.ts`

## Permissões

Menu Financeiro: perfis `proprietario`, `admin`, `financeiro`.
