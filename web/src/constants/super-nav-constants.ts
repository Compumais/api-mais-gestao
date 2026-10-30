import {
	IconArrowLeft,
	IconBuilding,
	IconChartBar,
	IconCreditCard,
	IconInfoCircle,
	IconNews,
	IconPhoto,
	IconUserPlus,
	IconUsers,
} from "@tabler/icons-react";

export const SUPER_NAV = {
	navMain: [
		{
			title: "Dashboard",
			url: "/super/dashboard",
			icon: IconChartBar,
		},
		{
			title: "Usuários",
			url: "/super/usuarios",
			icon: IconUsers,
		},
		{
			title: "Empresas",
			url: "/super/empresas",
			icon: IconBuilding,
		},
		{
			title: "Planos e módulos",
			url: "/super/planos",
			icon: IconCreditCard,
		},
		{
			title: "Cadastro",
			url: "/super/cadastro",
			icon: IconUserPlus,
		},
		{
			title: "Banco de imagens",
			url: "/super/banco-imagens",
			icon: IconPhoto,
		},
		{
			title: "Informativos",
			url: "/super/informativos",
			icon: IconInfoCircle,
		},
		{
			title: "CMS",
			url: "/super/cms",
			icon: IconNews,
		},
	],
	navSecondary: [
		{
			title: "Voltar ao ERP",
			url: "/dashboard",
			icon: IconArrowLeft,
		},
	],
};
