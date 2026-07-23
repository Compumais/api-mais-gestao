"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import type {
	FornecedorSugeridoImportacao,
	NotaFiscal,
} from "@/services/nota-fiscal.service";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import { CampoCfopImportacao } from "./campo-cfop-importacao";

type CabecalhoNfImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	nota: NotaFiscal;
	fornecedor: FornecedorSugeridoImportacao;
	quantidadeItens?: number;
	cfopXmlOperacao?: string | undefined;
	natOpXml?: string | undefined;
	finNFe?: number | undefined;
	ipiDevolvidoXml?: string | undefined;
};

const formatDate = (date: string | null | undefined) => {
	if (!date) return "-";
	return new Date(date).toLocaleDateString("pt-BR");
};

const formatCurrency = (value: string | number | null | undefined) => {
	if (value === null || value === undefined || value === "") {
		return "-";
	}

	const num = typeof value === "number" ? value : parseFloat(String(value));
	if (Number.isNaN(num)) return String(value);

	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
};

export function CabecalhoNfImportacao({
	idempresa,
	idRascunho,
	nota,
	fornecedor,
	quantidadeItens = 0,
	cfopXmlOperacao,
	natOpXml,
	finNFe,
	ipiDevolvidoXml,
}: CabecalhoNfImportacaoProps) {
	const queryClient = useQueryClient();
	const [cfopPendente, setCfopPendente] = useState<string | null>(null);
	const [dialogAberto, setDialogAberto] = useState(false);

	const { mutate: salvarCfop, isPending } = useMutation({
		mutationFn: (params: { idcfop: string; aplicarCfopItens?: boolean }) =>
			notaFiscalService.atualizarRascunhoImportacao(idRascunho, {
				idempresa,
				idcfop: params.idcfop || null,
				aplicarCfopItens: params.aplicarCfopItens,
			}),
		onSuccess: (_data, variables) => {
			toast.success(
				variables.aplicarCfopItens
					? "CFOP aplicado ao cabeçalho e aos itens"
					: "CFOP da nota atualizado",
			);
			queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
		},
		onError: (error: Error) => toast.error(error.message),
	});

	function solicitarAlteracaoCfop(idcfop: string) {
		if (isPending) return;

		if (quantidadeItens > 0 && idcfop) {
			setCfopPendente(idcfop);
			setDialogAberto(true);
			return;
		}

		salvarCfop({ idcfop });
	}

	function confirmarPropagacao(aplicar: boolean) {
		if (!cfopPendente) return;
		salvarCfop({ idcfop: cfopPendente, aplicarCfopItens: aplicar });
		setCfopPendente(null);
		setDialogAberto(false);
	}

	return (
		<section className="rounded-lg border bg-card p-4">
			<div className="flex items-center gap-2 mb-4">
				<h2 className="text-lg font-semibold">Cabeçalho da NF-e</h2>
				{finNFe === 4 && (
					<Badge variant="outline" className="border-amber-500 text-amber-700">
						Devolução
					</Badge>
				)}
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				<div className="grid gap-3 sm:grid-cols-2 text-sm">
					<div>
						<span className="text-muted-foreground">Número / Série</span>
						<p className="font-medium">
							{nota.numero ?? nota.numeronotafiscal ?? "-"} / {nota.serie ?? "-"}
						</p>
					</div>
					<div>
						<span className="text-muted-foreground">Emissão</span>
						<p className="font-medium">{formatDate(nota.emissao)}</p>
					</div>
					<div>
						<label
							htmlFor="entradasaida-rascunho"
							className="text-muted-foreground text-sm"
						>
							Data de entrada
						</label>
						<input
							id="entradasaida-rascunho"
							type="date"
							className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
							defaultValue={nota.entradasaida?.substring(0, 10) ?? ""}
							onBlur={(evento) => {
								const valor = evento.target.value;
								if (!valor || valor === nota.entradasaida?.substring(0, 10)) {
									return;
								}
								void notaFiscalService
									.atualizarRascunhoImportacao(idRascunho, {
										idempresa,
										entradasaida: valor,
									})
									.then(() => {
										toast.success("Data de entrada atualizada");
										void queryClient.invalidateQueries({
											queryKey: ["rascunho-importacao-nf", idRascunho],
										});
									})
									.catch((erro: Error) => toast.error(erro.message));
							}}
						/>
					</div>
					<div className="sm:col-span-2">
						<span className="text-muted-foreground">Chave NF-e</span>
						<p className="font-medium break-all text-xs">{nota.chavenfe ?? "-"}</p>
					</div>
					<div>
						<span className="text-muted-foreground">Fornecedor (XML)</span>
						<p className="font-medium">{nota.razaosocial ?? "-"}</p>
						<p className="text-xs text-muted-foreground">
							CNPJ: {nota.cnpjemissor ?? fornecedor.cnpj ?? "-"}
						</p>
					</div>
					<div>
						<span className="text-muted-foreground">Vínculo fornecedor</span>
						<p>
							{fornecedor.encontrado ? (
								<Badge className="bg-green-600">Cadastrado</Badge>
							) : (
								<Badge variant="destructive">Não vinculado</Badge>
							)}
						</p>
					</div>
					<div>
						<span className="text-muted-foreground">Valor total</span>
						<p className="font-medium">{formatCurrency(nota.valortotalnota)}</p>
					</div>
					<div>
						<span className="text-muted-foreground">Total produtos</span>
						<p className="font-medium">{formatCurrency(nota.totalproduto)}</p>
					</div>
					{natOpXml && (
						<div className="sm:col-span-2">
							<span className="text-muted-foreground">Natureza da operação (XML)</span>
							<p className="font-medium">{natOpXml}</p>
						</div>
					)}
					{cfopXmlOperacao ? (
						<div className="sm:col-span-2">
							<span className="text-muted-foreground">CFOP do XML (emitente)</span>
							<p className="font-mono text-sm">{cfopXmlOperacao}</p>
							<p className="text-xs text-muted-foreground">
								Referência histórica — selecione o CFOP de entrada da operação ao lado.
							</p>
						</div>
					) : null}
				</div>

				<div className="flex flex-col gap-4">
					<CampoCfopImportacao
						id="idcfop-nota"
						label="CFOP de entrada da operação"
						value={nota.idcfop ?? undefined}
						onChange={(idcfop) => {
							solicitarAlteracaoCfop(idcfop);
						}}
					/>

					<div className="rounded-md border p-3">
						<h3 className="text-sm font-semibold mb-2">Tributos da nota (XML)</h3>
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div>
								<span className="text-muted-foreground">Base ICMS</span>
								<p>{formatCurrency(nota.baseicms)}</p>
							</div>
							<div>
								<span className="text-muted-foreground">ICMS</span>
								<p>{formatCurrency(nota.icms)}</p>
							</div>
							<div>
								<span className="text-muted-foreground">IPI</span>
								<p>{formatCurrency(nota.ipi)}</p>
							</div>
							{(ipiDevolvidoXml || nota.dadosimportacao?.ipiDevolvidoXml) && (
								<div>
									<span className="text-muted-foreground">IPI Devolvido</span>
									<p>
										{formatCurrency(
											ipiDevolvidoXml ??
												nota.dadosimportacao?.ipiDevolvidoXml,
										)}
									</p>
								</div>
							)}
							<div>
								<span className="text-muted-foreground">PIS</span>
								<p>{formatCurrency(nota.pis)}</p>
							</div>
							<div>
								<span className="text-muted-foreground">COFINS</span>
								<p>{formatCurrency(nota.cofins)}</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<AlertDialog
				open={dialogAberto}
				onOpenChange={(aberto) => {
					setDialogAberto(aberto);
					if (!aberto) setCfopPendente(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Aplicar este CFOP de entrada a todos os itens?
						</AlertDialogTitle>
						<AlertDialogDescription>
							O CFOP do cabeçalho será gravado na nota
							{quantidadeItens > 0
								? `. Deseja também atualizar os ${quantidadeItens} itens?`
								: "."}{" "}
							O CFOP do XML do fornecedor permanece apenas como histórico.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							disabled={isPending}
							onClick={() => confirmarPropagacao(false)}
						>
							Não, só o cabeçalho
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={isPending}
							onClick={() => confirmarPropagacao(true)}
						>
							Sim, aplicar a todos
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
