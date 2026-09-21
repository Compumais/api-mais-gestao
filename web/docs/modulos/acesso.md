# Acesso (sessão, empresa, menu)

## Propósito

Decide quem entra no ERP, qual empresa vai no header HTTP e o que o menu mostra. Não é uma pasta única: está no proxy, nos layouts e em `ProtectedRoute`.

## Rotas

Layouts que exigem sessão:

- `src/app/(auth)/layout.tsx` — shell do ERP (sidebar ou topbar, abas, busca).
- `src/app/(pdv)/layout.tsx` e `src/app/(gourmet)/layout.tsx` — tela cheia + `CaixaPdvProvider`.
- `src/app/(garcom)/layout.tsx` — tela cheia, sem caixa.
- `src/app/(super)/layout.tsx` — `SuperProtectedRoute`.

Criação da primeira empresa: `/empresas/nova` (`(auth)/empresas/nova`).

## Services / hooks

- `src/services/auth.service.ts` — perfil. Sessão better-auth em `src/lib/auth-client.ts`.
- `src/services/empresas.service.ts` — listar/criar empresa.
- `src/services/planos.service.ts` — `getMeuPlano` (features, módulos, limites).
- `src/services/configuracao-usuario.service.ts` — preferência de menu.
- Hooks: `use-auth.ts`, `use-empresa.ts` (reexporta o provider), `use-empresas-usuario.ts`, `use-plano.ts` (`usePlano` e `useEntitlements`), `use-nav-filtrada.ts`, `use-preferencias-ui-usuario.ts`, `use-nav-abas-abertas.tsx`.
- HTTP: `src/lib/axios.ts`. Header confirmado: `x-empresa-id` (`HEADER_EMPRESA_ID` em `src/constants/empresa-constants.ts`), lido do `localStorage` a cada request.

O front não decide permissão de banco. Ele só esconde menu e redireciona com as regras abaixo. A API continua sendo a autoridade.

## Estado compartilhado

Outras telas leem isto. Mudar a chave ou o formato quebra o ERP inteiro.

| Chave / store | Quem escreve | Quem lê |
| --- | --- | --- |
| `["perfil"]` | `useAuth` / login | Layout, guards, menu, logout |
| `empresa:mais-gestao` | `selecionarEmpresa` | Axios, quase toda listagem via `useEmpresa().localStorageEmpresa` |
| `empresa:forcar-primeira` (sessionStorage) | login | `ProtectedRoute` |
| `["empresas-usuario", userId]` | `useEmpresasUsuario` | Guard e `CompanyToogle` (`src/components/company-toogle.tsx`) |
| `["meu-plano", idusuario, idempresa]` | `useEntitlements` | Menu e `podeAcessarRota`. `staleTime` infinito: plano novo não aparece até o cache cair |
| `["preferencias-ui-usuario"]` + `mais-gestao:layout-menu` | preferências de UI | Layout sidebar/topbar e visibilidade de colunas (`TABELA_*` em `use-preferencias-ui-usuario.ts`) |
| `mais-gestao:nav-abas-abertas` | `NavAbasAbertasProvider` | Keep-alive e `useRascunhoAbaForm` |

`CompanyToogle` grava a empresa e **não** chama `invalidateQueries`. Query sem `empresa.id` na chave pode mostrar dado da empresa anterior.

`Providers` (`src/app/providers.tsx`): Theme, React Query, `EmpresaProvider`. `useEmpresa` fora desse provider lança erro.

## Permissões / guards

1. `src/proxy.ts` — cookie de sessão (`AUTH_SESSION_COOKIE` ou nome com `mais-gestao` / `session_token`). Sem cookie e fora do público → `/entrar?redirect=`.
2. `ProtectedRoute` — sem usuário → `/entrar`. Sem empresa na lista → `/empresas/nova`.
3. `isSuper` → `/super/dashboard` se o path não começa com `/super`.
4. `isGarcom` + `isRouteAllowedForGarcom`.
5. `podeAcessarRota` (`src/lib/regras-acesso-rotas.ts`): só os prefixos listados. Sem regra, a rota passa.
6. Menu: `src/constants/nav-constants.ts` + `useNavFiltrada`. Perfil restrito (`isPerfilMenuRestrito`: perfil `usuario` sem perfil de gestão) fica com Dashboard, Pesquisar, Clientes e o rodapé Configurações/Ajuda.
7. Busca global (`src/constants/search-pages.ts`) repete URLs do menu. Item sumir do `DATA` e continuar na busca (ou o contrário) deixa atalho órfão.

Perfis nomeados no código: `usuario`, `admin`, `proprietario`, `financeiro`, `garcom`, `super`.

Features/módulos citados nas regras de rota: `ordem_servico`, `notas_fiscais`, `gourmet`, `nfse`, `sped_efd`.

## O que não remover

- Header `x-empresa-id` e a chave `empresa:mais-gestao`.
- `queryClient.clear()` no logout (senão a próxima conta vê cache da anterior).
- Redirect de quem não tem empresa para `/empresas/nova`.
- Limite `maxempresas` no botão “Adicionar empresa”.
- Lista `REGRAS_ACESSO_ROTAS` ao criar rota nova que o menu já restringe: o guard não herda o menu sozinho.

## Regressões típicas

- Unificar `empresa` e `localStorageEmpresa`: hoje os dois apontam para o mesmo estado. Vários arquivos leem um ou outro.
- Invalidar `["meu-plano"]` com chave parcial errada e o menu libera módulo que o plano não tem (ou esconde tudo enquanto `isLoading`).
- Apagar o keep-alive e achar que o formulário “perdeu estado”: o rascunho vive na aba, não no servidor.
- Tratar o menu como ACL. URL direta de prefixo sem regra (exemplo confirmado: `/contas-pagar` não está em `REGRAS_ACESSO_ROTAS`) não é barrada pelo `ProtectedRoute` para o perfil `usuario`.
