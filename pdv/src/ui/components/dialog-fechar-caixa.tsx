import { useEffect, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import type { ResumoTurnoCaixa } from "@/lib/pdv-types";
import { centavosToNumber, money } from "@/lib/utils";
import { NumericKeypad } from "@/ui/components/numeric-keypad";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

function LinhaResumo({
	label,
	valor,
	destaque,
	extra,
}: {
	label: string;
	valor: number;
	destaque?: boolean;
	extra?: string;
}) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<span className={destaque ? "font-medium" : "text-muted-foreground"}>
				{label}
			</span>
			<span className={destaque ? "font-semibold" : undefined}>
				{money(valor)}
				{extra ? (
					<span className="ml-1 text-xs font-normal text-muted-foreground">
						{extra}
					</span>
				) : null}
			</span>
		</div>
	);
}

export function DialogFecharCaixa({
	aberto,
	onFechar,
	onSucesso,
}: {
	aberto: boolean;
	onFechar: () => void;
	onSucesso: () => void | Promise<void>;
}) {
	const [resumo, setResumo] = useState<ResumoTurnoCaixa | null>(null);
	const [carregando, setCarregando] = useState(false);
	const [enviando, setEnviando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const [digitos, setDigitos] = useState("0");
	const [observacao, setObservacao] = useState("");

	useEscapeFechaModal(aberto && !enviando, onFechar);

	useEffect(() => {
		if (!aberto) {
			setResumo(null);
			setDigitos("0");
			setObservacao("");
			setErro(null);
			return;
		}

		let cancelado = false;
		setCarregando(true);
		setErro(null);
		void pdvInvoke<ResumoTurnoCaixa>("resumoTurnoCaixa")
			.then((dados) => {
				if (!cancelado) setResumo(dados);
			})
			.catch((err) => {
				if (!cancelado) {
					setErro(
						err instanceof Error
							? err.message
							: "Não foi possível carregar o resumo do turno",
					);
				}
			})
			.finally(() => {
				if (!cancelado) setCarregando(false);
			});

		return () => {
			cancelado = true;
		};
	}, [aberto]);

	if (!aberto) return null;

	const saldoinformado = centavosToNumber(digitos);
	const esperado = resumo?.saldoCaixaFisico ?? 0;
	const diferenca = Math.round((saldoinformado - esperado) * 100) / 100;
	const sobra = Math.max(0, diferenca);
	const falta = Math.max(0, -diferenca);
	const digitou = digitos !== "0";

	async function confirmar() {
		if (!resumo || enviando) return;
		setEnviando(true);
		setErro(null);
		try {
			await pdvInvoke(
				"fecharCaixa",
				saldoinformado,
				observacao.trim() || undefined,
			);
			await onSucesso();
			onFechar();
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Erro ao fechar caixa");
		} finally {
			setEnviando(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className="max-h-[95vh] w-[28rem] max-w-[95vw] space-y-4 overflow-y-auto rounded-lg border bg-card p-5">
				<div>
					<h2 className="text-lg font-semibold">Fechar caixa</h2>
					<p className="text-sm text-muted-foreground">
						Confira os recebimentos do turno e informe o valor contado em
						dinheiro na gaveta.
					</p>
				</div>

				{carregando ? (
					<div className="space-y-2 py-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={`skeleton-${i.toString()}`}
								className="h-7 rounded bg-muted animate-pulse"
							/>
						))}
					</div>
				) : resumo ? (
					<div className="space-y-3 rounded-lg border bg-muted/40 p-3 text-sm">
						<LinhaResumo label="Suprimento inicial" valor={resumo.suprimento} />
						<LinhaResumo
							label="Total vendido no turno"
							valor={resumo.saldoapurado}
							destaque
							extra={`(${resumo.qtdVendas} ${resumo.qtdVendas === 1 ? "venda" : "vendas"})`}
						/>
						<div className="space-y-1 border-t pt-2 pl-2">
							<LinhaResumo
								label="↳ Dinheiro (líquido)"
								valor={resumo.pagamentos.dinheiro}
							/>
							<LinhaResumo label="↳ PIX" valor={resumo.pagamentos.pix} />
							<LinhaResumo label="↳ Cartão" valor={resumo.pagamentos.cartao} />
							{resumo.pagamentos.prepago > 0 ? (
								<LinhaResumo
									label="↳ Pré-pago"
									valor={resumo.pagamentos.prepago}
								/>
							) : null}
						</div>
						<div className="border-t pt-2">
							<LinhaResumo
								label="Esperado em dinheiro (gaveta)"
								valor={resumo.saldoCaixaFisico}
								destaque
							/>
						</div>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						Não foi possível carregar o resumo do turno.
					</p>
				)}

				<div className="space-y-2">
					<p className="text-sm font-medium">
						Saldo informado (contagem física)
					</p>
					<div className="text-center text-2xl font-bold text-primary">
						{money(saldoinformado)}
					</div>
					<NumericKeypad
						digits={digitos}
						onChange={setDigitos}
						disabled={enviando || carregando}
						onEnter={() => {
							if (!enviando && resumo) void confirmar();
						}}
					/>
				</div>

				{digitou && resumo ? (
					<div className="rounded-lg border p-3 text-sm">
						<p className="mb-1 text-xs text-muted-foreground">
							Conferência da gaveta (informado × esperado em dinheiro)
						</p>
						{diferenca === 0 ? (
							<p className="font-medium text-green-600">
								Caixa conferido — sem diferença
							</p>
						) : sobra > 0 ? (
							<p className="font-medium text-amber-600">
								Sobra: {money(sobra)}
							</p>
						) : (
							<p className="font-medium text-destructive">
								Falta: {money(falta)}
							</p>
						)}
					</div>
				) : null}

				<textarea
					className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
					disabled={enviando}
					maxLength={255}
					placeholder="Observação (opcional)"
					value={observacao}
					onChange={(e) => setObservacao(e.target.value)}
				/>

				{erro ? <p className="text-sm text-destructive">{erro}</p> : null}

				<div className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1"
						disabled={enviando}
						onClick={onFechar}
					>
						Cancelar
					</Button>
					<Button
						className="flex-1"
						disabled={enviando || carregando || !resumo}
						onClick={() => void confirmar()}
					>
						{enviando ? "Fechando..." : "Fechar caixa"}
					</Button>
				</div>
			</div>
		</div>
	);
}
