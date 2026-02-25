"use client";

import {
	IconTrendingDown,
	IconTrendingUp,
	IconUsers,
	IconWallet,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useEmpresa } from "@/provider/empresa-provider";
import { dashboardService } from "@/services/dashboard.service";

const cardsInfo = [
	{
		title: "Contas a Pagar",
		badge: {
			text: "Pendentes",
			icon: IconTrendingDown,
			variant: "outline",
			className: "text-destructive",
		},
		footer: "Total de contas em aberto",
	},
	{
		title: "Contas a Receber",
		badge: {
			text: "A receber",
			icon: IconTrendingUp,
			variant: "outline",
			className: "text-green-600",
		},
		footer: "Total de contas em aberto",
	},
	{
		title: "Saldo Bancário",
		badge: {
			text: "Bancos",
			icon: IconWallet,
			variant: "outline",
		},
		footer: "Saldo total das contas bancárias",
	},
	{
		title: "Usuários",
		badge: {
			text: "Total",
			icon: IconUsers,
			variant: "outline",
		},
		footer: "Usuários associados à empresa",
	},
];

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	const num = parseFloat(value);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
};

export function SectionCards() {
	const { empresa } = useEmpresa();

	const { data: dashboardData, isLoading } = useQuery({
		queryKey: ["dashboard", empresa?.id],
		queryFn: () =>
			dashboardService.buscarDados({
				idempresa: empresa?.id,
			}),
		enabled: !!empresa?.id,
	});

	if (isLoading || !dashboardData) {
		return (
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
				{cardsInfo.map((card) => (
					<Card key={card.title} className="@container/card justify-between">
						<CardHeader>
							<CardDescription>{card.title}</CardDescription>
							<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
								<div className="h-6 w-26 animate-pulse rounded bg-muted" />
							</CardTitle>
							<CardAction>
								<Badge variant="outline" className={card.badge.className}>
									<card.badge.icon className="size-3" />
									{card.badge.text}
								</Badge>
							</CardAction>
						</CardHeader>

						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<div className="line-clamp-1 flex gap-2 font-medium text-xs">
								{card.footer}
							</div>
						</CardFooter>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
			<Card className="@container/card justify-between">
				<CardHeader>
					<CardDescription className="text-xs">Contas a Pagar</CardDescription>
					<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{formatCurrency(dashboardData?.totalContasPagar)}
					</CardTitle>
					<CardAction>
						<Badge variant="outline" className="text-destructive">
							<IconTrendingDown className="size-3" />
							Pendentes
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium text-xs">
						Total de contas em aberto
					</div>
				</CardFooter>
			</Card>

			<Card className="@container/card justify-between">
				<CardHeader>
					<CardDescription className="text-xs">
						Contas a Receber
					</CardDescription>
					<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{formatCurrency(dashboardData?.totalContasReceber)}
					</CardTitle>
					<CardAction>
						<Badge variant="outline" className="text-green-600">
							<IconTrendingUp className="size-3" />A receber
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium text-xs">
						Total de contas em aberto
					</div>
				</CardFooter>
			</Card>

			<Card className="@container/card justify-between">
				<CardHeader>
					<CardDescription className="text-xs">Saldo Bancário</CardDescription>
					<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{formatCurrency(dashboardData?.saldoBancario)}
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							<IconWallet className="size-3" />
							Bancos
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium text-xs">
						Saldo total das contas bancárias
					</div>
				</CardFooter>
			</Card>

			{/* <Card className="@container/card">
				<CardHeader>
					<CardDescription>Saldo do Caixa</CardDescription>
					<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{formatCurrency(dashboardData.saldoCaixa)}
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							<IconWallet className="size-3" />
							Caixa
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						Saldo total do caixa
					</div>
				</CardFooter>
			</Card> */}

			<Card className="@container/card justify-between">
				<CardHeader>
					<CardDescription className="text-xs">Usuários</CardDescription>
					<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{dashboardData?.quantidadeUsuarios ?? 0}
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							<IconUsers className="size-3" />
							Total
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium text-xs">
						Usuários associados à empresa
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}
