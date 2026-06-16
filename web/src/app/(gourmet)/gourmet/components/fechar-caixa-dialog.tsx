"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { useCaixaPdv } from "@/hooks/use-caixa-pdv";
import type { ResumoTurnoCaixa } from "@/hooks/use-caixa-pdv";
import { formatCurrency, parseValor } from "@/lib/gourmet-utils";

interface FecharCaixaDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function FecharCaixaDialog({
	open,
	onOpenChange,
}: FecharCaixaDialogProps) {
	const { fecharCaixa, isFechando, buscarResumoTurno, numeropdv } =
		useCaixaPdv();

	const [resumo, setResumo] = useState<ResumoTurnoCaixa | null>(null);
	const [carregandoResumo, setCarregandoResumo] = useState(false);
	const [saldoinformado, setSaldoinformado] = useState("");
	const [observacao, setObservacao] = useState("");

	useEffect(() => {
		if (!open) {
			setResumo(null);
			setSaldoinformado("");
			setObservacao("");
			return;
		}

		setCarregandoResumo(true);
		buscarResumoTurno()
			.then(setResumo)
			.finally(() => setCarregandoResumo(false));
	}, [open, buscarResumoTurno]);

	const saldoInformadoNum = parseValor(saldoinformado);
	const saldoCaixaFisico = resumo?.saldoCaixaFisico ?? 0;
	const diferenca = saldoInformadoNum - saldoCaixaFisico;
	const sobra = Math.max(0, diferenca);
	const falta = Math.max(0, -diferenca);

	const handleConfirmar = async () => {
		await fecharCaixa({
			saldoinformado: saldoinformado || "0",
			observacao: observacao || undefined,
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Fechar caixa</DialogTitle>
					<DialogDescription>
						PDV nº {numeropdv} — confira os valores do turno e informe o saldo
						contado em dinheiro.
					</DialogDescription>
				</DialogHeader>

				{carregandoResumo ? (
					<div className="space-y-2 py-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i.toString()}
								className="h-8 rounded bg-muted animate-pulse"
							/>
						))}
					</div>
				) : resumo ? (
					<div className="space-y-4">
						<div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Suprimento inicial (dinheiro)</span>
								<span className="font-medium">
									{formatCurrency(resumo.suprimento.toFixed(2))}
								</span>
							</div>
							<div className="flex justify-between border-t pt-2">
								<span className="font-medium">Total vendido no turno</span>
								<span className="font-semibold">
									{formatCurrency(resumo.saldoapurado.toFixed(2))}
									<span className="ml-1 text-xs font-normal text-muted-foreground">
										({resumo.qtdVendas}{" "}
										{resumo.qtdVendas === 1 ? "venda" : "vendas"})
									</span>
								</span>
							</div>
							<div className="space-y-1 border-t pt-2 pl-2">
								<div className="flex justify-between">
									<span className="text-muted-foreground">↳ Dinheiro (líquido)</span>
									<span>{formatCurrency(resumo.pagamentos.dinheiro.toFixed(2))}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">↳ Cartão</span>
									<span>{formatCurrency(resumo.pagamentos.cartao.toFixed(2))}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">↳ PIX</span>
									<span>{formatCurrency(resumo.pagamentos.pix.toFixed(2))}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">↳ Pré-pago</span>
									<span>{formatCurrency(resumo.pagamentos.prepago.toFixed(2))}</span>
								</div>
							</div>
							<div className="flex justify-between border-t pt-2">
								<span className="font-medium">Saldo em dinheiro (gaveta)</span>
								<span className="font-semibold text-primary">
									{formatCurrency(resumo.saldoCaixaFisico.toFixed(2))}
								</span>
							</div>
						</div>

						<p className="text-xs text-muted-foreground">
							O total vendido soma todas as formas de pagamento. O saldo em dinheiro
							é o suprimento inicial mais as vendas recebidas em espécie (já
							descontado o troco). Informe abaixo apenas a contagem física da gaveta.
						</p>

						<Field>
							<FieldLabel>Saldo informado (contagem física)</FieldLabel>
							<FieldGroup>
								<MoneyInput
									value={saldoinformado}
									onChange={setSaldoinformado}
									placeholder="R$ 0,00"
									autoFocus
								/>
							</FieldGroup>
						</Field>

						{saldoinformado && (
							<div className="rounded-lg border p-3 text-sm space-y-1">
								<p className="text-muted-foreground text-xs">
									Conferência da gaveta (informado × esperado em dinheiro)
								</p>
								{diferenca === 0 ? (
									<p className="text-green-600 font-medium">
										Caixa conferido — sem diferença
									</p>
								) : sobra > 0 ? (
									<p className="text-amber-600 font-medium">
										Sobra: {formatCurrency(sobra.toFixed(2))}
									</p>
								) : (
									<p className="text-destructive font-medium">
										Falta: {formatCurrency(falta.toFixed(2))}
									</p>
								)}
							</div>
						)}

						<Field>
							<FieldLabel>Observação (opcional)</FieldLabel>
							<FieldGroup>
								<Textarea
									value={observacao}
									onChange={(e) => setObservacao(e.target.value)}
									placeholder="Observações sobre o fechamento..."
									rows={2}
								/>
							</FieldGroup>
						</Field>
					</div>
				) : (
					<p className="py-4 text-center text-sm text-muted-foreground">
						Não foi possível carregar o resumo do turno.
					</p>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isFechando}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleConfirmar}
						disabled={isFechando || carregandoResumo || !resumo}
					>
						{isFechando ? "Fechando..." : "Fechar caixa"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
