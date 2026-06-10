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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/provider/empresa-provider";
import { gerarRelatorioCentroCustos } from "@/service/relatorios.service";

interface CentroCustosReportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CentroCustosReportDialog({
	open,
	onOpenChange,
}: CentroCustosReportDialogProps) {
	const { empresa } = useEmpresa();
	const [formato, setFormato] = useState<"pdf" | "txt" | "html">("txt");

	const gerarRelatorioMutation = useMutation({
		mutationFn: async () => {
			if (!empresa?.id) throw new Error("Empresa não selecionada");
			await gerarRelatorioCentroCustos({
				idempresa: empresa.id,
				formato,
			});
		},
		onSuccess: () => {
			toast.success("Relatório gerado com sucesso!");
			onOpenChange(false);
			setFormato("txt");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao gerar relatório");
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Gerar Relatório de Centro de Custos</DialogTitle>
					<DialogDescription>
						Selecione o formato do relatório estrutural de centros de custo.
					</DialogDescription>
				</DialogHeader>

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="cc-formato">Formato do Relatório *</FieldLabel>
						<Select
							value={formato}
							onValueChange={(v) => setFormato(v as "pdf" | "txt" | "html")}
						>
							<SelectTrigger id="cc-formato">
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
						onClick={() => gerarRelatorioMutation.mutate()}
						disabled={gerarRelatorioMutation.isPending}
					>
						{gerarRelatorioMutation.isPending
							? "Gerando..."
							: "Gerar Relatório"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
