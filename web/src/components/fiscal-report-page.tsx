"use client";

import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import type { GerarRelatorioFiscalParams } from "@/services/relatorios.service";

function obterPeriodoMesAtual() {
	const hoje = new Date();
	const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
	const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

	return {
		dataInicio: primeiroDiaMes.toISOString().split("T")[0],
		dataFim: ultimoDiaMes.toISOString().split("T")[0],
	};
}

interface FiscalReportPageProps {
	titulo: string;
	descricao: string;
	cardTitulo?: string;
	cardDescricao?: string;
	gerarRelatorio: (params: GerarRelatorioFiscalParams) => Promise<void>;
}

export function FiscalReportPage({
	titulo,
	descricao,
	cardTitulo = "Período de emissão",
	cardDescricao = "Informe o intervalo de datas de emissão dos documentos fiscais.",
	gerarRelatorio,
}: FiscalReportPageProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const periodoPadrao = obterPeriodoMesAtual();
	const [dataInicio, setDataInicio] = useState(periodoPadrao.dataInicio);
	const [dataFim, setDataFim] = useState(periodoPadrao.dataFim);
	const [formato, setFormato] = useState<"pdf" | "txt" | "html">("pdf");

	const exportarMutation = useMutation({
		mutationFn: async () => {
			if (!empresa?.id) {
				throw new Error("Empresa não selecionada");
			}

			if (!dataInicio || !dataFim) {
				throw new Error("Preencha o período completo");
			}

			const inicio = new Date(dataInicio);
			const fim = new Date(dataFim);

			if (inicio > fim) {
				throw new Error("Data inicial não pode ser maior que data final");
			}

			const diffDays = Math.ceil(
				Math.abs(fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
			);

			if (diffDays > 365) {
				throw new Error("Período máximo permitido é de 365 dias");
			}

			await gerarRelatorio({
				idempresa: empresa.id,
				dataInicio,
				dataFim,
				formato,
			});
		},
		onSuccess: () => {
			toast.success("Relatório gerado com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao gerar relatório");
		},
	});

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4">
				<h1 className="text-2xl font-bold">{titulo}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
			</div>

			<div className="px-4">
				<Card className="max-w-xl">
					<CardHeader>
						<CardTitle>{cardTitulo}</CardTitle>
						<CardDescription>{cardDescricao}</CardDescription>
					</CardHeader>
					<CardContent>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="dataInicio">Data inicial</FieldLabel>
								<Input
									id="dataInicio"
									type="date"
									value={dataInicio}
									onChange={(event) => setDataInicio(event.target.value)}
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor="dataFim">Data final</FieldLabel>
								<Input
									id="dataFim"
									type="date"
									value={dataFim}
									onChange={(event) => setDataFim(event.target.value)}
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor="formato">Formato</FieldLabel>
								<Select
									value={formato}
									onValueChange={(value) =>
										setFormato(value as "pdf" | "txt" | "html")
									}
								>
									<SelectTrigger id="formato">
										<SelectValue placeholder="Selecione o formato" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pdf">PDF</SelectItem>
										<SelectItem value="html">HTML</SelectItem>
										<SelectItem value="txt">TXT</SelectItem>
									</SelectContent>
								</Select>
							</Field>

							<Button
								onClick={() => exportarMutation.mutate()}
								disabled={exportarMutation.isPending || !empresa?.id}
								className="w-full sm:w-auto"
							>
								<DownloadIcon className="h-4 w-4" />
								{exportarMutation.isPending
									? "Gerando relatório..."
									: "Baixar relatório"}
							</Button>
						</FieldGroup>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
