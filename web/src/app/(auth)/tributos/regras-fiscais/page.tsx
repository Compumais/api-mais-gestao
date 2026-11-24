"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	IconAlertCircle,
	IconCheck,
	IconCode,
	IconFileText,
	IconHistory,
	IconPlus,
	IconScale,
	IconSettings,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	LISTA_UFS,
	OPCOES_ORGAO_FONTE,
	OPCOES_PRIORIDADE,
	OPCOES_TIPO_FONTE,
} from "@/constants/regra-fiscal-opcoes";
import {
	type RegraFiscalFormData,
	regraFiscalFormSchema,
} from "@/schemas/regra-fiscal.schema";
import {
	type RegraFiscal,
	regrasFiscaisService,
} from "@/services/regras-fiscais.service";
import { OPCOES_CSOSN, OPCOES_CST_ICMS } from "@/util/cst-produto-util";

const VALORES_PADRAO: RegraFiscalFormData = {
	ruleid: "",
	descricao: "",
	prioridade: 100,
	vigenciainicio: "2006-01-01",
	vigenciafim: "",

	// Estruturados
	escopo: "operacao",
	regime_tributario: "TODOS",
	uf_emitente: "QUALQUER",
	uf_destinatario: "QUALQUER",
	consumidor_final: "INDIFERENTE",
	contribuinte_icms: "INDIFERENTE",
	cfop: "",
	cfop_prefixo: "",
	ncm: "",
	cest: "",

	st_aplicavel: "NULL",
	fcp_aplicavel: "NULL",
	difal_aplicavel: "NULL",
	resultado_cfop: "",
	resultado_csosn: "",
	resultado_cst: "",

	fonte_orgao: "SEFAZ",
	fonte_tipo: "PROTOCOLO_ICMS",
	fonte_numero: "",
	fonte_url: "",

	// JSON fallback
	condicoesJson: '{"escopo":"operacao"}',
	resultadoJson: '{"st_aplicavel":null,"difal_aplicavel":null,"fcp_aplicavel":null}',
	fontesJson: '[{"orgao":"SEFAZ","tipo":"PROTOCOLO_ICMS","numero":"","url":""}]',
};

function parseJsonCampo(texto: string, rotulo: string): unknown {
	try {
		return JSON.parse(texto) as unknown;
	} catch {
		throw new Error(`${rotulo} não é um JSON válido`);
	}
}

function montarJsonFromForm(formValues: RegraFiscalFormData) {
	// Condições
	const cond: Record<string, unknown> = {
		escopo: formValues.escopo,
	};
	if (formValues.regime_tributario !== "TODOS") {
		cond.regime_tributario = formValues.regime_tributario;
	}
	if (formValues.uf_emitente && formValues.uf_emitente !== "QUALQUER") {
		cond.uf_emitente = formValues.uf_emitente;
	}
	if (formValues.uf_destinatario && formValues.uf_destinatario !== "QUALQUER") {
		cond.uf_destinatario = formValues.uf_destinatario;
	}
	if (formValues.consumidor_final !== "INDIFERENTE") {
		cond.consumidor_final = formValues.consumidor_final === "SIM";
	}
	if (formValues.contribuinte_icms !== "INDIFERENTE") {
		cond.contribuinte_icms = formValues.contribuinte_icms === "SIM";
	}
	if (formValues.cfop?.trim()) {
		cond.cfop = formValues.cfop.trim();
	}
	if (formValues.cfop_prefixo?.trim()) {
		cond.cfop_prefixo = formValues.cfop_prefixo.trim();
	}
	if (formValues.ncm?.trim()) {
		cond.ncm = formValues.ncm.trim().replace(/\D/g, "");
	}
	if (formValues.cest?.trim()) {
		cond.cest = formValues.cest.trim().replace(/\D/g, "");
	}

	// Resultado
	const res: Record<string, unknown> = {};
	if (formValues.st_aplicavel === "TRUE") res.st_aplicavel = true;
	else if (formValues.st_aplicavel === "FALSE") res.st_aplicavel = false;
	else res.st_aplicavel = null;

	if (formValues.fcp_aplicavel === "TRUE") res.fcp_aplicavel = true;
	else if (formValues.fcp_aplicavel === "FALSE") res.fcp_aplicavel = false;
	else res.fcp_aplicavel = null;

	if (formValues.difal_aplicavel === "TRUE") res.difal_aplicavel = true;
	else if (formValues.difal_aplicavel === "FALSE") res.difal_aplicavel = false;
	else res.difal_aplicavel = null;

	if (formValues.resultado_cfop?.trim()) res.cfop = formValues.resultado_cfop.trim();
	if (formValues.resultado_csosn && formValues.resultado_csosn !== "NENHUM")
		res.csosn = formValues.resultado_csosn;
	if (formValues.resultado_cst && formValues.resultado_cst !== "NENHUM")
		res.cst = formValues.resultado_cst;

	// Fontes
	const fontes: unknown[] = [];
	if (formValues.fonte_orgao || formValues.fonte_numero || formValues.fonte_url) {
		fontes.push({
			orgao: formValues.fonte_orgao || "SEFAZ",
			tipo: formValues.fonte_tipo || "PROTOCOLO_ICMS",
			numero: formValues.fonte_numero || "",
			url: formValues.fonte_url || "",
		});
	}

	return {
		condicoes: cond,
		resultado: res,
		fontes: fontes.length > 0 ? fontes : [{ orgao: "SEFAZ", tipo: "PROTOCOLO_ICMS" }],
	};
}

export default function RegrasFiscaisPage() {
	const queryClient = useQueryClient();
	const [pagina, setPagina] = useState(1);
	const [busca, setBusca] = useState("");
	const [dialogAberto, setDialogAberto] = useState(false);
	const [registroEdicao, setRegistroEdicao] = useState<RegraFiscal | null>(null);
	const [modoEditor, setModoEditor] = useState<"visual" | "json">("visual");

	const form = useForm<RegraFiscalFormData>({
		resolver: zodResolver(regraFiscalFormSchema) as Resolver<RegraFiscalFormData>,
		defaultValues: VALORES_PADRAO,
	});

	const { watch, setValue } = form;
	const valoresAtuais = watch();

	// Sincronizar campos visuais para JSON caso o usuário alterne para a aba JSON
	useEffect(() => {
		if (modoEditor === "json") {
			const { condicoes, resultado, fontes } = montarJsonFromForm(valoresAtuais);
			setValue("condicoesJson", JSON.stringify(condicoes, null, 2));
			setValue("resultadoJson", JSON.stringify(resultado, null, 2));
			setValue("fontesJson", JSON.stringify(fontes, null, 2));
		}
	}, [modoEditor, setValue, valoresAtuais]);

	const { data, isLoading } = useQuery({
		queryKey: ["regras-fiscais", pagina, busca],
		queryFn: () =>
			regrasFiscaisService.listar({
				page: pagina,
				limit: 20,
				busca: busca || undefined,
			}),
	});

	const salvarMutation = useMutation({
		mutationFn: async (dados: RegraFiscalFormData) => {
			let condicoesObj: Record<string, unknown>;
			let resultadoObj: Record<string, unknown>;
			let fontesObj: unknown[];

			if (modoEditor === "json") {
				condicoesObj = parseJsonCampo(dados.condicoesJson, "Condições") as Record<
					string,
					unknown
				>;
				resultadoObj = parseJsonCampo(dados.resultadoJson, "Resultado") as Record<
					string,
					unknown
				>;
				fontesObj = parseJsonCampo(dados.fontesJson, "Fontes") as unknown[];
			} else {
				const montado = montarJsonFromForm(dados);
				condicoesObj = montado.condicoes;
				resultadoObj = montado.resultado;
				fontesObj = montado.fontes;
			}

			const payload = {
				ruleid: dados.ruleid,
				descricao: dados.descricao,
				prioridade: dados.prioridade,
				vigenciainicio: dados.vigenciainicio,
				vigenciafim: dados.vigenciafim || null,
				condicoes: condicoesObj,
				resultado: resultadoObj,
				fontes: fontesObj,
			};

			if (registroEdicao) {
				return regrasFiscaisService.atualizar(registroEdicao.id, payload);
			}
			return regrasFiscaisService.criar(payload);
		},
		onSuccess: () => {
			toast.success(registroEdicao ? "Regra atualizada com sucesso" : "Regra criada com sucesso");
			void queryClient.invalidateQueries({ queryKey: ["regras-fiscais"] });
			setDialogAberto(false);
			setRegistroEdicao(null);
			form.reset(VALORES_PADRAO);
		},
		onError: (erro: Error) => {
			toast.error(erro.message);
		},
	});

	const validarMutation = useMutation({
		mutationFn: (id: string) => regrasFiscaisService.validar(id),
		onSuccess: () => {
			toast.success("Regra validada com sucesso! O emissor fiscal agora a reconhece como vigente.");
			void queryClient.invalidateQueries({ queryKey: ["regras-fiscais"] });
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	const rollbackMutation = useMutation({
		mutationFn: async (registro: RegraFiscal) => {
			const historico = await regrasFiscaisService.historico(registro.id);
			const anterior = historico.data.find(
				(item) => item.versao === registro.versao - 1,
			);
			if (!anterior) {
				throw new Error("Não há versão anterior para rollback");
			}
			return regrasFiscaisService.rollback(registro.id, anterior.versao);
		},
		onSuccess: () => {
			toast.success("Versão anterior restaurada (pendente de nova validação)");
			void queryClient.invalidateQueries({ queryKey: ["regras-fiscais"] });
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	function abrirNovo() {
		setRegistroEdicao(null);
		setModoEditor("visual");
		form.reset(VALORES_PADRAO);
		setDialogAberto(true);
	}

	function abrirEdicao(registro: RegraFiscal) {
		setRegistroEdicao(registro);
		setModoEditor("visual");

		const cond = (registro.condicoes || {}) as Record<string, unknown>;
		const res = (registro.resultado || {}) as Record<string, unknown>;
		const fontes = (registro.fontes || []) as Array<Record<string, unknown>>;
		const primFonte = fontes[0] || {};

		form.reset({
			ruleid: registro.ruleid,
			descricao: registro.descricao,
			prioridade: registro.prioridade,
			vigenciainicio: registro.vigenciainicio.slice(0, 10),
			vigenciafim: registro.vigenciafim?.slice(0, 10) ?? "",

			escopo: (cond.escopo as "operacao" | "estrutural") || "operacao",
			regime_tributario: (cond.regime_tributario as string) || "TODOS",
			uf_emitente: (cond.uf_emitente as string) || "QUALQUER",
			uf_destinatario: (cond.uf_destinatario as string) || "QUALQUER",
			consumidor_final:
				cond.consumidor_final === true
					? "SIM"
					: cond.consumidor_final === false
						? "NAO"
						: "INDIFERENTE",
			contribuinte_icms:
				cond.contribuinte_icms === true
					? "SIM"
					: cond.contribuinte_icms === false
						? "NAO"
						: "INDIFERENTE",
			cfop: (cond.cfop as string) || "",
			cfop_prefixo: (cond.cfop_prefixo as string) || "",
			ncm: (cond.ncm as string) || "",
			cest: (cond.cest as string) || "",

			st_aplicavel:
				res.st_aplicavel === true ? "TRUE" : res.st_aplicavel === false ? "FALSE" : "NULL",
			fcp_aplicavel:
				res.fcp_aplicavel === true ? "TRUE" : res.fcp_aplicavel === false ? "FALSE" : "NULL",
			difal_aplicavel:
				res.difal_aplicavel === true ? "TRUE" : res.difal_aplicavel === false ? "FALSE" : "NULL",
			resultado_cfop: (res.cfop as string) || "",
			resultado_csosn: (res.csosn as string) || "NENHUM",
			resultado_cst: (res.cst as string) || "NENHUM",

			fonte_orgao: (primFonte.orgao as string) || "SEFAZ",
			fonte_tipo: (primFonte.tipo as string) || "PROTOCOLO_ICMS",
			fonte_numero: (primFonte.numero as string) || "",
			fonte_url: (primFonte.url as string) || "",

			condicoesJson: JSON.stringify(registro.condicoes, null, 2),
			resultadoJson: JSON.stringify(registro.resultado, null, 2),
			fontesJson: JSON.stringify(registro.fontes, null, 2),
		});
		setDialogAberto(true);
	}

	const registros = data?.data ?? [];

	return (
		<main className="px-4 space-y-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Regras Fiscais</h1>
					<p className="text-muted-foreground text-sm">
						Catálogo oficial de regras para cálculo e validação tributária (ST, DIFAL, FCP e CFOP).
						Regras validadas evitam rejeições da SEFAZ na emissão.
					</p>
				</div>
				<div className="flex gap-2">
					<Button type="button" onClick={abrirNovo}>
						<IconPlus className="mr-2 h-4 w-4" aria-hidden="true" />
						Nova Regra Fiscal
					</Button>
				</div>
			</header>

			<div className="flex items-center gap-3">
				<Input
					placeholder="Buscar por identificador (rule_id) ou descrição..."
					value={busca}
					onChange={(evento) => {
						setBusca(evento.target.value);
						setPagina(1);
					}}
					className="max-w-md"
				/>
			</div>

			{isLoading ? (
				<TableSkeleton />
			) : (
				<div className="rounded-md border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Identificador / Regra</TableHead>
								<TableHead>Condições Chave</TableHead>
								<TableHead>Tributação Aplicável</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Vigência</TableHead>
								<TableHead>Versão</TableHead>
								<TableHead className="text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{registros.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
										Nenhuma regra fiscal cadastrada.
									</TableCell>
								</TableRow>
							) : (
								registros.map((registro) => {
									const cond = (registro.condicoes || {}) as Record<string, unknown>;
									const res = (registro.resultado || {}) as Record<string, unknown>;
									return (
										<TableRow key={registro.id}>
											<TableCell>
												<div className="font-mono text-xs font-semibold">{registro.ruleid}</div>
												<div className="text-xs text-muted-foreground line-clamp-1">{registro.descricao}</div>
											</TableCell>
											<TableCell className="text-xs">
												<div className="flex flex-wrap gap-1">
													{cond.uf_emitente || cond.uf_destinatario ? (
														<Badge variant="outline" className="text-[10px]">
															{String(cond.uf_emitente ?? "Qualquer")} ➔ {String(cond.uf_destinatario ?? "Qualquer")}
														</Badge>
													) : null}
													{cond.cfop ? (
														<Badge variant="outline" className="text-[10px]">
															CFOP: {String(cond.cfop)}
														</Badge>
													) : cond.cfop_prefixo ? (
														<Badge variant="outline" className="text-[10px]">
															CFOP: {String(cond.cfop_prefixo)}xx
														</Badge>
													) : null}
													{cond.ncm ? (
														<Badge variant="outline" className="text-[10px]">
															NCM: {String(cond.ncm)}
														</Badge>
													) : null}
												</div>
											</TableCell>
											<TableCell className="text-xs">
												<div className="flex flex-wrap gap-1">
													{res.st_aplicavel === true && (
														<Badge className="bg-amber-600 text-[10px]">ST: Sim</Badge>
													)}
													{res.st_aplicavel === false && (
														<Badge variant="secondary" className="text-[10px]">ST: Não</Badge>
													)}
													{res.fcp_aplicavel === true && (
														<Badge className="bg-indigo-600 text-[10px]">FCP: Sim</Badge>
													)}
													{res.difal_aplicavel === true && (
														<Badge className="bg-emerald-600 text-[10px]">DIFAL: Sim</Badge>
													)}
													{Boolean(res.csosn) && (
														<Badge variant="outline" className="text-[10px]">CSOSN {String(res.csosn)}</Badge>
													)}
													{Boolean(res.cst) && (
														<Badge variant="outline" className="text-[10px]">CST {String(res.cst)}</Badge>
													)}
												</div>
											</TableCell>
											<TableCell>
												{registro.status === "validado" ? (
													<Badge className="bg-emerald-600 hover:bg-emerald-700">Validado</Badge>
												) : registro.status === "pendente_revisao" ? (
													<Badge variant="secondary">Pendente Revisão</Badge>
												) : registro.status === "desativado" ? (
													<Badge variant="destructive">Desativado</Badge>
												) : (
													<Badge variant="outline">Rascunho</Badge>
												)}
											</TableCell>
											<TableCell className="text-xs whitespace-nowrap">
												{registro.vigenciainicio.slice(0, 10)}
												{registro.vigenciafim
													? ` até ${registro.vigenciafim.slice(0, 10)}`
													: " (vigente)"}
											</TableCell>
											<TableCell className="text-xs">v{registro.versao}</TableCell>
											<TableCell className="space-x-1 text-right whitespace-nowrap">
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => abrirEdicao(registro)}
												>
													Editar
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => validarMutation.mutate(registro.id)}
													disabled={registro.status === "validado" || validarMutation.isPending}
													title="Validar com fonte oficial para autorizar o emissor fiscal"
												>
													<IconCheck className="mr-1 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
													Validar
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => rollbackMutation.mutate(registro)}
													disabled={registro.versao <= 1 || rollbackMutation.isPending}
													title="Restaurar versão anterior"
												>
													<IconHistory className="h-3.5 w-3.5" aria-hidden="true" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			)}

			{data?.paginacao && data.paginacao.totalPages > 1 && (
				<div className="flex gap-2 justify-end">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={pagina <= 1}
						onClick={() => setPagina((atual) => atual - 1)}
					>
						Anterior
					</Button>
					<span className="flex items-center px-2 text-xs text-muted-foreground">
						Página {pagina} de {data.paginacao.totalPages}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={pagina >= data.paginacao.totalPages}
						onClick={() => setPagina((atual) => atual + 1)}
					>
						Próxima
					</Button>
				</div>
			)}

			<Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<IconScale className="h-5 w-5 text-primary" />
							{registroEdicao ? "Editar Regra Fiscal" : "Nova Regra Fiscal"}
						</DialogTitle>
						<DialogDescription>
							Configure as condições da operação e defina se há incidência de ICMS-ST, DIFAL e FCP.
						</DialogDescription>
					</DialogHeader>

					<Tabs value={modoEditor} onValueChange={(val) => setModoEditor(val as "visual" | "json")}>
						<div className="flex items-center justify-between border-b pb-2">
							<TabsList>
								<TabsTrigger value="visual" className="text-xs">
									<IconFileText className="mr-1.5 h-3.5 w-3.5" />
									Formulário com Seletores
								</TabsTrigger>
								<TabsTrigger value="json" className="text-xs">
									<IconCode className="mr-1.5 h-3.5 w-3.5" />
									Modo Avançado (JSON)
								</TabsTrigger>
							</TabsList>
						</div>

						<form
							className="space-y-4 pt-3"
							onSubmit={form.handleSubmit((dados) => salvarMutation.mutate(dados))}
						>
							{/* Seção 1: Dados Gerais de Identificação */}
							<div className="space-y-3 rounded-lg border p-3 bg-muted/20">
								<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
									<IconSettings className="h-3.5 w-3.5" />
									Identificação da Regra
								</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="space-y-1">
										<Label htmlFor="ruleid" className="text-xs">ID da Regra (rule_id)</Label>
										<Input
											id="ruleid"
											placeholder="ex: ST-SP-RJ-6403 ou DIFAL-CONSUMIDOR"
											{...form.register("ruleid")}
										/>
										{form.formState.errors.ruleid && (
											<span className="text-[11px] text-destructive">
												{form.formState.errors.ruleid.message}
											</span>
										)}
									</div>
									<div className="space-y-1">
										<Label htmlFor="descricao" className="text-xs">Descrição Amigável</Label>
										<Input
											id="descricao"
											placeholder="ex: Venda interestadual SP para RJ com ST"
											{...form.register("descricao")}
										/>
										{form.formState.errors.descricao && (
											<span className="text-[11px] text-destructive">
												{form.formState.errors.descricao.message}
											</span>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div className="space-y-1">
										<Label className="text-xs">Prioridade</Label>
										<Controller
											control={form.control}
											name="prioridade"
											render={({ field }) => (
												<Select
													value={String(field.value)}
													onValueChange={(val) => field.onChange(Number(val))}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Selecione..." />
													</SelectTrigger>
													<SelectContent>
														{OPCOES_PRIORIDADE.map((opt) => (
															<SelectItem key={opt.value} value={opt.value}>
																{opt.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="vigenciainicio" className="text-xs">Vigência Início</Label>
										<Input id="vigenciainicio" type="date" {...form.register("vigenciainicio")} />
									</div>
									<div className="space-y-1">
										<Label htmlFor="vigenciafim" className="text-xs">Vigência Fim (opcional)</Label>
										<Input id="vigenciafim" type="date" {...form.register("vigenciafim")} />
									</div>
								</div>
							</div>

							<TabsContent value="visual" className="m-0 space-y-4">
								{/* Seção 2: Condições da Operação */}
								<div className="space-y-3 rounded-lg border p-3">
									<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
										<IconAlertCircle className="h-3.5 w-3.5" />
										Condições da Operação (Filtros de Aplicação)
									</h3>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div className="space-y-1">
											<Label className="text-xs">Escopo</Label>
											<Controller
												control={form.control}
												name="escopo"
												render={({ field }) => (
													<Select value={field.value} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="operacao">Operação (Itens / CFOP / NCM)</SelectItem>
															<SelectItem value="estrutural">Estrutural (Geral)</SelectItem>
														</SelectContent>
													</Select>
												)}
											/>
										</div>

										<div className="space-y-1">
											<Label className="text-xs">Regime Tributário</Label>
											<Controller
												control={form.control}
												name="regime_tributario"
												render={({ field }) => (
													<Select value={field.value} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="TODOS">Todos os Regimes</SelectItem>
															<SelectItem value="SN">Simples Nacional (CRT 1, 2, 4)</SelectItem>
															<SelectItem value="NORMAL">Regime Normal (CRT 3)</SelectItem>
														</SelectContent>
													</Select>
												)}
											/>
										</div>

										<div className="space-y-1">
											<Label className="text-xs">Consumidor Final</Label>
											<Controller
												control={form.control}
												name="consumidor_final"
												render={({ field }) => (
													<Select value={field.value} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="INDIFERENTE">Indiferente / Todos</SelectItem>
															<SelectItem value="SIM">Sim (Consumidor Final)</SelectItem>
															<SelectItem value="NAO">Não (Revenda / Industrialização)</SelectItem>
														</SelectContent>
													</Select>
												)}
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div className="space-y-1">
											<Label className="text-xs">UF Emitente (Origem)</Label>
											<Controller
												control={form.control}
												name="uf_emitente"
												render={({ field }) => (
													<Select value={field.value} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="QUALQUER">Qualquer UF</SelectItem>
															{LISTA_UFS.map((uf) => (
																<SelectItem key={uf.value} value={uf.value}>
																	{uf.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
										</div>

										<div className="space-y-1">
											<Label className="text-xs">UF Destinatário (Destino)</Label>
											<Controller
												control={form.control}
												name="uf_destinatario"
												render={({ field }) => (
													<Select value={field.value} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="QUALQUER">Qualquer UF</SelectItem>
															{LISTA_UFS.map((uf) => (
																<SelectItem key={uf.value} value={uf.value}>
																	{uf.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
										</div>

										<div className="space-y-1">
											<Label className="text-xs">Contribuinte ICMS</Label>
											<Controller
												control={form.control}
												name="contribuinte_icms"
												render={({ field }) => (
													<Select value={field.value} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="INDIFERENTE">Indiferente / Todos</SelectItem>
															<SelectItem value="SIM">Sim (Inscrição Estadual ativa)</SelectItem>
															<SelectItem value="NAO">Não (Não Contribuinte)</SelectItem>
														</SelectContent>
													</Select>
												)}
											/>
										</div>
									</div>

									<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
										<div className="space-y-1">
											<Label htmlFor="cfop" className="text-xs">CFOP Exato</Label>
											<Input id="cfop" placeholder="ex: 6403" maxLength={4} {...form.register("cfop")} />
										</div>
										<div className="space-y-1">
											<Label htmlFor="cfop_prefixo" className="text-xs">Ou Prefixo CFOP</Label>
											<Input id="cfop_prefixo" placeholder="ex: 64" maxLength={3} {...form.register("cfop_prefixo")} />
										</div>
										<div className="space-y-1">
											<Label htmlFor="ncm" className="text-xs">NCM (opcional)</Label>
											<Input id="ncm" placeholder="ex: 22021000" maxLength={8} {...form.register("ncm")} />
										</div>
										<div className="space-y-1">
											<Label htmlFor="cest" className="text-xs">CEST (opcional)</Label>
											<Input id="cest" placeholder="ex: 0300100" maxLength={7} {...form.register("cest")} />
										</div>
									</div>
								</div>

								{/* Seção 3: Resultado Tributário */}
								<div className="space-y-3 rounded-lg border p-3 bg-muted/10">
									<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
										<IconScale className="h-3.5 w-3.5" />
										Resultado Tributário (Confirmação Fiscal)
									</h3>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div className="space-y-1">
											<Label className="text-xs font-medium text-amber-700 dark:text-amber-400">
												Substituição Tributária (ST)
											</Label>
											<Controller
												control={form.control}
												name="st_aplicavel"
												render={({ field }) => (
													<Select value={field.value} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="NULL">Não especificado (Null)</SelectItem>
															<SelectItem value="TRUE">Sim (Aplica ST / Obrigatória)</SelectItem>
															<SelectItem value="FALSE">Não (Sem ST / Desonerado)</SelectItem>
														</SelectContent>
													</Select>
												)}
											/>
										</div>

										<div className="space-y-1">
											<Label className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
												FCP (Fundo Combate à Pobreza)
											</Label>
											<Controller
												control={form.control}
												name="fcp_aplicavel"
												render={({ field }) => (
													<Select value={field.value} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="NULL">Não especificado (Null)</SelectItem>
															<SelectItem value="TRUE">Sim (Aplica FCP)</SelectItem>
															<SelectItem value="FALSE">Não (Sem FCP)</SelectItem>
														</SelectContent>
													</Select>
												)}
											/>
										</div>

										<div className="space-y-1">
											<Label className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
												DIFAL Interestadual
											</Label>
											<Controller
												control={form.control}
												name="difal_aplicavel"
												render={({ field }) => (
													<Select value={field.value} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="NULL">Não especificado (Null)</SelectItem>
															<SelectItem value="TRUE">Sim (Aplica DIFAL)</SelectItem>
															<SelectItem value="FALSE">Não (Sem DIFAL)</SelectItem>
														</SelectContent>
													</Select>
												)}
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
										<div className="space-y-1">
											<Label htmlFor="resultado_cfop" className="text-xs">CFOP Resultante (opcional)</Label>
											<Input id="resultado_cfop" placeholder="ex: 6403" maxLength={4} {...form.register("resultado_cfop")} />
										</div>

										<div className="space-y-1">
											<Label className="text-xs">CSOSN Resultante (SN)</Label>
											<Controller
												control={form.control}
												name="resultado_csosn"
												render={({ field }) => (
													<Select value={field.value || "NENHUM"} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="NENHUM">Nenhum / Não alterar</SelectItem>
															{OPCOES_CSOSN.map((cs) => (
																<SelectItem key={cs.value} value={cs.value}>
																	{cs.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
										</div>

										<div className="space-y-1">
											<Label className="text-xs">CST Resultante (Normal)</Label>
											<Controller
												control={form.control}
												name="resultado_cst"
												render={({ field }) => (
													<Select value={field.value || "NENHUM"} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="NENHUM">Nenhum / Não alterar</SelectItem>
															{OPCOES_CST_ICMS.map((cst) => (
																<SelectItem key={cst.value} value={cst.value}>
																	{cst.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
										</div>
									</div>
								</div>

								{/* Seção 4: Fonte Oficial */}
								<div className="space-y-3 rounded-lg border p-3">
									<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
										<IconFileText className="h-3.5 w-3.5" />
										Fonte Oficial / Base Legal (Obrigatório para Validação)
									</h3>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div className="space-y-1">
											<Label className="text-xs">Órgão Emissor</Label>
											<Controller
												control={form.control}
												name="fonte_orgao"
												render={({ field }) => (
													<Select value={field.value || "SEFAZ"} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{OPCOES_ORGAO_FONTE.map((orgao) => (
																<SelectItem key={orgao.value} value={orgao.value}>
																	{orgao.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
										</div>

										<div className="space-y-1">
											<Label className="text-xs">Tipo de Documento</Label>
											<Controller
												control={form.control}
												name="fonte_tipo"
												render={({ field }) => (
													<Select value={field.value || "PROTOCOLO_ICMS"} onValueChange={field.onChange}>
														<SelectTrigger className="w-full">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{OPCOES_TIPO_FONTE.map((tipo) => (
																<SelectItem key={tipo.value} value={tipo.value}>
																	{tipo.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
										</div>

										<div className="space-y-1">
											<Label htmlFor="fonte_numero" className="text-xs">Número / Identificação</Label>
											<Input
												id="fonte_numero"
												placeholder="ex: 41/2008 ou Lei 12.345"
												{...form.register("fonte_numero")}
											/>
										</div>
									</div>

									<div className="space-y-1">
										<Label htmlFor="fonte_url" className="text-xs">URL / Link Oficial (opcional)</Label>
										<Input
											id="fonte_url"
											placeholder="https://www.confaz.fazenda.gov.br/..."
											{...form.register("fonte_url")}
										/>
									</div>
								</div>
							</TabsContent>

							<TabsContent value="json" className="m-0 space-y-3">
								<div className="space-y-1">
									<Label htmlFor="condicoesJson" className="text-xs">Condições (JSON)</Label>
									<Textarea id="condicoesJson" rows={5} className="font-mono text-xs" {...form.register("condicoesJson")} />
								</div>
								<div className="space-y-1">
									<Label htmlFor="resultadoJson" className="text-xs">Resultado (JSON)</Label>
									<Textarea id="resultadoJson" rows={4} className="font-mono text-xs" {...form.register("resultadoJson")} />
								</div>
								<div className="space-y-1">
									<Label htmlFor="fontesJson" className="text-xs">Fontes Oficiais (JSON)</Label>
									<Textarea id="fontesJson" rows={4} className="font-mono text-xs" {...form.register("fontesJson")} />
								</div>
							</TabsContent>

							<div className="flex justify-end gap-2 pt-2 border-t">
								<Button
									type="button"
									variant="outline"
									onClick={() => setDialogAberto(false)}
									disabled={salvarMutation.isPending}
								>
									Cancelar
								</Button>
								<Button type="submit" disabled={salvarMutation.isPending}>
									{salvarMutation.isPending ? "Salvando..." : "Salvar Regra"}
								</Button>
							</div>
						</form>
					</Tabs>
				</DialogContent>
			</Dialog>
		</main>
	);
}
