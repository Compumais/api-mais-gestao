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
import { Checkbox } from "@/components/ui/checkbox";
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
import { gerarArquivoSintegra } from "@/services/sintegra.service";
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

export default function GerarSintegraPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const periodoPadrao = obterPeriodoMesAtual();
	const [dataInicio, setDataInicio] = useState(periodoPadrao.dataInicio);
	const [dataFim, setDataFim] = useState(periodoPadrao.dataFim);
	const [finalidade, setFinalidade] = useState<"1" | "2" | "3" | "5">("1");
	const [incluirInventario, setIncluirInventario] = useState(false);
	const [dataInventario, setDataInventario] = useState(
		periodoPadrao.dataFim,
	);
	const [alertas, setAlertas] = useState<string[]>([]);

	const gerarMutation = useMutation({
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

			if (incluirInventario && !dataInventario) {
				throw new Error("Informe a data do inventário");
			}

			return gerarArquivoSintegra({
				idempresa: empresa.id,
				dataInicio,
				dataFim,
				finalidade,
				incluirInventario,
				dataInventario: incluirInventario ? dataInventario : undefined,
			});
		},
		onSuccess: (resultado) => {
			setAlertas(resultado.alertas);
			toast.success(
				`Arquivo SINTEGRA gerado com ${resultado.totalLinhas} linha(s).`,
			);
			if (resultado.alertas.length > 0) {
				toast.warning(
					`${resultado.alertas.length} alerta(s) fiscal(is) encontrado(s).`,
				);
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao gerar arquivo SINTEGRA");
		},
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Gerar SINTEGRA</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Geração do arquivo magnético SINTEGRA (MG) para entrega à SEFAZ.
					</p>
				</div>

				<div className="px-4">
			<Card className="max-w-xl">
				<CardHeader>
					<CardTitle>Parâmetros de geração</CardTitle>
					<CardDescription>
						Informe o período de movimentação fiscal e as opções do arquivo.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup className="gap-4">
						<div className="grid gap-4 md:grid-cols-2">
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
						</div>

						<Field>
							<FieldLabel>Finalidade do arquivo</FieldLabel>
							<Select
								value={finalidade}
								onValueChange={(valor) =>
									setFinalidade(valor as "1" | "2" | "3" | "5")
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecione a finalidade" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1 - Normal</SelectItem>
									<SelectItem value="2">2 - Retificação total</SelectItem>
									<SelectItem value="3">3 - Retificação aditiva</SelectItem>
									<SelectItem value="5">5 - Desfazimento</SelectItem>
								</SelectContent>
							</Select>
						</Field>

						<div className="flex items-center gap-2">
							<Checkbox
								id="incluirInventario"
								checked={incluirInventario}
								onCheckedChange={(checked) =>
									setIncluirInventario(checked === true)
								}
							/>
							<FieldLabel htmlFor="incluirInventario">
								Incluir inventário fiscal (registro 74)
							</FieldLabel>
						</div>

						{incluirInventario && (
							<Field>
								<FieldLabel htmlFor="dataInventario">
									Data-base do inventário
								</FieldLabel>
								<Input
									id="dataInventario"
									type="date"
									value={dataInventario}
									onChange={(event) => setDataInventario(event.target.value)}
								/>
							</Field>
						)}

						<Button
							onClick={() => gerarMutation.mutate()}
							disabled={gerarMutation.isPending}
						>
							<DownloadIcon className="mr-2 h-4 w-4" />
							{gerarMutation.isPending ? "Gerando..." : "Gerar SINTEGRA"}
						</Button>
					</FieldGroup>
				</CardContent>
			</Card>
				</div>

			{alertas.length > 0 && (
				<div className="px-4">
				<Card className="border-amber-500/40">
					<CardHeader>
						<CardTitle>Alertas fiscais</CardTitle>
						<CardDescription>
							Revise os pontos abaixo antes de transmitir o arquivo ao PVA/SIGAF
							MG.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
							{alertas.map((alerta) => (
								<li key={alerta}>{alerta}</li>
							))}
						</ul>
					</CardContent>
				</Card>
				</div>
			)}
			</div>
		</PageContainer>
	);
}
