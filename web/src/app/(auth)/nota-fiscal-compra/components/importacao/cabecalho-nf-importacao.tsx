"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
	cfopXmlOperacao?: string | undefined;
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
	cfopXmlOperacao,
}: CabecalhoNfImportacaoProps) {
	const queryClient = useQueryClient();

	const { mutate: salvarCfop, isPending } = useMutation({
		mutationFn: (params: { idcfop: string }) =>
			notaFiscalService.atualizarRascunhoImportacao(idRascunho, {
				idempresa,
				idcfop: params.idcfop || null,
			}),
		onSuccess: () => {
			toast.success("CFOP da nota atualizado");
			queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
		},
		onError: (error: Error) => toast.error(error.message),
	});

	return (
		<section className="rounded-lg border bg-card p-4">
			<h2 className="text-lg font-semibold mb-4">Cabeçalho da NF-e</h2>
			<div className="grid gap-4 lg:grid-cols-2">
				<div className="grid gap-3 sm:grid-cols-2 text-sm">
					<div>
						<span className="text-muted-foreground">Número / Série</span>
						<p className="font-medium">
							{nota.numero ?? nota.numeronotafiscal ?? "-"} / {nota.serie ?? "-"}
						</p>
					</div>
					<div>
						<span className="text-muted-foreground">Emissão / Entrada</span>
						<p className="font-medium">
							{formatDate(nota.emissao)} / {formatDate(nota.entradasaida)}
						</p>
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
				</div>

				<div className="flex flex-col gap-4">
					<CampoCfopImportacao
						id="idcfop-nota"
						label="CFOP da operação"
						value={nota.idcfop ?? undefined}
						codigoXml={cfopXmlOperacao}
						onChange={(idcfop) => {
							if (!isPending) salvarCfop({ idcfop });
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
		</section>
	);
}
