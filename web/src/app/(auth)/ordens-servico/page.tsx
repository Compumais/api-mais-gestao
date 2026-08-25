"use client";

import { useQuery } from "@tanstack/react-query";
import { FilterX, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useMemo, useState } from "react";
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
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	useConfiguracaoOrdemServico,
	useExcluirOrdemServico,
	useOrdensServico,
	useTiposOrdemServicoEvento,
} from "@/hooks/use-ordem-servico";
import { areaService } from "@/services/area.service";
import { entidadesService } from "@/services/entidades.service";
import { objetoService } from "@/services/objeto.service";
import type { OrdemServico } from "@/services/ordem-servico.service";
import { tipoProblemaService } from "@/services/tipo-problema.service";
import { usuariosService } from "@/services/usuarios.service";
import { PageContainer } from "../components/page-container";
import { OrdensServicoTabela } from "./components/ordens-servico-tabela";

type FiltrosState = {
	dataInicio: string;
	dataFim: string;
	idcliente: string;
	idultimotecnico: string;
	status: string;
	codigo: string;
	orcamento: string;
	busca: string;
};

const filtrosVazios: FiltrosState = {
	dataInicio: "",
	dataFim: "",
	idcliente: "",
	idultimotecnico: "",
	status: "",
	codigo: "",
	orcamento: "",
	busca: "",
};

function filtrosAtivos(filtros: FiltrosState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function OrdensServicoPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const excluir = useExcluirOrdemServico();
	const idBase = useId();
	const idDataInicio = `${idBase}-data-inicio`;
	const idDataFim = `${idBase}-data-fim`;
	const idStatus = `${idBase}-status`;
	const idCodigo = `${idBase}-codigo`;
	const idOrcamento = `${idBase}-orcamento`;
	const idBusca = `${idBase}-busca`;
	const [page, setPage] = useState(1);
	const [filtros, setFiltros] = useState<FiltrosState>(filtrosVazios);
	const [filtrosAplicados, setFiltrosAplicados] =
		useState<FiltrosState>(filtrosVazios);
	const [osParaExcluir, setOsParaExcluir] = useState<OrdemServico | null>(null);
	const limit = 20;

	const { data: tipos = [] } = useTiposOrdemServicoEvento(empresa?.id ?? null);
	const { data: config, isLoading: isLoadingConfig } =
		useConfiguracaoOrdemServico(empresa?.id ?? null);

	const { data: entidadesLista } = useQuery({
		queryKey: ["entidades-os-lista", empresa?.id],
		queryFn: () =>
			entidadesService.listarTodos({
				idempresa: empresa?.id ?? "",
			}),
		enabled: !!empresa?.id,
	});

	const { data: usuariosLista } = useQuery({
		queryKey: ["usuarios-os-lista", empresa?.id],
		queryFn: () =>
			usuariosService.listarTodos({
				idempresa: empresa?.id ?? "",
			}),
		enabled: !!empresa?.id,
	});

	const { data: objetosLista } = useQuery({
		queryKey: ["objetos-os-lista", empresa?.id],
		queryFn: () =>
			objetoService.listarTodos({
				idempresa: empresa?.id ?? "",
				inativo: 0,
			}),
		enabled: !!empresa?.id && (config?.usaobjeto ?? 1) === 1,
	});

	const { data: areasLista } = useQuery({
		queryKey: ["areas-os-lista", empresa?.id],
		queryFn: () =>
			areaService.listarTodos({
				idempresa: empresa?.id ?? "",
				inativo: 0,
			}),
		enabled: !!empresa?.id && (config?.usaarea ?? 1) === 1,
	});

	const { data: tiposProblemaLista } = useQuery({
		queryKey: ["tipos-problema-os-lista", empresa?.id],
		queryFn: () =>
			tipoProblemaService.listarTodos({
				idempresa: empresa?.id ?? "",
				inativo: 0,
			}),
		enabled: !!empresa?.id && (config?.usatipoproblema ?? 1) === 1,
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

	const opcoesTecnicos = useMemo(
		() =>
			(usuariosLista ?? []).map((item) => ({
				value: item.id,
				label: item.nome || item.id,
			})),
		[usuariosLista],
	);

	const mapaUsuarios = useMemo(() => {
		const mapa: Record<string, string> = {};
		for (const item of usuariosLista ?? []) {
			mapa[item.id] = item.nome || item.id;
		}
		return mapa;
	}, [usuariosLista]);

	const mapaObjetos = useMemo(() => {
		const mapa: Record<string, string> = {};
		for (const item of objetosLista ?? []) {
			mapa[item.id] = item.descricao?.trim() || item.id;
		}
		return mapa;
	}, [objetosLista]);

	const mapaAreas = useMemo(() => {
		const mapa: Record<string, string> = {};
		for (const item of areasLista ?? []) {
			mapa[item.id] = item.descricao?.trim() || item.id;
		}
		return mapa;
	}, [areasLista]);

	const mapaTiposProblema = useMemo(() => {
		const mapa: Record<string, string> = {};
		for (const item of tiposProblemaLista ?? []) {
			mapa[item.id] = item.descricao?.trim() || item.codigo || item.id;
		}
		return mapa;
	}, [tiposProblemaLista]);

	const { data, isLoading } = useOrdensServico(
		empresa
			? {
					idempresa: empresa.id,
					page,
					limit,
					dataInicio: filtrosAplicados.dataInicio || undefined,
					dataFim: filtrosAplicados.dataFim || undefined,
					idcliente: filtrosAplicados.idcliente || undefined,
					idultimotecnico: filtrosAplicados.idultimotecnico || undefined,
					status: filtrosAplicados.status
						? Number(filtrosAplicados.status)
						: undefined,
					codigo: filtrosAplicados.codigo
						? Number(filtrosAplicados.codigo)
						: undefined,
					orcamento:
						filtrosAplicados.orcamento !== ""
							? Number(filtrosAplicados.orcamento)
							: undefined,
					busca: filtrosAplicados.busca || undefined,
				}
			: null,
	);

	const ordens = data?.data ?? [];
	const totalPages = data?.paginacao.totalPages ?? 1;

	const confirmarExclusao = useCallback(async () => {
		if (!empresa || !osParaExcluir) return;
		try {
			await excluir.mutateAsync({
				id: osParaExcluir.id,
				idempresa: empresa.id,
			});
			toast.success("Ordem de serviço excluída");
			setOsParaExcluir(null);
		} catch (erro) {
			toast.error("Erro ao excluir", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}, [empresa, excluir, osParaExcluir]);

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-muted-foreground">
						Selecione uma empresa para visualizar as ordens de serviço.
					</p>
				</div>
			</PageContainer>
		);
	}

	const comFiltros = filtrosAtivos(filtrosAplicados);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 p-4 md:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Ordens de serviço
						</h1>
						<p className="text-sm text-muted-foreground">
							Gerencie ordens de serviço, itens, eventos e faturamento.
						</p>
					</div>
					<Button asChild>
						<Link href="/ordens-servico/nova">
							<Plus className="h-4 w-4" />
							Nova OS
						</Link>
					</Button>
				</div>

				<div className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					<div className="space-y-1.5">
						<Label htmlFor={idDataInicio}>Data início</Label>
						<Input
							id={idDataInicio}
							type="date"
							value={filtros.dataInicio}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, dataInicio: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idDataFim}>Data fim</Label>
						<Input
							id={idDataFim}
							type="date"
							value={filtros.dataFim}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, dataFim: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Cliente</Label>
						<Combobox
							options={opcoesClientes}
							value={filtros.idcliente}
							onChange={(value) =>
								setFiltros((f) => ({ ...f, idcliente: value }))
							}
							placeholder="Todos"
							searchPlaceholder="Buscar cliente..."
							emptyMessage="Nenhum cliente encontrado."
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Técnico</Label>
						<Combobox
							options={opcoesTecnicos}
							value={filtros.idultimotecnico}
							onChange={(value) =>
								setFiltros((f) => ({ ...f, idultimotecnico: value }))
							}
							placeholder="Todos"
							searchPlaceholder="Buscar técnico..."
							emptyMessage="Nenhum técnico encontrado."
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idStatus}>Status</Label>
						<Select
							value={filtros.status || "todos"}
							onValueChange={(value) =>
								setFiltros((f) => ({
									...f,
									status: value === "todos" ? "" : value,
								}))
							}
						>
							<SelectTrigger className="w-full" id={idStatus}>
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todos">Todos</SelectItem>
								{tipos
									.filter((tipo) => tipo.ativo === 1)
									.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
									.map((tipo) => (
										<SelectItem key={tipo.id} value={String(tipo.status)}>
											{tipo.descricao}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idCodigo}>Código</Label>
						<Input
							id={idCodigo}
							type="number"
							inputMode="numeric"
							placeholder="Ex: 123"
							value={filtros.codigo}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, codigo: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idOrcamento}>Orçamento</Label>
						<Select
							value={filtros.orcamento || "todos"}
							onValueChange={(value) =>
								setFiltros((f) => ({
									...f,
									orcamento: value === "todos" ? "" : value,
								}))
							}
						>
							<SelectTrigger className="w-full" id={idOrcamento}>
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todos">Todos</SelectItem>
								<SelectItem value="1">Somente orçamentos</SelectItem>
								<SelectItem value="0">Somente OS</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idBusca}>Busca cliente</Label>
						<Input
							id={idBusca}
							placeholder="Nome do cliente"
							value={filtros.busca}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, busca: e.target.value }))
							}
						/>
					</div>
					<div className="flex justify-end items-end gap-2 xl:col-span-4">
						<Button
							onClick={() => {
								setFiltrosAplicados({ ...filtros });
								setPage(1);
							}}
						>
							Filtrar
						</Button>
						{comFiltros && (
							<Button
								variant="outline"
								onClick={() => {
									setFiltros(filtrosVazios);
									setFiltrosAplicados(filtrosVazios);
									setPage(1);
								}}
							>
								<FilterX className="h-4 w-4" />
								Limpar
							</Button>
						)}
					</div>
				</div>

				<OrdensServicoTabela
					ordens={ordens}
					isLoading={isLoading || isLoadingConfig}
					tipos={tipos}
					config={config}
					mapaUsuarios={mapaUsuarios}
					mapaObjetos={mapaObjetos}
					mapaAreas={mapaAreas}
					mapaTiposProblema={mapaTiposProblema}
					comFiltros={comFiltros}
					page={page}
					totalPages={totalPages}
					totalRegistros={data?.paginacao.total ?? 0}
					onPageChange={setPage}
					onExcluir={setOsParaExcluir}
					configPronta={!isLoadingConfig}
				/>
			</div>

			<AlertDialog
				open={!!osParaExcluir}
				onOpenChange={(open) => {
					if (!open) setOsParaExcluir(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir ordem de serviço?</AlertDialogTitle>
						<AlertDialogDescription>
							Confirma a exclusão da OS {osParaExcluir?.codigo ?? ""}? A
							exclusão só é permitida sem faturamentos e com todos os itens
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
