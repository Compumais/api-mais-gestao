# Super admin

## Propósito

Área da plataforma (perfil `super`): usuários globais, planos SaaS, cadastro, informativos e CMS. Não usa o shell do ERP nem a empresa ativa do tenant como guarda. O catálogo de planos editado aqui é o que o tenant enxerga em [assinatura.md](assinatura.md) depois que a API devolve `["meu-plano"]`.

## Rotas

Grupo `src/app/(super)/super`, layout com `SuperProtectedRoute` + `SuperSidebar`:

- `/super` — redirect para `/super/dashboard`
- `/super/dashboard`
- `/super/usuarios`
- `/super/planos`
- `/super/cadastro`
- `/super/informativos`
- `/super/cms`, `/super/cms/nova`, `/super/cms/[id]/editar`

Lista espelhada em `SUPER_ALLOWED_ROUTES` (`src/lib/perfis.ts`).

## Services / hooks

- `src/services/admin.service.ts`
- `src/services/planos.service.ts` na tela de planos (chave de admin, abaixo)
- `src/hooks/use-auth.ts` — o guard só checa `isSuper(user)` a partir de `["perfil"]`

Chaves confirmadas:

- `["admin-planos-saas"]` — mutations em `/super/planos` invalidam essa chave
- `["admin-informativos"]` e `["informativos-publicos"]` — salvar/remover informativo invalida as duas. O banner do ERP (`src/components/informativos-banner.tsx`) lê `["informativos-publicos"]`

Empresa do `EmpresaProvider` continua montada no root, mas o layout super **não** chama `ProtectedRoute` e portanto **não** força `/empresas/nova`.

## Estado compartilhado

- `["perfil"]` com perfil `super`. Se o perfil sumir do array, `SuperProtectedRoute` manda para `getDefaultRouteForUser` (no caso não-super, `/dashboard` ou `/garcom`).
- `ProtectedRoute` do ERP, se um super abrir rota que não começa com `/super`, redireciona para `/super/dashboard`. As duas mãos precisam continuar coerentes com `isRouteAllowedForSuper`.
- Informativo público é o único cache confirmado que a área super escreve e o tenant lê sem ser `meu-plano`.
- Plano do tenant **não** usa `["admin-planos-saas"]`. Alterar o catálogo não atualiza `["meu-plano"]` sozinho (caches diferentes).

## Permissões / guards

- Proxy: área não é pública; exige cookie de sessão.
- `SuperProtectedRoute`: sem usuário → `/entrar`; usuário sem perfil `super` → home desse perfil; path fora de `SUPER_ALLOWED_ROUTES` → `/super/dashboard`.
- Não aplica `podeAcessarRota` / features de módulo do tenant.

## O que não remover

- Redirect de `/super` para `/super/dashboard`.
- Lista `SUPER_ALLOWED_ROUTES` ao criar página nova em `(super)`. Sem a entrada, o guard devolve o usuário ao dashboard super.
- Invalidação de `["informativos-publicos"]` junto com a lista admin. Sem isso o banner do ERP fica velho.
- Separação entre plano admin e `getMeuPlano`.

## Regressões típicas

- Reusar `ProtectedRoute` no layout super e o super sem empresa cai em `/empresas/nova`.
- Deixar o super navegar para `/dashboard`: o `ProtectedRoute` empurra de volta. Não “corrigir” isso removendo o `isSuper` sem um fluxo explícito.
- Editar plano SaaS e esperar o menu do cliente mudar na hora. A chave do cliente é outra e tem `staleTime` infinito.
