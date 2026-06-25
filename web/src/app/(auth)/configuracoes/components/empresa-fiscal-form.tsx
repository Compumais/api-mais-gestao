"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
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
import {
	type EmpresaFiscalConfigFormData,
	empresaFiscalConfigSchema,
} from "@/schemas/empresa-fiscal-config.schema";
import { empresaFiscalService } from "@/services/empresa-fiscal.service";
import { localidadesService } from "@/services/localidades.service";

const OPCOES_REGIME = [
	{ value: "SN", label: "Simples Nacional", crt: 1 },
	{ value: "LP", label: "Lucro Presumido", crt: 3 },
	{ value: "LR", label: "Lucro Real", crt: 3 },
] as const;

const OPCOES_CRT = [
	{ value: "1", label: "1 - Simples Nacional" },
	{ value: "2", label: "2 - Simples excesso sublimite" },
	{ value: "3", label: "3 - Regime Normal" },
	{ value: "4", label: "4 - MEI" },
];

interface EmpresaFiscalFormProps {
	idempresa: string;
}

export function EmpresaFiscalForm({ idempresa }: EmpresaFiscalFormProps) {
	const queryClient = useQueryClient();

	const { data: fiscal, isLoading } = useQuery({
		queryKey: ["empresa-fiscal", idempresa],
		queryFn: () => empresaFiscalService.buscar(idempresa),
	});

	const { data: estadosData } = useQuery({
		queryKey: ["localidades", "estados"],
		queryFn: () => localidadesService.listarEstados(),
	});

	const form = useForm<
		z.input<typeof empresaFiscalConfigSchema>,
		unknown,
		z.output<typeof empresaFiscalConfigSchema>
	>({
		resolver: zodResolver(empresaFiscalConfigSchema),
		defaultValues: {
			regimetributario: "",
			indicadorie: 1,
			codigopais: "1058",
		},
	});

	const uf = form.watch("uf");

	const { data: municipiosData } = useQuery({
		queryKey: ["localidades", "municipios", uf],
		queryFn: () => localidadesService.listarMunicipios(uf as string),
		enabled: !!uf,
	});

	useEffect(() => {
		if (!fiscal) return;
		form.reset({
			razaosocial: fiscal.razaosocial ?? "",
			nomefantasia: fiscal.nomefantasia ?? "",
			inscricaoestadual: fiscal.inscricaoestadual ?? "",
			inscricaomunicipal: fiscal.inscricaomunicipal ?? "",
			crt: fiscal.crt ?? undefined,
			cnae: fiscal.cnae ?? "",
			indicadorie: fiscal.indicadorie ?? 1,
			logradouro: fiscal.logradouro ?? "",
			numero: fiscal.numero ?? "",
			complemento: fiscal.complemento ?? "",
			bairro: fiscal.bairro ?? "",
			cep: fiscal.cep ?? "",
			codigomunicipioibge: fiscal.codigomunicipioibge ?? "",
			uf: fiscal.uf ?? "",
			codigopais: fiscal.codigopais ?? "1058",
			telefone: fiscal.telefone ?? "",
			email: fiscal.email ?? "",
			regimetributario: fiscal.regimetributario ?? "",
		});
	}, [fiscal, form]);

	const salvarMutation = useMutation({
		mutationFn: (dados: EmpresaFiscalConfigFormData) =>
			empresaFiscalService.atualizar(idempresa, {
				...dados,
				regimetributario:
					dados.regimetributario === ""
						? null
						: (dados.regimetributario as "SN" | "LP" | "LR"),
			}),
		onSuccess: () => {
			toast.success("Dados fiscais salvos");
			queryClient.invalidateQueries({
				queryKey: ["empresa-fiscal", idempresa],
			});
		},
		onError: () => toast.error("Não foi possível salvar os dados fiscais"),
	});

	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<form onSubmit={form.handleSubmit((dados) => salvarMutation.mutate(dados))}>
			<FieldGroup>
				<div className="space-y-6 rounded-lg border bg-card p-6">
					<div>
						<h2 className="text-lg font-semibold mb-2">Dados fiscais</h2>
						<p className="text-muted-foreground text-sm mb-4">
							Informações tributárias e cadastrais utilizadas na emissão de
							documentos fiscais.
						</p>
						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="regimetributario">
									Regime tributário
								</FieldLabel>
								<Select
									value={form.watch("regimetributario") ?? ""}
									onValueChange={(valor) => {
										form.setValue(
											"regimetributario",
											valor === "none"
												? ""
												: (valor as EmpresaFiscalConfigFormData["regimetributario"]),
										);
										const opcao = OPCOES_REGIME.find((o) => o.value === valor);
										if (opcao) form.setValue("crt", opcao.crt);
									}}
								>
									<SelectTrigger id="regimetributario">
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Não informado</SelectItem>
										{OPCOES_REGIME.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>

							<Field>
								<FieldLabel htmlFor="crt">
									CRT (código regime tributário NF-e)
								</FieldLabel>
								<Select
									value={String(form.watch("crt") ?? "")}
									onValueChange={(v) =>
										form.setValue("crt", v ? Number(v) : undefined)
									}
								>
									<SelectTrigger id="crt">
										<SelectValue placeholder="CRT" />
									</SelectTrigger>
									<SelectContent>
										{OPCOES_CRT.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						</div>
					</div>

					<div className="border-t pt-6">
						<h2 className="text-lg font-semibold mb-4">Identificação</h2>
						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="razaosocial">Razão social</FieldLabel>
								<Input id="razaosocial" {...form.register("razaosocial")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="nomefantasia">Nome fantasia</FieldLabel>
								<Input id="nomefantasia" {...form.register("nomefantasia")} />
							</Field>
						</div>

						<div className="grid gap-4 md:grid-cols-3">
							<Field>
								<FieldLabel htmlFor="inscricaoestadual">
									Inscrição estadual
								</FieldLabel>
								<Input
									id="inscricaoestadual"
									{...form.register("inscricaoestadual")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="inscricaomunicipal">
									Inscrição municipal
								</FieldLabel>
								<Input
									id="inscricaomunicipal"
									{...form.register("inscricaomunicipal")}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="cnae">CNAE principal</FieldLabel>
								<Input id="cnae" {...form.register("cnae")} />
							</Field>
						</div>
					</div>

					<div className="border-t pt-6">
						<h2 className="text-lg font-semibold mb-4">Endereço</h2>
						<div className="grid gap-4 md:grid-cols-3">
							<Field>
								<FieldLabel htmlFor="cep">CEP</FieldLabel>
								<Input id="cep" {...form.register("cep")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="uf">UF</FieldLabel>
								<Select
									value={form.watch("uf") ?? ""}
									onValueChange={(v) => {
										form.setValue("uf", v);
										form.setValue("codigomunicipioibge", "");
									}}
								>
									<SelectTrigger id="uf">
										<SelectValue placeholder="UF" />
									</SelectTrigger>
									<SelectContent>
										{estadosData?.data.map((estado) => (
											<SelectItem key={estado.idestado} value={estado.idestado}>
												{estado.nome}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="codigomunicipioibge">
									Município (IBGE)
								</FieldLabel>
								<Select
									value={form.watch("codigomunicipioibge") ?? ""}
									onValueChange={(v) => form.setValue("codigomunicipioibge", v)}
									disabled={!uf}
								>
									<SelectTrigger id="codigomunicipioibge">
										<SelectValue placeholder="Município" />
									</SelectTrigger>
									<SelectContent>
										{municipiosData?.data.map((m) => (
											<SelectItem key={m.idcidade} value={m.idcidade}>
												{m.nome}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="logradouro">Logradouro</FieldLabel>
								<Input id="logradouro" {...form.register("logradouro")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="numero">Número</FieldLabel>
								<Input id="numero" {...form.register("numero")} />
							</Field>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="bairro">Bairro</FieldLabel>
								<Input id="bairro" {...form.register("bairro")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="complemento">Complemento</FieldLabel>
								<Input id="complemento" {...form.register("complemento")} />
							</Field>
						</div>
					</div>

					<div className="border-t pt-6">
						<h2 className="text-lg font-semibold mb-4">Contato</h2>
						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="telefone">Telefone</FieldLabel>
								<Input id="telefone" {...form.register("telefone")} />
							</Field>
							<Field data-invalid={!!form.formState.errors.email}>
								<FieldLabel htmlFor="email">E-mail</FieldLabel>
								<Input id="email" type="email" {...form.register("email")} />
								<FieldError
									errors={
										form.formState.errors.email
											? [form.formState.errors.email]
											: []
									}
								/>
							</Field>
						</div>
					</div>

					<div className="flex justify-end pt-4 border-t">
						<Button type="submit" disabled={salvarMutation.isPending}>
							{salvarMutation.isPending ? "Salvando..." : "Salvar"}
						</Button>
					</div>
				</div>
			</FieldGroup>
		</form>
	);
}
