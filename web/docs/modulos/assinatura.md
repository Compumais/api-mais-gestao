# Assinatura e planos (tenant)

## Propósito

O proprietário vê o plano SaaS, faz checkout e acompanha a assinatura. Features e módulos desse plano alimentam o menu e o `ProtectedRoute` de todo o ERP. Administração dos planos (catálogo) é outra área: [super-admin.md](super-admin.md).

## Rotas

- `/meus-planos`
- `/checkout`
- `/assinatura`

Todas em `src/app/(auth)/`.

## Services / hooks

- `src/services/planos.service.ts` — `getMeuPlano`
- `src/services/assinaturas.service.ts`
- `src/services/checkout.service.ts`
- `src/hooks/use-plano.ts` — `usePlano` e `useEntitlements`

Cache: `["meu-plano", idusuario, idempresa]` com `staleTime: Infinity` e `refetchOnWindowFocus: false`.

## Estado compartilhado

`useEntitlements` é lido por:

- `useNavFiltrada` (esconde Gourmet, NFS-e, NF-e, OS, EFD, etc.)
- `ProtectedRoute` → `podeAcessarRota`
- `CompanyToogle` (`limites.maxempresas`)

Depois do checkout, se ninguém invalidar `["meu-plano"]`, o menu continua no plano antigo até logout (`queryClient.clear()`) ou reload que descarte o cache. Invalidação explícita no sucesso do checkout: **não confirmada** neste levantamento. Ao mexer em checkout, conferir se a chave é atualizada.

## Permissões / guards

As três rotas: perfil `proprietario` apenas (`REGRAS_ACESSO_ROTAS`). `admin` e `financeiro` não passam no guard e voltam para `/dashboard`.

Perfil `super` nem fica nestas rotas: é mandado para `/super/dashboard`.

## O que não remover

- Checagem de `proprietario` nas três rotas juntas. Liberar só o checkout abre pagamento para outro perfil.
- Vínculo da query com `idempresa`. O plano é resolvido com a empresa selecionada (`getMeuPlano(idempresa)`).
- `hasFeature` / `hasModulo` como funções. Trocar para boolean solto no componente duplica a regra e o menu diverge do guard.

## Regressões típicas

- Encurtar o `staleTime` sem querer e, ao contrário, aumentar ainda mais: o usuário paga e não vê o módulo.
- Usar `user.plano` do `["perfil"]` no lugar de `getMeuPlano`. O perfil tem `plano?` opcional; entitlements (features/módulos/limites) vêm de `["meu-plano"]`.
- Misturar com `/super/planos`, que edita o catálogo da plataforma (`["admin-planos-saas"]`).
