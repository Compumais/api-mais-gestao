# Cadastros auxiliares

## Propósito no produto

Tabelas de apoio e trilha de auditoria usadas por vários módulos. Não autorizam nota nem movimentam saldo sozinhas.

Pastas cobertas:

- `src/controllers/http/area/` — `/areas`
- `src/controllers/http/localidade/` — `/localidades/estados`, municípios por UF, `GET /localidades/cep/:cep`
- `src/controllers/http/local-retirada/` — `/locais-retirada`
- `src/controllers/http/receita-sem-contribuicao/` — `/receitas-sem-contribuicao`
- `src/controllers/http/auditoria/` — `GET /auditoria`
- `src/controllers/http/shared/` — próximo código reutilizado por produtos, bancos, hierarquias, condições de pagamento (`proximo-codigo-query.ts`)

Todas as rotas acima usam `verifyJwt` nos `rotas.ts` lidos (localidade inclusive).

Services espelhados em `src/service/area/`, `local-retirada/`, `receita-sem-contribuicao/`, `auditoria/`. Localidade: handlers no controller; client de CEP não foi aberto neste levantamento (endereço por CEP existe na rota).

Schema: `drizzle/tables/area.ts`, `local-retirada.ts`, `receita-sem-contribuicao.ts`, `audit-logs.ts`. Ordenação de auditoria: `ORDENAR_AUDITORIA_CAMPOS` em `src/repositories/auditoria-repositories.ts`.

## Contratos externos

ERP web. Auditoria é consulta interna do que os services gravaram com `criarAuditoriaService`. PDV pode usar local de retirada se o fluxo de venda enviar o id — chamada direta não confirmada. POS Android: não confirmado.

## Configuração crítica

Nenhuma env própria confirmada. Próximo código usa `src/repositories/proximo-codigo-repositories.ts` e `ordenacao-codigo.ts`. Não duplicar a sequência no controller.

## Invariantes

- Auditoria é append-only na prática do produto: a rota exposta é GET. Não criar DELETE de log sem pedido explícito.
- Services de negócio chamam `criarAuditoriaService` depois do sucesso. Remover a chamada apaga a trilha, não a operação.
- Área, local de retirada e receita sem contribuição são por empresa (`verificarUsuarioPertenceEmpresa` nos services lidos de local de retirada).
- CEP e municípios alimentam endereço de empresa, entidade e fiscal. Quebrar o formato de UF/município desalinha IBGE usado na nota.
- Próximo código é compartilhado. Mudar o padding ou o tipo (`number` versus string) no helper quebra vários cadastros ao mesmo tempo.

## O que quebra se alterar ou apagar

- Filtros de listagem que usam área, local de retirada ou receita.
- Endereço por CEP no cadastro.
- Tela de auditoria e a ordenação por campos permitidos (Zod `z.enum(ORDENAR_AUDITORIA_CAMPOS)`).
- Botões “próximo código” de produto, banco, hierarquia e condição de pagamento.

## Dependências de outros módulos da API

Empresas (tenant), usuários (quem fez a ação na auditoria). Consumido por cadastros fiscais e financeiros; não depende de SEFAZ.

## Testes relacionados

- `src/controllers/http/auditoria/listar-auditorias.ts` valida query com Zod; teste dedicado de auditoria: não confirmado.
- Services de área/localidade: testes unitários não confirmados na amostra lida.
