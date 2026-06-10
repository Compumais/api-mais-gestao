"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CriarContaContabilFormData,
	criarContaContabilSchema,
} from "@/schemas/conta-contabil.schema";
import { contaContabilService } from "@/services/conta-contabil.service";

export default function NovaContaContabilPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();

	const form = useForm<CriarContaContabilFormData>({
		resolver: zodResolver(criarContaContabilSchema),
		defaultValues: {
			idempresa: localStorageEmpresa?.id ?? "",
			descricao: "",
			natureza: null,
			tipocontacontabil: null,
			codigoreduzido: null,
			codigocontareferencial: null,
			codigoextenso: null,
			contaglutinadora: null,
			nivelconta: null,
			idcontapai: null,
			inativo: 0,
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const natureza = watch("natureza");
	const tipocontacontabil = watch("tipocontacontabil");

	const { mutate: criarContaContabil, isPending } = useMutation({
		mutationFn: contaContabilService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["conta-contabil"] });
			toast.success("Conta contábil criada com sucesso!");
			router.push("/conta-contabil");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar conta contábil");
		},
	});

	const onSubmit = (data: CriarContaContabilFormData) => {
		if (!localStorageEmpresa?.id) {
			toast.error("Empresa não selecionada");
			return;
		}

		criarContaContabil({
			idempresa: localStorageEmpresa.id,
			descricao: data.descricao,
			natureza: data.natureza || undefined,
			tipocontacontabil: data.tipocontacontabil || undefined,
			codigoreduzido: data.codigoreduzido || undefined,
			codigocontareferencial: data.codigocontareferencial || undefined,
			codigoextenso: data.codigoextenso || undefined,
			contaglutinadora: data.contaglutinadora ?? undefined,
			nivelconta: data.nivelconta ?? undefined,
			idcontapai: data.idcontapai || undefined,
			inativo: data.inativo ?? 0,
		});
	};

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Nova conta contábil</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<form onSubmit={handleSubmit(onSubmit)}>
					<FieldGroup>
						<div className="grid grid-cols-3 w-full items-start gap-4">
							<Field data-invalid={!!errors.descricao}>
								<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
								<Input
									id="descricao"
									placeholder="Descrição da conta contábil"
									maxLength={100}
									aria-invalid={!!errors.descricao}
									aria-describedby={
										errors.descricao ? "descricao-error" : undefined
									}
									{...register("descricao")}
								/>
								<FieldError
									errors={errors.descricao ? [errors.descricao] : []}
								/>
							</Field>

							<Field data-invalid={!!errors.natureza}>
								<FieldLabel htmlFor="natureza">Natureza</FieldLabel>
								<Select
									value={natureza ?? ""}
									onValueChange={(value: string) =>
										setValue("natureza", value as "D" | "C")
									}
								>
									<SelectTrigger
										className="w-full"
										aria-invalid={!!errors.natureza}
										aria-describedby={
											errors.natureza ? "natureza-error" : undefined
										}
									>
										<SelectValue placeholder="Selecione a natureza" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="D">Devedora</SelectItem>
										<SelectItem value="C">Credora</SelectItem>
									</SelectContent>
								</Select>
								<FieldError errors={errors.natureza ? [errors.natureza] : []} />
							</Field>

							<Field data-invalid={!!errors.tipocontacontabil}>
								<FieldLabel htmlFor="tipocontacontabil">
									Tipo de conta
								</FieldLabel>
								<Select
									value={tipocontacontabil ?? ""}
									onValueChange={(value: string) =>
										setValue("tipocontacontabil", value as "S" | "A")
									}
								>
									<SelectTrigger
										className="w-full"
										aria-invalid={!!errors.tipocontacontabil}
										aria-describedby={
											errors.tipocontacontabil
												? "tipocontacontabil-error"
												: undefined
										}
									>
										<SelectValue placeholder="Selecione o tipo" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="S">Sintética</SelectItem>
										<SelectItem value="A">Analítica</SelectItem>
									</SelectContent>
								</Select>
								<FieldError
									errors={
										errors.tipocontacontabil ? [errors.tipocontacontabil] : []
									}
								/>
							</Field>
						</div>

						<div className="grid grid-cols-3 w-full items-start gap-4">
							<Field data-invalid={!!errors.codigoreduzido}>
								<FieldLabel htmlFor="codigoreduzido">
									Código reduzido
								</FieldLabel>
								<Input
									id="codigoreduzido"
									placeholder="Ex: 1.01.001"
									maxLength={20}
									aria-invalid={!!errors.codigoreduzido}
									aria-describedby={
										errors.codigoreduzido ? "codigoreduzido-error" : undefined
									}
									{...register("codigoreduzido")}
								/>
								<FieldError
									errors={errors.codigoreduzido ? [errors.codigoreduzido] : []}
								/>
							</Field>

							<Field data-invalid={!!errors.codigocontareferencial}>
								<FieldLabel htmlFor="codigocontareferencial">
									Código referencial
								</FieldLabel>
								<Input
									id="codigocontareferencial"
									placeholder="Código de conta referencial"
									maxLength={60}
									aria-invalid={!!errors.codigocontareferencial}
									aria-describedby={
										errors.codigocontareferencial
											? "codigocontareferencial-error"
											: undefined
									}
									{...register("codigocontareferencial")}
								/>
								<FieldError
									errors={
										errors.codigocontareferencial
											? [errors.codigocontareferencial]
											: []
									}
								/>
							</Field>

							<Field data-invalid={!!errors.codigoextenso}>
								<FieldLabel htmlFor="codigoextenso">
									Código por extenso
								</FieldLabel>
								<Input
									id="codigoextenso"
									placeholder="Código por extenso"
									maxLength={85}
									aria-invalid={!!errors.codigoextenso}
									aria-describedby={
										errors.codigoextenso ? "codigoextenso-error" : undefined
									}
									{...register("codigoextenso")}
								/>
								<FieldError
									errors={errors.codigoextenso ? [errors.codigoextenso] : []}
								/>
							</Field>
						</div>

						<div className="flex justify-end gap-2 mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending ? "Criando..." : "Criar"}
							</Button>
						</div>
					</FieldGroup>
				</form>
			</div>
		</PageContainer>
	);
}
