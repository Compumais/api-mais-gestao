import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { marcarBootPendente } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import { rotaHomePdv, type StatusContext } from "@/lib/pdv-types";
import { centavosToNumber, money } from "@/lib/utils";
import { LogoMaisGestao } from "@/ui/components/logo-mais-gestao";
import { NumericKeypad } from "@/ui/components/numeric-keypad";
import { Button } from "@/ui/components/ui/button";

export function AberturaCaixaPage() {
	const navigate = useNavigate();
	const { status, refresh } = useOutletContext<StatusContext>();
	const [digitos, setDigitos] = useState("0");
	const [loading, setLoading] = useState(false);
	const [erro, setErro] = useState("");

	useEffect(() => {
		if (status?.caixa) {
			navigate(rotaHomePdv(status), { replace: true });
			return;
		}
		void refresh();
	}, [status?.caixa, status?.moduloGourmet, refresh, navigate]);

	async function confirmar() {
		setLoading(true);
		setErro("");
		try {
			await pdvInvoke("abrirCaixa", centavosToNumber(digitos));
			await refresh();
			navigate(rotaHomePdv(status), { replace: true });
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Erro ao abrir caixa");
		} finally {
			setLoading(false);
		}
	}

	async function sair() {
		await pdvInvoke("logout");
		marcarBootPendente();
		navigate("/login", { replace: true });
	}

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
			<div className="absolute inset-x-0 top-0 h-52 bg-sidebar" />
			<div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-slate-950/10 lg:grid-cols-[1fr_22rem]">
				<div className="flex flex-col justify-between bg-sidebar p-8 text-sidebar-foreground lg:p-10">
					<LogoMaisGestao variante="branco" className="h-14 self-start" />
					<div className="my-10">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
							Início do turno
						</p>
						<h1 className="mt-2 text-3xl font-bold">Abertura de caixa</h1>
						<p className="mt-3 max-w-md text-sm leading-6 text-sidebar-foreground/75">
							Turno de {status?.sessao.username ?? "operador"}. Informe o
							suprimento inicial para começar a operar.
						</p>
					</div>
					<p className="text-xs text-sidebar-foreground/55">
						O valor informado ficará registrado no movimento deste caixa.
					</p>
				</div>
				<div className="space-y-4 p-5 sm:p-7">
					{status?.caixaOutroOperador ? (
						<p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
							Há um caixa aberto
							{status.caixaOutroOperador.username
								? ` por ${status.caixaOutroOperador.username}`
								: " por outro operador"}
							. Esse turno não vale para você — abra o seu para vender.
						</p>
					) : null}
					<div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-center dark:border-blue-900 dark:bg-blue-950/30">
						<p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
							Suprimento inicial
						</p>
						<div className="text-4xl font-black tabular-nums text-primary">
							{money(centavosToNumber(digitos))}
						</div>
					</div>
					<NumericKeypad
						digits={digitos}
						onChange={setDigitos}
						disabled={loading}
						capturarSobreInput
						onEnter={() => {
							if (!loading) void confirmar();
						}}
					/>
					<p className="text-center text-xs text-muted-foreground">
						Digite o valor e pressione Enter para confirmar.
					</p>
					{erro && (
						<p className="text-center text-sm text-destructive">{erro}</p>
					)}
					<Button
						size="xl"
						className="pdv-touch w-full"
						disabled={loading}
						onClick={() => void confirmar()}
					>
						{loading ? "Abrindo..." : "Confirmar abertura"}
					</Button>
					<Button
						variant="ghost"
						className="pdv-touch w-full"
						disabled={loading}
						onClick={() => void sair()}
					>
						Sair
					</Button>
				</div>
			</div>
		</div>
	);
}
