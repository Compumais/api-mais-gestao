"use client";

import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { FinanceiroForm } from "../../../contas-receber/components/financeiro-form";

export default function EditarContaPagarPage() {
	const router = useRouter();
	const params = useParams();
	const id = params?.id as string;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Conta a Pagar</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<FinanceiroForm
					modo="editar"
					financeiroId={id}
					tipo="P"
					onSuccess={() => router.push("/contas-pagar")}
				/>
			</div>
		</PageContainer>
	);
}
