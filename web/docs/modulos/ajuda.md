# Ajuda

## Propósito

Central de ajuda dentro do ERP logado (categorias e artigos). Conteúdo vem da API/CMS consumido pelo service, não de cópia fixa no componente. Há um `README.md` antigo em `(auth)/ajuda/` descrevendo layout; a fonte de verdade da rota é o `page.tsx`. Este doc não substitui aquele arquivo.

## Rotas

- `/ajuda`
- `/ajuda/categoria/[slug]`
- `/ajuda/artigo/[slug]` — query `["ajuda-post", slug]`

## Services / hooks

- `src/services/ajuda.service.ts`
- Schema `src/schemas/ajuda-post.schema.ts`
- Artigos do super admin (CMS) invalidam conteúdo público de informativos, não esta chave: ver [super-admin.md](super-admin.md). Ligação direta CMS → `["ajuda-post"]`: **não confirmada**.

Não há hook `use-ajuda` em `src/hooks`.

## Estado compartilhado

A chave `["ajuda-post", slug]` é local ao artigo. Lista de categorias: chave exata não confirmada além do service. Não entra no cache de `["perfil"]` nem de empresa, salvo se o service filtrar por empresa (não confirmado na página do artigo, que busca por `slug`).

## Permissões / guards

Item de menu “Ajuda” sem `acesso` restritivo: aparece para o menu completo e para o perfil restrito (`navSecondary`). Sem entrada em `REGRAS_ACESSO_ROTAS`. Continua atrás do `ProtectedRoute` (não é rota pública do proxy).

## O que não remover

- Rotas dinâmicas `categoria/[slug]` e `artigo/[slug]`. A home de ajuda aponta para elas.
- Schema do post se a tela valida o retorno.
- Sanitização de markdown se o artigo renderiza HTML (`react-markdown` / `rehype-sanitize` estão no `package.json`). Não trocar por `dangerouslySetInnerHTML` cru (regra de `web/.cursor/rules/security.mdc`).

## Regressões típicas

- Tirar a Ajuda do `navSecondary` e o perfil `usuario` perde o único atalho além de Configurações e Clientes.
- Cachear artigo sem `slug` na chave e o texto de um post aparece em outro.
