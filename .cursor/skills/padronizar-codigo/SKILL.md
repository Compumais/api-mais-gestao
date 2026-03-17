---
name: padronizar-codigo
description: Padroniza código aplicando formatação, convenções de estilo e consistência. Usar quando o usuário pedir para padronizar o código, uniformizar estilo ou alinhar arquivos às convenções do projeto.
---

# Padronizar código

## Objetivo

Aplicar padronização consistente ao código: formatação, estilo, organização de imports e convenções do projeto. Respeitar sempre a configuração existente (ex.: biome.json, eslint, prettier).

## Fluxo de padronização

1. **Identificar escopo**: arquivos ou pastas que o usuário indicou, ou o arquivo/contexto atual.
2. **Verificar ferramentas do projeto**: checar se existe `biome.json`, `.eslintrc*`, `prettier.config*` ou scripts `lint`/`format` nos `package.json`.
3. **Aplicar ferramentas primeiro**: preferir executar os scripts do projeto em vez de reescrever manualmente.
4. **Ajustes manuais só quando necessário**: quando não houver ferramenta configurada ou para convenções não cobertas por elas.

## Quando o projeto usa Biome

- **Formatar**: `pnpm format` ou `npx biome format --write <caminho>` (web: `pnpm format` na raiz do web).
- **Lint e correções automáticas**: `pnpm lint` ou `npx biome check --write <caminho>`.
- Respeitar `biome.json` na raiz (ex.: indentação tab, aspas duplas, organize imports).

Se existir `biome.json`:
- Usar **tabs** para indentação.
- Usar **aspas duplas** em JS/TS.
- Manter **organizeImports** ativo (Biome já pode aplicar).

## Convenções gerais a aplicar

- **Nomenclatura**: camelCase para variáveis/funções; PascalCase para tipos/classes/componentes; UPPER_SNAKE_CASE para constantes.
- **Imports**: agrupados e ordenados (bibliotecas → aliases → relativos); remover imports não usados.
- **Espaçamento**: consistência em torno de operadores, após vírgulas e em blocos.
- **Tamanho**: funções/componentes muito longos — sugerir quebra em funções/componentes menores, sem alterar comportamento.
- **Idioma**: comentários e mensagens ao usuário em português quando fizer parte do padrão do projeto.

## Checklist antes de finalizar

- [ ] Formatação alinhada ao biome.json / eslint / prettier do projeto.
- [ ] Imports organizados e sem não utilizados.
- [ ] Nomenclatura consistente no arquivo e com o resto do projeto.
- [ ] Nenhuma alteração de comportamento ou lógica; apenas estilo e estrutura.

## Resposta ao usuário

Ao terminar, resumir o que foi feito (ex.: “Formatado com Biome”, “Imports organizados”, “Ajustes de nomenclatura em X e Y”) e, se tiver executado comandos, citar quais (ex.: `pnpm format`, `pnpm lint`).
