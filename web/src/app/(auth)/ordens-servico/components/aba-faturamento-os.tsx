"use client";

import { ExternalLink, FileText, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useGerarContasReceberOrdemServico,
	useGerarNfeRascunhoOrdemServico,
	useOrdemServicoFaturamentos,
} from "@/hooks/use-ordem-servico";
import type { OrdemServico } from "@/services/ordem-servico.service";
import { formatarDataHoraOs, formatarMoedaOs } from "@/util/ordem-servico-ui";

type AbaFaturamentoOsProps = {
	ordemServicoId: string;
	idempresa: string;
	os: OrdemServico;
	opcoesTiposDocumento: Array<{ value: string; label: string }>;
	opcoesSeriesNfe: Array<{ value: string; label: string }>;
	desabilitado?: boolean;
};

export function AbaFaturamentoOs({
	ordemServicoId,
	idempresa,
	os,
	opcoesTiposDocumento,
	opcoesSeriesNfe,
	desabilitado = false,
}: AbaFaturamentoOsProps) {
	const { data: faturamentos = [], isLoading } = useOrdemServicoFaturamentos(
		ordemServicoId,
		idempresa,
	);
	const gerarCr = useGerarContasReceberOrdemServico(ordemServicoId);
	const gerarNfe = useGerarNfeRascunhoOrdemServico(ordemServicoId);

	const [modalCr, setModalCr] = useState(false);
	const [modalNfe, setModalNfe] = useState(false);
	const [idTipoDoc, setIdTipoDoc] = useState(
		os.idtipodocumentofinanceiro ?? "",
	);
	const [valorForma, setValorForma] = useState(os.valor ?? "0.00");
	const [idSerie, setIdSerie] = useState("");

	const podeGerarCr =
		!desabilitado && !!os.idcliente && parseFloat(os.valor ?? "0") > 0;
	const podeGerarNfe =
		!desabilitado && !!os.idcliente && os.faturouparanota !== 1;

	async function confirmarContasReceber() {
		try {
			const resultado = await gerarCr.mutateAsync({
				idempresa,
				formasPagamento: idTipoDoc
					? [
							{
								idtipodocumentofinanceiro: idTipoDoc,
								valor: parseFloat(String(valorForma).replace(",", ".")),
							},
						]
					: undefined,
			});
			if (resultado.parcelasGeradas === 0 && resultado.titulosExistentes > 0) {
				toast.success("Contas a receber já existentes", {
					description: `${resultado.titulosExistentes} título(s) já vinculados a esta OS.`,
				});
			} else {
				toast.success("Contas a receber geradas", {
					description: `${resultado.parcelasGeradas} parcela(s) criada(s).`,
				});
			}
			setModalCr(false);
		} catch (erro) {
			toast.error("Erro ao gerar contas a receber", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	async function confirmarNfe() {
		try {
			const resultado = await gerarNfe.mutateAsync({
				idempresa,
				idserienfe: idSerie || undefined,
			});
			toast.success("NF-e rascunho criada", {
				description:
					resultado.avisos && resultado.avisos.length > 0
						? resultado.avisos.join("; ")
						: `Status ${resultado.status}`,
			});
			setModalNfe(false);
		} catch (erro) {
			toast.error("Erro ao gerar NF-e rascunho", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 className="text-lg font-semibold">Faturamento</h2>
					<p className="text-sm text-muted-foreground">
						Valor da OS: {formatarMoedaOs(os.valor)} · Produtos:{" "}
						{formatarMoedaOs(os.valorprodutos)} · Serviços:{" "}
						{formatarMoedaOs(os.valorservicos)}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!podeGerarCr || gerarCr.isPending}
						onClick={() => {
							setIdTipoDoc(os.idtipodocumentofinanceiro ?? "");
							setValorForma(os.valor ?? "0.00");
							setModalCr(true);
						}}
					>
						<Wallet className="h-4 w-4" />
						Gerar contas a receber
					</Button>
					<Button
						type="button"
						size="sm"
						disabled={!podeGerarNfe || gerarNfe.isPending}
						onClick={() => setModalNfe(true)}
					>
						<FileText className="h-4 w-4" />
						Gerar NF-e rascunho
					</Button>
				</div>
			</div>

			{(os.geroufinanceiro === 1 || os.faturouparanota === 1) && (
				<div
					className="rounded-md border bg-muted/40 p-3 text-sm"
					aria-live="polite"
				>
					{os.geroufinanceiro === 1 && <p>Financeiro gerado para esta OS.</p>}
					{os.faturouparanota === 1 && os.iddocumentofiscal && (
						<p>
							NF-e vinculada:{" "}
							<Link
								href={`/nota-fiscal-venda/${os.iddocumentofiscal}`}
								className="underline underline-offset-2"
							>
								abrir documento
							</Link>
						</p>
					)}
				</div>
			)}

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Tipo</TableHead>
							<TableHead>Referência</TableHead>
							<TableHead>Criado em</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="text-center text-muted-foreground"
								>
									Carregando vínculos...
								</TableCell>
							</TableRow>
						) : faturamentos.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="text-center text-muted-foreground"
								>
									Nenhum vínculo de faturamento.
								</TableCell>
							</TableRow>
						) : (
							faturamentos.map((item) => (
								<TableRow key={item.id}>
									<TableCell>
										{item.idnotafiscal
											? "NF-e"
											: item.idfaturamento
												? "Conta a receber"
												: item.iddavos
													? "DAV"
													: "Vínculo"}
									</TableCell>
									<TableCell className="font-mono text-xs">
										{item.idnotafiscal ??
											item.idfaturamento ??
											item.iddavos ??
											"—"}
									</TableCell>
									<TableCell>{formatarDataHoraOs(item.datacriacao)}</TableCell>
									<TableCell className="text-right">
										{item.idnotafiscal && (
											<Button variant="ghost" size="sm" asChild>
												<Link href={`/nota-fiscal-venda/${item.idnotafiscal}`}>
													<ExternalLink className="h-4 w-4" />
													Abrir NF-e
												</Link>
											</Button>
										)}
										{item.idfaturamento && (
											<Button variant="ghost" size="sm" asChild>
												<Link href={`/contas-receber/${item.idfaturamento}`}>
													<ExternalLink className="h-4 w-4" />
													Abrir título
												</Link>
											</Button>
										)}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<Dialog open={modalCr} onOpenChange={setModalCr}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Gerar contas a receber</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							A geração é idempotente: se já existirem títulos da OS, eles serão
							reutilizados.
						</p>
						<Field>
							<FieldLabel>Tipo de documento (opcional)</FieldLabel>
							<Combobox
								options={opcoesTiposDocumento}
								value={idTipoDoc}
								onChange={setIdTipoDoc}
								placeholder="Usar da OS / condição"
								searchPlaceholder="Buscar..."
								emptyMessage="Nenhum tipo encontrado."
							/>
						</Field>
						{idTipoDoc && (
							<Field>
								<FieldLabel>Valor</FieldLabel>
								<MoneyInput value={valorForma} onChange={setValorForma} />
							</Field>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setModalCr(false)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							onClick={() => void confirmarContasReceber()}
							disabled={gerarCr.isPending}
						>
							{gerarCr.isPending ? "Gerando..." : "Confirmar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={modalNfe} onOpenChange={setModalNfe}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Gerar NF-e rascunho</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Cria NF-e modelo 55 com status pendente (90), sem transmitir à
							SEFAZ. Itens de serviço não entram na NF-e.
						</p>
						<Field>
							<FieldLabel>Série NF-e (opcional)</FieldLabel>
							<Combobox
								options={opcoesSeriesNfe}
								value={idSerie}
								onChange={setIdSerie}
								placeholder="Padrão da empresa"
								searchPlaceholder="Buscar série..."
								emptyMessage="Nenhuma série encontrada."
							/>
						</Field>
						{!opcoesSeriesNfe.length && (
							<p className="text-xs text-muted-foreground">
								Nenhuma série listada; a API usará a configuração padrão.
							</p>
						)}
						<Input type="hidden" value={idSerie} readOnly aria-hidden />
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setModalNfe(false)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							onClick={() => void confirmarNfe()}
							disabled={gerarNfe.isPending}
						>
							{gerarNfe.isPending ? "Gerando..." : "Confirmar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
