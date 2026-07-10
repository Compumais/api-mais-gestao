"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type ContabilidadeCadastroFormData,
	contabilidadeCadastroSchema,
} from "@/schemas/automacao.schema";
import { contabilidadeCadastroService } from "@/services/contabilidade-cadastro.service";
import { PageContainer } from "../components/page-container";

export default function ConfiguracaoContabilidadePage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();

	const { data: cadastro, isLoading } = useQuery({
		queryKey: ["contabilidade-cadastro", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return contabilidadeCadastroService.buscar(empresa.id);
		},
		enabled: !!empresa?.id,
	});

	const form = useForm<ContabilidadeCadastroFormData>({
		resolver: zodResolver(contabilidadeCadastroSchema),
		defaultValues: {
			nome: "",
			cnpj: "",
			emailprincipal: "",
			emailsadicionais: "",
			ativo: true,
		},
	});

	useEffect(() => {
		if (!cadastro) return;
		form.reset({
			nome: cadastro.nome,
			cnpj: cadastro.cnpj ?? "",
			emailprincipal: cadastro.emailprincipal,
			emailsadicionais: (cadastro.emailsadicionais ?? []).join(", "),
			ativo: cadastro.ativo,
		});
	}, [cadastro, form]);

	const { mutate: salvar, isPending } = useMutation({
		mutationFn: async (dados: ContabilidadeCadastroFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const emails = dados.emailsadicionais
				?.split(/[,;]/)
				.map((e) => e.trim())
				.filter(Boolean);
			return contabilidadeCadastroService.salvar({
				idempresa: empresa.id,
				nome: dados.nome,
				cnpj: dados.cnpj?.trim() || null,
				emailprincipal: dados.emailprincipal,
				emailsadicionais: emails?.length ? emails : null,
				ativo: dados.ativo,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["contabilidade-cadastro"],
			});
			toast.success("Cadastro da contabilidade salvo");
		},
		onError: (erro) => {
			toast.error("Erro ao salvar", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-muted-foreground">
						Selecione uma empresa para configurar a contabilidade.
					</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Configuração da contabilidade
					</h1>
					<p className="text-sm text-muted-foreground">
						Cadastre o escritório contábil que receberá SINTEGRA e XMLs pelas
						automações.
					</p>
				</div>

				{isLoading ? (
					<p className="text-sm text-muted-foreground">Carregando...</p>
				) : (
					<form
						className="space-y-6"
						onSubmit={form.handleSubmit((dados) => salvar(dados))}
					>
						<FieldGroup>
							<FieldSet>
								<FieldLegend>Escritório</FieldLegend>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<Field className="md:col-span-2">
										<FieldLabel htmlFor="contab-nome">Nome</FieldLabel>
										<Input id="contab-nome" {...form.register("nome")} />
										{form.formState.errors.nome && (
											<p className="text-xs text-destructive">
												{form.formState.errors.nome.message}
											</p>
										)}
									</Field>
									<Field>
										<FieldLabel htmlFor="contab-cnpj">CNPJ (opcional)</FieldLabel>
										<Input id="contab-cnpj" {...form.register("cnpj")} />
									</Field>
									<Field>
										<FieldLabel htmlFor="contab-email">
											E-mail principal
										</FieldLabel>
										<Input
											id="contab-email"
											type="email"
											{...form.register("emailprincipal")}
										/>
										{form.formState.errors.emailprincipal && (
											<p className="text-xs text-destructive">
												{form.formState.errors.emailprincipal.message}
											</p>
										)}
									</Field>
									<Field className="md:col-span-2">
										<FieldLabel htmlFor="contab-emails-extra">
											E-mails adicionais
										</FieldLabel>
										<Input
											id="contab-emails-extra"
											placeholder="email1@..., email2@..."
											{...form.register("emailsadicionais")}
										/>
										<p className="text-xs text-muted-foreground">
											Separe por vírgula ou ponto e vírgula.
										</p>
									</Field>
								</div>
							</FieldSet>
						</FieldGroup>

						<div className="flex items-center gap-3 rounded-md border p-4">
							<Controller
								control={form.control}
								name="ativo"
								render={({ field }) => (
									<Checkbox
										id="contab-ativo"
										checked={field.value}
										onCheckedChange={(v) => field.onChange(!!v)}
									/>
								)}
							/>
							<FieldLabel htmlFor="contab-ativo" className="font-medium">
								Cadastro ativo
							</FieldLabel>
						</div>

						<Button type="submit" disabled={isPending}>
							{isPending ? "Salvando..." : "Salvar"}
						</Button>
					</form>
				)}
			</div>
		</PageContainer>
	);
}
