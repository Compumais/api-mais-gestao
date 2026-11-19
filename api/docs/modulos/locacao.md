# Locação de equipamentos

## Propósito no produto

Cadastro de bens únicos e contratos de locação. O financeiro nasce só no fechamento: conta a receber a prazo, ou lançamento à vista no caixa ou na conta corrente. Atraso depois da data prevista soma a diária congelada no item.

## Pastas e entrypoints

| Plugin | Prefixo |
| --- | --- |
| `src/controllers/http/equipamento/rotas.ts` | `/equipamentos` |
| `src/controllers/http/locacao/rotas.ts` | `/locacoes` |

Services: `src/service/equipamento/`, `src/service/locacao/`.

Schema: `drizzle/tables/equipamento.ts`, `locacao.ts`, `locacao-item.ts`.

## Invariantes

- Bem `alocado` não entra em outra locação aberta. A troca de situação para disponível ocorre no fechamento ou no cancelamento.
- Preço do período e diária ficam no item. Alterar o cadastro não muda locação já aberta enquanto o período do item não mudar.
- Data prevista = início + (dias do período × quantidade) − 1. Diária: 1, semanal: 7, quinzenal: 15, mensal: 30.
- Devolução até a data prevista cobra só o período. Devolução antecipada não devolve diferença. Cada dia seguinte soma a diária.
- A prazo: um título `financeiro` tipo `R`, `tipoorigem = 6`, `idorigem` = id da locação. À vista: crédito em `contacorrentelancamento`, sem título.
- Locação fechada ou cancelada não é editada. Não há devolução parcial nem estorno nesta versão.
- Endereço de alocação fica na locação e pode ser diferente do cadastro do cliente.

## O que quebra se alterar ou apagar

- Disponibilidade do patrimônio e o título ou o lançamento gerados no fechamento.
- Baixa do título continua no módulo financeiro; não duplicar a quitação aqui.
