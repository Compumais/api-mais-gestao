"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Combobox } from "@/components/ui/combobox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { ItemNfe } from "@/schemas/nfe-emissao.schema";
import { produtosService } from "@/services/produtos.service";
import {
	empresaUsaCsosn,
	itemEmissaoPodeSerConfirmado,
	mapearProdutoParaItemNfe,
	mapearTributacaoCfopParaItem,
	normalizarTributacaoItemFormulario,
	normalizarGtinItemFormulario,
	prepararItemEmissaoFormulario,
} from "@/util/mapear-produto-item-nfe";
import { resolverIcmsItemDeTaxaUf } from "@/util/resolver-icms-taxa-uf";
import { taxaUfService } from "@/services/taxauf.service";
import {
	OPCOES_CSOSN,
	OPCOES_CST_ICMS,
} from "@/util/cst-produto-util";

const OPCOES_CST_PIS_COFINS = [
	{ value: "01", label: "01 - Operação tributável (alíquota básica)" },
	{ value: "04", label: "04 - Monofásica (alíquota zero)" },
	{ value: "06", label: "06 - Alíquota zero" },
	{ value: "07", label: "07 - Operação isenta" },
	{ value: "08", label: "08 - Sem incidência" },
	{ value: "09", label: "09 - Suspensão" },
	{ value: "49", label: "49 - Outras operações de saída" },
];

const OPCOES_ORIGEM = [
	{ value: "0", label: "0 - Nacional" },
	{ value: "1", label: "1 - Estrangeira (importação direta)" },
	{ value: "2", label: "2 - Estrangeira (adquirida no mercado interno)" },
	{ value: "3", label: "3 - Nacional (conteúdo importação > 40%)" },
	{ value: "4", label: "4 - Nacional (processos produtivos básicos)" },
	{ value: "5", label: "5 - Nacional (conteúdo importação <= 40%)" },
	{ value: "6", label: "6 - Estrangeira (importação direta, sem similar)" },
	{ value: "7", label: "7 - Estrangeira (adquirida no mercado interno, sem similar)" },
	{ value: "8", label: "8 - Nacional (conteúdo importação > 70%)" },
];

interface ModalItemEmissaoProps {
	open: boolean;
	onClose: () => void;
	onConfirmar: (item: ItemNfe) => void;
	idempresa: string;
	crt?: number | null;
	itemParaEditar?: ItemNfe | null;
	cfopSaidaPadrao?: string;
	cfopOpcoes?: { value: string; label: string }[];
	cfopsReferencia?: Array<{ id: string; codigo: string }>;
	ufEmpresa?: string | null;
	devolucaoCompra?: boolean;
}

const ITEM_NOVO: ItemNfe = {
	descricao: "",
	ncm: "",
	cfop: "",
	unidade: "UN",
	quantidade: 1,
	valorUnitario: 0,
	orig: 0,
};

const CFOP_COMUNS = [
	{ value: "5102", label: "5102 — Venda de mercadoria adquirida ou recebida de terceiros (dentro do estado)" },
	{ value: "5405", label: "5405 — Venda de mercadoria com ST (dentro do estado)" },
	{ value: "5101", label: "5101 — Venda de produto industrializado (dentro do estado)" },
	{ value: "6102", label: "6102 — Venda de mercadoria adquirida ou recebida de terceiros (fora do estado)" },
	{ value: "6101", label: "6101 — Venda de produto industrializado (fora do estado)" },
	{ value: "6403", label: "6403 — Venda de mercadoria com ST (fora do estado)" },
];

const formatarMoeda = (v: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(v);

export function ModalItemEmissao({
	open,
	onClose,
	onConfirmar,
	idempresa,
	crt,
	itemParaEditar,
	cfopSaidaPadrao = "",
	cfopOpcoes = CFOP_COMUNS,
	cfopsReferencia = [],
	ufEmpresa,
	devolucaoCompra = false,
}: ModalItemEmissaoProps) {
	const searchRef = useRef<HTMLInputElement>(null);
	const [busca, setBusca] = useState("");
	const [buscaDebounced, setBuscaDebounced] = useState("");
	const [item, setItem] = useState<ItemNfe>({ ...ITEM_NOVO });
	const [carregandoProduto, setCarregandoProduto] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setBuscaDebounced(busca), 300);
		return () => window.clearTimeout(timer);
	}, [busca]);

	const { data: produtosData, isFetching: buscandoProdutos } = useQuery({
		queryKey: ["produtos-emissao-busca", idempresa, buscaDebounced],
		queryFn: () =>
			produtosService.listar({
				idempresa,
				q: buscaDebounced.trim() || undefined,
				page: 1,
				limit: 20,
				inativo: 0,
			}),
		enabled: !!idempresa && open,
	});

	const produtos = produtosData?.data ?? [];

	const usaCsosn = empresaUsaCsosn(crt);

	const idCfopReferencia = useMemo(() => {
		const codigo = cfopSaidaPadrao || item.cfop;
		if (!codigo) return undefined;
		return cfopsReferencia.find((cfop) => cfop.codigo === codigo)?.id;
	}, [cfopSaidaPadrao, item.cfop, cfopsReferencia]);

	const cfopOpcoesUnicas = useMemo(() => {
		const porCodigo = new Map<string, { value: string; label: string }>();
		for (const opcao of cfopOpcoes) {
			if (!opcao.value || porCodigo.has(opcao.value)) continue;
			porCodigo.set(opcao.value, opcao);
		}
		return Array.from(porCodigo.values());
	}, [cfopOpcoes]);

	useEffect(() => {
		if (open) {
			if (itemParaEditar) {
				const itemNormalizado = prepararItemEmissaoFormulario(
					itemParaEditar,
					usaCsosn,
				);
				setItem(itemNormalizado);
				setBusca(itemNormalizado.descricao ?? "");
			} else {
				setItem({ ...ITEM_NOVO, cfop: cfopSaidaPadrao });
				setBusca("");
			}
			setTimeout(() => searchRef.current?.focus(), 100);
		}
	}, [open, itemParaEditar, cfopSaidaPadrao, usaCsosn]);

	async function selecionarProduto(idproduto: string) {
		setCarregandoProduto(true);
		try {
			const produto = await produtosService.buscar(idproduto);
			const cfop = cfopSaidaPadrao || item.cfop;
			let itemMapeado = mapearProdutoParaItemNfe(produto, cfop, usaCsosn);

			if (!itemMapeado.cst && !itemMapeado.csosn && idCfopReferencia) {
				try {
					const tributacaoCfop = await produtosService.tributacaoPorCfop(
						idempresa,
						idCfopReferencia,
					);
					itemMapeado = {
						...itemMapeado,
						...mapearTributacaoCfopParaItem(tributacaoCfop, usaCsosn),
					};
				} catch {
					// Mantém item sem tributação quando não houver padrão do CFOP.
				}
			}

			itemMapeado = {
				...itemMapeado,
				...normalizarTributacaoItemFormulario(itemMapeado, usaCsosn),
			};

			if (produto.idtaxauf && ufEmpresa && !usaCsosn) {
				try {
					const taxa = await taxaUfService.buscar(produto.idtaxauf, idempresa);
					const valorProduto =
						(itemMapeado.quantidade || 0) * (itemMapeado.valorUnitario || 0);
					const icmsTaxa = resolverIcmsItemDeTaxaUf(
						taxa,
						ufEmpresa,
						valorProduto,
					);
					itemMapeado = {
						...itemMapeado,
						...icmsTaxa,
						...(icmsTaxa.aliquotaIcms != null
							? {
									valorIcms:
										Math.round(
											(icmsTaxa.baseIcms * icmsTaxa.aliquotaIcms) / 100 * 100,
										) / 100,
								}
							: {}),
					};
				} catch {
					// Mantém ICMS manual quando a taxa UF não estiver disponível.
				}
			}

			setBusca(produto.nome);
			setItem(itemMapeado);
		} catch {
			toast.error("Não foi possível carregar os dados fiscais do produto.");
		} finally {
			setCarregandoProduto(false);
		}
	}

	function atualizarCampo<K extends keyof ItemNfe>(campo: K, valor: ItemNfe[K]) {
		setItem((prev) => ({ ...prev, [campo]: valor }));
	}

	const totalItem = (item.quantidade || 0) * (item.valorUnitario || 0);

	function handleConfirmar() {
		const tributacao = normalizarTributacaoItemFormulario(item, usaCsosn);
		const gtin = normalizarGtinItemFormulario({ ...item, ...tributacao });
		const itemFinal = { ...item, ...tributacao, ...gtin };

		if (itemFinal.baseIcms == null) {
			itemFinal.baseIcms = totalItem;
		}
		if (itemFinal.valorIcms == null && itemFinal.aliquotaIcms != null) {
			itemFinal.valorIcms =
				Math.round(
					((itemFinal.baseIcms ?? totalItem) * itemFinal.aliquotaIcms) / 100 *
						100,
				) / 100;
		}

		onConfirmar(itemFinal);
		onClose();
	}

	const podeConfirmar = itemEmissaoPodeSerConfirmado(item, usaCsosn);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-visible">
				<DialogHeader>
					<DialogTitle>
						{itemParaEditar ? "Editar item" : "Adicionar item"}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Busca de produto */}
					<div className="space-y-1">
						<span className="text-sm font-medium text-muted-foreground block">
							Produto
						</span>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								ref={searchRef}
								className="pl-9"
								placeholder="Buscar por nome, código ou código de barras..."
								value={busca}
								onChange={(e) => {
									setBusca(e.target.value);
									if (e.target.value !== item.descricao) {
										setItem((prev) => ({
											...prev,
											idproduto: undefined,
											descricao: e.target.value,
										}));
									}
								}}
							/>
						</div>

						{/* Lista de sugestões */}
						{carregandoProduto && (
							<p className="text-xs text-muted-foreground flex items-center gap-2 px-1">
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
								Carregando tributação do produto...
							</p>
						)}

						{busca.length > 0 &&
							!item.idproduto &&
							!carregandoProduto &&
							produtos.length > 0 && (
							<div className="rounded-md border bg-popover text-popover-foreground shadow-md max-h-40 overflow-y-auto">
								{produtos.map((p) => (
									<button
										key={p.id}
										type="button"
										className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-3"
										onClick={() => selecionarProduto(p.id)}
									>
										<span className="font-medium truncate">{p.nome}</span>
										<span className="text-muted-foreground text-xs shrink-0">
											{p.preco
												? formatarMoeda(parseFloat(p.preco))
												: "—"}
										</span>
									</button>
								))}
							</div>
						)}

						{busca.length > 0 &&
							!item.idproduto &&
							!carregandoProduto &&
							!buscandoProdutos &&
							produtos.length === 0 && (
								<p className="text-xs text-muted-foreground px-1">
									Nenhum produto encontrado.
								</p>
							)}
					</div>

					{/* Campos do item */}
					<div className="grid grid-cols-3 gap-3">
						<div className="space-y-1">
							<span className="text-sm font-medium text-muted-foreground block">
								Quantidade
							</span>
							<Input
								type="number"
								min="0.001"
								step="0.001"
								value={item.quantidade}
								onChange={(e) =>
									atualizarCampo("quantidade", parseFloat(e.target.value) || 0)
								}
							/>
						</div>

						<div className="space-y-1">
							<span className="text-sm font-medium text-muted-foreground block">
								Unidade
							</span>
							<Input
								value={item.unidade}
								maxLength={6}
								onChange={(e) =>
									atualizarCampo("unidade", e.target.value.toUpperCase())
								}
							/>
						</div>

						<div className="space-y-1">
							<span className="text-sm font-medium text-muted-foreground block">
								Vlr Unitário
							</span>
							<MoneyInput
								value={String(item.valorUnitario ?? 0)}
								onChange={(v) =>
									atualizarCampo("valorUnitario", v ? parseFloat(v) : 0)
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-3">
						<div className="space-y-1">
							<span className="text-sm font-medium text-muted-foreground block">
								GTIN / Código de barras (cEAN)
							</span>
							<Input
								value={item.ean ?? ""}
								maxLength={14}
								placeholder="Vazio = SEM GTIN"
								onChange={(e) => {
									const valor = e.target.value.replace(/\D/g, "");
									setItem((prev) => ({
										...prev,
										ean: valor || undefined,
										eanTributavel:
											valor ? prev.eanTributavel || valor : undefined,
									}));
								}}
							/>
						</div>
						<div className="space-y-1">
							<span className="text-sm font-medium text-muted-foreground block">
								GTIN da unidade tributável (cEANTrib)
							</span>
							<Input
								value={item.eanTributavel ?? ""}
								maxLength={14}
								placeholder={
									item.ean
										? "Igual ao GTIN se não informado"
										: "Informe o GTIN acima primeiro"
								}
								disabled={!item.ean}
								onChange={(e) => {
									const valor = e.target.value.replace(/\D/g, "");
									atualizarCampo("eanTributavel", valor || undefined);
								}}
							/>
							<p className="text-xs text-muted-foreground">
								Obrigatório quando houver GTIN comercial. Deixe ambos vazios se o
								produto não tiver código de barras.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1 min-w-0">
							<span className="text-sm font-medium text-muted-foreground block">
								NCM
							</span>
							<Input
								value={item.ncm}
								maxLength={10}
								placeholder="00000000"
								onChange={(e) =>
									atualizarCampo("ncm", e.target.value.replace(/\D/g, ""))
								}
							/>
						</div>

						<div className="space-y-1 min-w-0">
							<span className="text-sm font-medium text-muted-foreground block">
								CFOP
							</span>
							<Combobox
								options={cfopOpcoesUnicas}
								value={item.cfop || undefined}
								onChange={(v) => atualizarCampo("cfop", v)}
								placeholder="Selecionar CFOP..."
								searchPlaceholder="Buscar CFOP..."
								emptyMessage="Nenhum CFOP encontrado."
								className="w-full"
							/>
						</div>
					</div>

					<div className="rounded-lg border bg-muted/30 p-3 space-y-3">
						<p className="text-sm font-medium">
							Tributação do item
							{usaCsosn && (
								<span className="ml-2 text-xs font-normal text-muted-foreground">
									Simples Nacional — use CSOSN
								</span>
							)}
						</p>

						<div className="space-y-3">
							<div className="space-y-1">
								<span className="text-sm font-medium text-muted-foreground block">
									Origem
								</span>
								<Select
									value={String(item.orig ?? 0)}
									onValueChange={(v) => atualizarCampo("orig", Number(v))}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{OPCOES_ORIGEM.map((opcao) => (
											<SelectItem key={opcao.value} value={opcao.value}>
												{opcao.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1">
								<span className="text-sm font-medium text-muted-foreground block">
									{usaCsosn ? "CSOSN" : "CST ICMS"}
								</span>
								{usaCsosn ? (
									<Select
										value={item.csosn ?? "102"}
										onValueChange={(v) =>
											setItem((prev) => ({
												...prev,
												csosn: v,
												cst: undefined,
											}))
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Selecione o CSOSN" />
										</SelectTrigger>
										<SelectContent>
											{OPCOES_CSOSN.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<Select
										value={item.cst ?? "00"}
										onValueChange={(v) =>
											setItem((prev) => ({
												...prev,
												cst: v,
												csosn: undefined,
											}))
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Selecione o CST" />
										</SelectTrigger>
										<SelectContent>
											{OPCOES_CST_ICMS.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="space-y-1">
									<span className="text-sm font-medium text-muted-foreground block">
										CST PIS
									</span>
									<Select
										value={item.cstPis ?? "07"}
										onValueChange={(v) => atualizarCampo("cstPis", v)}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{OPCOES_CST_PIS_COFINS.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-1">
									<span className="text-sm font-medium text-muted-foreground block">
										CST COFINS
									</span>
									<Select
										value={item.cstCofins ?? "07"}
										onValueChange={(v) => atualizarCampo("cstCofins", v)}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{OPCOES_CST_PIS_COFINS.map((opcao) => (
												<SelectItem key={opcao.value} value={opcao.value}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						{!usaCsosn && (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="space-y-1">
									<span className="text-sm font-medium text-muted-foreground block">
										Alíquota ICMS (%)
									</span>
									<Input
										type="number"
										min="0"
										step="0.01"
										value={item.aliquotaIcms ?? ""}
										onChange={(e) => {
											const aliquota = e.target.value
												? parseFloat(e.target.value)
												: undefined;
											const base = item.baseIcms ?? totalItem;
											const valorIcms =
												aliquota !== undefined
													? Math.round(((base * aliquota) / 100) * 100) / 100
													: undefined;
											setItem((prev) => ({
												...prev,
												aliquotaIcms: aliquota,
												valorIcms,
											}));
										}}
									/>
									<p className="text-xs text-muted-foreground">
										Altera a alíquota e sugere o valor do ICMS. Você pode
										ajustar base e valor na seção abaixo.
									</p>
								</div>
							</div>
						)}
					</div>

					<Collapsible className="rounded-lg border bg-muted/20">
						<CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-muted/40 transition-colors">
							Impostos do item (ICMS, IPI, ST, FCP)
							<ChevronDown className="h-4 w-4 text-muted-foreground" />
						</CollapsibleTrigger>
						<CollapsibleContent className="px-3 pb-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
								{(
									[
										["baseIcms", "Base de cálculo ICMS (R$)"],
										["valorIcms", "Valor ICMS (R$)"],
										["valorIpi", "Valor IPI (R$)"],
										...(devolucaoCompra
											? ([["valorIpiDevol", "IPI Devolvido (R$)"]] as const)
											: []),
										["baseIcmsSt", "Base ICMS ST (R$)"],
										["valorIcmsSt", "Valor ICMS ST (R$)"],
										["valorFcpSt", "Valor FCP ST (R$)"],
										["valorFcpStRet", "FCP ST Retido (R$)"],
										["valorIcmsDesonerado", "ICMS Desonerado (R$)"],
										["valorIcmsMonoRet", "ICMS mono ret. (R$)"],
										["valorIcmsMonoReten", "ICMS mono reten. (R$)"],
									] as const
								).map(([campo, label]) => (
									<div key={campo} className="space-y-1">
										<span className="text-sm font-medium text-muted-foreground block">
											{label}
										</span>
										<MoneyInput
											value={String(
												campo === "baseIcms"
													? (item.baseIcms ?? totalItem)
													: (item[campo] ?? 0),
											)}
											onChange={(v) =>
												atualizarCampo(
													campo,
													v ? parseFloat(v) : undefined,
												)
											}
										/>
									</div>
								))}
							</div>
						</CollapsibleContent>
					</Collapsible>

					{/* Total */}
					<div className="rounded-lg bg-muted/50 border px-4 py-3 flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Total Item:</span>
						<span className="font-semibold text-lg">
							{formatarMoeda(totalItem)}
						</span>
					</div>
				</div>

				<DialogFooter className="gap-2">
					<Button type="button" variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={handleConfirmar}
						disabled={!podeConfirmar}
					>
						{itemParaEditar ? "Salvar alterações" : "Adicionar item"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
