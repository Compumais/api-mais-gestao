"use client";

import { LayoutDashboard, Play, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	useBiCatalogo,
	useBiConsultas,
	useBiMutations,
	useBiSchema,
} from "@/hooks/use-editor-sql";
import { adicionarDiasIso, hojeBrasiliaIsoDate } from "@/lib/date";
import type {
	BiCatalogoItem,
	BiColSpan,
	BiConsulta,
	BiMapeamentoGrafico,
	BiResultadoExecucao,
	BiTipoGrafico,
} from "@/services/editor-sql.service";
import { PageContainer } from "../components/page-container";
import { ResultadoPainel } from "./components/resultado-painel";
import { SchemaSidebar } from "./components/schema-sidebar";
import { SqlCodeEditor } from "./components/sql-code-editor";

const SQL_INICIAL = `SELECT
	TO_CHAR(data_venda::date, 'DD/MM') AS dia,
	ROUND(COALESCE(SUM(valor_total), 0)::numeric, 2) AS total
FROM vw_vendas_pdv
WHERE cancelada = false
	AND data_venda::date BETWEEN :data_inicio::date AND :data_fim::date
GROUP BY data_venda::date
ORDER BY data_venda::date ASC`;

function detectarParametros(sql: string): string[] {
	const encontrados = new Set<string>();
	const regex = /(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)/g;
	for (const match of sql.matchAll(regex)) {
		if (match[1]) encontrados.add(match[1]);
	}
	return Array.from(encontrados);
}

function extrairMensagemErro(err: unknown): string {
	if (err && typeof err === "object" && "response" in err) {
		const resp = (err as { response?: { data?: { error?: string } } }).response;
		if (resp?.data?.error) return resp.data.error;
	}
	return err instanceof Error ? err.message : "Erro ao processar requisição.";
}

function EditorSqlWorkspace() {
	const searchParams = useSearchParams();
	const consultaIdUrl = searchParams.get("consultaId");

	const { data: schemaData, isLoading: carregandoSchema } = useBiSchema();
	const { data: catalogoData } = useBiCatalogo();
	const { data: consultasData } = useBiConsultas();
	const {
		executarSql,
		criarConsulta,
		atualizarConsulta,
		excluirConsulta,
		criarWidget,
	} = useBiMutations();

	const [sql, setSql] = React.useState(SQL_INICIAL);
	const [consultaAtivaId, setConsultaAtivaId] = React.useState<string | null>(
		null,
	);
	const [nomeConsulta, setNomeConsulta] = React.useState("");
	const [descricaoConsulta, setDescricaoConsulta] = React.useState("");
	const [modalSalvarAberto, setModalSalvarAberto] = React.useState(false);

	const hoje = React.useMemo(() => hojeBrasiliaIsoDate(), []);
	const [parametros, setParametros] = React.useState<Record<string, string>>(
		() => ({
			data_inicio: adicionarDiasIso(hoje, -29),
			data_fim: hoje,
		}),
	);

	const [resultado, setResultado] = React.useState<BiResultadoExecucao | null>(
		null,
	);
	const [erroExecucao, setErroExecucao] = React.useState<string | null>(null);
	const [tipoGrafico, setTipoGrafico] = React.useState<BiTipoGrafico>("barra");
	const [mapeamento, setMapeamento] = React.useState<BiMapeamentoGrafico>({
		formato: "moeda",
	});

	const consultas = consultasData?.consultas ?? [];
	const views = schemaData?.views ?? [];
	const catalogo = catalogoData?.catalogo ?? [];

	React.useEffect(() => {
		if (!consultaIdUrl || consultas.length === 0) return;
		const encontrada = consultas.find((c) => c.id === consultaIdUrl);
		if (encontrada && consultaAtivaId !== encontrada.id) {
			setConsultaAtivaId(encontrada.id);
			setNomeConsulta(encontrada.nome);
			setDescricaoConsulta(encontrada.descricao ?? "");
			setSql(encontrada.sql);
		}
	}, [consultaIdUrl, consultas, consultaAtivaId]);

	const paramsDetectados = React.useMemo(() => detectarParametros(sql), [sql]);

	const handleExecutar = React.useCallback(async () => {
		setErroExecucao(null);
		try {
			const res = await executarSql.mutateAsync({
				sql,
				parametros,
				limiteLinhas: 500,
			});
			setResultado(res);
			if (res.colunas.length > 0) {
				setMapeamento((prev) => ({
					...prev,
					eixoX: prev.eixoX && res.colunas.includes(prev.eixoX) ? prev.eixoX : res.colunas[0],
					colunaValor:
						prev.colunaValor && res.colunas.includes(prev.colunaValor)
							? prev.colunaValor
							: res.colunas[res.colunas.length - 1],
					series:
						prev.series?.length &&
						res.colunas.includes(prev.series[0]?.coluna ?? "")
							? prev.series
							: [
									{
										coluna: res.colunas[1] ?? res.colunas[0]!,
										label: res.colunas[1] ?? res.colunas[0]!,
										cor: "#2563eb",
									},
								],
				}));
			}
		} catch (err) {
			setResultado(null);
			setErroExecucao(extrairMensagemErro(err));
		}
	}, [executarSql, sql, parametros]);

	const handleSalvarConsulta = async () => {
		if (!nomeConsulta.trim()) {
			toast.error("Informe um nome para a consulta.");
			return;
		}
		try {
			if (consultaAtivaId) {
				await atualizarConsulta.mutateAsync({
					id: consultaAtivaId,
					nome: nomeConsulta,
					descricao: descricaoConsulta || null,
					sql,
				});
				toast.success("Consulta atualizada!");
			} else {
				const res = await criarConsulta.mutateAsync({
					nome: nomeConsulta,
					descricao: descricaoConsulta || null,
					sql,
				});
				setConsultaAtivaId(res.consulta.id);
				toast.success("Consulta salva com sucesso!");
			}
			setModalSalvarAberto(false);
		} catch (err) {
			toast.error(extrairMensagemErro(err));
		}
	};

	const handlePublicarWidget = async (dados: {
		titulo: string;
		subtitulo: string;
		colSpan: BiColSpan;
	}) => {
		try {
			await criarWidget.mutateAsync({
				...(consultaAtivaId ? { idconsulta: consultaAtivaId } : { sql }),
				nomeConsulta: nomeConsulta || dados.titulo,
				titulo: dados.titulo,
				subtitulo: dados.subtitulo || null,
				tipografico: tipoGrafico,
				mapeamento,
				colSpan: dados.colSpan,
				adicionarAoDashboard: true,
			});
			toast.success('Widget publicado na aba "Meu Painel" do Dashboard!');
		} catch (err) {
			toast.error(extrairMensagemErro(err));
		}
	};

	const handleSelecionarConsulta = (c: BiConsulta) => {
		setConsultaAtivaId(c.id);
		setNomeConsulta(c.nome);
		setDescricaoConsulta(c.descricao ?? "");
		setSql(c.sql);
		setErroExecucao(null);
	};

	const handleUsarCatalogo = (item: BiCatalogoItem) => {
		setConsultaAtivaId(null);
		setNomeConsulta(item.titulo);
		setDescricaoConsulta(item.descricao);
		setSql(item.sql);
		setTipoGrafico(item.tipoGrafico);
		setMapeamento(item.mapeamento);
		setErroExecucao(null);
	};

	const handleExcluirConsulta = async (id: string) => {
		try {
			await excluirConsulta.mutateAsync(id);
			if (consultaAtivaId === id) {
				setConsultaAtivaId(null);
				setNomeConsulta("");
			}
			toast.success("Consulta removida.");
		} catch (err) {
			toast.error(extrairMensagemErro(err));
		}
	};

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 px-4 py-4 lg:px-6 lg:py-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-xl font-semibold tracking-tight">
								Editor SQL &amp; BI
							</h1>
							<Badge variant="outline" className="gap-1 text-[11px]">
								<ShieldCheck className="size-3 text-emerald-600" />
								Somente leitura · Isolado por empresa
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							Crie consultas sobre as views do schema <code>relatorios</code> e
							publique gráficos diretamente no seu Dashboard Personalizado.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" size="sm" asChild>
							<Link href="/dashboard?tab=personalizado">
								<LayoutDashboard className="mr-1.5 size-4" />
								Abrir Meu Painel
							</Link>
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setModalSalvarAberto(true)}
						>
							<Save className="mr-1.5 size-4" />
							{consultaAtivaId ? "Atualizar Consulta" : "Salvar Consulta"}
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={handleExecutar}
							disabled={executarSql.isPending}
						>
							<Play className="mr-1.5 size-4" />
							{executarSql.isPending ? "Executando..." : "Executar (Ctrl+Enter)"}
						</Button>
					</div>
				</div>

				<div className="grid gap-4 lg:grid-cols-12">
					<div className="lg:col-span-3 lg:max-h-[calc(100vh-190px)]">
						<SchemaSidebar
							views={views}
							consultas={consultas}
							catalogo={catalogo}
							carregandoSchema={carregandoSchema}
							onInserirTexto={(texto) =>
								setSql((prev) => `${prev}${prev.endsWith(" ") ? "" : " "}${texto}`)
							}
							onSelecionarConsulta={handleSelecionarConsulta}
							onExcluirConsulta={handleExcluirConsulta}
							onUsarCatalogo={handleUsarCatalogo}
						/>
					</div>

					<div className="flex flex-col gap-4 lg:col-span-9">
						<div className="space-y-3 rounded-lg border bg-card p-3">
							<SqlCodeEditor
								value={sql}
								onChange={setSql}
								onExecute={handleExecutar}
								views={views}
							/>

							{paramsDetectados.length > 0 && (
								<div className="flex flex-wrap items-end gap-3 rounded-md bg-muted/40 p-2.5">
									<span className="text-xs font-medium text-muted-foreground">
										Parâmetros:
									</span>
									{paramsDetectados.map((p) => (
										<div key={p} className="flex items-center gap-1.5">
											<Label className="font-mono text-xs">:{p}</Label>
											<Input
												type={p.includes("data") ? "date" : "text"}
												value={parametros[p] ?? ""}
												onChange={(e) =>
													setParametros((prev) => ({
														...prev,
														[p]: e.target.value,
													}))
												}
												className="h-7 w-36 text-xs"
											/>
										</div>
									))}
								</div>
							)}
						</div>

						<ResultadoPainel
							resultado={resultado}
							erro={erroExecucao}
							executando={executarSql.isPending}
							tipoGrafico={tipoGrafico}
							onTipoGraficoChange={setTipoGrafico}
							mapeamento={mapeamento}
							onMapeamentoChange={setMapeamento}
							onPublicarWidget={handlePublicarWidget}
							publicando={criarWidget.isPending}
						/>
					</div>
				</div>
			</div>

			<Dialog open={modalSalvarAberto} onOpenChange={setModalSalvarAberto}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{consultaAtivaId ? "Atualizar Consulta" : "Salvar Consulta SQL"}
						</DialogTitle>
						<DialogDescription>
							A consulta ficará disponível para reutilização e vinculação a
							widgets desta empresa.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="space-y-1">
							<Label htmlFor="nome-consulta">Nome</Label>
							<Input
								id="nome-consulta"
								value={nomeConsulta}
								onChange={(e) => setNomeConsulta(e.target.value)}
								placeholder="Ex.: Faturamento PDV por dia"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="desc-consulta">Descrição (opcional)</Label>
							<Input
								id="desc-consulta"
								value={descricaoConsulta}
								onChange={(e) => setDescricaoConsulta(e.target.value)}
								placeholder="Resumo do que esta consulta mede"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setModalSalvarAberto(false)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							onClick={handleSalvarConsulta}
							disabled={criarConsulta.isPending || atualizarConsulta.isPending}
						>
							Salvar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}

export default function EditorSqlPage() {
	return (
		<Suspense
			fallback={
				<PageContainer>
					<div className="px-4 py-6 text-sm text-muted-foreground lg:px-6">
						Carregando Editor SQL…
					</div>
				</PageContainer>
			}
		>
			<EditorSqlWorkspace />
		</Suspense>
	);
}
