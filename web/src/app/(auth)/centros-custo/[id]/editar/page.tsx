"use client";

import { use } from "react";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { CentroCustoForm } from "../../components/centro-custo-form";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default function EditarCentroCustoPage({ params }: PageProps) {
	const { id } = use(params);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6 px-4">
				<h1 className="text-2xl font-bold">Editar centro de custo</h1>
				<CentroCustoForm modo="editar" centroCustoId={id} />
			</div>
		</PageContainer>
	);
}
