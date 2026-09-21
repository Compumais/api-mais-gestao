# Índice de módulos

Este arquivo só aponta. A descrição interna de cada módulo fica em `docs/modulos/` do pacote. Os `AGENTS.md` de pacote são a porta de entrada antes de editar aquele código.

| Pacote | Antes de editar | Módulos |
|--------|-----------------|--------------------------|
| API | [api/AGENTS.md](../../api/AGENTS.md) | [api/docs/modulos/](../../api/docs/modulos/) |
| Web | [web/AGENTS.md](../../web/AGENTS.md) | [web/docs/modulos/](../../web/docs/modulos/) |
| PDV | [pdv/AGENTS.md](../../pdv/AGENTS.md) | [pdv/docs/modulos/](../../pdv/docs/modulos/) |
| POS Android | [POSmaisgestao/AGENTS.md](../../POSmaisgestao/AGENTS.md) | [POSmaisgestao/docs/modulos/](../../POSmaisgestao/docs/modulos/) |

Contratos entre eles: [contratos-entre-pacotes.md](contratos-entre-pacotes.md). O que não remover: [pontos-criticos.md](pontos-criticos.md).

`api_Nfe/` e `infra/` não têm pasta `docs/modulos` neste índice. Papel deles: gateway SEFAZ/NFS-e e deploy. Ver [visao-geral.md](visao-geral.md).

A linha de cada arquivo abaixo é a do README daquele pacote.

## API

Antes de editar: [api/AGENTS.md](../../api/AGENTS.md). Pasta: [api/docs/modulos/](../../api/docs/modulos/).

| Arquivo | Linha do README |
|---------|-----------------|
| [README.md](../../api/docs/modulos/README.md) | Módulos da API |
| [plataforma-auth.md](../../api/docs/modulos/plataforma-auth.md) | Derruba login, sessão e todas as rotas protegidas. |
| [empresas-tenancy.md](../../api/docs/modulos/empresas-tenancy.md) | Quebra isolamento multi-empresa, limite de empresas e cobrança SaaS. |
| [financeiro.md](../../api/docs/modulos/financeiro.md) | Corrompe contas a pagar/receber, caixa e conciliação. |
| [contabilidade.md](../../api/docs/modulos/contabilidade.md) | Desalinha plano de contas, exportação e integração Domínio. |
| [entidades.md](../../api/docs/modulos/entidades.md) | Remove clientes, fornecedores e o vínculo usuário–empresa. |
| [produtos.md](../../api/docs/modulos/produtos.md) | Quebra cadastro usado por estoque, fiscal, PDV e compras. |
| [estoque.md](../../api/docs/modulos/estoque.md) | Diverge saldo, lote e baixa de venda/nota. |
| [compras-entrada-nfe.md](../../api/docs/modulos/compras-entrada-nfe.md) | Para entrada de XML, custo, estoque e contas a pagar da compra. |
| [emissao-fiscal.md](../../api/docs/modulos/emissao-fiscal.md) | Invalida NF-e/NFC-e/NFS-e, certificado, série e autorização SEFAZ. |
| [obrigacoes-fiscais.md](../../api/docs/modulos/obrigacoes-fiscais.md) | Gera SINTEGRA ou EFD inconsistente com notas e cadastros. |
| [pdv.md](../../api/docs/modulos/pdv.md) | Quebra sync de venda, NFC-e do caixa, terminal e auto-update. |
| [vendas-dav.md](../../api/docs/modulos/vendas-dav.md) | Impede faturar pedido em NF-e/NFC-e. |
| [ordem-servico.md](../../api/docs/modulos/ordem-servico.md) | Perde OS, faturamento, lotes e rascunho de nota. |
| [producao.md](../../api/docs/modulos/producao.md) | Quebra ficha técnica e explosão de estoque na venda. |
| [relatorios-dashboard.md](../../api/docs/modulos/relatorios-dashboard.md) | Relatórios fiscais e gerenciais passam a ler dados errados. |
| [automacao-email.md](../../api/docs/modulos/automacao-email.md) | Para alertas, sync de NF-e de entrada e envio Domínio. |
| [admin-ia-conteudo.md](../../api/docs/modulos/admin-ia-conteudo.md) | Abre ou fecha painel super, planos SaaS e chaves de IA do usuário. |
| [cadastros-auxiliares.md](../../api/docs/modulos/cadastros-auxiliares.md) | Remove tabelas de apoio usadas por vários fluxos; risco menor que fiscal/estoque, mas com FK. |

## Web

Antes de editar: [web/AGENTS.md](../../web/AGENTS.md). Pasta: [web/docs/modulos/](../../web/docs/modulos/).

| Arquivo | Linha do README |
|---------|-----------------|
| [README.md](../../web/docs/modulos/README.md) | Módulos de tela (`web`) |
| [publico.md](../../web/docs/modulos/publico.md) | `/`, login, páginas legais, cotação pública |
| [acesso.md](../../web/docs/modulos/acesso.md) | Sessão, empresa ativa, guards, menu |
| [dashboard.md](../../web/docs/modulos/dashboard.md) | `(auth)/dashboard` |
| [cadastros.md](../../web/docs/modulos/cadastros.md) | Clientes, fornecedores, produtos, serviços, grupos, unidades |
| [estoque.md](../../web/docs/modulos/estoque.md) | Estoque, produção, MGV, relatórios de produto |
| [compras.md](../../web/docs/modulos/compras.md) | `(auth)/compras` e cotação pública |
| [vendas.md](../../web/docs/modulos/vendas.md) | Pedidos (DAV) e ordens de serviço |
| [pdv.md](../../web/docs/modulos/pdv.md) | `(pdv)/pdv`, vendas e fechamento de caixa |
| [gourmet.md](../../web/docs/modulos/gourmet.md) | `(gourmet)` e `(garcom)` |
| [financeiro.md](../../web/docs/modulos/financeiro.md) | Contas, movimentações, plano de contas, budget |
| [fiscal.md](../../web/docs/modulos/fiscal.md) | NF-e, NFC-e, NFS-e, compra, tributos, CFOP |
| [contabilidade.md](../../web/docs/modulos/contabilidade.md) | SINTEGRA, EFD, plano contábil |
| [relatorios.md](../../web/docs/modulos/relatorios.md) | `(auth)/relatorios` |
| [configuracoes.md](../../web/docs/modulos/configuracoes.md) | Configurações, usuários, auditoria, tarefas |
| [assinatura.md](../../web/docs/modulos/assinatura.md) | Planos, checkout, assinatura |
| [ajuda.md](../../web/docs/modulos/ajuda.md) | `(auth)/ajuda` |
| [super-admin.md](../../web/docs/modulos/super-admin.md) | `(super)/super` |

## PDV

Antes de editar: [pdv/AGENTS.md](../../pdv/AGENTS.md). Pasta: [pdv/docs/modulos/](../../pdv/docs/modulos/).

| Arquivo | Linha do README |
|---------|-----------------|
| [README.md](../../pdv/docs/modulos/README.md) | Módulos do PDV |
| [banco-local.md](../../pdv/docs/modulos/banco-local.md) | Postgres do caixa, migração e config |
| [sessao-configuracao.md](../../pdv/docs/modulos/sessao-configuracao.md) | Login, empresa, chaves de `config` |
| [catalogo.md](../../pdv/docs/modulos/catalogo.md) | Produtos, preços e atalhos em cache |
| [venda-pagamento.md](../../pdv/docs/modulos/venda-pagamento.md) | Cupom, meios e fechamento |
| [caixa.md](../../pdv/docs/modulos/caixa.md) | Turno, suprimento e conferência |
| [fiscal-nfce.md](../../pdv/docs/modulos/fiscal-nfce.md) | Emissão, contingência, número e XML |
| [sync-outbox.md](../../pdv/docs/modulos/sync-outbox.md) | Fila até a API |
| [mesas-gourmet-delivery.md](../../pdv/docs/modulos/mesas-gourmet-delivery.md) | Conta, comanda, entrega e fila de produção |
| [impressao.md](../../pdv/docs/modulos/impressao.md) | DANFC-e, cupom e pedido de cozinha |
| [lan-pos.md](../../pdv/docs/modulos/lan-pos.md) | Maquininha Android no desktop |
| [pdv-secundario.md](../../pdv/docs/modulos/pdv-secundario.md) | Terminal extra sem banco fiscal próprio |
| [integracoes-perifericos.md](../../pdv/docs/modulos/integracoes-perifericos.md) | SiTef, balança e Tecnibra |
| [backup.md](../../pdv/docs/modulos/backup.md) | Cópia local e troca de empresa |
| [atualizacao-installer.md](../../pdv/docs/modulos/atualizacao-installer.md) | Versão, setup e preservação do banco |

## POS Android

Antes de editar: [POSmaisgestao/AGENTS.md](../../POSmaisgestao/AGENTS.md). Pasta: [POSmaisgestao/docs/modulos/](../../POSmaisgestao/docs/modulos/).

| Arquivo | Linha do README |
|---------|-----------------|
| [README.md](../../POSmaisgestao/docs/modulos/README.md) | Módulos do POS Android |
| [app-shell.md](../../POSmaisgestao/docs/modulos/app-shell.md) | Application, launcher, navegação, Activities |
| [autenticacao.md](../../POSmaisgestao/docs/modulos/autenticacao.md) | Login, empresa, token |
| [configuracao-build.md](../../POSmaisgestao/docs/modulos/configuracao-build.md) | URL, modo cloud/local, Gradle |
| [pagamento.md](../../POSmaisgestao/docs/modulos/pagamento.md) | Meios, PIX QR, ausência de TEF |
| [venda-fiscal.md](../../POSmaisgestao/docs/modulos/venda-fiscal.md) | Venda rápida, NFC-e, DAV, caixa |
| [mesas-comandas.md](../../POSmaisgestao/docs/modulos/mesas-comandas.md) | Mesas, comanda, fila de pedidos |
| [integracao-api.md](../../POSmaisgestao/docs/modulos/integracao-api.md) | `ApiClient` e `LocalPdvApi` |
| [persistencia-offline.md](../../POSmaisgestao/docs/modulos/persistencia-offline.md) | Prefs, catálogo SQLite, outbox |
| [perifericos.md](../../POSmaisgestao/docs/modulos/perifericos.md) | Impressora, balança, câmera |
