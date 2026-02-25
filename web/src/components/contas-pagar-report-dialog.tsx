"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/provider/empresa-provider";
import { gerarRelatorioContasPagar } from "@/services/relatorios.service";

interface ContasPagarReportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ContasPagarReportDialog({
	open,
	onOpenChange,
}: ContasPagarReportDialogProps) {
	const { empresa } = useEmpresa();
	const [dataInicio, setDataInicio] = useState("");
	const [dataFim, setDataFim] = useState("");
	const [formato, setFormato] = useState<"pdf" | "txt" | "html">("txt");

	const gerarRelatorioMutation = useMutation({
		mutationFn: async () => {
			if (!empresa?.id) throw new Error("Empresa não selecionada");
			if (!dataInicio || !dataFim) throw new Error("Preencha todas as datas");
			await gerarRelatorioContasPagar({
				idempresa: empresa.id,
				dataInicio,
				dataFim,
				formato,
			});
		},
		onSuccess: () => {
			toast.success("Relatório gerado com sucesso!");
			onOpenChange(false);
			setDataInicio("");
			setDataFim("");
			setFormato("txt");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao gerar relatório");
		},
	});

	const handleGerar = () => {
		if (!dataInicio || !dataFim) {
			toast.error("Preencha todas as datas");
			return;
		}
		const inicio = new Date(dataInicio);
		const fim = new Date(dataFim);
		if (inicio > fim) {
			toast.error("Data inicial não pode ser maior que data final");
			return;
		}
		const diffTime = Math.abs(fim.getTime() - inicio.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		if (diffDays > 365) {
			toast.error("Período máximo permitido é de 365 dias");
			return;
		}
		gerarRelatorioMutation.mutate();
	};

	const hoje = new Date();
	const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
	const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
	const dataInicioPadrao = primeiroDiaMes.toISOString().split("T")[0];
	const dataFimPadrao = ultimoDiaMes.toISOString().split("T")[0];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Gerar Relatório de Contas a Pagar</DialogTitle>
					<DialogDescription>
						Selecione o período de vencimento e o formato do relatório
					</DialogDescription>
				</DialogHeader>

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="cap-dataInicio">Data Inicial *</FieldLabel>
						<Input
							id="cap-dataInicio"
							type="date"
							value={dataInicio || dataInicioPadrao}
							onChange={(e) => setDataInicio(e.target.value)}
							required
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="cap-dataFim">Data Final *</FieldLabel>
						<Input
							id="cap-dataFim"
							type="date"
							value={dataFim || dataFimPadrao}
							onChange={(e) => setDataFim(e.target.value)}
							required
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="cap-formato">Formato do Relatório *</FieldLabel>
						<Select
							value={formato}
							onValueChange={(v) => setFormato(v as "pdf" | "txt" | "html")}
						>
							<SelectTrigger id="cap-formato">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="txt">TXT</SelectItem>
								<SelectItem value="html">HTML</SelectItem>
								<SelectItem value="pdf">PDF</SelectItem>
							</SelectContent>
						</Select>
					</Field>
				</FieldGroup>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={gerarRelatorioMutation.isPending}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleGerar}
						disabled={gerarRelatorioMutation.isPending}
					>
						{gerarRelatorioMutation.isPending ? "Gerando..." : "Gerar Relatório"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
