import { useEffect, useMemo, useState } from "react";
import {
	lancamentoTemSitef,
	podeFecharPagamentos,
	reaisParaDigitos,
	rotuloMeio,
	saldoRestante,
	somarLancamentos,
	trocoEstimado,
} from "@/lib/pagamento";
import { pdvInvoke } from "@/lib/pdv-api";
import type {
	LancamentoPagamento,
	MeioPagamento,
	SitefCancelarResultado,
	SitefPagarResultado,
	SitefStatus,
} from "@/lib/pdv-types";
import { centavosToNumber, money } from "@/lib/utils";
import { NumericKeypad } from "@/ui/components/numeric-keypad";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

export type FechamentoMisto = {
	lancamentos: LancamentoPagamento[];
	troco: number;
};

type DialogPagamentoMistoProps = {
	aberto: boolean;
	total: number;
	loading?: boolean;
	titulo?: string;
	confirmarLabel?: string;
	onCancelar: () => void;
	onConfirmar: (fechamento: FechamentoMisto) => void;
};

const MEIOS: MeioPagamento[] = ["DINHEIRO", "PIX", "CARTAO"];

export function DialogPagamentoMisto({
	aberto,
	total,
	loading = false,
	titulo = "Pagamento",
	confirmarLabel = "Confirmar",
	onCancelar,
	onConfirmar,
}: DialogPagamentoMistoProps) {
	const [lancamentos, setLancamentos] = useState<LancamentoPagamento[]>([]);
	const [digitos, setDigitos] = useState("0");
	const [sitef, setSitef] = useState<SitefStatus | null>(null);
	const [processando, setProcessando] = useState(false);
	const [erro, setErro] = useState("");

	const restante = useMemo(
		() => saldoRestante(total, lancamentos),
		[total, lancamentos],
	);
	const pago = useMemo(() => somarLancamentos(lancamentos), [lancamentos]);
	const troco = useMemo(
		() => trocoEstimado(total, lancamentos),
		[total, lancamentos],
	);
	const podeFechar = podeFecharPagamentos(total, lancamentos);
	const ocupado = loading || processando;

	useEffect(() => {
		if (!aberto) return;
		setLancamentos([]);
		setDigitos(reaisParaDigitos(total));
		setErro("");
		setProcessando(false);
		void pdvInvoke<SitefStatus>("sitef.status")
			.then(setSitef)
			.catch(() => setSitef(null));
	}, [aberto, total]);

	useEffect(() => {
		if (!aberto) return;
		setDigitos(reaisParaDigitos(restante));
	}, [aberto, restante]);

	async function cancelarAutorizados(lista: LancamentoPagamento[]) {
		for (const item of lista) {
			if (!lancamentoTemSitef(item)) continue;
			try {
				await pdvInvoke<SitefCancelarResultado>("sitef.cancelar", {
					nsu: item.nsu,
					valor: item.valor,
				});
			} catch {
				// desfazimento local segue; PIN pad pode exigir estorno manual
			}
		}
	}

	async function fecharDialog() {
		if (ocupado) return;
		setProcessando(true);
		try {
			await cancelarAutorizados(lancamentos);
		} finally {
			setProcessando(false);
			onCancelar();
		}
	}

	useEscapeFechaModal(aberto, () => {
		void fecharDialog();
	});

	async function adicionar(meio: MeioPagamento) {
		if (ocupado) return;
		const valor = centavosToNumber(digitos);
		if (!(valor > 0)) {
			setErro("Informe um valor maior que zero");
			return;
		}
		if (meio !== "DINHEIRO" && valor - restante > 0.001) {
			setErro("PIX e cartão não podem ultrapassar o restante");
			return;
		}
		if (restante <= 0 && meio !== "DINHEIRO") {
			setErro("Saldo já está zerado");
			return;
		}

		setErro("");
		if (meio !== "CARTAO") {
			setLancamentos((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					meio,
					valor,
					status: "ok",
				},
			]);
			return;
		}

		setProcessando(true);
		try {
			const status =
				sitef ??
				(await pdvInvoke<SitefStatus>("sitef.status").catch(() => null));
			if (status) setSitef(status);
			if (!status?.disponivel) {
				setLancamentos((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						meio: "CARTAO",
						valor,
						status: "ok",
					},
				]);
				return;
			}

			const result = await pdvInvoke<SitefPagarResultado>("sitef.pagar", {
				valor,
			});
			if (result.manual) {
				setLancamentos((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						meio: "CARTAO",
						valor,
						status: "ok",
					},
				]);
				return;
			}
			if (!result.ok) {
				setErro(result.mensagem || "Pagamento SiTef não autorizado");
				return;
			}
			setLancamentos((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					meio: "CARTAO",
					valor,
					status: "ok",
					nsu: result.nsu ?? null,
					autorizacao: result.autorizacao ?? null,
					bandeira: result.bandeira ?? null,
				},
			]);
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha no SiTef");
		} finally {
			setProcessando(false);
		}
	}

	async function remover(id: string | undefined, indice: number) {
		if (ocupado) return;
		const item = id
			? lancamentos.find((l) => l.id === id)
			: lancamentos[indice];
		if (!item) return;
		setErro("");
		if (lancamentoTemSitef(item)) {
			setProcessando(true);
			try {
				const result = await pdvInvoke<SitefCancelarResultado>(
					"sitef.cancelar",
					{ nsu: item.nsu, valor: item.valor },
				);
				if (!result.ok) {
					setErro(result.mensagem || "Não foi possível cancelar no SiTef");
					return;
				}
			} catch (err) {
				setErro(
					err instanceof Error ? err.message : "Falha ao cancelar no SiTef",
				);
				return;
			} finally {
				setProcessando(false);
			}
		}
		setLancamentos((prev) =>
			prev.filter((l, i) => (id ? l.id !== id : i !== indice)),
		);
	}

	if (!aberto) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
			<div className="flex max-h-[95vh] w-[28rem] max-w-[95vw] flex-col gap-3 overflow-auto rounded-lg border bg-card p-5">
				<h2 className="text-lg font-semibold">{titulo}</h2>
				<div className="grid grid-cols-2 gap-2 text-center">
					<div className="rounded-md border bg-background px-2 py-2">
						<div className="text-xs text-muted-foreground">Total</div>
						<div className="text-xl font-bold">{money(total)}</div>
					</div>
					<div
						className={
							restante > 0
								? "rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-2"
								: "rounded-md border border-primary/40 bg-primary/10 px-2 py-2"
						}
					>
						<div className="text-xs text-muted-foreground">Restante</div>
						<div
							className={
								restante > 0
									? "text-2xl font-bold text-amber-700 dark:text-amber-400"
									: "text-2xl font-bold text-primary"
							}
						>
							{money(restante)}
						</div>
					</div>
				</div>
				{troco > 0 && (
					<p className="text-center text-sm font-medium">
						Troco: <span className="text-primary">{money(troco)}</span>
					</p>
				)}

				<div className="text-center text-3xl font-bold text-primary">
					{money(centavosToNumber(digitos))}
				</div>
				<NumericKeypad
					digits={digitos}
					onChange={setDigitos}
					disabled={ocupado || restante <= 0}
				/>

				<div className="grid grid-cols-3 gap-2">
					{MEIOS.map((meio) => (
						<Button
							key={meio}
							variant="outline"
							disabled={ocupado || (restante <= 0 && meio !== "DINHEIRO")}
							onClick={() => void adicionar(meio)}
						>
							{meio === "CARTAO"
								? sitef?.disponivel
									? "Cartão/SiTef"
									: "Cartão"
								: rotuloMeio(meio)}
						</Button>
					))}
				</div>
				<p className="text-xs text-muted-foreground">
					{processando
						? "Aguardando PIN pad…"
						: sitef?.disponivel
							? "Cartão passa pela PIN pad SiTef."
							: (sitef?.mensagem ??
								"SiTef indisponível — cartão entra como lançamento manual.")}
				</p>

				<div className="min-h-16 space-y-1 rounded-md border bg-background p-2">
					{lancamentos.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhum lançamento. Adicione Dinheiro, PIX ou Cartão até zerar o
							restante.
						</p>
					) : (
						lancamentos.map((item, indice) => (
							<div
								key={item.id ?? `${item.meio}-${indice}`}
								className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
							>
								<div className="min-w-0">
									<div className="font-medium">
										{rotuloMeio(item.meio)} · {money(item.valor)}
									</div>
									{(item.nsu || item.autorizacao || item.bandeira) && (
										<div className="text-xs text-muted-foreground">
											{[
												item.bandeira,
												item.nsu ? `NSU ${item.nsu}` : null,
												item.autorizacao ? `Aut. ${item.autorizacao}` : null,
											]
												.filter(Boolean)
												.join(" · ")}
										</div>
									)}
								</div>
								<Button
									size="sm"
									variant="ghost"
									disabled={ocupado}
									onClick={() => void remover(item.id, indice)}
								>
									Remover
								</Button>
							</div>
						))
					)}
				</div>

				{pago > 0 && (
					<p className="text-xs text-muted-foreground">
						Pago {money(pago)} de {money(total)}
					</p>
				)}
				{erro && <p className="text-sm text-destructive">{erro}</p>}

				<div className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1"
						disabled={ocupado}
						onClick={() => void fecharDialog()}
					>
						Cancelar
					</Button>
					<Button
						className="flex-1"
						disabled={ocupado || !podeFechar}
						onClick={() => onConfirmar({ lancamentos, troco })}
					>
						{loading
							? "Finalizando..."
							: processando
								? "Aguarde..."
								: confirmarLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
