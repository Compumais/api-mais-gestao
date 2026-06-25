"use client";

import { IconFileTypePdf, IconPrinter } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NFE_AMBIENTE_LABELS } from "@/constants/nfe-status";
import {
	calcularPrecoTotalItem,
	formatCurrency,
	parseValor,
	type CupomNaoFiscalData,
} from "@/lib/gourmet-utils";
import { abrirDanfeNfe } from "@/services/nfe-emissao.service";

interface CupomNaoFiscalProps {
	dados: CupomNaoFiscalData;
	onFechar: () => void;
}

function formatarChaveNfce(chave: string): string {
	return chave.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function CupomNaoFiscal({ dados, onFechar }: CupomNaoFiscalProps) {
	const [abrindoDanfe, setAbrindoDanfe] = useState(false);
	const ehNfce = Boolean(dados.nfce?.chave);

	const handlePrint = () => {
		window.print();
	};

	const handleAbrirDanfe = async () => {
		if (!dados.nfce?.idnotafiscal) return;

		setAbrindoDanfe(true);
		try {
			await abrirDanfeNfe(dados.nfce.idnotafiscal);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Erro ao abrir DANFE",
			);
		} finally {
			setAbrindoDanfe(false);
		}
	};

	const ambienteLabel =
		dados.nfce?.ambiente != null
			? NFE_AMBIENTE_LABELS[dados.nfce.ambiente]
			: undefined;

	return (
		<>
			<style
				dangerouslySetInnerHTML={{
					__html: `@media print {
						body * { visibility: hidden !important; }
						#cupom-nao-fiscal-print,
						#cupom-nao-fiscal-print * { visibility: visible !important; }
						#cupom-nao-fiscal-print {
							position: absolute;
							left: 0;
							top: 0;
							width: 80mm;
							padding: 8mm;
						}
					}`,
				}}
			/>
			<div className="flex h-full flex-col">
				<div
					id="cupom-nao-fiscal-print"
					className="mx-auto w-full max-w-sm flex-1 overflow-y-auto rounded-lg border bg-white p-6 text-black print:border-0 print:shadow-none"
				>
					<div className="border-b border-dashed border-black pb-3 text-center">
						<p className="text-lg font-bold uppercase">{dados.empresaNome}</p>
						<p className="text-xs">
							{ehNfce ? "DOCUMENTO AUXILIAR DA NFC-e" : "CUPOM NÃO FISCAL"}
						</p>
						{ambienteLabel && (
							<p
								className={`mt-1 text-xs font-semibold ${
									dados.nfce?.ambiente === 2
										? "text-yellow-700"
										: "text-red-700"
								}`}
							>
								Ambiente: {ambienteLabel}
							</p>
						)}
						{dados.contexto && (
							<p className="mt-1 text-xs text-gray-600">{dados.contexto}</p>
						)}
						<p className="mt-1 text-xs">
							{dayjs(dados.dataHora).format("DD/MM/YYYY HH:mm:ss")}
						</p>
						{dados.vendaId && (
							<p className="text-xs text-gray-600">
								Venda: {dados.vendaId.slice(0, 8)}
							</p>
						)}
					</div>

					<div className="my-3 space-y-2 text-xs">
						{dados.itens.map((item, index) => {
							const total = calcularPrecoTotalItem(
								item.quantidade,
								item.precounitario,
							);
							return (
								<div
									key={`${item.nome}-${index}`}
									className="border-b border-dashed border-gray-300 pb-2"
								>
									<p className="font-medium">
										{item.codigo != null ? `${item.codigo} — ` : ""}
										{item.nome}
									</p>
									<div className="mt-1 flex justify-between text-gray-700">
										<span>
											{parseValor(item.quantidade)} x{" "}
											{formatCurrency(item.precounitario)}
										</span>
										<span>{formatCurrency(total)}</span>
									</div>
								</div>
							);
						})}
					</div>

					<div className="space-y-1 border-t border-dashed border-black pt-3 text-xs">
						<div className="flex justify-between">
							<span>Subtotal</span>
							<span>{formatCurrency(dados.subtotal)}</span>
						</div>
						{dados.desconto > 0 && (
							<div className="flex justify-between">
								<span>Desconto</span>
								<span>-{formatCurrency(dados.desconto)}</span>
							</div>
						)}
						{dados.taxaServico > 0 && (
							<div className="flex justify-between">
								<span>Taxa de serviço</span>
								<span>{formatCurrency(dados.taxaServico)}</span>
							</div>
						)}
						{dados.couvert > 0 && (
							<div className="flex justify-between">
								<span>Couvert</span>
								<span>{formatCurrency(dados.couvert)}</span>
							</div>
						)}
						<div className="flex justify-between pt-1 text-sm font-bold">
							<span>TOTAL</span>
							<span>{formatCurrency(dados.total)}</span>
						</div>
					</div>

					<div className="mt-3 space-y-1 border-t border-dashed border-black pt-3 text-xs">
						<p className="font-semibold">Pagamentos</p>
						{dados.pagamentos.map((p, i) => (
							<div key={`${p.meio}-${i}`} className="flex justify-between">
								<span>{p.label}</span>
								<span>{formatCurrency(p.valor)}</span>
							</div>
						))}
						{dados.troco > 0 && (
							<div className="flex justify-between font-semibold">
								<span>Troco</span>
								<span>{formatCurrency(dados.troco)}</span>
							</div>
						)}
					</div>

					{dados.nfce && (
						<div className="mt-3 space-y-1 border-t border-dashed border-black pt-3 text-[10px]">
							<p className="text-center font-semibold">DADOS DA NFC-e</p>
							<p className="break-all leading-relaxed">
								Chave: {formatarChaveNfce(dados.nfce.chave)}
							</p>
							{dados.nfce.protocolo && (
								<p>Protocolo: {dados.nfce.protocolo}</p>
							)}
						</div>
					)}

					<p className="mt-4 text-center text-[10px] text-gray-500">
						{ehNfce
							? "Consulte a NFC-e pelo QR Code no DANFE — Mais Gestão PDV Gourmet"
							: "Documento sem valor fiscal — Mais Gestão PDV Gourmet"}
					</p>
				</div>

				<div className="mt-4 flex justify-end gap-2 print:hidden">
					<Button type="button" variant="outline" onClick={onFechar}>
						Fechar
					</Button>
					{ehNfce && dados.nfce?.idnotafiscal && (
						<Button
							type="button"
							variant="outline"
							disabled={abrindoDanfe}
							onClick={() => void handleAbrirDanfe()}
						>
							<IconFileTypePdf className="size-4" />
							{abrindoDanfe ? "Abrindo..." : "DANFE"}
						</Button>
					)}
					<Button type="button" onClick={handlePrint}>
						<IconPrinter className="size-4" />
						Imprimir cupom
					</Button>
				</div>
			</div>
		</>
	);
}
