"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	type NotaFiscalItemImportacao,
} from "@/services/nota-fiscal.service";
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

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Cód. fornec.</TableHead>
						<TableHead>Descrição fornecedor</TableHead>
						<TableHead>EAN</TableHead>
						<TableHead>Produto cadastro</TableHead>
						<TableHead>CFOP</TableHead>
						<TableHead>NCM</TableHead>
						<TableHead>Qtd</TableHead>
						<TableHead>Unit.</TableHead>
						<TableHead>Total</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Ações</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{itens.map((item) => {
						const dados = item.dadosimportacao;
						return (
							<TableRow key={item.id} className={statusCor(item)}>
								<TableCell>{dados?.codigoFornecedor ?? "-"}</TableCell>
								<TableCell className="max-w-[200px] truncate">
									{dados?.descricaoFornecedor ?? item.descricao}
								</TableCell>
								<TableCell className="font-mono text-xs">
									{dados?.eanXml ?? "-"}
								</TableCell>
								<TableCell className="max-w-[180px] truncate">
									{dados?.produtoEncontrado?.nome ??
										(dados?.statusVinculo === "novo"
											? "(cadastrar novo)"
											: "-")}
								</TableCell>
								<TableCell>{dados?.cfopXml ?? item.cfop ?? "-"}</TableCell>
								<TableCell>{dados?.ncmXml ?? item.ncm ?? "-"}</TableCell>
								<TableCell>{dados?.quantidadeXml ?? item.quantidade}</TableCell>
								<TableCell>
									{formatCurrency(dados?.precounitarioXml ?? item.precounitario)}
								</TableCell>
								<TableCell>{formatCurrency(item.total)}</TableCell>
								<TableCell>{statusBadge(item)}</TableCell>
								<TableCell>
									<div className="flex flex-wrap justify-end gap-1">
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => setItemLocalizar(item)}
										>
											Localizar
										</Button>
										<Button
											type="button"
											size="sm"
											variant="outline"
											disabled={isPending}
											onClick={() =>
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
															toast.success(
																"Produto marcado para cadastro na finalização",
															),
													},
												)
											}
										>
											Cadastrar
										</Button>
										<Button
											type="button"
											size="sm"
											variant="ghost"
											disabled={isPending}
											onClick={() =>
												atualizarItem({
													idItem: item.id,
													dados: {
														idempresa,
														statusVinculo: "pendente",
													},
												})
											}
										>
											Desvincular
										</Button>
										<Button
											type="button"
											size="sm"
											onClick={() => setItemModal(item)}
										>
											Editar
										</Button>
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>

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
