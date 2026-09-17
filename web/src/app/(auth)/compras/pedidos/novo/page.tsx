"use client";

import { PageContainer } from "@/app/(auth)/components/page-container";
import { PedidoCompraForm } from "../components/pedido-form";

export default function NovoPedidoCompraPage() {
	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Novo pedido de compra</h1>
					<p className="text-sm text-muted-foreground">
						Selecione o fornecedor cadastrado, inclua os produtos e, se quiser,
						salve também como cotação.
					</p>
				</div>
				<div className="mx-4 rounded-lg border bg-card p-4">
					<PedidoCompraForm />
				</div>
			</div>
		</PageContainer>
	);
}
