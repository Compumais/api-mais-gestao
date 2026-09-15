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
import type { OrdenacaoColunaOs } from "./components/cabecalho-coluna-os";
import { OrdensServicoTabela } from "./components/ordens-servico-tabela";
import {
	COLUNA_PARA_CAMPO_FILTRO,
	type ConfigFiltroColunaOs,
	type FiltrosColunaOsState,
	filtrosColunaOsVazios,
} from "./ordens-servico-colunas";

const OPCOES_SIM_NAO = [
	{ value: "1", label: "Sim" },
	{ value: "0", label: "Não" },
];

function filtrosAtivos(filtros: FiltrosColunaOsState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

function numeroOpcional(valor: string): number | undefined {
	if (valor.trim() === "") return undefined;
	const n = Number(valor);
	return Number.isFinite(n) ? n : undefined;
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
	const [filtros, setFiltros] = useState<FiltrosColunaOsState>(
		filtrosColunaOsVazios,
	);
	const [filtrosAplicados, setFiltrosAplicados] =
		useState<FiltrosColunaOsState>(filtrosColunaOsVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
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

	const opcoesObjetos = useMemo(
		() =>
			(objetosLista ?? []).map((item) => ({
				value: item.id,
				label: item.descricao?.trim() || item.id,
			})),
		[objetosLista],
	);

	const opcoesAreas = useMemo(
		() =>
			(areasLista ?? []).map((item) => ({
				value: item.id,
				label: item.descricao?.trim() || item.id,
			})),
		[areasLista],
	);

	const opcoesTiposProblema = useMemo(
		() =>
			(tiposProblemaLista ?? []).map((item) => ({
				value: item.id,
				label: item.descricao?.trim() || item.codigo || item.id,
			})),
		[tiposProblemaLista],
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

	const opcoesStatus = useMemo(
		() =>
			tipos
				.filter((tipo) => tipo.ativo === 1)
				.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
				.map((tipo) => ({
					value: String(tipo.status),
					label: tipo.descricao ?? `Status ${tipo.status}`,
				})),
		[tipos],
	);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaOs
	> => {
		const texto = (placeholder?: string): ConfigFiltroColunaOs => ({
			tipo: "texto",
			placeholder,
		});
		const data = (): ConfigFiltroColunaOs => ({ tipo: "data" });
		const nenhum = (): ConfigFiltroColunaOs => ({ tipo: "nenhum" });

		return {
			codigo: texto("Ex: 123"),
			cliente: texto("Nome do cliente"),
			cnpjcpfcliente: texto("CNPJ/CPF"),
			data: data(),
			status: { tipo: "opcoes", opcoes: opcoesStatus },
			valor: nenhum(),
			orcamento: {
				tipo: "opcoes",
				opcoes: [
					{ value: "1", label: "Somente orçamentos" },
					{ value: "0", label: "Somente OS" },
				],
			},
			tecnico: { tipo: "catalogo", opcoes: opcoesTecnicos },
			atendente: { tipo: "catalogo", opcoes: opcoesTecnicos },
			objeto: { tipo: "catalogo", opcoes: opcoesObjetos },
			area: { tipo: "catalogo", opcoes: opcoesAreas },
			tipoproblema: { tipo: "catalogo", opcoes: opcoesTiposProblema },
			agendamento: data(),
			previsaoconclusao: data(),
			dataultimoevento: data(),
			problemadescrito: texto("Problema descrito"),
			laudotecnico: texto("Laudo técnico"),
			observacao: texto("Observação"),
			descricaotipoultimoevento: texto("Tipo do último evento"),
			descricaoultimoevento: texto("Último evento"),
			valorprodutos: nenhum(),
			valorservicos: nenhum(),
			descontosubtotal: nenhum(),
			geroufinanceiro: { tipo: "opcoes", opcoes: OPCOES_SIM_NAO },
			faturouparanota: { tipo: "opcoes", opcoes: OPCOES_SIM_NAO },
			faturouparacupom: { tipo: "opcoes", opcoes: OPCOES_SIM_NAO },
			placa: texto("Placa"),
			marca: texto("Marca"),
			modelo: texto("Modelo"),
			renavam: texto("Renavam"),
			extra1: texto(),
			extra2: texto(),
			extra3: texto(),
			extra4: texto(),
			extra5: texto(),
			extra6: texto(),
			extra7: texto(),
			extra8: texto(),
			extra9: texto(),
			extra10: texto(),
			extra11: texto(),
			extra12: texto(),
			extra13: texto(),
			extra14: texto(),
			extra15: texto(),
			extra16: texto(),
		};
	}, [
		opcoesStatus,
		opcoesTecnicos,
		opcoesObjetos,
		opcoesAreas,
		opcoesTiposProblema,
	]);

	const aplicarFiltrosImediatos = useCallback(
		(proximos: FiltrosColunaOsState) => {
			setFiltros(proximos);
			setFiltrosAplicados(proximos);
			setPage(1);
		},
		[],
	);

	const onOrdenarColuna = useCallback(
		(colunaId: string, direcao: OrdenacaoColunaOs) => {
			if (!direcao) {
				setOrdenarPor(null);
				setOrdem(null);
			} else {
				setOrdenarPor(colunaId);
				setOrdem(direcao);
			}
			setPage(1);
		},
		[],
	);

	const onFiltrarColuna = useCallback((colunaId: string, valor: string) => {
		const campo = COLUNA_PARA_CAMPO_FILTRO[colunaId];
		if (!campo) return;

		setFiltros((atual) => {
			const proximos: FiltrosColunaOsState = { ...atual };
			if (colunaId === "data") {
				proximos.dataInicio = valor;
				proximos.dataFim = valor;
			} else {
				proximos[campo] = valor;
			}
			setFiltrosAplicados(proximos);
			return proximos;
		});
		setPage(1);
	}, []);

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
					idatendente: filtrosAplicados.idatendente || undefined,
					idobjeto: filtrosAplicados.idobjeto || undefined,
					idarea: filtrosAplicados.idarea || undefined,
					idtipoproblema: filtrosAplicados.idtipoproblema || undefined,
					status: numeroOpcional(filtrosAplicados.status),
					codigo: numeroOpcional(filtrosAplicados.codigo),
					orcamento: numeroOpcional(filtrosAplicados.orcamento),
					busca: filtrosAplicados.busca || undefined,
					cnpjcpfcliente: filtrosAplicados.cnpjcpfcliente || undefined,
					geroufinanceiro: numeroOpcional(filtrosAplicados.geroufinanceiro),
					faturouparanota: numeroOpcional(filtrosAplicados.faturouparanota),
					faturouparacupom: numeroOpcional(filtrosAplicados.faturouparacupom),
					agendamento: filtrosAplicados.agendamento || undefined,
					previsaoconclusao: filtrosAplicados.previsaoconclusao || undefined,
					dataultimoevento: filtrosAplicados.dataultimoevento || undefined,
					problemadescrito: filtrosAplicados.problemadescrito || undefined,
					laudotecnico: filtrosAplicados.laudotecnico || undefined,
					observacao: filtrosAplicados.observacao || undefined,
					descricaotipoultimoevento:
						filtrosAplicados.descricaotipoultimoevento || undefined,
					descricaoultimoevento:
						filtrosAplicados.descricaoultimoevento || undefined,
					placa: filtrosAplicados.placa || undefined,
					marca: filtrosAplicados.marca || undefined,
					modelo: filtrosAplicados.modelo || undefined,
					renavam: filtrosAplicados.renavam || undefined,
					extra1: filtrosAplicados.extra1 || undefined,
					extra2: filtrosAplicados.extra2 || undefined,
					extra3: filtrosAplicados.extra3 || undefined,
					extra4: filtrosAplicados.extra4 || undefined,
					extra5: filtrosAplicados.extra5 || undefined,
					extra6: filtrosAplicados.extra6 || undefined,
					extra7: filtrosAplicados.extra7 || undefined,
					extra8: filtrosAplicados.extra8 || undefined,
					extra9: filtrosAplicados.extra9 || undefined,
					extra10: filtrosAplicados.extra10 || undefined,
					extra11: filtrosAplicados.extra11 || undefined,
					extra12: filtrosAplicados.extra12 || undefined,
					extra13: filtrosAplicados.extra13 || undefined,
					extra14: filtrosAplicados.extra14 || undefined,
					extra15: filtrosAplicados.extra15 || undefined,
					extra16: filtrosAplicados.extra16 || undefined,
					ordenarPor: ordenarPor || undefined,
					ordem: ordem || undefined,
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

	const comFiltros = filtrosAtivos(filtrosAplicados) || !!ordenarPor;

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
								{opcoesStatus.map((tipo) => (
									<SelectItem key={tipo.value} value={tipo.value}>
										{tipo.label}
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
								aplicarFiltrosImediatos({ ...filtros });
							}}
						>
							Filtrar
						</Button>
						{comFiltros && (
							<Button
								variant="outline"
								onClick={() => {
									setFiltros(filtrosColunaOsVazios);
									setFiltrosAplicados(filtrosColunaOsVazios);
									setOrdenarPor(null);
									setOrdem(null);
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
					filtros={filtrosAplicados}
					ordenarPor={ordenarPor}
					ordem={ordem}
					onOrdenarColuna={onOrdenarColuna}
					onFiltrarColuna={onFiltrarColuna}
					configFiltroPorColuna={configFiltroPorColuna}
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
