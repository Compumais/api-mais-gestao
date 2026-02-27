"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ChartPieDespesas } from "@/components/chart-pie-despesas";
import { ChartPieReceitas } from "@/components/chart-pie-receitas";
import { DashboardTable } from "@/components/dashboard-table";
import { SectionCards } from "@/components/section-cards";
import { useEmpresa } from "@/hooks/use-empresa";
import { dashboardService } from "@/services/dashboard.service";
import { PageContainer } from "../components/page-container";

export default function Page() {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data: ultimasMovimentacoes, isLoading } = useQuery({
		queryKey: ["dashboard-ultimas-movimentacoes", empresa?.id],
		queryFn: () =>
			dashboardService.buscarUltimasMovimentacoes({ idempresa: empresa?.id }),
		enabled: !!empresa?.id,
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<SectionCards />
				<div className="px-4 lg:px-6">
					<ChartAreaInteractive />
				</div>
				<div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
					<ChartPieDespesas />
					<ChartPieReceitas />
				</div>
				<div className="px-4 lg:px-6">
					<DashboardTable data={ultimasMovimentacoes} isLoading={isLoading} />
				</div>
			</div>
		</PageContainer>
	);
}
