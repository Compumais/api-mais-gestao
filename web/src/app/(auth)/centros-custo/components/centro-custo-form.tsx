"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CampoDepartamento } from "@/components/campo-departamento";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
import { Textarea } from "@/components/ui/textarea";
import { TIPO_GESTAO_CENTRO_CUSTO } from "@/constants/centro-custo-constants";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type AtualizarCentroCustoFormData,
	atualizarCentroCustoSchema,
	type CriarCentroCustoFormData,
	criarCentroCustoSchema,
} from "@/schemas/centro-custo.schema";
import {
	type CentroCusto,
	centroCustoService,
} from "@/services/centro-custo.service";

type CentroCustoFormProps = {
	modo: "criar" | "editar";
	centroCustoId?: string;
	idcentrocustopai?: string | null;
};

export function CentroCustoForm({
	modo,
	centroCustoId,
	idcentrocustopai,
}: CentroCustoFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const isEdicao = modo === "editar";

	const form = useForm<
		CriarCentroCustoFormData | AtualizarCentroCustoFormData
	>({
		resolver: zodResolver(
			isEdicao ? atualizarCentroCustoSchema : criarCentroCustoSchema,
		) as never,
			defaultValues: {
				idempresa: empresa?.id ?? "",
				nome: "",
				descricao: null,
				tipogestao: null,
				iddepartamento: null,
				inativo: 0,
				idcentrocustopai: idcentrocustopai ?? undefined,
				codigoextenso: "",
				codigoreduzido: "",
				observacao: null,
			},
		},
	);

	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = form;

	const inativo = watch("inativo");

	const { data: centroAtual, isLoading: loadingCentro } = useQuery({
		queryKey: ["centros-custo", centroCustoId],
		queryFn: () => centroCustoService.buscar(centroCustoId!),
		enabled: isEdicao && !!centroCustoId,
	});

	const { data: paiData } = useQuery({
		queryKey: ["centros-custo", "pai", idcentrocustopai],
		queryFn: () => centroCustoService.buscar(idcentrocustopai!),
		enabled: !!idcentrocustopai && !isEdicao,
	});

	const { data: centrosLista } = useQuery({
		queryKey: ["centros-custo", "pai-opcoes", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return centroCustoService.listar({
				idempresa: empresa.id,
				formato: "lista",
				limit: 500,
			});
		},
		enabled: !!empresa && isEdicao,
	});

	useEffect(() => {
		if (centroAtual) {
			reset({
				nome: centroAtual.nome,
				descricao: centroAtual.descricao,
				tipogestao: (centroAtual.tipogestao as CriarCentroCustoFormData["tipogestao"]) ?? null,
				iddepartamento: centroAtual.iddepartamento,
				inativo: centroAtual.inativo === 1 ? 1 : 0,
				idcentrocustopai: centroAtual.idcentrocustopai ?? undefined,
				codigoextenso: centroAtual.codigoextenso ?? "",
				codigoreduzido: centroAtual.codigoreduzido ?? "",
				observacao: centroAtual.observacao,
			});
		}
	}, [centroAtual, reset]);

	const criarMutation = useMutation({
		mutationFn: centroCustoService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
			toast.success("Centro de custo criado com sucesso!");
			router.push("/centros-custo");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar centro de custo");
		},
	});

	const atualizarMutation = useMutation({
		mutationFn: (dados: AtualizarCentroCustoFormData) =>
			centroCustoService.atualizar(centroCustoId!, dados),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["centros-custo"] });
			toast.success("Centro de custo atualizado!");
			router.push("/centros-custo");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar centro de custo");
		},
	});

	const onSubmit = (
		data: CriarCentroCustoFormData | AtualizarCentroCustoFormData,
	) => {
		if (!empresa?.id && !isEdicao) {
			toast.error("Empresa não selecionada");
			return;
		}

		const payload = {
			nome: data.nome,
			descricao: data.descricao ?? null,
			tipogestao: data.tipogestao ?? null,
			iddepartamento: data.iddepartamento ?? null,
			inativo: data.inativo === 1 ? 1 : 0,
			idcentrocustopai: data.idcentrocustopai || undefined,
			codigoextenso: data.codigoextenso || undefined,
			codigoreduzido: data.codigoreduzido || undefined,
			observacao: data.observacao ?? null,
		};

		if (isEdicao) {
			atualizarMutation.mutate(payload);
		} else {
			criarMutation.mutate({ ...payload, idempresa: empresa!.id });
		}
	};

	const opcoesPai = ((centrosLista?.data ?? []) as CentroCusto[])
		.filter((c) => c.id !== centroCustoId)
		.map((c) => ({
			value: c.id,
			label: c.codigoreduzido
				? `${c.codigoreduzido} - ${c.nome}`
				: c.nome,
		}));

	if (isEdicao && loadingCentro) {
		return <p className="text-muted-foreground p-4">Carregando...</p>;
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup className="space-y-4">
				{paiData ? (
					<p className="text-sm text-muted-foreground">
						Centro pai: <strong>{paiData.nome}</strong>
					</p>
				) : null}

				<Field data-invalid={!!errors.nome}>
					<FieldLabel htmlFor="nome">Nome *</FieldLabel>
					<Input id="nome" {...register("nome")} maxLength={50} />
					<FieldError errors={errors.nome ? [errors.nome] : []} />
				</Field>

				<Field data-invalid={!!errors.descricao}>
					<FieldLabel htmlFor="descricao">Descrição</FieldLabel>
					<Textarea id="descricao" rows={3} {...register("descricao")} />
					<FieldError errors={errors.descricao ? [errors.descricao] : []} />
				</Field>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field>
						<FieldLabel>Tipo de gestão</FieldLabel>
						<Controller
							control={control}
							name="tipogestao"
							render={({ field }) => (
								<Select
									value={field.value ?? "none"}
									onValueChange={(v) =>
										field.onChange(v === "none" ? null : v)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Não informado</SelectItem>
										{TIPO_GESTAO_CENTRO_CUSTO.map((t) => (
											<SelectItem key={t.value} value={t.value}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					</Field>

					<Controller
						control={control}
						name="iddepartamento"
						render={({ field }) => (
							<CampoDepartamento
								value={field.value ?? null}
								onChange={field.onChange}
							/>
						)}
					/>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="codigoreduzido">Código reduzido</FieldLabel>
						<Input id="codigoreduzido" {...register("codigoreduzido")} />
					</Field>
					<Field>
						<FieldLabel htmlFor="codigoextenso">Código extenso</FieldLabel>
						<Input id="codigoextenso" {...register("codigoextenso")} />
					</Field>
				</div>

				{isEdicao ? (
					<Field>
						<FieldLabel>Centro de custo pai</FieldLabel>
						<Controller
							control={control}
							name="idcentrocustopai"
							render={({ field }) => (
								<Combobox
									options={opcoesPai}
									value={field.value ?? ""}
									onChange={(v) => field.onChange(v || undefined)}
									placeholder="Raiz (sem pai)"
									allowEmpty
								/>
							)}
						/>
					</Field>
				) : null}

				<Field orientation="horizontal">
					<Checkbox
						id="inativo"
						className="size-4 shrink-0"
						checked={inativo === 1}
						onCheckedChange={(checked) =>
							setValue("inativo", checked ? 1 : 0)
						}
					/>
					<FieldLabel htmlFor="inativo" className="font-normal">
						Inativo
					</FieldLabel>
				</Field>

				<div className="flex justify-end gap-2 mt-6">
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Cancelar
					</Button>
					<Button
						type="submit"
						disabled={criarMutation.isPending || atualizarMutation.isPending}
					>
						{isEdicao
							? atualizarMutation.isPending
								? "Salvando..."
								: "Salvar"
							: criarMutation.isPending
								? "Criando..."
								: "Criar"}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
