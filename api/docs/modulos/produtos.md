# Produtos

## Propósito no produto

Cadastro de produtos (e grupos, departamentos, hierarquia, unidade, fator de conversão e custo). Base de estoque, emissão, compra, PDV e produção.

## Pastas e entrypoints

| Plugin | Prefixo |
| --- | --- |
| `src/controllers/http/produtos/rotas.ts` | `/produtos` |
| `src/controllers/http/custo-produto/rotas.ts` | `/custos-produto` |
| `src/controllers/http/unidade-medida/rotas.ts` | `/unidades-medida` |
| `src/controllers/http/grupo-gourmet/rotas.ts` | `/grupos-gourmet` |
| `src/controllers/http/hierarquia/rotas.ts` | `/hierarquias` |
| `src/controllers/http/departamento/rotas.ts` | `/departamentos` |
| `src/controllers/http/fator-conversao/rotas.ts` | `/fatores-conversao` |

`produtos` exige `verifyJwt`. O parâmetro `:id` é restringido a UUID para não capturar rotas estáticas (`catalogo-pdv`, `exportar`, etc.).

Rotas de produto além do CRUD: exportar, `GET /produtos/catalogo-pdv`, tributação por CFOP, exportar MGV, próximo código, template, importar (preview e efetivo), inativar, alterar em massa, lotes, imagem (galeria).

Services: `src/service/produto/`, `custo-produto/`, `unidade-medida/`, `grupo-gourmet/`, `hierarquia/`, `departamento/`, `fator-conversao/`.

Schema: `drizzle/tables/produtos.ts`, `produto-imagem.ts`, `produto-fornecedor.ts`, `produto-relatorio-estruturas.ts`, `custo-produto.ts`, `unidade-medida.ts`, `grupo-gourmet.ts`, `hierarquia.ts`, `departamento.ts`, `fator-conversao.ts`, `marca.ts` (tabela sem plugin HTTP próprio encontrado).

Fatores padrão: `criarFatoresConversaoPadraoService` na criação da empresa. Script npm `popular-fatores-conversao-padrao`.

## Contratos externos

- Web: CRUD, importação, imagens, custo.
- PDV: `GET /produtos/catalogo-pdv`. Perfil garçom pode `GET /produtos`.
- POS Android: não confirmado.

## Configuração crítica

- `PRODUTO_IMAGENS_PATH` — arquivos de imagem; o banco guarda referência (`src/service/produto/imagem-produto.ts`).
- `GRUPO_GOURMET_IMAGENS_PATH` — imagens de grupo (`src/service/grupo-gourmet/imagem-grupo-gourmet.ts`).
- Limites no plugin de produtos: importação 20 MB; imagem 5 MB. Parser de `image/jpeg`, `image/png`, `image/webp`.

Grupo gourmet não usa `requireModulo(gourmet)` no `rotas.ts` lido. Conta mesa usa. Não assumir que apagar o módulo SaaS gourmet desliga este CRUD.

## Invariantes

- Produto é da empresa. Inativar não é o mesmo que excluir (`PATCH /produtos/inativar/:id`).
- Custo (`custoaquisicao`, `customedioinicial`, `precoultimacompra`) é lido na movimentação de estoque da nota quando o item não traz custo.
- Tributação por CFOP e NCM/CEST do produto alimentam emissão. Não zerar campos fiscais “não usados” sem ler `tributacao-por-cfop`.
- Importação tem preview separado do commit.
- Fator de conversão entra na entrada de NF (unidade do fornecedor versus estoque).
- Zod/schemas em `doc-schema/schema.ts` do controller. Services de custo validam acesso ao produto (`validar-acesso-produto.ts`).

## O que quebra se alterar ou apagar

- Catálogo do PDV e baixa de estoque (produto inexistente ou inativo).
- Importação de XML de compra que cadastra ou vincula item.
- Custo médio e histórico (`GET /custos-produto/historico`, `POST /custos-produto/nf`).
- Imagens se o diretório de storage sumir (o banco fica com ponteiro inválido).
- Exportação MGV (`POST /produtos/exportar-mgv`).

## Dependências de outros módulos da API

Empresas, hierarquia/grupo, unidades, fatores, estoque/lotes, fiscal (CFOP, NCM, parametrização), produção (ficha).

## Testes relacionados

- `src/service/produto/listar-produtos.test.ts`
- `src/service/produto/exportar-produtos-mgv.test.ts`
- `src/repositories/produto-historico-repositories.test.ts`
- `src/repositories/relatorio-produtos-repositories.test.ts`
