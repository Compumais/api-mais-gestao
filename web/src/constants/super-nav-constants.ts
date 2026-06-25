import {
	IconBuilding,
	IconChartBar,
	IconInfoCircle,
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
			title: "Cadastro",
			url: "/super/cadastro",
			icon: IconUserPlus,
		},
		{
			title: "Informativos",
			url: "/super/informativos",
			icon: IconInfoCircle,
		},
	],
	navSecondary: [
		{
			title: "Voltar ao ERP",
			url: "/dashboard",
			icon: IconBuilding,
		},
	],
};
