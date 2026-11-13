# Guia de Correção Definitiva: MAIS Migration (Isolamento Multi-Tenant)

Este documento descreve a correção obrigatória a ser aplicada no código-fonte do aplicativo **MAIS Migration** para eliminar o risco de colisão de dados entre diferentes empresas migradas de sistemas legados (como Uniplus, Clipp, etc.).

---

## 1. O Problema: Geração de UUIDs Sem Escopo de Empresa

### Como estava implementado:
No código do migrador (`out/main/index.cjs`):
```javascript
const MAIS_MIGRATION_NAMESPACE = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

function destinationId(kind, externalId, sourceSystem = "clipp") {
  return uuid.v5(`${sourceSystem}:${kind}:${externalId}`, MAIS_MIGRATION_NAMESPACE);
}
```

### Por que isso quebra o sistema:
No Uniplus e outros ERPs desktop, cada cliente/instalação possui IDs sequenciais inteiros reiniciando em `1` (`1, 2, 3, ...`).
- Ao migrar a **Empresa A**, a categoria/conta `1` gerava o UUID `X` com `idempresa = empresa_a`.
- Ao migrar a **Empresa B**, a categoria/conta `1` gerava **exatamente o mesmo UUID `X`**.
- Na hora do insert com `ON CONFLICT (id) DO UPDATE SET idempresa = EXCLUDED.idempresa`, o registro era transferido de empresa ou colidia com o da outra empresa, misturando lançamentos de contas correntes e planos de contas de ambas!

---

## 2. A Correção Obrigatória no MAIS Migration

### A. Adicionar `idempresa` no cálculo do `destinationId`

Na função `destinationId`, passe a incluir o `idempresa` no namespace/seed do UUIDv5:

```typescript
export function destinationId(
  kind: string, 
  externalId: string | number, 
  sourceSystem = "clipp", 
  idempresa = ""
): string {
  // O idempresa garante que cada empresa gere UUIDs únicos e isolados
  const seed = idempresa
    ? `${idempresa}:${sourceSystem}:${kind}:${String(externalId).trim()}`
    : `${sourceSystem}:${kind}:${String(externalId).trim()}`;
  return uuidv5(seed, MAIS_MIGRATION_NAMESPACE);
}
```

Onde o `destinationId` for invocado para mapear registros e foreign keys (ex: `mapUniplusRow`, `remapValue`, etc.), garanta a passagem do `idempresa`:
```typescript
function mapUniplusRow(kind: string, raw: Record<string, unknown>, idempresa: string) {
  // ...
  if (lower === "id") {
    out.id = destinationId(kind, String(value), "uniplus", idempresa);
    continue;
  }
  if (scope[lower]) {
    out[destKey] = destinationId(scope[lower], String(value), "uniplus", idempresa);
    continue;
  }
  // ...
}
```

### B. Proteger o campo `idempresa` contra sobrescrita no Upsert

Na função `buildUpsertSql`, adicione `idempresa` à lista `skipUpdate`:

```typescript
function buildUpsertSql(table: string, columns: string[]): string {
  const cols = columns.join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  
  // NUNCA permitir que o idempresa seja transferido em caso de colisão acidental
  const skipUpdate = new Set([
    "id",
    "idempresa",
    "datacadastro",
    "criadoem",
    "datacriacao"
  ]);

  const updates = columns
    .filter((c) => !skipUpdate.has(c))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(",\n  ");

  return `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
ON CONFLICT (id) DO UPDATE SET
  ${updates}`;
}
```

---

## 3. Como Corrigir Empresas Já Migradas que Colidiram

Para bases de dados que já foram migradas com a versão antiga do migrador e apresentam lançamentos ou planos misturados:
Execute o script de auditoria e correção na API:
```bash
cd api
# Simulação para ver os cruzamentos detectados:
pnpm tsx scripts/auditoria-reparo-migracao-uniplus.ts

# Aplicação real da correção (desacoplamento e reatribuição à empresa correta):
pnpm tsx scripts/auditoria-reparo-migracao-uniplus.ts --fix
```
Se o operador preferir, com o novo migrador corrigido e compilado, pode-se excluir os dados da empresa recém-migrada e realizar a migração novamente com os UUIDs segregados.
