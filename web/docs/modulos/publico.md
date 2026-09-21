# Público

## Propósito

Landing, entrada na conta, textos legais, fallback offline e resposta de cotação de compra sem sessão. O grupo de rota `(auth)` **não** é esta área: ele é o ERP logado.

## Rotas

Confirmadas em `web/src/app`:

- `/` — `page.tsx`
- `/entrar` — `entrar/page.tsx`
- `/registrar` — `registrar/page.tsx`
- `/termos-de-servico`
- `/politica-de-privacidade`
- `/~offline`
- `/cotacao-compra/[token]` — pública no `src/proxy.ts` (`pathname.startsWith("/cotacao-compra/")`)
- `/cardapio/[slug]` — cardápio público de delivery no `src/proxy.ts` (`pathname.startsWith("/cardapio/")`)
- `/slice-simulator` — existe a página; **não** está em `PUBLIC_ROUTES`. Sem sessão o proxy redireciona para `/entrar`.

`PUBLIC_ROUTES` em `src/proxy.ts`: `/`, `/entrar`, `/registrar`, `/termos-de-servico`, `/politica-de-privacidade`, `/~offline`, mais `/cotacao-compra/`, `/cardapio/` e `/brand/`.

Com sessão, `/entrar` e `/registrar` redirecionam para `/dashboard` (o destino final do perfil `super`/`garcom` é ajustado no client, em `resolveRedirectForUser`).

## Services / hooks

- `src/services/auth.service.ts` e `src/lib/auth-client.ts` (better-auth, `baseURL` = `NEXT_PUBLIC_API_URL`).
- `src/hooks/use-auth.ts` — query `["perfil"]`.
- `src/components/login-form.tsx` invalida `["perfil"]` e pode chamar `selecionarEmpresa` na primeira empresa.
- `src/schemas/auth.schema.ts` e `src/schemas/demonstracao.schema.ts` (formulário da home).
- Cotação pública: `src/services/cotacoes-compra.service.ts` e `src/schemas/cotacao-compra.schema.ts`. O front só envia a resposta; a regra da cotação fica na API.
- Cardápio delivery público: `src/services/cardapio-publico.service.ts`. Catálogo, taxa, pizza meio a meio e PIX são recalculados na API (`POST /publico/cardapio/:slug/pedidos`). A página `src/app/cardapio/[slug]` só monta menu, sacola e checkout.

## Estado compartilhado

- Login marca sessão (`marcarSessaoFrontend`) e pode gravar `empresa:forcar-primeira` para o `ProtectedRoute` escolher a primeira empresa.
- Logout (em qualquer tela autenticada) limpa token, cookie de sessão do front, empresa e o cache do React Query.

## Permissões / guards

Proxy deixa passar só as rotas públicas. Não há `ProtectedRoute` nestas páginas. Metadata de SEO das rotas públicas segue a regra em `web/.cursor/rules/SEO.mdc` (title, description, openGraph).

## O que não remover

- `redirect` na query de `/entrar`.
- Schema Zod do login/registro.
- Exceção `/cotacao-compra/` no proxy. Sem ela o fornecedor cai no login.
- Exceção `/cardapio/` no proxy. Sem ela o cliente do delivery cai no login.
- Não colocar segredo ou token de cotação em `localStorage`.

## Regressões típicas

- Tirar uma rota de `PUBLIC_ROUTES` e a landing ou o termo de uso passam a exigir login.
- Incluir `/dashboard` no redirect do proxy para todo mundo: perfil `super` e `garcom` precisam do ajuste em `src/lib/perfis.ts` depois do perfil carregar.
- Tratar `/cotacao-compra/[token]` como tela interna e exigir empresa ativa.
- Tratar `/cardapio/[slug]` como tela autenticada: o link público some para o cliente.
