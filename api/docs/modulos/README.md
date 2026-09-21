# Módulos da API

Leia [../../AGENTS.md](../../AGENTS.md) antes de editar. Um arquivo por domínio coeso. Pastas pequenas relacionadas estão agrupadas e nomeadas dentro de cada doc.

| Módulo | Risco se alterar ou apagar |
| --- | --- |
| [Plataforma e auth](plataforma-auth.md) | Derruba login, sessão e todas as rotas protegidas. |
| [Empresas, tenancy e planos](empresas-tenancy.md) | Quebra isolamento multi-empresa, limite de empresas e cobrança SaaS. |
| [Financeiro](financeiro.md) | Corrompe contas a pagar/receber, caixa e conciliação. |
| [Contabilidade](contabilidade.md) | Desalinha plano de contas, exportação e integração Domínio. |
| [Entidades](entidades.md) | Remove clientes, fornecedores e o vínculo usuário–empresa. |
| [Produtos](produtos.md) | Quebra cadastro usado por estoque, fiscal, PDV e compras. |
| [Estoque](estoque.md) | Diverge saldo, lote e baixa de venda/nota. |
| [Compras e entrada de NF-e](compras-entrada-nfe.md) | Para entrada de XML, custo, estoque e contas a pagar da compra. |
| [Emissão fiscal](emissao-fiscal.md) | Invalida NF-e/NFC-e/NFS-e, certificado, série e autorização SEFAZ. |
| [Obrigações fiscais](obrigacoes-fiscais.md) | Gera SINTEGRA ou EFD inconsistente com notas e cadastros. |
| [PDV](pdv.md) | Quebra sync de venda, NFC-e do caixa, terminal e auto-update. |
| [Vendas DAV](vendas-dav.md) | Impede faturar pedido em NF-e/NFC-e. |
| [Ordem de serviço](ordem-servico.md) | Perde OS, faturamento, lotes e rascunho de nota. |
| [Produção](producao.md) | Quebra ficha técnica e explosão de estoque na venda. |
| [Relatórios e dashboard](relatorios-dashboard.md) | Relatórios fiscais e gerenciais passam a ler dados errados. |
| [Automação, e-mail e jobs](automacao-email.md) | Para alertas, sync de NF-e de entrada e envio Domínio. |
| [Admin, IA e conteúdo](admin-ia-conteudo.md) | Abre ou fecha painel super, planos SaaS e chaves de IA do usuário. |
| [Cadastros auxiliares](cadastros-auxiliares.md) | Remove tabelas de apoio usadas por vários fluxos; risco menor que fiscal/estoque, mas com FK. |
