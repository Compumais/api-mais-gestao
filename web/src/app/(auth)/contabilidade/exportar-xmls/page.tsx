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
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import { exportarXmlsFiscais } from "@/services/contabilidade.service";
import { PageContainer } from "../../components/page-container";

function obterPeriodoMesAtual() {
	const hoje = new Date();
	const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
	const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

	return {
		dataInicio: primeiroDiaMes.toISOString().split("T")[0],
		dataFim: ultimoDiaMes.toISOString().split("T")[0],
	};
}

export default function ExportarXmlsContabilidadePage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const periodoPadrao = obterPeriodoMesAtual();
	const [dataInicio, setDataInicio] = useState(periodoPadrao.dataInicio);
	const [dataFim, setDataFim] = useState(periodoPadrao.dataFim);

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

			const diffTime = Math.abs(fim.getTime() - inicio.getTime());
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

			if (diffDays > 365) {
				throw new Error("Período máximo permitido é de 365 dias");
			}

			await exportarXmlsFiscais({
				idempresa: empresa.id,
				dataInicio,
				dataFim,
			});
		},
		onSuccess: () => {
			toast.success("ZIP com XMLs fiscais baixado com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao exportar XMLs fiscais");
		},
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Exportar XMLs fiscais</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Baixe um arquivo ZIP com os XMLs autorizados de NF-e de venda e
						NFC-e da empresa no período informado, organizados nas pastas{" "}
						<code className="text-xs">nfe/</code> e{" "}
						<code className="text-xs">nfce/</code>.
					</p>
				</div>

				<div className="px-4">
					<Card className="max-w-xl">
						<CardHeader>
							<CardTitle>Período de emissão</CardTitle>
							<CardDescription>
								Somente notas autorizadas com XML disponível serão incluídas no
								arquivo.
							</CardDescription>
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

								<Button
									onClick={() => exportarMutation.mutate()}
									disabled={exportarMutation.isPending || !empresa?.id}
									className="w-full sm:w-auto"
								>
									<DownloadIcon className="h-4 w-4" />
									{exportarMutation.isPending
										? "Gerando ZIP..."
										: "Baixar ZIP"}
								</Button>
							</FieldGroup>
						</CardContent>
					</Card>
				</div>
			</div>
		</PageContainer>
	);
}
