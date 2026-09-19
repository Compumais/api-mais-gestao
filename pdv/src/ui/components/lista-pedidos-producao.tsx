import { ChefHat, Clock3, Printer, RefreshCw, UserRound } from "lucide-react";
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
		return (
			<div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
				<RefreshCw className="size-4 animate-spin" />
				Carregando pedidos…
			</div>
		);
	}

	if (pedidos.length === 0) {
		return (
			<div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
				<ChefHat className="size-8 opacity-50" />
				<p>Nenhum pedido de produção neste dia.</p>
			</div>
		);
	}

	return (
		<div>
			<div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/95 px-3 py-2 backdrop-blur">
				<div>
					<p className="text-sm font-semibold">Produção de hoje</p>
					<p className="text-xs text-muted-foreground">
						{pedidos.length} pedido{pedidos.length === 1 ? "" : "s"} enviado
						{pedidos.length === 1 ? "" : "s"} à cozinha
					</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					disabled={loading}
					onClick={() => void carregar()}
				>
					<RefreshCw className={loading ? "animate-spin" : ""} />
					Atualizar
				</Button>
			</div>
			<div className="divide-y divide-border/70">
				{pedidos.map((pedido) => (
					<article
						key={pedido.clientOrderId}
						className="grid gap-3 px-3 py-3 transition-colors hover:bg-muted/35 md:grid-cols-[minmax(180px,0.8fr)_minmax(280px,2fr)_auto]"
					>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<span className="font-mono text-base font-bold text-primary">
									{pedido.numeroMesa > 0
										? `Mesa ${pedido.numeroMesa}`
										: pedido.origem}
								</span>
								<Badge
									variant={
										pedido.status === "pendente" ? "warning" : "success"
									}
								>
									{pedido.status === "pendente" ? "Pendente" : "Entregue"}
								</Badge>
							</div>
							<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
								<Clock3 className="size-3" />
								{new Date(pedido.criadoem).toLocaleString("pt-BR")}
							</p>
							{pedido.nomecliente ? (
								<p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
									<UserRound className="size-3" />
									{pedido.nomecliente}
								</p>
							) : null}
						</div>
						<ul className="grid content-start gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
							{pedido.itens.map((item) => (
								<li key={item.id} className="min-w-0">
									<span className="font-semibold text-primary">
										{formatarQuantidade(item.quantidade)}×
									</span>{" "}
									<span className="font-medium">{item.descricao}</span>
									{item.observacao ? (
										<div className="pl-5 text-xs text-muted-foreground">
											{item.observacao}
										</div>
									) : null}
								</li>
							))}
						</ul>
						<div className="flex items-center justify-end">
							<Button
								size="sm"
								variant="outline"
								className="min-w-28"
								disabled={reimprimindo === pedido.clientOrderId}
								onClick={() => void reimprimir(pedido.clientOrderId)}
							>
								<Printer className="size-4" />
								{reimprimindo === pedido.clientOrderId
									? "Imprimindo…"
									: "Reimprimir"}
							</Button>
						</div>
					</article>
				))}
			</div>
		</div>
	);
}
