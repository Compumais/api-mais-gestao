# Módulos de tela (`web`)

Um arquivo por domínio de rota em `web/src/app`. O front fala com a API por `src/services` e hooks/React Query. Não há acesso a banco aqui.

Leia antes [../../AGENTS.md](../../AGENTS.md) (deste pacote) e o [AGENTS.md da raiz](../../../AGENTS.md).

| Arquivo | Pastas / rotas |
| --- | --- |
| [publico.md](publico.md) | `/`, login, páginas legais, cotação pública, cardápio delivery |
| [acesso.md](acesso.md) | Sessão, empresa ativa, guards, menu |
| [dashboard.md](dashboard.md) | `(auth)/dashboard` |
| [cadastros.md](cadastros.md) | Clientes, fornecedores, produtos, serviços, grupos, unidades |
| [estoque.md](estoque.md) | Estoque, produção, MGV, relatórios de produto |
| [compras.md](compras.md) | `(auth)/compras` e cotação pública |
| [vendas.md](vendas.md) | Pedidos (DAV) e ordens de serviço |
| [pdv.md](pdv.md) | `(pdv)/pdv`, vendas e fechamento de caixa |
| [gourmet.md](gourmet.md) | `(gourmet)` e `(garcom)` |
| [financeiro.md](financeiro.md) | Contas, movimentações, plano de contas, budget |
| [fiscal.md](fiscal.md) | NF-e, NFC-e, NFS-e, compra, tributos, CFOP |
| [contabilidade.md](contabilidade.md) | SINTEGRA, EFD, plano contábil |
| [relatorios.md](relatorios.md) | `(auth)/relatorios` |
| [configuracoes.md](configuracoes.md) | Configurações, usuários, auditoria, tarefas |
| [assinatura.md](assinatura.md) | Planos, checkout, assinatura |
| [ajuda.md](ajuda.md) | `(auth)/ajuda` |
| [super-admin.md](super-admin.md) | `(super)/super` |

Estado que atravessa módulos está em [acesso.md](acesso.md).
