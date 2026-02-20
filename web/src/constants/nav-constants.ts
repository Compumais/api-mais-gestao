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
  IconSearch,
  IconSettings,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";

export const DATA = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Clientes",
      url: "/clientes",
      icon: IconUsers,
    },
    {
      title: "Fornecedores",
      url: "/fornecedores",
      icon: IconBuilding,
    },
    {
      title: "Usuários",
      url: "/usuarios",
      icon: IconUser,
    },
  ],
  navClouds: [
    {
      title: "Plano de contas",
      url: "/plano-contas",
      icon: IconListDetails,
    },
    {
      title: "Bancos",
      url: "/bancos",
      icon: IconBuildingBank,
    },
    {
      title: "Contas correntes",
      url: "/contas-correntes",
      icon: IconCreditCard,
    },
    {
      title: "Movimentações",
      url: "/movimentacoes",
      icon: IconArrowsLeftRight,
    },
    {
      title: "Contas a receber",
      url: "/contas-receber",
      icon: IconCashBanknotePlus,
    },
    {
      title: "Contas a pagar",
      url: "/contas-pagar",
      icon: IconCashBanknoteMinus,
    },
    // {
    // 	title: "Conciliação",
    // 	url: "#",
    // 	icon: IconArrowsLeftRight,
    // },
    {
      title: "Relatórios",
      url: "/relatorios",
      icon: IconChartBar,
    },
  ],
  others: [
    {
      title: "Contabilidade",
      url: "#",
      icon: IconReportMoney,
      items: [
        {
          title: "Configuração",
          url: "/configuracao-contabilidade",
        },
        {
          title: "Integração contábil",
          url: "/integracao-contabil",
        },
        {
          title: "Código reduzidos",
          url: "/codigo-reduzidos",
        },
        {
          title: "Plano de contas contábeis",
          url: "/plano-contas-contabeis"
        }
      ],
    },
  ],
  navSecondary: [
    {
      title: "Configurações",
      url: "/configuracoes",
      icon: IconSettings,
    },
    {
      title: "Auditoria",
      url: "/auditoria",
      icon: IconHistory,
    },
    {
      title: "Ajuda",
      url: "/ajuda",
      icon: IconHelp,
    },
    {
      title: "Pesquisar",
      url: "#",
      icon: IconSearch,
    },
  ],
};