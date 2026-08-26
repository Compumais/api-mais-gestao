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
import { useModelosImpressaoOs } from "@/hooks/use-modelo-impressao-os";
import { PreviewModeloImpressaoOs } from "@/app/(auth)/configuracoes/modelos-impressao/components/preview-modelo-impressao-os";
import type { Empresa } from "@/services/empresas.service";
import type {
	OrdemServico,
	OrdemServicoItem,
} from "@/services/ordem-servico.service";
import { carregarDadosClienteImpressao } from "@/util/carregar-dados-cliente-impressao";
import {
	imprimirHtmlModeloOs,
	renderizarHtmlModeloImpressaoOs,
} from "@/util/renderizar-modelo-impressao-os";

type ModalImprimirOrdemServicoProps = {
	open: boolean;
	onClose: () => void;
	idempresa: string;
	empresa: Empresa | null;
	ordem: OrdemServico;
	itens: OrdemServicoItem[];
};

export function ModalImprimirOrdemServico({
	open,
	onClose,
	idempresa,
	empresa,
	ordem,
	itens,
}: ModalImprimirOrdemServicoProps) {
	const { data: modelos = [], isLoading } = useModelosImpressaoOs(idempresa);
	const [modeloId, setModeloId] = useState<string>("");

	const { data: cliente } = useQuery({
		queryKey: [
			"cliente-impressao-os",
			ordem.idcliente,
			ordem.nomecliente,
			ordem.cnpjcpfcliente,
		],
		queryFn: () =>
			carregarDadosClienteImpressao(ordem.idcliente, {
				nome: ordem.nomecliente,
				cnpjcpf: ordem.cnpjcpfcliente,
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
			ordem,
			itens,
			cliente: cliente ?? {
				nome: ordem.nomecliente,
				cnpjcpf: ordem.cnpjcpfcliente,
			},
		}),
		[empresa, ordem, itens, cliente],
	);

	function handleImprimir() {
		if (!modeloSelecionado) {
			toast.error("Selecione um modelo de impressão");
			return;
		}
		const html = renderizarHtmlModeloImpressaoOs(
			modeloSelecionado.layout,
			dadosPreview,
		);
		const ok = imprimirHtmlModeloOs(
			html,
			`OS ${ordem.codigo ?? ordem.id}`,
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
					<DialogTitle>Imprimir ordem de serviço</DialogTitle>
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
							<PreviewModeloImpressaoOs
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
