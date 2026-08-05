"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ORDEM_SERVICO_CAMPOS_EXTRA } from "@/constants/ordem-servico-status";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	useAtualizarOrdemServico,
	useConfiguracaoOrdemServico,
	useExcluirOrdemServico,
	useOrdemServico,
	useTiposOrdemServicoEvento,
} from "@/hooks/use-ordem-servico";
import {
	type OrdemServicoFormData,
	type OrdemServicoFormInput,
	ordemServicoFormSchema,
} from "@/schemas/ordem-servico.schema";
import { areaService } from "@/services/area.service";
import { condicaoPagamentoService } from "@/services/condicao-pagamento.service";
import { entidadesService } from "@/services/entidades.service";
import { nfeConfiguracaoService } from "@/services/nfe-configuracao.service";
import { objetoService } from "@/services/objeto.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";
import { tipoProblemaService } from "@/services/tipo-problema.service";
import { usuariosService } from "@/services/usuarios.service";
import {
	camposExtrasAtivos,
	extrairExtrasOs,
	formatarMoedaOs,
	listarErrosFormularioOs,
	osBloqueadaEdicao,
	osPodeExcluir,
} from "@/util/ordem-servico-ui";
import { PageContainer } from "../../components/page-container";
import { AbaEventosOs } from "../components/aba-eventos-os";
import { AbaFaturamentoOs } from "../components/aba-faturamento-os";
import { AbaItensOs } from "../components/aba-itens-os";
import { OrdemServicoForm } from "../components/ordem-servico-form";
import { OrdemServicoStatusBadge } from "../components/ordem-servico-status-badge";

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
		if (valor === "" || valor === undefined) payload[chave] = null;
	}
	for (const campo of ORDEM_SERVICO_CAMPOS_EXTRA) {
		const config = camposextrasAtivos.find((item) => item.campo === campo);
		if (!config) delete payload[campo];
	}
	if (!usarDadosVeiculo) {
		delete payload.marca;
		delete payload.modelo;
		delete payload.placa;
		delete payload.renavam;
	}
	if (!usarArea) payload.idarea = null;
	if (!usarObjeto) payload.idobjeto = null;
	if (!usarTipoProblema) payload.idtipoproblema = null;
	if (typeof payload.agendamento === "string" && payload.agendamento) {
		payload.agendamento = dayjs(payload.agendamento).toISOString();
	}
	return payload;
}

export default function OrdemServicoDetalhePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const router = useRouter();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

	const { data: os, isLoading } = useOrdemServico(id);
	const { data: config } = useConfiguracaoOrdemServico(empresa?.id ?? null);
	const { data: tipos = [] } = useTiposOrdemServicoEvento(empresa?.id ?? null);
	const atualizar = useAtualizarOrdemServico(id);
	const excluir = useExcluirOrdemServico();

	const form = useForm<
		OrdemServicoFormInput,
		unknown,
		OrdemServicoFormData
	>({
		resolver: zodResolver(ordemServicoFormSchema),
		defaultValues: {
			orcamento: 0,
			...Object.fromEntries(ORDEM_SERVICO_CAMPOS_EXTRA.map((c) => [c, ""])),
		},
	});

	useEffect(() => {
		if (!os) return;
		const agendamento = os.agendamento
			? dayjs(os.agendamento).format("YYYY-MM-DDTHH:mm")
			: "";
		form.reset({
			idcliente: os.idcliente,
			nomecliente: os.nomecliente,
			cnpjcpfcliente: os.cnpjcpfcliente,
			idobjeto: os.idobjeto,
			idarea: os.idarea,
			idtipoproblema: os.idtipoproblema,
			idatendente: os.idatendente,
			idultimotecnico: os.idultimotecnico,
			idcondicaopagamento: os.idcondicaopagamento,
			idtipodocumentofinanceiro: os.idtipodocumentofinanceiro,
			problemadescrito: os.problemadescrito ?? "",
			laudotecnico: os.laudotecnico ?? "",
			observacao: os.observacao ?? "",
			agendamento,
			previsaoconclusao: os.previsaoconclusao ?? "",
			dataos: os.dataos ?? "",
			orcamento: os.orcamento ?? 0,
			marca: os.marca ?? "",
			modelo: os.modelo ?? "",
			placa: os.placa ?? "",
			renavam: os.renavam ?? "",
			...extrairExtrasOs(os),
		});
	}, [os, form]);

	const { data: entidadesLista } = useQuery({
		queryKey: ["entidades-os-detalhe", empresa?.id],
		queryFn: () =>
			entidadesService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id,
	});
	const { data: usuariosLista } = useQuery({
		queryKey: ["usuarios-os-detalhe", empresa?.id],
		queryFn: () =>
			usuariosService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id,
	});
	const mostrarArea = config?.usaarea !== 0;
	const mostrarObjeto = config?.usaobjeto !== 0;
	const mostrarTipoProblema = config?.usatipoproblema !== 0;
	const mostrarVeiculo = config?.usadadosveiculo !== 0;

	const { data: objetosLista } = useQuery({
		queryKey: ["objetos-os-detalhe", empresa?.id],
		queryFn: () => objetoService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id && mostrarObjeto,
	});
	const { data: areasLista } = useQuery({
		queryKey: ["areas-os-detalhe", empresa?.id],
		queryFn: () => areaService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id && mostrarArea,
	});
	const { data: tiposProblemaLista } = useQuery({
		queryKey: ["tipos-problema-os-detalhe", empresa?.id],
		queryFn: () =>
			tipoProblemaService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id && mostrarTipoProblema,
	});
	const { data: condicoesLista } = useQuery({
		queryKey: ["condicoes-os-detalhe", empresa?.id],
		queryFn: () =>
			condicaoPagamentoService.listarTodos({ idempresa: empresa?.id ?? "" }),
		enabled: !!empresa?.id,
	});
	const { data: tiposDocLista } = useQuery({
		queryKey: ["tipos-doc-os-detalhe", empresa?.id],
		queryFn: () =>
			tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa?.id ?? "",
			}),
		enabled: !!empresa?.id,
	});
	const { data: seriesNfe } = useQuery({
		queryKey: ["series-nfe-os", empresa?.id],
		queryFn: () => nfeConfiguracaoService.listarSeries(empresa?.id ?? "", "55"),
		enabled: !!empresa?.id,
	});

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
	const opcoesUsuarios = useMemo(
		() =>
			(usuariosLista ?? []).map((item) => ({
				value: item.id,
				label: item.nome || item.id,
			})),
		[usuariosLista],
	);

	const bloqueada = osBloqueadaEdicao(os);

	async function onSalvar(dados: OrdemServicoFormData) {
		if (!empresa || !os) {
			toast.error("Não foi possível salvar a ordem de serviço");
			return;
		}
		const extras = camposExtrasAtivos(config?.camposextras ?? os.camposextras);
		for (const extra of extras) {
			if (extra.obrigatorio) {
				const valor = dados[extra.campo];
				if (!valor || String(valor).trim() === "") {
					toast.error(`Campo obrigatório: ${extra.nome}`);
					return;
				}
			}
		}
		const cliente = entidadesLista?.find((item) => item.id === dados.idcliente);
		const payload = limparPayload(dados, extras, {
			usarDadosVeiculo: mostrarVeiculo,
			usarArea: mostrarArea,
			usarObjeto: mostrarObjeto,
			usarTipoProblema: mostrarTipoProblema,
		});
		try {
			await atualizar.mutateAsync({
				idempresa: empresa.id,
				...payload,
				nomecliente:
					cliente?.razaosocial?.trim() ||
					cliente?.nome?.trim() ||
					(payload.nomecliente as string | null) ||
					null,
				cnpjcpfcliente: cliente?.cnpjcpf ?? null,
			});
			toast.success("Ordem de serviço salva");
		} catch (erro) {
			toast.error("Erro ao salvar", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	function onInvalid(erros: FieldErrors<OrdemServicoFormInput>) {
		const mensagens = listarErrosFormularioOs(
			erros as Record<string, unknown>,
		);
		toast.error("Não foi possível salvar a ordem de serviço", {
			description:
				mensagens.length > 0
					? mensagens.slice(0, 4).join(" · ")
					: "Verifique os campos do formulário.",
		});
	}

	async function confirmarExclusao() {
		if (!empresa) return;
		try {
			await excluir.mutateAsync({ id, idempresa: empresa.id });
			toast.success("Ordem de serviço excluída");
			router.push("/ordens-servico");
		} catch (erro) {
			toast.error("Erro ao excluir", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-muted-foreground">
						Selecione uma empresa para abrir a ordem de serviço.
					</p>
				</div>
			</PageContainer>
		);
	}

	if (isLoading) {
		return (
			<PageContainer>
				<div className="p-6 text-muted-foreground">
					Carregando ordem de serviço...
				</div>
			</PageContainer>
		);
	}

	if (!os) {
		return (
			<PageContainer>
				<div className="p-6">
					<p className="text-muted-foreground">
						Ordem de serviço não encontrada.
					</p>
					<Button variant="link" asChild className="px-0">
						<Link href="/ordens-servico">Voltar</Link>
					</Button>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-6 p-4 md:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
							<Link href="/ordens-servico">
								<ArrowLeft className="h-4 w-4" />
								Ordens de serviço
							</Link>
						</Button>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-semibold tracking-tight">
								OS {os.codigo ?? os.id.slice(0, 8)}
							</h1>
							<OrdemServicoStatusBadge status={os.status} tipos={tipos} />
						</div>
						<p className="text-sm text-muted-foreground">
							Total {formatarMoedaOs(os.valor)} · Produtos{" "}
							{formatarMoedaOs(os.valorprodutos)} · Serviços{" "}
							{formatarMoedaOs(os.valorservicos)}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{osPodeExcluir(os) && (
							<Button
								type="button"
								variant="outline"
								onClick={() => setConfirmandoExclusao(true)}
								disabled={excluir.isPending}
							>
								<Trash2 className="h-4 w-4" />
								Excluir
							</Button>
						)}
						<Button
							type="button"
							onClick={form.handleSubmit(onSalvar, onInvalid)}
							disabled={atualizar.isPending || bloqueada}
						>
							<Save className="h-4 w-4" />
							{atualizar.isPending ? "Salvando..." : "Salvar"}
						</Button>
					</div>
				</div>

				<Tabs defaultValue="dados">
					<TabsList>
						<TabsTrigger value="dados">Dados</TabsTrigger>
						<TabsTrigger value="itens">Itens</TabsTrigger>
						<TabsTrigger value="servico">Serviço</TabsTrigger>
						<TabsTrigger value="eventos">Eventos</TabsTrigger>
						<TabsTrigger value="faturamento">Faturamento</TabsTrigger>
					</TabsList>

					<TabsContent value="dados" className="mt-4">
						<form onSubmit={form.handleSubmit(onSalvar, onInvalid)}>
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
								camposextras={config?.camposextras ?? os.camposextras}
								mostrarVeiculoEquipamento={mostrarVeiculo}
								mostrarArea={mostrarArea}
								mostrarObjeto={mostrarObjeto}
								mostrarTipoProblema={mostrarTipoProblema}
								desabilitado={bloqueada}
							/>
						</form>
					</TabsContent>

					<TabsContent value="itens" className="mt-4">
						<AbaItensOs
							ordemServicoId={id}
							idempresa={empresa.id}
							tipoItem="P"
							desabilitado={bloqueada}
							tecnicoObrigatorio={config?.tecnicoobrigatorio === 1}
							opcoesTecnicos={opcoesUsuarios}
						/>
					</TabsContent>

					<TabsContent value="servico" className="mt-4">
						<AbaItensOs
							ordemServicoId={id}
							idempresa={empresa.id}
							tipoItem="S"
							desabilitado={bloqueada}
							tecnicoObrigatorio={config?.tecnicoobrigatorio === 1}
							opcoesTecnicos={opcoesUsuarios}
						/>
					</TabsContent>

					<TabsContent value="eventos" className="mt-4">
						<AbaEventosOs
							ordemServicoId={id}
							idempresa={empresa.id}
							statusAtual={os.status}
							tipos={tipos}
							opcoesTecnicosUsuarios={opcoesUsuarios}
							desabilitado={bloqueada}
						/>
					</TabsContent>

					<TabsContent value="faturamento" className="mt-4">
						<AbaFaturamentoOs
							ordemServicoId={id}
							idempresa={empresa.id}
							os={os}
							opcoesTiposDocumento={(tiposDocLista ?? []).map((item) => ({
								value: item.id,
								label: item.descricao ?? item.id,
							}))}
							opcoesSeriesNfe={(seriesNfe ?? []).map((serie) => ({
								value: serie.id,
								label:
									serie.descricao?.trim() ||
									`Série ${serie.serie}${serie.padrao ? " (padrão)" : ""}`,
							}))}
							desabilitado={bloqueada}
						/>
					</TabsContent>
				</Tabs>
			</div>

			<AlertDialog
				open={confirmandoExclusao}
				onOpenChange={setConfirmandoExclusao}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir ordem de serviço?</AlertDialogTitle>
						<AlertDialogDescription>
							A exclusão só é permitida sem faturamentos e com todos os itens
							cancelados. Esta ação não poderá ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={excluir.isPending}>
							Voltar
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={excluir.isPending}
							onClick={() => void confirmarExclusao()}
						>
							{excluir.isPending ? "Excluindo..." : "Confirmar exclusão"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageContainer>
	);
}
