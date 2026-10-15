"use client";

import {
	IconCalculator,
	IconDotsVertical,
	IconLink,
	IconLinkOff,
	IconPencil,
	IconPlus,
	IconAlertCircle,
	IconCheck,
	IconLinkExternal,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type BuscarRascunhoImportacaoResponse,
	type DadosImportacaoItem,
	type NotaFiscalItemImportacao,
	notaFiscalService,
} from "@/services/nota-fiscal.service";
import { listarPendenciasCamposImportacao } from "@/util/pendencias-finalizacao-importacao-nf";
import { CelulaCfopEntradaImportacao } from "./celula-cfop-entrada-importacao";
import { CelulaFatorConversaoImportacao } from "./celula-fator-conversao-importacao";
import { DialogCadastrarEmMassaImportacao } from "./dialog-cadastrar-em-massa-importacao";
import { LocalizarProdutoDialog } from "./localizar-produto-dialog";
import { ModalComposicaoPrecoImportacao } from "./modal-composicao-preco-importacao";
import { ModalItemImportacao } from "./modal-item-importacao";

type GridItensImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	itens: NotaFiscalItemImportacao[];
	idgrupoPadrao?: string | null;
};

function statusCor(item: NotaFiscalItemImportacao): string {
	const dados = item.dadosimportacao;
	if (!dados) return "bg-red-50 dark:bg-red-950/20";
	if (dados.statusVinculo === "pendente") return "bg-red-50 dark:bg-red-950/20";
	const pendencias = listarPendenciasCamposImportacao([item]);
	if (pendencias.length > 0) return "bg-yellow-50 dark:bg-yellow-950/20";
	if (dados.statusVinculo === "vinculado") return "bg-green-50 dark:bg-green-950/20";
	if (dados.statusVinculo === "novo") return "bg-yellow-50 dark:bg-yellow-950/20";
	return "";
}

function statusBadge(item: NotaFiscalItemImportacao) {
	const dados = item.dadosimportacao;
	if (!dados) return <Badge variant="destructive">Sem dados</Badge>;
	const pendencias = listarPendenciasCamposImportacao([item]);
	const temPendencia = pendencias.length > 0;

	if (dados.statusVinculo === "pendente") {
		return (
			<Badge variant="destructive" className="flex gap-1">
				<IconAlertCircle className="size-3" />
				Pendente
			</Badge>
		);
	}
	if (dados.statusVinculo === "vinculado") {
		return temPendencia ? (
			<Badge variant="outline" className="border-amber-500 text-amber-600 flex gap-1">
				<IconAlertCircle className="size-3" />
				Ajustar Vínculo
			</Badge>
		) : (
			<Badge className="bg-green-600 flex gap-1">
				<IconCheck className="size-3" />
				Vinculado
			</Badge>
		);
	}
	if (dados.statusVinculo === "novo") {
		return temPendencia ? (
			<Badge variant="outline" className="border-amber-500 text-amber-600 flex gap-1">
				<IconAlertCircle className="size-3" />
				Ajustar Cadastro
			</Badge>
		) : (
			<Badge variant="secondary" className="flex gap-1">
				<IconCheck className="size-3" />
				Novo
			</Badge>
		);
	}
	return <Badge variant="destructive">Pendente</Badge>;
}

function podeDesvincular(dados: DadosImportacaoItem): boolean {
	return Boolean(dados.idproduto) || dados.statusVinculo === "vinculado";
}

function exibirProdutoCadastro(dados: DadosImportacaoItem) {
	if (dados.produtoEncontrado) {
		return (
			<div className="min-w-[140px] max-w-[220px]">
				<p className="truncate text-sm font-medium">{dados.produtoEncontrado.nome}</p>
				{dados.produtoEncontrado.codigo != null ? (
					<p className="text-xs text-muted-foreground">Cód. {dados.produtoEncontrado.codigo}</p>
				) : null}
			</div>
		);
	}
	if (dados.statusVinculo === "novo") {
		return (
			<div className="min-w-[140px] max-w-[220px]">
				<p className="text-sm font-medium text-amber-700 dark:text-amber-400">Cadastrar na finalização</p>
				{dados.codigoProduto != null ? (
					<p className="text-xs text-muted-foreground">Cód. {dados.codigoProduto}</p>
				) : null}
			</div>
		);
	}
	return <span className="text-sm italic text-muted-foreground">Não vinculado</span>;
}

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "-";
	const num = parseFloat(value);
	if (Number.isNaN(num)) return value;
	return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

function listarItensPendentesCadastro(itens: NotaFiscalItemImportacao[]): NotaFiscalItemImportacao[] {
	return itens.filter((item) => item.dadosimportacao?.statusVinculo === "pendente");
}

export function GridItensImportacao({ idempresa, idRascunho, itens, idgrupoPadrao }: GridItensImportacaoProps) {
	const queryClient = useQueryClient();
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [itemLocalizar, setItemLocalizar] = useState<NotaFiscalItemImportacao | null>(null);
	const [isBulkLinking, setIsBulkLinking] = useState(false);
	const [itemModal, setItemModal] = useState<NotaFiscalItemImportacao | null>(null);
	const [itemComposicao, setItemComposicao] = useState<NotaFiscalItemImportacao | null>(null);
	const [dialogMassaAberto, setDialogMassaAberto] = useState(false);
	
	const itensPendentes = listarItensPendentesCadastro(itens);

	const { mutate: atualizarItem, isPending } = useMutation({
		mutationFn: (params: { idItem: string; dados: Parameters<typeof notaFiscalService.atualizarItemRascunhoImportacao>[2] }) =>
			notaFiscalService.atualizarItemRascunhoImportacao(idRascunho, params.idItem, params.dados),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rascunho-importacao-nf", idRascunho] }),
		onError: (error: Error) => toast.error(error.message),
	});

	const alternarSelecao = (id: string) => {
		setSelectedIds((atual) => atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id]);
	};

	const selecionarTodosPendentes = () => setSelectedIds(itensPendentes.map((i) => i.id));
	const desmarcarTodos = () => setSelectedIds([]);

	const abrirVinculoMassa = () => {
		setIsBulkLinking(true);
		setItemLocalizar(null);
	};

	const marcarCadastro = (item: NotaFiscalItemImportacao) => {
		atualizarItem({ idItem: item.id, dados: { idempresa, statusVinculo: "novo" } }, {
			onSuccess: () => toast.success("Produto marcado para cadastro na finalização"),
		});
	};

	const desvincular = (item: NotaFiscalItemImportacao) => {
		atualizarItem({ idItem: item.id, dados: { idempresa, statusVinculo: "pendente" } }, {
			onSuccess: () => toast.success("Vínculo removido"),
		});
	};

	const atualizarCfop = (item: NotaFiscalItemImportacao, idcfop: string) => {
		atualizarItem({ idItem: item.id, dados: { idempresa, idcfop: idcfop || undefined } });
	};

	return (
		<>
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Checkbox
						id="selecionar-todos-pendentes"
						checked={selectedIds.length === itensPendentes.length && itensPendentes.length > 0}
						onCheckedChange={(checked) => checked ? selecionarTodosPendentes() : desmarcarTodos()}
					/>
					<Label htmlFor="selecionar-todos-pendentes" className="text-sm text-muted-foreground">
						Selecionar todos os pendentes
					</Label>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={selectedIds.length === 0}
						onClick={abrirVinculoMassa}
					>
						<IconLinkExternal className="mr-1 size-4" />
						Vincular selecionados ({selectedIds.length})
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={itensPendentes.length === 0}
						onClick={() => setDialogMassaAberto(true)}
					>
						<IconPlus className="mr-1 size-4" />
						Cadastrar pendentes
					</Button>
				</div>
			</div>
			<div className="overflow-x-auto rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10">
								<Checkbox
									id="todos-itens"
									checked={selectedIds.length === itens.length && itens.length > 0}
									onCheckedChange={(checked) => checked ? setSelectedIds(itens.map((i) => i.id)) : desmarcarTodos()}
								/>
							</TableHead>
							<TableHead className="w-10">#</TableHead>
							<TableHead>Produto (fornecedor)</TableHead>
							<TableHead>Produto estoque</TableHead>
							<TableHead>CFOP entrada</TableHead>
							<TableHead className="hidden md:table-cell">NCM</TableHead>
							<TableHead>Qtd NF</TableHead>
							<TableHead className="w-24">Fator</TableHead>
							<TableHead>Unit. estoque</TableHead>
							<TableHead className="hidden sm:table-cell">Total</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="w-14 text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{itens.map((item) => {
							const dados = item.dadosimportacao;
							if (!dados) return (
								<TableRow key={item.id}>
									<TableCell />
									<TableCell className="text-muted-foreground text-xs">{item.contador}</TableCell>
									<TableCell colSpan={10}><span className="text-destructive text-sm">Sem dados de importação</span></TableCell>
								</TableRow>
							);

							const pendente = dados.statusVinculo === "pendente";
							const mostrarDesvincular = podeDesvincular(dados);

							return (
								<TableRow key={item.id} className={statusCor(item)}>
									<TableCell>
										<Checkbox
											id={`item-sel-${item.id}`}
											checked={selectedIds.includes(item.id)}
											onCheckedChange={() => alternarSelecao(item.id)}
										/>
									</TableCell>
									<TableCell className="text-muted-foreground text-xs">{item.contador}</TableCell>
									<TableCell>
										<div className="min-w-[160px] max-w-[260px] space-y-0.5">
											<p className="truncate text-sm font-medium">{dados.descricaoFornecedor ?? item.descricao}</p>
											<div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
												{dados.codigoFornecedor ? <span>Cód. {dados.codigoFornecedor}</span> : null}
												{dados.eanXml ? <span className="font-mono">EAN {dados.eanXml}</span> : null}
											</div>
										</div>
									</TableCell>
									<TableCell>{exibirProdutoCadastro(dados)}</TableCell>
									<TableCell>
										<CelulaCfopEntradaImportacao
											idempresa={idempresa}
											idcfop={dados.idcfop}
											disabled={isPending}
											tributacao={dados.tributacao}
											onChange={(idcfop) => atualizarCfop(item, idcfop)}
										/>
									</TableCell>
									<TableCell className="hidden md:table-cell">{dados.ncmXml ?? item.ncm ?? "-"}</TableCell>
									<TableCell>{dados.quantidadeXml ?? item.quantidade}</TableCell>
									<TableCell>
										<CelulaFatorConversaoImportacao
											idempresa={idempresa}
											idRascunho={idRascunho}
											idItem={item.id}
											fatorAtual={dados.fatorConversao ?? "1"}
											disabled={isPending}
										/>
									</TableCell>
									<TableCell className="whitespace-nowrap">
										<p>{formatCurrency(dados.precounitarioEstoque ?? dados.precounitarioXml ?? item.precounitario)}</p>
										{dados.fatorConversao !== "1" ? (
											<p className="text-xs text-muted-foreground">NF: {formatCurrency(dados.precounitarioXml ?? item.precounitario)}</p>
										) : null}
									</TableCell>
									<TableCell className="hidden whitespace-nowrap sm:table-cell">{formatCurrency(item.total)}</TableCell>
									<TableCell>{statusBadge(item)}</TableCell>
									<TableCell>
										<div className="flex items-center justify-end gap-1">
											{!pendente ? (
												<Button type="button" size="sm" variant="outline" onClick={() => setItemModal(item)}>
													<IconPencil className="mr-1 size-3.5" />
													Editar
												</Button>
											) : null}
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" disabled={isPending}>
														<IconDotsVertical className="size-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={() => setItemComposicao(item)}>
														<IconCalculator className="mr-2 size-4" />
														Composição de preço
													</DropdownMenuItem>
													{pendente ? (
														<>
															<DropdownMenuItem onClick={() => setItemLocalizar(item)}>
																<IconLink className="mr-2 size-4" />
																Localizar produto
															</DropdownMenuItem>
															<DropdownMenuItem onClick={() => marcarCadastro(item)}>
																<IconPlus className="mr-2 size-4" />
																Cadastrar produto
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem onClick={() => setItemModal(item)}>
																<IconPencil className="mr-2 size-4" />
																Editar detalhes
															</DropdownMenuItem>
														</>
													) : (
														<DropdownMenuItem onClick={() => setItemLocalizar(item)}>
															<IconLink className="mr-2 size-4" />
															Trocar vínculo
														</DropdownMenuItem>
													)}
													{mostrarDesvincular ? (
														<>
															<DropdownMenuSeparator />
															<DropdownMenuItem variant="destructive" onClick={() => desvincular(item)}>
																<IconLinkOff className="mr-2 size-4" />
																Desvincular
															</DropdownMenuItem>
														</>
													) : null}
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{(itemLocalizar || isBulkLinking) ? (
				<LocalizarProdutoDialog
					idempresa={idempresa}
					idRascunho={idRascunho}
					item={itemLocalizar}
					selectedIds={selectedIds}
					aberto={!!itemLocalizar || isBulkLinking}
					onAbertoChange={(aberto) => {
						if (!aberto) {
							setItemLocalizar(null);
							setIsBulkLinking(false);
						}
					}}
				/>
			) : null}

			{itemComposicao ? (
				<ModalComposicaoPrecoImportacao
					idempresa={idempresa}
					idRascunho={idRascunho}
					item={itemComposicao}
					aberto={!!itemComposicao}
					onAbertoChange={(aberto) => !aberto && setItemComposicao(null)}
				/>
			) : null}

			{itemModal ? (
				<ModalItemImportacao
					idempresa={idempresa}
					idRascunho={idRascunho}
					item={itemModal}
					aberto={!!itemModal}
					onAbertoChange={(aberto) => !aberto && setItemModal(null)}
				/>
			) : null}

			<DialogCadastrarEmMassaImportacao
				idempresa={idempresa}
				idRascunho={idRascunho}
				itensPendentes={itensPendentes}
				idgrupoPadrao={idgrupoPadrao}
				aberto={dialogMassaAberto}
				onAbertoChange={setDialogMassaAberto}
			/>
		</>
	);
}

export function contarPendenciasItens(itens: BuscarRascunhoImportacaoResponse["itens"]): string[] {
	const pendencias: string[] = [];
	for (const item of itens) {
		const dados = item.dadosimportacao;
		if (!dados) {
			pendencias.push(`Item ${item.contador}: sem dados de importação`);
			continue;
		}
		if (dados.statusVinculo === "pendente") {
			pendencias.push(`Item ${item.contador}: ${dados.descricaoFornecedor} — produto pendente`);
		}
	}
	return pendencias;
}
