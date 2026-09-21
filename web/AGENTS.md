# Agentes no front (`web/`)

Leia este arquivo antes de editar telas, rotas, hooks, services ou estado do Next.js.

Contexto do monorepo: [../AGENTS.md](../AGENTS.md). Pontos que quebram o sistema inteiro: [../docs/sistema/pontos-criticos.md](../docs/sistema/pontos-criticos.md). Módulos de tela: [docs/modulos/README.md](docs/modulos/README.md).

## O que este pacote é

App Next.js (App Router) em `web/src/app`. UI com shadcn/ui. Dados remotos com TanStack React Query. Formulários com react-hook-form + Zod. Sessão com better-auth. HTTP em `src/lib/axios.ts` (`NEXT_PUBLIC_API_URL`, cookie `withCredentials`, header `Authorization` quando há token).

O front **não** acessa PostgreSQL e **não** implementa regra de negócio do backend (tributação, estoque, financeiro, SEFAZ). Ele monta payload, valida formulário e consome a API.

## Convenção ao mudar código

- Chamada HTTP fica em `src/services/<domínio>.service.ts` (sem React, sem React Query, sem schema de formulário).
- Leitura/escrita assíncrona na UI passa por hook (`src/hooks`) ou `useQuery`/`useMutation` na página, chamando o service.
- Validação de formulário fica em `src/schemas/*.ts` (`z.infer`). Não apague o schema “porque a API já valida”.
- `"use client"` só onde há hook, evento ou browser. `page.tsx` compõe; `layout.tsx` estrutura.
- Datas de tela: dayjs (`src/lib/date.ts`). Não troque por `Date` solto na formatação.
- Não grave token, senha ou certificado em `localStorage`. A empresa ativa **é** persistida de propósito (ver abaixo).

## Sessão, empresa e permissão (não “limpar”)

| Peça | Onde | Efeito se quebrar |
| --- | --- | --- |
| Cookie/proxy | `src/proxy.ts` | Rota privada sem sessão vai para `/entrar?redirect=`. `/entrar` e `/registrar` com sessão vão para `/dashboard`. |
| Perfil | query `["perfil"]` em `src/hooks/use-auth.ts` → `authService.getProfile()` | Menu, guards e logout dependem disso. Logout chama `queryClient.clear()`, limpa token e empresa. |
| Empresa ativa | `EmpresaProvider` (`src/provider/empresa-provider.tsx`), chave `empresa:mais-gestao` | `src/lib/axios.ts` envia `x-empresa-id` em **toda** request. Troca de empresa (`CompanyToogle`) **não** invalida o cache sozinha. |
| Lista de empresas | `["empresas-usuario", userId]` | Sem empresa, `ProtectedRoute` manda para `/empresas/nova`. |
| Plano / módulos | `["meu-plano", idusuario, idempresa]`, `staleTime` infinito | Menu (`useNavFiltrada`) e `podeAcessarRota` leem `hasFeature` / `hasModulo`. |
| Abas | `NavAbasAbertasProvider` + keep-alive (`mais-gestao:nav-abas-abertas`) | Formulário pode ser restaurado por `useRascunhoAbaForm`. Fechar aba ou mudar o path perde ou vaza rascunho. |
| Layout do menu | `["preferencias-ui-usuario"]` e `mais-gestao:layout-menu` | Sidebar vs topbar. O layout `(auth)` espera o carregamento para não piscar o menu errado. |

Guards (código confirmado):

- Grupo `(auth)`, `(pdv)`, `(gourmet)`, `(garcom)`: `ProtectedRoute`.
- Grupo `(super)`: `SuperProtectedRoute` (só perfil `super`).
- Perfil `super` no ERP é desviado para `/super/dashboard`.
- Perfil `garcom` só entra em `/pdv`, `/garcom`, `/vendas-pdv`, `/fechamentos-caixa` e `/gourmet/...` (a rota exata `/gourmet` é negada em `isRouteAllowedForGarcom`).
- Prefixo com regra extra: `src/lib/regras-acesso-rotas.ts`. Prefixo **sem** regra passa no guard. O menu (`src/constants/nav-constants.ts` + `src/lib/acesso-navegacao.ts`) esconde item por perfil/feature/módulo, mas isso **não** é a mesma lista do guard. Perfil `usuario` (sem `proprietario`/`admin`/`financeiro`) vê menu reduzido (Dashboard, Pesquisar, Clientes, Configurações, Ajuda).

## Checklist ao mudar estado compartilhado

Se alterar escrita de empresa, `["perfil"]`, `["meu-plano"]`, `["empresas-usuario"]`, `["preferencias-ui-usuario"]`, `["financeiro"]`, `["produtos"]`, `["entidades"]`, `["plano-contas"]`, `["caixa-pdv-aberto"]` ou abas/rascunho, confira estas rotas no mesmo fluxo:

1. `/entrar` → `/dashboard` (e, se perfil `super`, `/super/dashboard`; se `garcom`, `/garcom`).
2. Troca de empresa no topo e uma listagem que usa `empresa.id` na query (`/produtos`, `/contas-pagar` ou `/nota-fiscal-venda`).
3. `/empresas/nova` quando o usuário não tem empresa.
4. Uma rota com feature (`/nota-fiscal-venda`, `/ordens-servico`, `/contabilidade/efd`) e o item correspondente no menu.
5. `/pdv` e `/gourmet` se mexeu em caixa (`CaixaPdvProvider`).
6. `/configuracoes?tab=integracoes-contabeis` e `/configuracoes?tab=nfe` se mexeu em aba ou query string de configuração.

Detalhe por domínio: [docs/modulos/README.md](docs/modulos/README.md).
