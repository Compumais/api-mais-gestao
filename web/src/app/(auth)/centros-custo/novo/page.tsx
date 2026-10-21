"use client";

import { useSearchParams } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { CentroCustoForm } from "../components/centro-custo-form";

export default function NovoCentroCustoPage() {
	const searchParams = useSearchParams();
	const idcentrocustopai = searchParams.get("idcentrocustopai");

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6 px-4">
				<h1 className="text-2xl font-bold">Novo centro de custo</h1>
				<CentroCustoForm
					modo="criar"
					idcentrocustopai={idcentrocustopai}
				/>
			</div>
		</PageContainer>
	);
}
