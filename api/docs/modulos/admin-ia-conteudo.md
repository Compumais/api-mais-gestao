# Admin, IA e conteúdo

## Propósito no produto

Painel interno do perfil super (usuários, empresas, planos SaaS, informativos, ajuda), chat Atena e conteúdo de ajuda/informativos para o usuário autenticado.

## Pastas e entrypoints

- `src/controllers/http/admin/rotas.ts` — `verifyJwt` + `verifySuper`. Prefixo `/admin/*`: dashboard, usuários (senha, inativar, ativar, associar empresa, entitlement), empresas, informativos, ajuda-posts, planos SaaS, módulos SaaS.
- `src/controllers/http/informativos/rotas.ts` — `GET /informativos` com `verifyJwt` (lista públicos).
- `src/controllers/http/ajuda/rotas.ts` — `GET /ajuda-posts` e `GET /ajuda-posts/:slug` com `verifyJwt`.
- `src/controllers/http/ia/rotas.ts` — `POST /ia/chat` e `POST /ia/testar`, `verifyJwt` + `requireModulo(ia_financeira)`.

Services: `src/service/admin/`, `src/service/ajuda/`, `src/service/ia/` (`chat-com-atena.ts`, `completar-texto.ts`, `provedores.ts`, `testar-ia.ts`).

Schema: `drizzle/tables/informativos.ts`, `ajuda-posts.ts`, `planos-saas.ts`, `modulos-saas.ts`, `usuario-modulos.ts`. Chaves opcionais de IA ficam em integrações do usuário (`configuracao-usuario`). O Ollama da plataforma fica só no env da API.

## Contratos externos

- Super: operadores internos da plataforma (web admin).
- Usuário comum: informativos, ajuda e chat.
- Provedores externos: OpenAI, Gemini, OpenRouter, chamados com a chave gravada no usuário.
- Provedor da plataforma: Ollama, chamado pela API com `OLLAMA_BASE_URL` e `OLLAMA_MODEL`. O front não recebe essa URL.
- PDV/POS: não confirmado.

## Configuração crítica

Não há `OPENAI_API_KEY` global. Chaves opcionais: `openaiApiKey`, `geminiApiKey`, `openrouterApiKey` e modelos na configuração do usuário.

`OLLAMA_BASE_URL` e `OLLAMA_MODEL` ligam a IA gratuita. As duas precisam estar preenchidas. A URL pode ser a raiz do servidor ou já terminar em `/v1`. No modo `auto`, o Ollama vem antes das chaves do usuário. Quem força Gemini, OpenAI ou OpenRouter e tem a chave correspondente continua nesse provedor. Sem o env, `auto` tenta Gemini, depois OpenAI, depois OpenRouter.

Módulo SaaS `ia_financeira`. Sem o módulo: 403.

Imagens de ajuda/informativo no admin são data URL, máximo 700_000 caracteres, no máximo 10 imagens (`admin/rotas.ts`).

## Invariantes

- `verifySuper` é obrigatório em todo `/admin`. Não reutilizar esses handlers em rota de tenant.
- Entitlement (`GET|PUT /admin/usuarios/:id/entitlement`) altera o que `requireFeature` / `requireModulo` decidem. Não gravar plano só na coluna `usuarios.plano` e esquecer módulos.
- Ajuda “pública” no nome do service ainda passa por `verifyJwt` na rota. Não é anônima.
- Chat não deve receber a chave de outro usuário. `resolverProvedor` lê as integrações daquele usuário. A URL do Ollama não entra nessa configuração.
- Timeout de fetch dos provedores de nuvem: 30 s em `provedores.ts`. Chamadas ao Ollama usam 90 s.
- Sem `OLLAMA_BASE_URL` e `OLLAMA_MODEL`, a interpretação da rejeição da NFC-e e o chat continuam exigindo chave do usuário.

## O que quebra se alterar ou apagar

- Operação interna: criar empresa, bloquear usuário, mudar plano.
- Contratação refletida em `usuarioTemFeature`.
- Telas de ajuda e avisos do web.
- Atena deixa de responder se o módulo SaaS for ignorado, ou se não houver Ollama no env nem chave na configuração do usuário.
- A interpretação da rejeição da NFC-e deixa de aparecer para quem não tem chave se o env do Ollama for removido.

## Dependências de outros módulos da API

Auth e perfis, planos, empresas, configuração de usuário.

## Testes relacionados

- `src/service/admin/gerenciar-usuarios.test.ts`
- `src/service/ia/chat-com-atena.test.ts`
