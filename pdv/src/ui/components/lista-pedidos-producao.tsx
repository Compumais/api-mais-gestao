import { useEffect, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import { formatarQuantidade } from "@/lib/produto-kg";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";

export type PedidoProducaoResumo = {
	clientOrderId: string;
	idconta: string;
	numeroMesa: number;
	nomecliente: string | null;
	origem: string;
	criadoem: string;
	status: string;
	itens: Array<{
		id: string;
		idproduto: string;
		descricao: string;
		quantidade: number;
		observacao: string | null;
	}>;
};

export function ListaPedidosProducao({
	idconta,
	onMensagem,
}: {
	idconta?: string;
	onMensagem?: (texto: string) => void;
}) {
	const [pedidos, setPedidos] = useState<PedidoProducaoResumo[]>([]);
	const [loading, setLoading] = useState(false);
	const [reimprimindo, setReimprimindo] = useState<string | null>(null);

	async function carregar() {
		setLoading(true);
		try {
			setPedidos(
				await pdvInvoke<PedidoProducaoResumo[]>(
					"listarPedidosProducao",
					idconta,
				),
			);
		} catch (err) {
			onMensagem?.(
				err instanceof Error ? err.message : "Erro ao listar pedidos",
			);
		} finally {
			setLoading(false);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: recarrega ao abrir ou trocar a conta
	useEffect(() => {
		void carregar();
	}, [idconta]);

	async function reimprimir(clientOrderId: string) {
		setReimprimindo(clientOrderId);
		try {
			await pdvInvoke("reimprimirPedidoProducao", clientOrderId);
			onMensagem?.("Pedido reenviado à impressora de produção");
		} catch (err) {
			onMensagem?.(
				err instanceof Error ? err.message : "Erro ao reimprimir o pedido",
			);
		} finally {
			setReimprimindo(null);
		}
	}

	if (loading && pedidos.length === 0) {
		return <p className="text-sm text-muted-foreground">Carregando pedidos…</p>;
	}

	if (pedidos.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				Nenhum pedido de produção neste dia.
			</p>
		);
	}

	return (
		<div className="space-y-3">
			{pedidos.map((pedido) => (
				<div
					key={pedido.clientOrderId}
					className="space-y-2 rounded-md border p-3"
				>
					<div className="flex flex-wrap items-start justify-between gap-2">
						<div>
							<p className="font-semibold">{pedido.origem}</p>
							<p className="text-xs text-muted-foreground">
								{new Date(pedido.criadoem).toLocaleString("pt-BR")}
								{pedido.nomecliente ? ` · ${pedido.nomecliente}` : ""}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Badge
								variant={pedido.status === "pendente" ? "warning" : "success"}
							>
								{pedido.status === "pendente" ? "Pendente" : "Entregue"}
							</Badge>
							<Button
								size="sm"
								variant="outline"
								disabled={reimprimindo === pedido.clientOrderId}
								onClick={() => void reimprimir(pedido.clientOrderId)}
							>
								{reimprimindo === pedido.clientOrderId
									? "Imprimindo…"
									: "Reimprimir"}
							</Button>
						</div>
					</div>
					<ul className="space-y-1 text-sm">
						{pedido.itens.map((item) => (
							<li key={item.id}>
								{formatarQuantidade(item.quantidade)} × {item.descricao}
								{item.observacao ? (
									<span className="text-muted-foreground">
										{" "}
										· {item.observacao}
									</span>
								) : null}
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}
