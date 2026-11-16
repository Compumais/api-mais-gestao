"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useEmpresa } from "@/hooks/use-empresa";
import { api } from "@/lib/axios";
import {
	cobrancaBancariaService,
	type RetornoBancarioItem,
} from "@/services/cobranca-bancaria.service";
import { contasCorrentesService } from "@/services/contas-correntes.service";

function formatarMoeda(valor: string | number | null | undefined) {
	const n = Number(valor ?? 0);
	return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CobrancaBancariaPage() {
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const idempresa = empresa?.id;

	const [aba, setAba] = useState("remessa");
	const [vencimentoInicio, setVencimentoInicio] = useState("");
	const [vencimentoFim, setVencimentoFim] = useState("");
	const [emissaoInicio, setEmissaoInicio] = useState("");
	const [emissaoFim, setEmissaoFim] = useState("");
	const [cliente, setCliente] = useState("");
	const [visualizar, setVisualizar] = useState<"sem" | "com">("sem");
	const [idContaCobranca, setIdContaCobranca] = useState("");
	const [observacao, setObservacao] = useState("");
	const [diasInstrucao, setDiasInstrucao] = useState(0);
	const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

	const [idContaRetorno, setIdContaRetorno] = useState("");
	const [arquivosRetorno, setArquivosRetorno] = useState<
		Array<{ nome: string; conteudo: string }>
	>([]);
	const [idRetornoAtual, setIdRetornoAtual] = useState<string | null>(null);
	const [itensRetorno, setItensRetorno] = useState<RetornoBancarioItem[]>([]);
	const [itensSelecionadosRetorno, setItensSelecionadosRetorno] = useState<
		Set<string>
	>(new Set());

	const { data: contas } = useQuery({
		queryKey: ["contas-correntes", idempresa],
		enabled: Boolean(idempresa),
		queryFn: () =>
			contasCorrentesService.listar({
				idempresa: idempresa!,
				limit: 200,
			}),
	});

	const { data: contaCobranca } = useQuery({
		queryKey: ["conta-corrente", idContaCobranca],
		enabled: Boolean(idContaCobranca),
		queryFn: () => contasCorrentesService.buscar(idContaCobranca),
	});

	const filtrosTitulos = useMemo(
		() => ({
			idempresa: idempresa!,
			tipo: "R" as const,
			status: "A",
			emissaoInicio: emissaoInicio || undefined,
			emissaoFim: emissaoFim || undefined,
			vencimentoInicio: vencimentoInicio || undefined,
			vencimentoFim: vencimentoFim || undefined,
			emitente: cliente || undefined,
			remessagerada: visualizar === "sem" ? 0 : 1,
			permiteBoleto: true,
			page: 1,
			limit: 100,
		}),
		[
			idempresa,
			emissaoInicio,
			emissaoFim,
			vencimentoInicio,
			vencimentoFim,
			cliente,
			visualizar,
		],
	);

	const {
		data: titulosData,
		isFetching: carregandoTitulos,
		refetch: refetchTitulos,
	} = useQuery({
		queryKey: ["cobranca-titulos", filtrosTitulos],
		enabled: Boolean(idempresa) && aba === "remessa",
		queryFn: () => cobrancaBancariaService.listarTitulos(filtrosTitulos),
	});

	const titulos = titulosData?.data ?? [];

	const gerarRemessa = useMutation({
		mutationFn: async () => {
			if (!idempresa) throw new Error("Empresa não selecionada");
			if (!idContaCobranca) throw new Error("Selecione a conta corrente");
			if (selecionados.size === 0) {
				throw new Error("Selecione ao menos um título");
			}
			return cobrancaBancariaService.gerarRemessa({
				idempresa,
				idcontacorrente: idContaCobranca,
				idsfinanceiros: [...selecionados],
				dadosCobranca: {
					diasinstrucaocobrancaboleto: diasInstrucao,
					observacaoboleto: observacao || null,
					instrucaocobrancaboleto: 0,
				},
			});
		},
		onSuccess: async (resultado) => {
			toast.success(
				`Remessa gerada: ${resultado.qtdIncluidos} incluído(s)${
					resultado.erros.length
						? `, ${resultado.erros.length} com erro`
						: ""
				}`,
			);
			if (resultado.erros[0]) {
				toast.error(resultado.erros[0].mensagem);
			}
			const response = await api.get(
				cobrancaBancariaService.urlDownloadRemessa(
					resultado.idremessa,
					idempresa!,
				),
				{ responseType: "blob" },
			);
			const blob = new Blob([response.data], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = resultado.nomearquivo || `remessa_${resultado.idremessa}.rem`;
			a.click();
			URL.revokeObjectURL(url);
			setSelecionados(new Set());
			queryClient.invalidateQueries({ queryKey: ["cobranca-titulos"] });
			queryClient.invalidateQueries({ queryKey: ["remessas-bancarias"] });
		},
		onError: (e: Error) => toast.error(e.message || "Falha ao gerar remessa"),
	});

	const importarRetorno = useMutation({
		mutationFn: async () => {
			if (!idempresa) throw new Error("Empresa não selecionada");
			if (!idContaRetorno) throw new Error("Selecione a conta corrente");
			if (arquivosRetorno.length === 0) {
				throw new Error("Selecione ao menos um arquivo");
			}
			const arquivo = arquivosRetorno[0]!;
			return cobrancaBancariaService.importarRetorno({
				idempresa,
				idcontacorrente: idContaRetorno,
				nomearquivo: arquivo.nome,
				conteudo: arquivo.conteudo,
			});
		},
		onSuccess: (resultado) => {
			toast.success(
				resultado.jaExistia
					? "Arquivo já importado anteriormente"
					: "Retorno importado com sucesso",
			);
			setIdRetornoAtual(resultado.retorno.id);
			setItensRetorno(resultado.itens);
			setItensSelecionadosRetorno(
				new Set(
					resultado.itens
						.filter((i) => i.statusprocessamento === "pendente")
						.map((i) => i.id),
				),
			);
		},
		onError: (e: Error) => toast.error(e.message || "Falha ao importar retorno"),
	});

	const processarRetorno = useMutation({
		mutationFn: async () => {
			if (!idempresa || !idRetornoAtual) {
				throw new Error("Importe um retorno antes de processar");
			}
			return cobrancaBancariaService.processarRetorno({
				id: idRetornoAtual,
				idempresa,
				idsitens:
					itensSelecionadosRetorno.size > 0
						? [...itensSelecionadosRetorno]
						: undefined,
			});
		},
		onSuccess: (resultado) => {
			toast.success(
				`Processado: ${resultado.processados} | Ignorados: ${resultado.ignorados} | Erros: ${resultado.erros}`,
			);
			setItensRetorno(resultado.itens);
			queryClient.invalidateQueries({ queryKey: ["cobranca-titulos"] });
			queryClient.invalidateQueries({ queryKey: ["financeiros"] });
		},
		onError: (e: Error) =>
			toast.error(e.message || "Falha ao processar retorno"),
	});

	function toggleTodosTitulos(checked: boolean) {
		if (!checked) {
			setSelecionados(new Set());
			return;
		}
		setSelecionados(new Set(titulos.map((t) => t.id)));
	}

	function toggleTitulo(id: string, checked: boolean) {
		setSelecionados((atual) => {
			const next = new Set(atual);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}

	async function onSelecionarArquivos(files: FileList | null) {
		if (!files?.length) return;
		const lidos: Array<{ nome: string; conteudo: string }> = [];
		for (const file of Array.from(files)) {
			const conteudo = await file.text();
			lidos.push({ nome: file.name, conteudo });
		}
		setArquivosRetorno(lidos);
	}

	const opcoesContas = contas?.data ?? [];

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<div>
					<h1 className="text-2xl font-bold">Cobrança bancária</h1>
					<p className="text-sm text-muted-foreground">
						Emissão de remessa CNAB e processamento de retorno
					</p>
				</div>
			</div>

			<div className="px-4 pb-6">
				<Tabs value={aba} onValueChange={setAba}>
					<TabsList>
						<TabsTrigger value="remessa">Remessa</TabsTrigger>
						<TabsTrigger value="retorno">Retorno</TabsTrigger>
					</TabsList>

					<TabsContent value="remessa" className="space-y-4 mt-4">
						<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
							<div className="xl:col-span-2 rounded-lg border bg-card p-4 space-y-3">
								<h2 className="font-semibold">Filtros</h2>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
									<div>
										<Label>Vencimento de</Label>
										<Input
											type="date"
											value={vencimentoInicio}
											onChange={(e) => setVencimentoInicio(e.target.value)}
										/>
									</div>
									<div>
										<Label>Vencimento até</Label>
										<Input
											type="date"
											value={vencimentoFim}
											onChange={(e) => setVencimentoFim(e.target.value)}
										/>
									</div>
									<div>
										<Label>Emissão de</Label>
										<Input
											type="date"
											value={emissaoInicio}
											onChange={(e) => setEmissaoInicio(e.target.value)}
										/>
									</div>
									<div>
										<Label>Emissão até</Label>
										<Input
											type="date"
											value={emissaoFim}
											onChange={(e) => setEmissaoFim(e.target.value)}
										/>
									</div>
									<div>
										<Label>Cliente</Label>
										<Input
											value={cliente}
											onChange={(e) => setCliente(e.target.value)}
											placeholder="Nome do cliente"
										/>
									</div>
									<div>
										<Label>Visualizar</Label>
										<Select
											value={visualizar}
											onValueChange={(v) => setVisualizar(v as "sem" | "com")}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="sem">
													Duplicatas sem remessa
												</SelectItem>
												<SelectItem value="com">
													Duplicatas com remessa
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
								<Button
									variant="outline"
									onClick={() => refetchTitulos()}
									disabled={carregandoTitulos}
								>
									Filtrar
								</Button>
							</div>

							<div className="rounded-lg border bg-card p-4 space-y-3">
								<h2 className="font-semibold">Dados para cobrança</h2>
								<div className="space-y-2">
									<Label>Conta corrente</Label>
									<Select
										value={idContaCobranca}
										onValueChange={setIdContaCobranca}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											{opcoesContas.map((c) => (
												<SelectItem key={c.id} value={c.id}>
													{c.descricao || c.numeroconta || c.id}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Carteira</Label>
									<Input
										value={contaCobranca?.carteira || ""}
										readOnly
										placeholder="Definida na conta corrente"
									/>
								</div>
								<div>
									<Label>Layout</Label>
									<Input
										value={(
											contaCobranca?.layoutarquivoremessa || "cnab240"
										).toUpperCase()}
										readOnly
									/>
								</div>
								<div>
									<Label>Ação</Label>
									<Input value="01 - Entrada de Títulos" readOnly />
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<Label>Instrução (dias)</Label>
										<Input
											type="number"
											value={diasInstrucao}
											onChange={(e) =>
												setDiasInstrucao(Number(e.target.value) || 0)
											}
										/>
									</div>
									<div>
										<Label>Tipo</Label>
										<Input value="DM" readOnly />
									</div>
								</div>
								<div>
									<Label>Observação</Label>
									<Textarea
										value={observacao}
										onChange={(e) => setObservacao(e.target.value)}
										className="min-h-20"
									/>
								</div>
								<Button
									className="w-full"
									onClick={() => gerarRemessa.mutate()}
									disabled={gerarRemessa.isPending}
								>
									{gerarRemessa.isPending
										? "Gerando..."
										: "Gerar remessa e baixar"}
								</Button>
							</div>
						</div>

						<div className="rounded-lg border bg-card">
							<div className="p-3 border-b flex items-center justify-between">
								<h2 className="font-semibold">
									Duplicatas ({titulos.length})
								</h2>
								<span className="text-sm text-muted-foreground">
									{selecionados.size} selecionada(s)
								</span>
							</div>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-10">
											<Checkbox
												checked={
													titulos.length > 0 &&
													selecionados.size === titulos.length
												}
												onCheckedChange={(v) => toggleTodosTitulos(Boolean(v))}
											/>
										</TableHead>
										<TableHead>Documento</TableHead>
										<TableHead>Tipo</TableHead>
										<TableHead>Cliente</TableHead>
										<TableHead>Emissão</TableHead>
										<TableHead>Vencimento</TableHead>
										<TableHead>Valor</TableHead>
										<TableHead>Nosso número</TableHead>
										<TableHead>DV</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{carregandoTitulos && (
										<TableRow>
											<TableCell colSpan={9}>Carregando...</TableCell>
										</TableRow>
									)}
									{!carregandoTitulos && titulos.length === 0 && (
										<TableRow>
											<TableCell colSpan={9}>
												Nenhum título encontrado com os filtros.
											</TableCell>
										</TableRow>
									)}
									{titulos.map((t) => (
										<TableRow key={t.id}>
											<TableCell>
												<Checkbox
													checked={selecionados.has(t.id)}
													onCheckedChange={(v) =>
														toggleTitulo(t.id, Boolean(v))
													}
												/>
											</TableCell>
											<TableCell>{t.documento || "-"}</TableCell>
											<TableCell>{t.tipodocumentodescricao || "-"}</TableCell>
											<TableCell>{t.emitente || "-"}</TableCell>
											<TableCell>{t.emissao || "-"}</TableCell>
											<TableCell>{t.vencimento || "-"}</TableCell>
											<TableCell>{formatarMoeda(t.valor)}</TableCell>
											<TableCell>{t.nossonumero || "-"}</TableCell>
											<TableCell>{t.dvnossonumero || "-"}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</TabsContent>

					<TabsContent value="retorno" className="space-y-4 mt-4">
						<div className="rounded-lg border bg-card p-4 space-y-3">
							<h2 className="font-semibold">Arquivo retorno</h2>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
								<div>
									<Label>Conta corrente</Label>
									<Select
										value={idContaRetorno}
										onValueChange={setIdContaRetorno}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											{opcoesContas.map((c) => (
												<SelectItem key={c.id} value={c.id}>
													{c.descricao || c.numeroconta || c.id}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Selecionar arquivos</Label>
									<Input
										type="file"
										accept=".ret,.crt,.txt,.rem,.ced"
										multiple
										onChange={(e) => onSelecionarArquivos(e.target.files)}
									/>
								</div>
								<div className="flex gap-2">
									<Button
										onClick={() => importarRetorno.mutate()}
										disabled={importarRetorno.isPending}
									>
										{importarRetorno.isPending ? "Importando..." : "Importar"}
									</Button>
									<Button
										variant="outline"
										onClick={() => {
											setArquivosRetorno([]);
											setItensRetorno([]);
											setIdRetornoAtual(null);
										}}
									>
										Remover
									</Button>
								</div>
							</div>
							{arquivosRetorno.length > 0 && (
								<ul className="text-sm text-muted-foreground list-disc pl-5">
									{arquivosRetorno.map((a) => (
										<li key={a.nome}>{a.nome}</li>
									))}
								</ul>
							)}
						</div>

						<div className="rounded-lg border bg-card">
							<div className="p-3 border-b flex items-center justify-between gap-2">
								<h2 className="font-semibold">
									Ocorrências bancárias ({itensRetorno.length})
								</h2>
								<Button
									onClick={() => processarRetorno.mutate()}
									disabled={
										processarRetorno.isPending || !idRetornoAtual
									}
								>
									{processarRetorno.isPending
										? "Processando..."
										: "Processar retorno"}
								</Button>
							</div>
							<div className="overflow-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-10" />
											<TableHead>Nosso número</TableHead>
											<TableHead>Documento</TableHead>
											<TableHead>Sacado</TableHead>
											<TableHead>Valor</TableHead>
											<TableHead>Valor pago</TableHead>
											<TableHead>Vencimento</TableHead>
											<TableHead>Crédito</TableHead>
											<TableHead>Ocorrência</TableHead>
											<TableHead>Motivo</TableHead>
											<TableHead>Juros</TableHead>
											<TableHead>Multa</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{itensRetorno.length === 0 && (
											<TableRow>
												<TableCell colSpan={13}>
													Importe um arquivo de retorno para visualizar as
													ocorrências.
												</TableCell>
											</TableRow>
										)}
										{itensRetorno.map((item) => (
											<TableRow key={item.id}>
												<TableCell>
													<Checkbox
														checked={itensSelecionadosRetorno.has(item.id)}
														onCheckedChange={(v) => {
															setItensSelecionadosRetorno((atual) => {
																const next = new Set(atual);
																if (v) next.add(item.id);
																else next.delete(item.id);
																return next;
															});
														}}
													/>
												</TableCell>
												<TableCell>{item.nossonumero || "-"}</TableCell>
												<TableCell>{item.numerodocumento || "-"}</TableCell>
												<TableCell>{item.nomesacado || "-"}</TableCell>
												<TableCell>{formatarMoeda(item.valor)}</TableCell>
												<TableCell>{formatarMoeda(item.valorpago)}</TableCell>
												<TableCell>{item.vencimento || "-"}</TableCell>
												<TableCell>{item.datacredito || "-"}</TableCell>
												<TableCell>
													{item.ocorrencia}
													{item.ocorrenciadescricao
														? ` - ${item.ocorrenciadescricao}`
														: ""}
												</TableCell>
												<TableCell>{item.motivo || "-"}</TableCell>
												<TableCell>{formatarMoeda(item.juros)}</TableCell>
												<TableCell>{formatarMoeda(item.multa)}</TableCell>
												<TableCell>
													{item.statusprocessamento}
													{item.mensagemerro ? ` (${item.mensagemerro})` : ""}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</PageContainer>
	);
}
