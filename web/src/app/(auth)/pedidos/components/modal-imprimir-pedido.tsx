"use client";

import { Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PreviewModeloImpressaoPedido } from "@/app/(auth)/configuracoes/modelos-impressao-pedido/components/preview-modelo-impressao-pedido";
import { useModelosImpressaoPedido } from "@/hooks/use-modelo-impressao-pedido";
import type { Empresa } from "@/services/empresas.service";
import type { PedidoDav, PedidoDavItem } from "@/services/dav.service";
import { carregarDadosClienteImpressao } from "@/util/carregar-dados-cliente-impressao";
import {
	imprimirHtmlModeloPedido,
	renderizarHtmlModeloImpressaoPedido,
} from "@/util/renderizar-modelo-impressao-pedido";

type ModalImprimirPedidoProps = {
	open: boolean;
	onClose: () => void;
	idempresa: string;
	empresa: Empresa | null;
	pedido: PedidoDav;
	itens: PedidoDavItem[];
};

export function ModalImprimirPedido({
	open,
	onClose,
	idempresa,
	empresa,
	pedido,
	itens,
}: ModalImprimirPedidoProps) {
	const { data: modelos = [], isLoading } = useModelosImpressaoPedido(idempresa);
	const [modeloId, setModeloId] = useState<string>("");

	const { data: cliente } = useQuery({
		queryKey: [
			"cliente-impressao-pedido",
			pedido.idcliente,
			pedido.nomecliente,
			pedido.cnpjcpfcliente,
		],
		queryFn: () =>
			carregarDadosClienteImpressao(pedido.idcliente, {
				nome: pedido.nomecliente,
				cnpjcpf: pedido.cnpjcpfcliente,
			}),
		enabled: open,
	});

	useEffect(() => {
		if (!open || modelos.length === 0) return;
		const primario = modelos.find((m) => m.primario);
		setModeloId(primario?.id ?? modelos[0]?.id ?? "");
	}, [open, modelos]);

	const modeloSelecionado = useMemo(
		() => modelos.find((m) => m.id === modeloId) ?? null,
		[modelos, modeloId],
	);

	const dadosPreview = useMemo(
		() => ({
			empresa,
			pedido,
			itens,
			cliente: cliente ?? {
				nome: pedido.nomecliente,
				cnpjcpf: pedido.cnpjcpfcliente,
			},
		}),
		[empresa, pedido, itens, cliente],
	);

	function handleImprimir() {
		if (!modeloSelecionado) {
			toast.error("Selecione um modelo de impressão");
			return;
		}
		const html = renderizarHtmlModeloImpressaoPedido(
			modeloSelecionado.layout,
			dadosPreview,
		);
		const ok = imprimirHtmlModeloPedido(
			html,
			`Pedido ${pedido.codigo ?? pedido.id}`,
		);
		if (!ok) {
			toast.error("Não foi possível abrir a janela de impressão", {
				description: "Verifique se o bloqueador de pop-ups está desativado.",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Imprimir pedido</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<span className="text-sm font-medium">Modelo</span>
						{isLoading ? (
							<p className="text-sm text-muted-foreground">
								Carregando modelos...
							</p>
						) : modelos.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Nenhum modelo disponível. Cadastre em Configurações → Modelos
								de impressão.
							</p>
						) : (
							<Select value={modeloId} onValueChange={setModeloId}>
								<SelectTrigger>
									<SelectValue placeholder="Selecione o modelo" />
								</SelectTrigger>
								<SelectContent>
									{modelos.map((modelo) => (
										<SelectItem key={modelo.id} value={modelo.id}>
											{modelo.nome}
											{modelo.primario ? " (primário)" : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					{modeloSelecionado && (
						<div className="rounded-lg border bg-muted/20 overflow-auto max-h-[55vh] p-2">
							<PreviewModeloImpressaoPedido
								layout={modeloSelecionado.layout}
								dados={dadosPreview}
								mostrarLimiteFolha={false}
							/>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Fechar
					</Button>
					<Button
						type="button"
						className="gap-2"
						disabled={!modeloSelecionado}
						onClick={handleImprimir}
					>
						<Printer className="h-4 w-4" />
						Imprimir
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
