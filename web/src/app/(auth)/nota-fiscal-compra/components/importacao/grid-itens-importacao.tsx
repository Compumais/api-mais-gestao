"use client";

import { IconDotsVertical, IconLink, IconLinkOff, IconPencil } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	notaFiscalService,
	type BuscarRascunhoImportacaoResponse,
	type DadosImportacaoItem,
	type NotaFiscalItemImportacao,
} from "@/services/nota-fiscal.service";
import { CelulaCfopEntradaImportacao } from "./celula-cfop-entrada-importacao";
import { LocalizarProdutoDialog } from "./localizar-produto-dialog";
import { ModalItemImportacao } from "./modal-item-importacao";

type GridItensImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	itens: NotaFiscalItemImportacao[];
};

function statusCor(item: NotaFiscalItemImportacao): string {
	const status = item.dadosimportacao?.statusVinculo;
	if (status === "vinculado") return "bg-green-50 dark:bg-green-950/20";
	if (status === "novo") {
		return "bg-yellow-50 dark:bg-yellow-950/20";
	}
	return "bg-red-50 dark:bg-red-950/20";
}

function statusBadge(item: NotaFiscalItemImportacao) {
	const dados = item.dadosimportacao;
	if (!dados) return <Badge variant="destructive">Sem dados</Badge>;
	if (dados.statusVinculo === "vinculado") {
		return <Badge className="bg-green-600">Vinculado</Badge>;
	}
	if (dados.statusVinculo === "novo") {
		return <Badge variant="secondary">Novo</Badge>;
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
					<p className="text-xs text-muted-foreground">
						Cód. {dados.produtoEncontrado.codigo}
					</p>
				) : null}
			</div>
		);
	}

	if (dados.statusVinculo === "novo") {
		return (
			<span className="text-sm font-medium text-amber-700 dark:text-amber-400">
				Cadastrar na finalização
			</span>
		);
	}

	return (
		<span className="text-sm italic text-muted-foreground">Não vinculado</span>
	);
}

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "-";
	const num = parseFloat(value);
	if (Number.isNaN(num)) return value;
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
};

export function GridItensImportacao({
	idempresa,
	idRascunho,
	itens,
}: GridItensImportacaoProps) {
	const queryClient = useQueryClient();
	const [itemLocalizar, setItemLocalizar] =
		useState<NotaFiscalItemImportacao | null>(null);
	const [itemModal, setItemModal] = useState<NotaFiscalItemImportacao | null>(
		null,
	);

	const { mutate: atualizarItem, isPending } = useMutation({
		mutationFn: (params: {
			idItem: string;
			dados: Parameters<
				typeof notaFiscalService.atualizarItemRascunhoImportacao
			>[2];
		}) =>
			notaFiscalService.atualizarItemRascunhoImportacao(
				idRascunho,
				params.idItem,
				params.dados,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const marcarCadastro = (item: NotaFiscalItemImportacao) => {
		atualizarItem(
			{
				idItem: item.id,
				dados: {
					idempresa,
					statusVinculo: "novo",
				},
			},
			{
				onSuccess: () =>
					toast.success("Produto marcado para cadastro na finalização"),
			},
		);
	};

	const desvincular = (item: NotaFiscalItemImportacao) => {
		atualizarItem(
			{
				idItem: item.id,
				dados: {
					idempresa,
					statusVinculo: "pendente",
				},
			},
			{
				onSuccess: () => toast.success("Vínculo removido"),
			},
		);
	};

	const atualizarCfop = (
		item: NotaFiscalItemImportacao,
		idcfop: string,
		codigo?: string,
	) => {
		atualizarItem({
			idItem: item.id,
			dados: {
				idempresa,
				idcfop: idcfop || undefined,
				cfopXml: codigo ?? item.dadosimportacao?.cfopXml,
			},
		});
	};

	return (
		<>
			<div className="overflow-x-auto rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10">#</TableHead>
							<TableHead>Produto (fornecedor)</TableHead>
							<TableHead>Produto estoque</TableHead>
							<TableHead>CFOP entrada</TableHead>
							<TableHead className="hidden md:table-cell">NCM</TableHead>
							<TableHead>Qtd</TableHead>
							<TableHead>Unit.</TableHead>
							<TableHead className="hidden sm:table-cell">Total</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="min-w-[180px] text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{itens.map((item) => {
							const dados = item.dadosimportacao;
							if (!dados) {
								return (
									<TableRow key={item.id}>
										<TableCell>{item.contador}</TableCell>
										<TableCell colSpan={9}>
											<span className="text-destructive text-sm">
												Sem dados de importação
											</span>
										</TableCell>
									</TableRow>
								);
							}

							const pendente = dados.statusVinculo === "pendente";
							const mostrarDesvincular = podeDesvincular(dados);

							return (
								<TableRow key={item.id} className={statusCor(item)}>
									<TableCell className="text-muted-foreground text-xs">
										{item.contador}
									</TableCell>
									<TableCell>
										<div className="min-w-[160px] max-w-[260px] space-y-0.5">
											<p className="truncate text-sm font-medium">
												{dados.descricaoFornecedor ?? item.descricao}
											</p>
											<div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
												{dados.codigoFornecedor ? (
													<span>Cód. {dados.codigoFornecedor}</span>
												) : null}
												{dados.eanXml ? (
													<span className="font-mono">EAN {dados.eanXml}</span>
												) : null}
											</div>
										</div>
									</TableCell>
									<TableCell>{exibirProdutoCadastro(dados)}</TableCell>
									<TableCell>
										<CelulaCfopEntradaImportacao
											idempresa={idempresa}
											idcfop={dados.idcfop}
											cfopXml={dados.cfopXml ?? item.cfop ?? undefined}
											disabled={isPending}
											onChange={(idcfop, codigo) =>
												atualizarCfop(item, idcfop, codigo)
											}
										/>
									</TableCell>
									<TableCell className="hidden md:table-cell">
										{dados.ncmXml ?? item.ncm ?? "-"}
									</TableCell>
									<TableCell>{dados.quantidadeXml ?? item.quantidade}</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatCurrency(dados.precounitarioXml ?? item.precounitario)}
									</TableCell>
									<TableCell className="hidden whitespace-nowrap sm:table-cell">
										{formatCurrency(item.total)}
									</TableCell>
									<TableCell>{statusBadge(item)}</TableCell>
									<TableCell>
										<div className="flex items-center justify-end gap-1">
											{pendente ? (
												<>
													<Button
														type="button"
														size="sm"
														variant="default"
														disabled={isPending}
														onClick={() => setItemLocalizar(item)}
													>
														<IconLink className="mr-1 size-3.5" />
														Localizar
													</Button>
													<Button
														type="button"
														size="sm"
														variant="outline"
														disabled={isPending}
														onClick={() => marcarCadastro(item)}
													>
														Cadastrar
													</Button>
												</>
											) : (
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => setItemModal(item)}
												>
													<IconPencil className="mr-1 size-3.5" />
													Editar
												</Button>
											)}

											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="size-8 shrink-0"
														aria-label="Mais ações do item"
														disabled={isPending}
													>
														<IconDotsVertical className="size-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													{pendente ? (
														<DropdownMenuItem onClick={() => setItemModal(item)}>
															<IconPencil className="mr-2 size-4" />
															Editar detalhes
														</DropdownMenuItem>
													) : null}
													{!pendente ? (
														<DropdownMenuItem
															onClick={() => setItemLocalizar(item)}
														>
															<IconLink className="mr-2 size-4" />
															Trocar vínculo
														</DropdownMenuItem>
													) : null}
													{mostrarDesvincular ? (
														<>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																variant="destructive"
																onClick={() => desvincular(item)}
															>
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

			{itemLocalizar ? (
				<LocalizarProdutoDialog
					idempresa={idempresa}
					idRascunho={idRascunho}
					item={itemLocalizar}
					aberto={!!itemLocalizar}
					onAbertoChange={(aberto) => !aberto && setItemLocalizar(null)}
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
		</>
	);
}

export function contarPendenciasItens(
	itens: BuscarRascunhoImportacaoResponse["itens"],
): string[] {
	const pendencias: string[] = [];

	for (const item of itens) {
		const dados = item.dadosimportacao;
		if (!dados) {
			pendencias.push(`Item ${item.contador}: sem dados de importação`);
			continue;
		}
		if (dados.statusVinculo === "pendente") {
			pendencias.push(
				`Item ${item.contador}: ${dados.descricaoFornecedor} — produto pendente`,
			);
		}
	}

	return pendencias;
}
