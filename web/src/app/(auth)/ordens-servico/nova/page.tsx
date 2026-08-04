"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ORDEM_SERVICO_CAMPOS_EXTRA } from "@/constants/ordem-servico-status";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	useConfiguracaoOrdemServico,
	useCriarOrdemServico,
} from "@/hooks/use-ordem-servico";
import {
	type OrdemServicoFormData,
	type OrdemServicoFormInput,
	ordemServicoFormSchema,
} from "@/schemas/ordem-servico.schema";
import { areaService } from "@/services/area.service";
import { condicaoPagamentoService } from "@/services/condicao-pagamento.service";
import { entidadesService } from "@/services/entidades.service";
import { objetoService } from "@/services/objeto.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";
import { tipoProblemaService } from "@/services/tipo-problema.service";
import { usuariosService } from "@/services/usuarios.service";
import {
	camposExtrasAtivos,
	listarErrosFormularioOs,
} from "@/util/ordem-servico-ui";
import { PageContainer } from "../../components/page-container";
import { OrdemServicoForm } from "../components/ordem-servico-form";

function defaultsForm(): OrdemServicoFormInput {
	const extras = Object.fromEntries(
		ORDEM_SERVICO_CAMPOS_EXTRA.map((campo) => [campo, ""]),
	) as Record<(typeof ORDEM_SERVICO_CAMPOS_EXTRA)[number], string>;

	return {
		idcliente: null,
		nomecliente: null,
		cnpjcpfcliente: null,
		idobjeto: null,
		idarea: null,
		idtipoproblema: null,
		idatendente: null,
		idultimotecnico: null,
		idcondicaopagamento: null,
		idtipodocumentofinanceiro: null,
		problemadescrito: "",
		laudotecnico: "",
		observacao: "",
		agendamento: "",
		previsaoconclusao: "",
		dataos: dayjs().format("YYYY-MM-DD"),
		orcamento: 0,
		marca: "",
		modelo: "",
		placa: "",
		renavam: "",
		...extras,
	};
}

function limparPayload(
	dados: OrdemServicoFormData,
	camposextrasAtivos: ReturnType<typeof camposExtrasAtivos>,
	opcoes: {
		usarDadosVeiculo?: boolean;
		usarArea?: boolean;
		usarObjeto?: boolean;
		usarTipoProblema?: boolean;
	} = {},
) {
	const {
		usarDadosVeiculo = true,
		usarArea = true,
		usarObjeto = true,
		usarTipoProblema = true,
	} = opcoes;
	const payload: Record<string, unknown> = { ...dados };

	for (const chave of Object.keys(payload)) {
		const valor = payload[chave];
		if (valor === "" || valor === undefined) {
			payload[chave] = null;
		}
	}

	for (const campo of ORDEM_SERVICO_CAMPOS_EXTRA) {
		const config = camposextrasAtivos.find((item) => item.campo === campo);
		if (!config) {
			delete payload[campo];
		}
	}

	if (!usarDadosVeiculo) {
		delete payload.marca;
		delete payload.modelo;
		delete payload.placa;
		delete payload.renavam;
	}
	if (!usarArea) {
		payload.idarea = null;
	}
	if (!usarObjeto) {
		payload.idobjeto = null;
	}
	if (!usarTipoProblema) {
		payload.idtipoproblema = null;
	}

	if (typeof payload.agendamento === "string" && payload.agendamento) {
		payload.agendamento = dayjs(payload.agendamento).toISOString();
	}

	return payload;
}

export default function NovaOrdemServicoPage() {
	const router = useRouter();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { data: config } = useConfiguracaoOrdemServico(empresa?.id ?? null);
	const criar = useCriarOrdemServico();

	const mostrarArea = config?.usaarea !== 0;
	const mostrarObjeto = config?.usaobjeto !== 0;
	const mostrarTipoProblema = config?.usatipoproblema !== 0;
	const mostrarVeiculo = config?.usadadosveiculo !== 0;

	const form = useForm<
		OrdemServicoFormInput,
		unknown,
		OrdemServicoFormData
	>({
		resolver: zodResolver(ordemServicoFormSchema),
		defaultValues: defaultsForm(),
	});

	const { data: entidadesLista } = useQuery({
		queryKey: ["entidades-os-form", empresa?.id],
		queryFn: () =>
			entidadesService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id,
	});
	const { data: usuariosLista } = useQuery({
		queryKey: ["usuarios-os-form", empresa?.id],
		queryFn: () =>
			usuariosService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id,
	});
	const { data: objetosLista } = useQuery({
		queryKey: ["objetos-os-form", empresa?.id],
		queryFn: () => objetoService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id && mostrarObjeto,
	});
	const { data: areasLista } = useQuery({
		queryKey: ["areas-os-form", empresa?.id],
		queryFn: () => areaService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id && mostrarArea,
	});
	const { data: tiposProblemaLista } = useQuery({
		queryKey: ["tipos-problema-os-form", empresa?.id],
		queryFn: () =>
			tipoProblemaService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id && mostrarTipoProblema,
	});
	const { data: condicoesLista } = useQuery({
		queryKey: ["condicoes-os-form", empresa?.id],
		queryFn: () =>
			condicaoPagamentoService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id,
	});
	const { data: tiposDocLista } = useQuery({
		queryKey: ["tipos-doc-os-form", empresa?.id],
		queryFn: () =>
			tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa?.id ?? "",
			}),
		enabled: !!empresa?.id,
	});

	const opcoesUsuarios = useMemo(
		() =>
			(usuariosLista ?? []).map((item) => ({
				value: item.id,
				label: item.nome || item.id,
			})),
		[usuariosLista],
	);
	const opcoesClientes = useMemo(
		() =>
			(entidadesLista ?? [])
				.filter((item) => item.cliente === 1)
				.map((item) => ({
					value: item.id,
					label:
						item.razaosocial?.trim() ||
						item.nome?.trim() ||
						item.cnpjcpf ||
						item.id,
				})),
		[entidadesLista],
	);

	async function onSubmit(dados: OrdemServicoFormData) {
		if (!empresa) {
			toast.error("Selecione uma empresa para criar a ordem de serviço");
			return;
		}

		const extras = camposExtrasAtivos(config?.camposextras);
		for (const extra of extras) {
			if (extra.obrigatorio) {
				const valor = dados[extra.campo];
				if (!valor || String(valor).trim() === "") {
					toast.error(`Campo obrigatório: ${extra.nome}`);
					return;
				}
			}
		}

		if (
			mostrarObjeto &&
			config?.pedirprimeiroobjeto === 1 &&
			!dados.idobjeto
		) {
			toast.error("Selecione o objeto da ordem de serviço");
			return;
		}

		const cliente = entidadesLista?.find((item) => item.id === dados.idcliente);
		const payload = limparPayload(dados, extras, {
			usarDadosVeiculo: mostrarVeiculo,
			usarArea: mostrarArea,
			usarObjeto: mostrarObjeto,
			usarTipoProblema: mostrarTipoProblema,
		});

		try {
			const criada = await criar.mutateAsync({
				idempresa: empresa.id,
				...payload,
				nomecliente:
					cliente?.razaosocial?.trim() ||
					cliente?.nome?.trim() ||
					(payload.nomecliente as string | null) ||
					null,
				cnpjcpfcliente: cliente?.cnpjcpf ?? null,
			});
			toast.success("Ordem de serviço criada");
			router.push(`/ordens-servico/${criada.id}`);
		} catch (erro) {
			toast.error("Erro ao criar ordem de serviço", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	function onInvalid(erros: FieldErrors<OrdemServicoFormInput>) {
		const mensagens = listarErrosFormularioOs(
			erros as Record<string, unknown>,
		);
		toast.error("Não foi possível criar a ordem de serviço", {
			description:
				mensagens.length > 0
					? mensagens.slice(0, 4).join(" · ")
					: "Verifique os campos do formulário.",
		});
	}

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-muted-foreground">
						Selecione uma empresa para criar uma ordem de serviço.
					</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<form
				className="flex flex-col gap-6 p-4 md:p-6"
				onSubmit={form.handleSubmit(onSubmit, onInvalid)}
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
							<Link href="/ordens-servico">
								<ArrowLeft className="h-4 w-4" />
								Ordens de serviço
							</Link>
						</Button>
						<h1 className="text-2xl font-semibold tracking-tight">
							Nova ordem de serviço
						</h1>
					</div>
				</div>

				<div aria-live="polite">
					<OrdemServicoForm
						form={form}
						opcoesClientes={opcoesClientes}
						opcoesObjetos={(objetosLista ?? []).map((item) => ({
							value: item.id,
							label: item.descricao ?? item.id,
						}))}
						opcoesAreas={(areasLista ?? []).map((item) => ({
							value: item.id,
							label: item.descricao ?? item.id,
						}))}
						opcoesTiposProblema={(tiposProblemaLista ?? []).map((item) => ({
							value: item.id,
							label: item.descricao ?? item.id,
						}))}
						opcoesAtendentes={opcoesUsuarios}
						opcoesTecnicos={opcoesUsuarios}
						opcoesCondicoes={(condicoesLista ?? []).map((item) => ({
							value: item.id,
							label: item.descricao ?? item.id,
						}))}
						opcoesTiposDocumento={(tiposDocLista ?? []).map((item) => ({
							value: item.id,
							label: item.descricao ?? item.id,
						}))}
						camposextras={config?.camposextras}
						mostrarVeiculoEquipamento={mostrarVeiculo}
						mostrarArea={mostrarArea}
						mostrarObjeto={mostrarObjeto}
						mostrarTipoProblema={mostrarTipoProblema}
					/>
				</div>

				<div className="flex gap-2 self-end">
					<Button type="button" variant="outline" asChild>
						<Link href="/ordens-servico">Cancelar</Link>
					</Button>
					<Button type="submit" disabled={criar.isPending}>
						{criar.isPending ? "Salvando..." : "Criar OS"}
					</Button>
				</div>
			</form>
		</PageContainer>
	);
}
