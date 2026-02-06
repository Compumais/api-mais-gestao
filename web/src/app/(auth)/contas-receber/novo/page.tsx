"use client";

import { useRouter } from "next/navigation";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { FinanceiroForm } from "../components/financeiro-form";

export default function NovoContaReceberPage() {
	const router = useRouter();

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Nova Conta a Receber</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<FinanceiroForm
					modo="criar"
					tipo="R"
					onSuccess={() => router.push("/contas-receber")}
				/>
			</div>
		</PageContainer>
	);
}

