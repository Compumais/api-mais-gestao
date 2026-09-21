# Mais Gestão — guia para agentes

Plataforma SaaS multi-empresa de controle financeiro e fiscal. O repositório é um monorepo: pacotes independentes, com deploy e CI separados. Leia este arquivo antes de alterar qualquer pacote.

## Ordem de leitura

1. Este arquivo.
2. [docs/sistema/visao-geral.md](docs/sistema/visao-geral.md)
3. [docs/sistema/contratos-entre-pacotes.md](docs/sistema/contratos-entre-pacotes.md)
4. [docs/sistema/pontos-criticos.md](docs/sistema/pontos-criticos.md)
5. [docs/sistema/indice-modulos.md](docs/sistema/indice-modulos.md)
6. O `AGENTS.md` do pacote que for alterar.
7. A pasta `docs/modulos/` daquele pacote.

| Pacote | Guia do pacote | Módulos |
|--------|----------------|---------|
| API | [api/AGENTS.md](api/AGENTS.md) | [api/docs/modulos/](api/docs/modulos/) |
| Web | [web/AGENTS.md](web/AGENTS.md) | [web/docs/modulos/](web/docs/modulos/) |
| PDV | [pdv/AGENTS.md](pdv/AGENTS.md) | [pdv/docs/modulos/](pdv/docs/modulos/) |
| POS Android | [POSmaisgestao/AGENTS.md](POSmaisgestao/AGENTS.md) | [POSmaisgestao/docs/modulos/](POSmaisgestao/docs/modulos/) |

Instale e execute sempre dentro do pacote (`api/`, `web/` ou `pdv/`). Não misture padrões de `api/` e `web/`. Skills fiscais e resoluções complexas ficam em `.cursor/skills/` na raiz.

## O que cada pacote pode e não pode

| Pacote | Pode | Não pode |
|--------|------|----------|
| `api/` | Rotas, services, repositories, models e migrations Drizzle no PostgreSQL da API | Virar tela, cliente desktop ou cliente Android |
| `web/` | Telas, componentes e hooks. Consome a API por `web/src/services/` e `web/src/hooks/` | Acessar o banco ou a lógica de negócio do backend |
| `pdv/` | Electron + React + PostgreSQL local (`pdv_local`) e sync HTTP com outbox | Importar código de `web/` ou acessar o PostgreSQL da API (`mais_gestao`) |
| `POSmaisgestao/` | App Android da maquininha, cliente da API e, no modo PDV local, da API LAN do desktop | Entrar no banco da API ou no código de `web/` |
| `api_Nfe/` | Gateway PHP de SEFAZ (NF-e) e gateway de NFS-e. Dependência de emissão, não um módulo para “simplificar” dentro da API | Ser ignorado em fluxo de NF-e, NFC-e ou NFS-e |
| `infra/` | Deploy e operação na VPS (Docker, PM2, Nginx) | Ser tratado como deploy automático só porque existe workflow no GitHub |

Não duplique código entre pacotes. Não crie pacote compartilhado sem solicitação explícita.

## Invariantes — não remover

- Autenticação multi-empresa com Better Auth e vínculo usuário–empresa.
- Isolamento por empresa (`verificarUsuarioPertenceEmpresa` e contexto de controle de acesso).
- Sync do PDV por outbox no PostgreSQL local, nunca gravando direto no banco da API.
- Emissão fiscal (NF-e/NFC-e e NFS-e) passando pelos gateways em `api_Nfe/`, chamados pela API.
- CI por pacote em `.github/workflows/ci.yml` (hoje cobre `api/` e `web/`).
- `git push` não implanta produção. Publicação de API e Web é manual com `./up.sh` no clone da VPS. Esse script não republica PDV nem POS.

Detalhe, caminhos e efeito de uma remoção: [docs/sistema/pontos-criticos.md](docs/sistema/pontos-criticos.md).
