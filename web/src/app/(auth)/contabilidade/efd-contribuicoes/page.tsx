"use client";

import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
import {
	gerarArquivoEfdContribuicoes,
	mesAtualAnoMes,
	periodoMesCivil,
} from "@/services/efd.service";
import { PageContainer } from "../../components/page-container";

export default function GerarEfdContribuicoesPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [anoMes, setAnoMes] = useState(mesAtualAnoMes);
	const [finalidade, setFinalidade] = useState<"0" | "1">("0");
	const [alertas, setAlertas] = useState<string[]>([]);

	const periodo = useMemo(() => periodoMesCivil(anoMes), [anoMes]);

	const gerarMutation = useMutation({
		mutationFn: async () => {
			if (!empresa?.id) {
				throw new Error("Empresa não selecionada");
			}
			return gerarArquivoEfdContribuicoes({
				idempresa: empresa.id,
				dataInicio: periodo.dataInicio,
				dataFim: periodo.dataFim,
				finalidade,
			});
		},
		onSuccess: (resultado) => {
			setAlertas(resultado.alertas);
			toast.success(
				`Arquivo EFD-Contribuições gerado com ${resultado.totalLinhas} linha(s).`,
			);
			if (resultado.alertas.length > 0) {
				toast.warning(
					`${resultado.alertas.length} alerta(s) fiscal(is) encontrado(s).`,
				);
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao gerar EFD-Contribuições");
		},
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Gerar EFD-Contribuições</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						PIS/COFINS para Lucro Presumido ou Real. Empresas do Simples
						Nacional (CRT 1, 2 ou 4) não geram este arquivo — a obrigação não se
						aplica na regra geral.
					</p>
				</div>

				<div className="px-4">
					<Card className="max-w-xl">
						<CardHeader>
							<CardTitle>Parâmetros de geração</CardTitle>
							<CardDescription>
								Use o PVA da EFD-Contribuições (validador distinto do ICMS/IPI).
							</CardDescription>
						</CardHeader>
						<CardContent>
							<FieldGroup className="gap-4">
								<Field>
									<FieldLabel htmlFor="competencia">Competência</FieldLabel>
									<Input
										id="competencia"
										type="month"
										value={anoMes}
										onChange={(event) => setAnoMes(event.target.value)}
									/>
									<p className="text-xs text-muted-foreground">
										Período: {periodo.dataInicio} a {periodo.dataFim}
									</p>
								</Field>

								<Field>
									<FieldLabel>Finalidade</FieldLabel>
									<Select
										value={finalidade}
										onValueChange={(valor) => setFinalidade(valor as "0" | "1")}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecione a finalidade" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="0">0 - Original</SelectItem>
											<SelectItem value="1">1 - Substituto</SelectItem>
										</SelectContent>
									</Select>
								</Field>

								<Button
									onClick={() => gerarMutation.mutate()}
									disabled={gerarMutation.isPending}
								>
									<DownloadIcon className="mr-2 h-4 w-4" />
									{gerarMutation.isPending
										? "Gerando..."
										: "Gerar EFD-Contribuições"}
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
