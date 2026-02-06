"use client";

import { useRouter } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { FinanceiroForm } from "../../contas-receber/components/financeiro-form";

export default function NovoContaPagarPage() {
	const router = useRouter();

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Nova Conta a Pagar</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<FinanceiroForm
					modo="criar"
					tipo="P"
					onSuccess={() => router.push("/contas-pagar")}
				/>
			</div>
		</PageContainer>
	);
}
