---
name: resolucoes-complexas
description: Adiciona e mantém resoluções complexas em um arquivo .md na raiz do projeto. Usar quando o usuário pedir para documentar uma resolução, salvar uma solução complexa, registrar um troubleshooting ou adicionar entrada ao arquivo de resoluções.
---

# Resoluções complexas

## Objetivo

Registrar resoluções de problemas complexos (bugs, configurações, integrações, troubleshooting) em um único arquivo Markdown na raiz do projeto, para consulta futura e onboarding.

## Arquivo de destino

- **Caminho**: `RESOLUCOES.md` na **raiz do repositório** (mesmo nível que `package.json` ou pastas `api`, `web`, etc.).
- Se o arquivo não existir, criá-lo com o cabeçalho e índice descritos abaixo.

## Estrutura de cada resolução

Cada entrada deve seguir este template. Manter ordem: mais recente no topo da seção "Resoluções".

```markdown
### [Título curto e descritivo da resolução]

- **Contexto**: Breve descrição do problema ou cenário (1–3 frases).
- **Causa / Motivo**: O que gerou o problema (erro, configuração, versão, ambiente, etc.).
- **Solução**: Passos ou abordagem aplicada (lista numerada ou parágrafos objetivos).
- **Referências** (opcional): Links, docs, issues, comandos úteis.
- **Data**: YYYY-MM-DD.
```

## Fluxo ao adicionar uma resolução

1. **Confirmar o arquivo**: Ler `RESOLUCOES.md` na raiz; se não existir, criar com:
   - Título principal: `# Resoluções complexas`
   - Uma linha de introdução opcional
   - Seção `## Resoluções` (lista de entradas)
2. **Montar a entrada**: Preencher o template acima com as informações fornecidas pelo usuário ou extraídas da conversa.
3. **Inserir no topo**: Adicionar a nova resolução como primeiro item dentro de `## Resoluções`, para manter as mais recentes primeiro.
4. **Manter consistência**: Usar o mesmo formato em todas as entradas; evitar duplicatas (mesmo problema = atualizar entrada existente, se fizer sentido).

## Quando usar esta skill

- Usuário pede para "documentar essa resolução", "salvar essa solução", "adicionar ao RESOLUCOES.md".
- Usuário quer "registrar esse troubleshooting" ou "deixar anotado para o time".
- Após resolver um problema complexo e o usuário confirma que quer gravar no projeto.

## Resposta ao usuário

Após adicionar ou atualizar: informar que a resolução foi registrada em `RESOLUCOES.md` e dar um resumo de uma linha do que foi documentado.
