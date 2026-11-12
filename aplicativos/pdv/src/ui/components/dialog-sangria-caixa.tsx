import { useEffect, useState } from "react";
import {
	AlertCircle,
	ArrowDownToLine,
	CheckCircle2,
	Lock,
	Printer,
	Wallet,
} from "lucide-react";
import { pdvInvoke } from "@/lib/pdv-api";
import type { ResumoTurnoCaixa } from "@/lib/pdv-types";
import { centavosToNumber, money } from "@/lib/utils";
import { NumericKeypad } from "@/ui/components/numeric-keypad";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

const MOTIVOS_SUGERIDOS = [
	"Retirada do suprimento inicial",
	"Sangria para cofre",
	"Pagamento de fornecedor",
	"Despesa operacional",
];

type DialogSangriaCaixaProps = {
	aberto: boolean;
	onFechar: () => void;
	onSucesso?: () => void | Promise<void>;
};

export function DialogSangriaCaixa({
	aberto,
	onFechar,
	onSucesso,
}: DialogSangriaCaixaProps) {
	const [resumo, setResumo] = useState<ResumoTurnoCaixa | null>(null);
	const [carregandoResumo, setCarregandoResumo] = useState(false);
	const [digitos, setDigitos] = useState("0");
	const [motivo, setMotivo] = useState("");
	const [senha, setSenha] = useState("");
	const [imprimir, setImprimir] = useState(true);
	const [enviando, setEnviando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const [sucesso, setSucesso] = useState(false);

	useEscapeFechaModal(aberto && !enviando, onFechar);

	useEffect(() => {
		if (!aberto) {
			setDigitos("0");
			setMotivo("");
			setSenha("");
			setErro(null);
			setSucesso(false);
			return;
		}

		let cancelado = false;
		async function carregar() {
			setCarregandoResumo(true);
			setErro(null);
			try {
				const r = await pdvInvoke<ResumoTurnoCaixa>("resumoTurnoCaixa");
				if (!cancelado) {
					setResumo(r);
				}
			} catch (err) {
				if (!cancelado) {
					setErro(
						err instanceof Error
							? err.message
							: "Falha ao carregar informações do caixa",
					);
				}
			} finally {
				if (!cancelado) setCarregandoResumo(false);
			}
		}

		void carregar();
		return () => {
			cancelado = true;
		};
	}, [aberto]);

	const valorRetirada = centavosToNumber(digitos);
	const saldoDisponivel = resumo?.saldoCaixaFisico ?? 0;
	const valorInvalido = valorRetirada <= 0;
	const valorExcede = valorRetirada > saldoDisponivel;

	function aplicarSuprimentoInicial() {
		if (!resumo || resumo.suprimento <= 0) return;
		const centavos = Math.round(resumo.suprimento * 100).toString();
		setDigitos(centavos);
		setMotivo("Retirada do suprimento inicial");
	}

	async function confirmar() {
		if (valorInvalido) {
			setErro("Informe um valor válido maior que zero.");
			return;
		}
		if (valorExcede) {
			setErro(
				`O valor (${money(valorRetirada)}) não pode ser maior que o saldo em dinheiro na gaveta (${money(saldoDisponivel)}).`,
			);
			return;
		}
		if (!senha.trim()) {
			setErro("Informe a senha gerencial para autorizar a retirada.");
			return;
		}

		setEnviando(true);
		setErro(null);
		try {
			await pdvInvoke("registrarSangria", {
				valor: valorRetirada,
				motivo: motivo.trim() || "Retirada / sangria de caixa",
				senha: senha.trim(),
				imprimir,
			});
			setSucesso(true);
			await onSucesso?.();
			setTimeout(() => {
				onFechar();
			}, 1200);
		} catch (err) {
			setErro(
				err instanceof Error
					? err.message
					: "Falha ao registrar sangria de caixa",
			);
		} finally {
			setEnviando(false);
		}
	}

	if (!aberto) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
			<div className="pdv-surface max-h-[95vh] w-[32rem] max-w-[95vw] space-y-4 overflow-y-auto p-5">
				<div className="flex items-center justify-between border-b pb-3">
					<div>
						<h2 className="flex items-center gap-2 text-lg font-bold">
							<ArrowDownToLine className="size-5 text-amber-500" />
							Sangria / Retirada de Caixa
						</h2>
						<p className="text-xs text-muted-foreground">
							Retirada física de dinheiro da gaveta com autorização gerencial.
						</p>
					</div>
				</div>

				{sucesso ? (
					<div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-emerald-600 dark:text-emerald-400">
						<CheckCircle2 className="size-12 animate-bounce" />
						<p className="text-base font-bold">Retirada registrada com sucesso!</p>
						{imprimir && (
							<p className="text-xs text-muted-foreground">
								Comprovante enviado para impressão.
							</p>
						)}
					</div>
				) : (
					<div className="space-y-4">
						{/* Painel de Saldo e Suprimento */}
						<div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
							<div>
								<span className="flex items-center gap-1 text-xs text-muted-foreground">
									<Wallet className="size-3.5" />
									Saldo em dinheiro (gaveta)
								</span>
								<div className="mt-0.5 text-base font-bold text-foreground">
									{carregandoResumo ? "..." : money(saldoDisponivel)}
								</div>
							</div>
							<div>
								<span className="text-xs text-muted-foreground">
									Suprimento inicial
								</span>
								<div className="mt-0.5 text-base font-semibold text-muted-foreground">
									{carregandoResumo ? "..." : money(resumo?.suprimento ?? 0)}
								</div>
							</div>
						</div>

						{/* Botão de Atalho Rápido para retirar o suprimento */}
						{resumo && resumo.suprimento > 0 && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="w-full border-dashed text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-400"
								onClick={aplicarSuprimentoInicial}
								disabled={enviando}
							>
								Retirar valor do suprimento inicial ({money(resumo.suprimento)})
							</Button>
						)}

						{/* Display do Valor */}
						<div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3 text-center dark:border-amber-900/60 dark:bg-amber-950/20">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
								Valor a Retirar
							</span>
							<div
								className={`text-3xl font-black tabular-nums ${
									valorExcede ? "text-destructive" : "text-primary"
								}`}
							>
								{money(valorRetirada)}
							</div>
							{valorExcede && (
								<p className="mt-1 text-xs font-semibold text-destructive">
									Atenção: valor maior que o saldo em dinheiro disponível na gaveta!
								</p>
							)}
						</div>

						{/* Teclado numérico */}
						<NumericKeypad
							digits={digitos}
							onChange={setDigitos}
							disabled={enviando}
							capturarSobreInput={false}
							onEnter={() => {
								if (!enviando && !valorInvalido && !valorExcede) {
									void confirmar();
								}
							}}
						/>

						{/* Motivo */}
						<div className="space-y-1.5">
							<Label className="text-xs font-semibold">Motivo da retirada</Label>
							<div className="flex flex-wrap gap-1 pb-1">
								{MOTIVOS_SUGERIDOS.map((sug) => (
									<button
										key={sug}
										type="button"
										onClick={() => setMotivo(sug)}
										disabled={enviando}
										className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
											motivo === sug
												? "border-primary bg-primary text-primary-foreground font-semibold"
												: "border-border bg-background hover:bg-muted text-muted-foreground"
										}`}
									>
										{sug}
									</button>
								))}
							</div>
							<Input
								value={motivo}
								onChange={(e) => setMotivo(e.target.value)}
								placeholder="Informe ou selecione o motivo da retirada"
								disabled={enviando}
								maxLength={64}
								className="h-9 text-xs"
							/>
						</div>

						{/* Senha Gerencial */}
						<div className="space-y-1.5 rounded-lg border border-border/80 bg-background/50 p-2.5">
							<Label className="flex items-center gap-1.5 text-xs font-semibold">
								<Lock className="size-3.5 text-muted-foreground" />
								Senha gerencial (supervisor)
							</Label>
							<Input
								type="password"
								value={senha}
								onChange={(e) => setSenha(e.target.value)}
								placeholder="Digite a senha de supervisor"
								disabled={enviando}
								className="h-9 text-xs"
							/>
						</div>

						{/* Opção de Impressão */}
						<label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
							<input
								type="checkbox"
								checked={imprimir}
								onChange={(e) => setImprimir(e.target.checked)}
								disabled={enviando}
								className="size-4 rounded border-border accent-primary"
							/>
							<Printer className="size-3.5" />
							Imprimir comprovante de retirada na impressora térmica
						</label>

						{/* Mensagem de Erro */}
						{erro && (
							<div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
								<AlertCircle className="size-4 shrink-0" />
								<span>{erro}</span>
							</div>
						)}

						{/* Ações */}
						<div className="flex gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								className="flex-1"
								onClick={onFechar}
								disabled={enviando}
							>
								Cancelar
							</Button>
							<Button
								type="button"
								variant="destructive"
								className="flex-1"
								onClick={() => void confirmar()}
								disabled={enviando || valorInvalido || valorExcede || !senha.trim()}
							>
								{enviando ? "Registrando..." : "Confirmar retirada"}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
