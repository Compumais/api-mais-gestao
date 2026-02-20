"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DashboardTable } from "@/components/dashboard-table";
import { SectionCards } from "@/components/section-cards";
import { PageContainer } from "../components/page-container";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { useEmpresa } from "@/hooks/use-empresa";

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
				<div className="px-4 lg:px-6">
					<DashboardTable data={ultimasMovimentacoes} isLoading={isLoading} />
				</div>
			</div>
		</PageContainer>
	);
}
