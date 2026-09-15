"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NaturezaAbaGeral } from "@/app/(auth)/tributos/naturezas/components/natureza-aba-geral";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ABAS_NATUREZA_CFOP } from "@/constants/cfop-natureza";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CfopFormData,
	cfopFormDefaultValues,
	cfopFormSchema,
} from "@/schemas/cfop.schema";
import { cfopService } from "@/services/cfop.service";
import { planoContasService } from "@/services/plano-contas.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";
import {
	mapearNaturezaFormParaApi,
	valoresIniciaisNaturezaForm,
} from "@/util/cfop-natureza-mapper";

const ROTA_LISTAGEM = "/tributos/naturezas";

type NaturezaFormProps = {
	modo?: "criar" | "editar";
	naturezaId?: string;
	valoresIniciais?: Partial<CfopFormData>;
};

export function NaturezaForm(props: NaturezaFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const modo = props.modo ?? "criar";
	const isEdicao = modo === "editar";

	const form = useForm<CfopFormData>({
		resolver: zodResolver(cfopFormSchema),
		defaultValues: {
			...cfopFormDefaultValues,
			...props.valoresIniciais,
		},
	});

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
		reset,
	} = form;

	useEffect(() => {
		if (!isEdicao) return;
		if (!props.valoresIniciais) return;
		reset({
			...cfopFormDefaultValues,
			...props.valoresIniciais,
		});
	}, [isEdicao, props.valoresIniciais, reset]);

	const { data: planosContas = [], isLoading: carregandoPlanos } = useQuery({
		queryKey: ["plano-contas", "natureza-form", empresa?.id],
		queryFn: async () => {
			if (!empresa) return [];
			const resposta = await planoContasService.listar({
				idempresa: empresa.id,
				page: 1,
				limit: 100,
				listarTudo: true,
			});
			return resposta.data.filter((plano) => plano.inativo !== 1);
		},
		enabled: !!empresa,
	});

	const { data: tiposDocumento = [], isLoading: carregandoTipos } = useQuery({
		queryKey: ["tipos-documento-financeiro", "natureza-form", empresa?.id],
		queryFn: async () => {
			if (!empresa) return [];
			const tipos = await tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
			return tipos.filter((tipo) => tipo.inativo !== 1);
		},
		enabled: !!empresa,
	});

	const { data: naturezas = [], isLoading: carregandoNaturezas } = useQuery({
		queryKey: ["cfops", "relacionadas", empresa?.id, props.naturezaId],
		queryFn: async () => {
			if (!empresa) return [];
			const registros = await cfopService.listarTodos({
				idempresa: empresa.id,
			});
			return registros.filter((item) => item.id !== props.naturezaId);
		},
		enabled: !!empresa,
	});

	const { mutate: criarNatureza, isPending: isPendingCriar } = useMutation({
		mutationFn: cfopService.criar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cfops"] });
			toast.success("Natureza cadastrada com sucesso!");
			router.push(ROTA_LISTAGEM);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cadastrar natureza");
		},
	});

	const { mutate: atualizarNatureza, isPending: isPendingAtualizar } =
		useMutation({
			mutationFn: async (
				dados: Parameters<typeof cfopService.atualizar>[1],
			) => {
				if (!isEdicao || !props.naturezaId) {
					throw new Error("ID da natureza é obrigatório para editar");
				}
				return await cfopService.atualizar(props.naturezaId, dados);
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["cfops"] });
				if (props.naturezaId) {
					queryClient.invalidateQueries({
						queryKey: ["cfop", props.naturezaId],
					});
				}
				toast.success("Natureza atualizada com sucesso!");
				router.push(ROTA_LISTAGEM);
			},
			onError: (error: Error) => {
				toast.error(error.message || "Erro ao atualizar natureza");
			},
		});

	const onSubmit = (data: CfopFormData) => {
		if (!empresa) {
			toast.error("Empresa não selecionada");
			return;
		}

		const payload = mapearNaturezaFormParaApi(data);

		if (!isEdicao) {
			criarNatureza({
				idempresa: empresa.id,
				...payload,
			});
			return;
		}

		atualizarNatureza(payload);
	};

	const carregandoRelacionados =
		carregandoPlanos || carregandoTipos || carregandoNaturezas;

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<FieldGroup>
				<Tabs defaultValue="geral" className="w-full">
					<div className="mb-4 overflow-x-auto">
						<TabsList className="h-auto min-w-max flex-wrap justify-start gap-1">
							{ABAS_NATUREZA_CFOP.map((aba) => (
								<TabsTrigger
									key={aba.value}
									value={aba.value}
									disabled={!aba.enabled}
									className="px-3"
								>
									{aba.label}
								</TabsTrigger>
							))}
						</TabsList>
					</div>

					<TabsContent value="geral" className="mt-0">
						<NaturezaAbaGeral
							control={control}
							errors={errors}
							register={register}
							planosContas={planosContas}
							tiposDocumento={tiposDocumento}
							naturezas={naturezas}
							carregandoRelacionados={carregandoRelacionados}
						/>
					</TabsContent>

					{ABAS_NATUREZA_CFOP.filter((aba) => aba.value !== "geral").map(
						(aba) => (
							<TabsContent key={aba.value} value={aba.value}>
								<p className="text-sm text-muted-foreground">
									Aba {aba.label} em breve.
									{"subabas" in aba && aba.subabas
										? ` Subabas previstas: ${aba.subabas
												.map((subaba) => subaba.label)
												.join(", ")}.`
										: null}
								</p>
							</TabsContent>
						),
					)}
				</Tabs>

				<div className="mt-6 flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Cancelar
					</Button>
					<Button type="submit" disabled={isPendingCriar || isPendingAtualizar}>
						{modo === "editar"
							? isPendingAtualizar
								? "Salvando..."
								: "Salvar"
							: isPendingCriar
								? "Cadastrando..."
								: "Cadastrar"}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}

export { valoresIniciaisNaturezaForm };
