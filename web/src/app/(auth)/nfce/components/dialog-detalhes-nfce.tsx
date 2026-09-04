"use client";

import { IconSparkles } from "@tabler/icons-react";
import dayjs from "dayjs";
import Link from "next/link";
import { CardErroNfe } from "@/app/(auth)/nota-fiscal-venda/components/card-erro-nfe";
import { StatusNfeBadge } from "@/app/(auth)/nota-fiscal-venda/components/status-nfe-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { NFE_AMBIENTE_LABELS } from "@/constants/nfe-status";
import { formatCurrency } from "@/lib/gourmet-utils";
import type {
	DetalhesNfce,
	InterpretacaoRejeicaoNfce,
} from "@/services/nfce.service";

export type DialogDetalhesNfceProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	carregando: boolean;
	erro: Error | null;
	detalhes: DetalhesNfce | undefined;
	interpretacao: InterpretacaoRejeicaoNfce | undefined;
	carregandoInterpretacao: boolean;
	erroInterpretacao: Error | null;
};

function formatarValor(valor: string | number | null | undefined) {
	const n = typeof valor === "number" ? valor : Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "R$ 0,00";
	return formatCurrency(n);
}

function rotuloNumero(numero: string | null, serie: string | null) {
	if (!numero) return "—";
	return serie ? `${numero}/${serie}` : numero;
}

function BlocoInterpretacaoIa({
	iaDisponivel,
	interpretacao,
	carregando,
	erro,
}: {
	iaDisponivel: boolean;
	interpretacao: InterpretacaoRejeicaoNfce | undefined;
	carregando: boolean;
	erro: Error | null;
}) {
	if (!iaDisponivel) {
		return (
			<Alert>
				<IconSparkles className="size-4" aria-hidden="true" />
				<AlertTitle>Interpretação por IA</AlertTitle>
				<AlertDescription>
					Configure a chave de IA em{" "}
					<Link
						href="/configuracoes?tab=integracao"
						className="font-medium underline underline-offset-2"
					>
						Configurações &gt; Integrações
					</Link>{" "}
					para a Atena explicar a rejeição e sugerir como corrigir.
				</AlertDescription>
			</Alert>
		);
	}

	if (carregando) {
		return (
			<p className="text-sm text-muted-foreground" aria-live="polite">
				A IA está interpretando a rejeição…
			</p>
		);
	}

	if (erro) {
		return (
			<Alert variant="destructive">
				<AlertTitle>Não foi possível interpretar</AlertTitle>
				<AlertDescription>
					{erro.message || "Falha ao consultar a IA."}
				</AlertDescription>
			</Alert>
		);
	}

	if (!interpretacao) {
		return null;
	}

	if (!interpretacao.interpretado) {
		return (
			<Alert>
				<IconSparkles className="size-4" aria-hidden="true" />
				<AlertTitle>Interpretação por IA</AlertTitle>
				<AlertDescription>
					{interpretacao.mensagem ??
						"Não foi possível gerar a interpretação desta rejeição."}
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<section className="space-y-2 rounded-lg border bg-muted/40 p-4">
			<div className="flex flex-wrap items-center gap-2">
				<h3 className="text-sm font-semibold">Como corrigir (IA)</h3>
				{interpretacao.classificacao ? (
					<span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
						{interpretacao.classificacao === "PROVAVEL"
							? "Classificação: Provável"
							: "Classificação: Indeterminada"}
					</span>
				) : null}
			</div>
			<p className="text-xs text-muted-foreground">
				Interpretação assistida com a chave de IA das integrações. Não substitui
				consulta à legislação ou ao retorno oficial da SEFAZ.
			</p>
			{interpretacao.explicacao ? (
				<p className="whitespace-pre-wrap text-sm">
					{interpretacao.explicacao}
				</p>
			) : null}
			{interpretacao.comoCorrigir ? (
				<div>
					<p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Passos no ERP
					</p>
					<p className="whitespace-pre-wrap text-sm">
						{interpretacao.comoCorrigir}
					</p>
				</div>
			) : null}
		</section>
	);
}

export function DialogDetalhesNfce({
	open,
	onOpenChange,
	carregando,
	erro,
	detalhes,
	interpretacao,
	carregandoInterpretacao,
	erroInterpretacao,
}: DialogDetalhesNfceProps) {
	const nota = detalhes?.nota;
	const dataEmissao = nota?.datahoraemissao ?? nota?.emissao;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-3xl"
				aria-describedby="detalhes-nfce-descricao"
			>
				<DialogHeader>
					<DialogTitle className="text-lg">Detalhes da NFC-e</DialogTitle>
					<DialogDescription id="detalhes-nfce-descricao">
						Itens, meios de pagamento e rejeição SEFAZ, quando houver.
					</DialogDescription>
				</DialogHeader>

				{carregando ? (
					<p className="text-sm text-muted-foreground" aria-live="polite">
						Carregando detalhes…
					</p>
				) : erro ? (
					<Alert variant="destructive">
						<AlertTitle>Erro ao carregar</AlertTitle>
						<AlertDescription>
							{erro.message ||
								"Não foi possível carregar os detalhes da NFC-e."}
						</AlertDescription>
					</Alert>
				) : detalhes && nota ? (
					<div className="space-y-5">
						<section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div>
								<p className="text-xs text-muted-foreground">Número / série</p>
								<p className="text-sm font-medium">
									{rotuloNumero(nota.numeronotafiscal, nota.serie)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Status</p>
								<StatusNfeBadge
									status={nota.status}
									cStat={detalhes.rejeicao?.cStat}
									xMotivo={detalhes.rejeicao?.xMotivo}
									size="sm"
								/>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Emissão</p>
								<p className="text-sm">
									{dataEmissao
										? dayjs(dataEmissao).format("DD/MM/YYYY HH:mm")
										: "—"}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Ambiente</p>
								<p className="text-sm">
									{nota.tipoambientenfe != null
										? (NFE_AMBIENTE_LABELS[nota.tipoambientenfe] ??
											nota.tipoambientenfe)
										: "—"}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Valor</p>
								<p className="text-sm font-medium">
									{formatarValor(nota.valortotalnota)}
								</p>
							</div>
							<div className="sm:col-span-2">
								<p className="text-xs text-muted-foreground">Chave</p>
								<p className="break-all font-mono text-xs">
									{nota.chavenfe || "—"}
								</p>
							</div>
						</section>

						<Separator />

						<section>
							<h3 className="mb-2 text-sm font-semibold">Itens</h3>
							{detalhes.itens.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Nenhum item encontrado nesta NFC-e.
								</p>
							) : (
								<div className="overflow-x-auto rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Produto</TableHead>
												<TableHead className="text-right">Qtd</TableHead>
												<TableHead className="text-right">Valor</TableHead>
												<TableHead>CFOP</TableHead>
												<TableHead>CST/CSOSN</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{detalhes.itens.map((item, index) => (
												<TableRow key={`${item.nome}-${item.codigo ?? index}`}>
													<TableCell>
														<div className="flex flex-col">
															<span>{item.nome}</span>
															{item.ncm ? (
																<span className="font-mono text-xs text-muted-foreground">
																	NCM {item.ncm}
																</span>
															) : null}
														</div>
													</TableCell>
													<TableCell className="text-right">
														{item.quantidade}
														{item.unidade ? ` ${item.unidade}` : ""}
													</TableCell>
													<TableCell className="text-right">
														{formatarValor(item.valortotal)}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{item.cfop || "—"}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{item.csosn || item.cst || "—"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</section>

						<section>
							<h3 className="mb-2 text-sm font-semibold">Meios de pagamento</h3>
							{detalhes.pagamentos.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Nenhum pagamento registrado na venda.
								</p>
							) : (
								<ul className="space-y-1 text-sm">
									{detalhes.pagamentos.map((pagamento) => (
										<li
											key={`${pagamento.meio}-${pagamento.label}`}
											className="flex justify-between gap-4"
										>
											<span>{pagamento.label}</span>
											<span>{formatarValor(pagamento.valor)}</span>
										</li>
									))}
									{detalhes.troco > 0 ? (
										<li className="flex justify-between gap-4 text-muted-foreground">
											<span>Troco</span>
											<span>{formatarValor(detalhes.troco)}</span>
										</li>
									) : null}
								</ul>
							)}
						</section>

						{detalhes.rejeicao ? (
							<section className="space-y-3">
								<CardErroNfe
									titulo="Rejeição SEFAZ"
									codigo={detalhes.rejeicao.cStat}
									motivo={detalhes.rejeicao.xMotivo ?? "Motivo não informado"}
								/>
								<BlocoInterpretacaoIa
									iaDisponivel={detalhes.iaDisponivel}
									interpretacao={interpretacao}
									carregando={carregandoInterpretacao}
									erro={erroInterpretacao}
								/>
							</section>
						) : null}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
