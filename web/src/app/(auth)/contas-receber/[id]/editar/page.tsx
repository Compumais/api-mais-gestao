"use client";

import { useRouter, useParams } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { FinanceiroForm } from "../../components/financeiro-form";

export default function EditarContaReceberPage() {
	const router = useRouter();
	const params = useParams();
	const id = params?.id as string;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Conta a Receber</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<FinanceiroForm
					modo="editar"
					financeiroId={id}
					tipo="R"
					onSuccess={() => router.push("/contas-receber")}
				/>
			</div>
		</PageContainer>
	);
}

