# Locação de equipamentos (Web)

## Rotas

- `/equipamentos` — cadastro do bem, com preços diária, semanal, quinzenal e mensal
- `/equipamentos/novo`, `/equipamentos/[id]/editar`
- `/locacoes` — listagem
- `/locacoes/novo`, `/locacoes/[id]/editar`
- `/locacoes/[id]` — detalhe, cancelamento e fechamento com prévia

## Services

- `web/src/services/equipamento.service.ts`
- `web/src/services/locacao.service.ts`

## Permissões

Menu Locação: perfis `proprietario`, `admin`, `financeiro`.

O endereço de alocação começa com o endereço do cliente e pode ser alterado. O fechamento escolhe a prazo (conta a receber) ou à vista (caixa ou conta corrente).
