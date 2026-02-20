import type { Icon } from "@tabler/icons-react";
import {
  IconArrowsLeftRight,
  IconBuilding,
  IconBuildingBank,
  IconCashBanknoteMinus,
  IconCashBanknotePlus,
  IconChartBar,
  IconCreditCard,
  IconDashboard,
  IconHelp,
  IconHistory,
  IconListDetails,
  IconReportMoney,
  IconSettings,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";

export interface SearchablePage {
  title: string;
  url: string;
  category: string;
  icon?: Icon;
  keywords?: string[];
}

export const SEARCHABLE_PAGES: SearchablePage[] = [
  // Principal
  {
    title: "Dashboard",
    url: "/dashboard",
    category: "Principal",
    icon: IconDashboard,
    keywords: ["início", "home", "painel"],
  },
  {
    title: "Clientes",
    url: "/clientes",
    category: "Principal",
    icon: IconUsers,
    keywords: ["cliente", "clientes"],
  },
  {
    title: "Fornecedores",
    url: "/fornecedores",
    category: "Principal",
    icon: IconBuilding,
    keywords: ["fornecedor", "fornecedores"],
  },
  {
    title: "Usuários",
    url: "/usuarios",
    category: "Principal",
    icon: IconUser,
    keywords: ["usuário", "usuarios", "user"],
  },
  // Financeiro
  {
    title: "Plano de contas",
    url: "/plano-contas",
    category: "Financeiro",
    icon: IconListDetails,
    keywords: ["plano", "contas", "conta"],
  },
  {
    title: "Bancos",
    url: "/bancos",
    category: "Financeiro",
    icon: IconBuildingBank,
    keywords: ["banco", "bancos", "instituição financeira"],
  },
  {
    title: "Contas correntes",
    url: "/contas-correntes",
    category: "Financeiro",
    icon: IconCreditCard,
    keywords: ["conta corrente", "conta", "corrente"],
  },
  {
    title: "Movimentações",
    url: "/movimentacoes",
    category: "Financeiro",
    icon: IconArrowsLeftRight,
    keywords: ["movimentação", "movimentacoes", "transação", "transações"],
  },
  {
    title: "Contas a receber",
    url: "/contas-receber",
    category: "Financeiro",
    icon: IconCashBanknotePlus,
    keywords: ["receber", "recebimento", "recebimentos", "a receber"],
  },
  {
    title: "Contas a pagar",
    url: "/contas-pagar",
    category: "Financeiro",
    icon: IconCashBanknoteMinus,
    keywords: ["pagar", "pagamento", "pagamentos", "a pagar"],
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    category: "Financeiro",
    icon: IconChartBar,
    keywords: ["relatório", "relatorios", "relatorio", "report"],
  },
  // Contabilidade
  {
    title: "Configuração",
    url: "/configuracao-contabilidade",
    category: "Contabilidade",
    icon: IconReportMoney,
    keywords: ["configuração", "configuracao", "config", "contabilidade"],
  },
  {
    title: "Integração contábil",
    url: "/integracao-contabil",
    category: "Contabilidade",
    icon: IconReportMoney,
    keywords: ["integração", "integracao", "integracao contabil", "contábil"],
  },
  {
    title: "Código reduzidos",
    url: "/codigo-reduzidos",
    category: "Contabilidade",
    icon: IconReportMoney,
    keywords: ["código", "codigo", "reduzido", "reduzidos"],
  },
  {
    title: "Plano de contas contábeis",
    url: "/plano-contas-contabeis",
    category: "Contabilidade",
    icon: IconReportMoney,
    keywords: ["plano contas contábeis", "contábeis", "contabeis"],
  },
  // Outros
  {
    title: "Configurações",
    url: "/configuracoes",
    category: "Outros",
    icon: IconSettings,
    keywords: ["configuração", "configuracao", "config", "settings"],
  },
  {
    title: "Auditoria",
    url: "/auditoria",
    category: "Outros",
    icon: IconHistory,
    keywords: ["auditoria", "audit", "histórico", "historico"],
  },
  {
    title: "Ajuda",
    url: "/ajuda",
    category: "Outros",
    icon: IconHelp,
    keywords: ["ajuda", "help", "suporte", "documentação", "documentacao"],
  },
];

