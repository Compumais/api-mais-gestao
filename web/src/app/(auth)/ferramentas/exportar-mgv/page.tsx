"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
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
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type ExportarMgvFormData,
	exportarMgvSchema,
} from "@/schemas/mgv.schema";
import { exportarProdutosMgv } from "@/services/mgv.service";
import { PageContainer } from "../../components/page-container";

export default function ExportarMgvPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [alertas, setAlertas] = useState<string[]>([]);

	const form = useForm<ExportarMgvFormData>({
		resolver: zodResolver(exportarMgvSchema) as Resolver<ExportarMgvFormData>,
		defaultValues: {
			departamentoPadrao: 1,
			diasValidade: 0,
			apenasPesaveis: false,
		},
	});

	const exportarMutation = useMutation({
		mutationFn: async (dados: ExportarMgvFormData) => {
			if (!empresa?.id) {
				throw new Error("Empresa não selecionada");
			}

			return exportarProdutosMgv({
				idempresa: empresa.id,
				departamentoPadrao: dados.departamentoPadrao,
				diasValidade: dados.diasValidade,
				apenasPesaveis: dados.apenasPesaveis,
			});
		},
		onSuccess: (resultado) => {
			setAlertas(resultado.alertas);
			toast.success(
				`Arquivo TXTitens.txt baixado com ${resultado.totalLinhas} item(ns).`,
			);
			if (resultado.alertas.length > 0) {
				toast.warning(
					`${resultado.alertas.length} produto(s) foram ignorados. Verifique códigos e preços.`,
				);
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao exportar produtos para o MGV");
		},
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Exportar produtos para MGV</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Gera o arquivo <code className="text-xs">TXTitens.txt</code> no
						layout Toledo MGV 6 (versão 3), importável no MGV 7, com os produtos
						ativos da empresa selecionada.
					</p>
				</div>

				<div className="px-4">
					<Card className="max-w-xl">
						<CardHeader>
							<CardTitle>Parâmetros da exportação</CardTitle>
							<CardDescription>
								O código do produto vira o PLU da balança. Preço máximo R$
								9.999,99. Produtos sem código válido ou sem preço são ignorados.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={form.handleSubmit((dados) =>
									exportarMutation.mutate(dados),
								)}
							>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="departamentoPadrao">
											Departamento padrão
										</FieldLabel>
										<Input
											id="departamentoPadrao"
											type="number"
											min={1}
											max={99}
											{...form.register("departamentoPadrao")}
										/>
										<FieldDescription>
											Usado quando o produto não tem departamento cadastrado (1
											a 99).
										</FieldDescription>
										<FieldError
											errors={
												form.formState.errors.departamentoPadrao
													? [form.formState.errors.departamentoPadrao]
													: []
											}
										/>
									</Field>

									<Field>
										<FieldLabel htmlFor="diasValidade">
											Dias de validade
										</FieldLabel>
										<Input
											id="diasValidade"
											type="number"
											min={0}
											max={999}
											{...form.register("diasValidade")}
										/>
										<FieldDescription>
											0 não imprime validade. 1 a 990 imprime datas. 998 não
											imprime. 999 solicita na balança.
										</FieldDescription>
										<FieldError
											errors={
												form.formState.errors.diasValidade
													? [form.formState.errors.diasValidade]
													: []
											}
										/>
									</Field>

									<Field orientation="horizontal">
										<Controller
											control={form.control}
											name="apenasPesaveis"
											render={({ field }) => (
												<Checkbox
													id="apenasPesaveis"
													checked={field.value}
													onCheckedChange={(valor) => field.onChange(!!valor)}
												/>
											)}
										/>
										<FieldLabel htmlFor="apenasPesaveis">
											Exportar apenas produtos pesáveis
										</FieldLabel>
									</Field>

									<Button
										type="submit"
										disabled={exportarMutation.isPending || !empresa?.id}
										className="w-full sm:w-auto"
									>
										<DownloadIcon className="h-4 w-4" />
										{exportarMutation.isPending
											? "Gerando arquivo..."
											: "Baixar TXTitens.txt"}
									</Button>
								</FieldGroup>
							</form>
						</CardContent>
					</Card>
				</div>

				{alertas.length > 0 && (
					<div className="px-4">
						<Card className="border-amber-500/40">
							<CardHeader>
								<CardTitle>Produtos ignorados</CardTitle>
								<CardDescription>
									Esses itens não entram no TXTitens.txt. Ajuste código (PLU 1 a
									999999) ou preço (até R$ 9.999,99) e exporte de novo.
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
