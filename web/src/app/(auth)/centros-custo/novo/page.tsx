"use client";

import { useSearchParams } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { CentroCustoForm } from "../components/centro-custo-form";

export default function NovoCentroCustoPage() {
	const searchParams = useSearchParams();
	const idcentrocustopai = searchParams.get("idcentrocustopai");

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo centro de custo</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<CentroCustoForm
					modo="criar"
					idcentrocustopai={idcentrocustopai}
				/>
			</div>
		</PageContainer>
	);
}
