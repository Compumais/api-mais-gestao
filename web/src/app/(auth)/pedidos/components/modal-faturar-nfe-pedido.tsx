"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { NfeSerie } from "@/services/nfe-configuracao.service";

type ModalFaturarNfePedidoProps = {
	open: boolean;
	onClose: () => void;
	onConfirmar: (dados: {
		idserienfe?: string;
		confirmarProducao: boolean;
		gerarFinanceiro: boolean;
		gerarEstoque: boolean;
	}) => void;
	carregando?: boolean;
	ambienteProducao?: boolean;
	series?: NfeSerie[];
};

export function ModalFaturarNfePedido({
	open,
	onClose,
	onConfirmar,
	carregando = false,
	ambienteProducao = false,
	series = [],
}: ModalFaturarNfePedidoProps) {
	const [idserienfe, setIdserienfe] = useState("");
	const [gerarFinanceiro, setGerarFinanceiro] = useState(true);
	const [gerarEstoque, setGerarEstoque] = useState(true);
	const [confirmadoProducao, setConfirmadoProducao] = useState(false);

	const seriesAtivas = series.filter((serie) => serie.ativo && serie.modelo === "55");

	function handleClose() {
		setConfirmadoProducao(false);
		onClose();
	}

	function handleConfirmar() {
		if (ambienteProducao && !confirmadoProducao) return;

		onConfirmar({
			...(idserienfe ? { idserienfe } : {}),
			confirmarProducao: ambienteProducao,
			gerarFinanceiro,
			gerarEstoque,
		});
	}

	return (
		<Dialog open={open} onOpenChange={(aberto) => !aberto && handleClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Faturar pedido em NF-e</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<p className="text-sm text-muted-foreground">
						O pedido será convertido em uma NF-e de venda. Estoque e financeiro
						serão integrados conforme as opções abaixo.
					</p>

					<Field>
						<FieldLabel htmlFor="serie-nfe-pedido">Série NF-e</FieldLabel>
						<Select
							value={idserienfe || "padrao"}
							onValueChange={(valor) =>
								setIdserienfe(valor === "padrao" ? "" : valor)
							}
						>
							<SelectTrigger id="serie-nfe-pedido">
								<SelectValue placeholder="Série padrão da configuração" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="padrao">Série padrão da configuração</SelectItem>
								{seriesAtivas.map((serie) => (
									<SelectItem key={serie.id} value={serie.id}>
										Série {serie.serie}
										{serie.padrao ? " — Padrão" : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2">
							<Checkbox
								id="gerarEstoque-pedido"
								checked={gerarEstoque}
								onCheckedChange={(checked) =>
									setGerarEstoque(checked === true)
								}
							/>
							<Label htmlFor="gerarEstoque-pedido">
								Baixar estoque automaticamente
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="gerarFinanceiro-pedido"
								checked={gerarFinanceiro}
								onCheckedChange={(checked) =>
									setGerarFinanceiro(checked === true)
								}
							/>
							<Label htmlFor="gerarFinanceiro-pedido">
								Gerar financeiro (contas a receber ou caixa)
							</Label>
						</div>
					</div>

					{ambienteProducao && (
						<div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
							<p className="flex items-center gap-2 text-sm font-medium text-red-800">
								<AlertTriangle className="h-4 w-4" />
								Ambiente de produção
							</p>
							<p className="text-sm text-red-700">
								A NF-e terá validade fiscal real e será transmitida à SEFAZ.
							</p>
							<div className="flex items-center gap-2">
								<Checkbox
									id="confirmar-producao-pedido"
									checked={confirmadoProducao}
									onCheckedChange={(checked) =>
										setConfirmadoProducao(checked === true)
									}
								/>
								<Label
									htmlFor="confirmar-producao-pedido"
									className="text-sm cursor-pointer"
								>
									Confirmo a emissão em produção
								</Label>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={carregando}>
						Cancelar
					</Button>
					<Button
						onClick={handleConfirmar}
						disabled={
							carregando || (ambienteProducao && !confirmadoProducao)
						}
					>
						{carregando ? "Faturando..." : "Faturar NF-e"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
