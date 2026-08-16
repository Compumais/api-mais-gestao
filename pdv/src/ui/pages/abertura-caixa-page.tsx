import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { marcarBootPendente } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import type { StatusContext } from "@/lib/pdv-types";
import { centavosToNumber, money } from "@/lib/utils";
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
			navigate("/", { replace: true });
			return;
		}
		void (async () => {
			await refresh();
		})();
	}, [status?.caixa, refresh, navigate]);

	async function confirmar() {
		setLoading(true);
		setErro("");
		try {
			await pdvInvoke("abrirCaixa", centavosToNumber(digitos));
			await refresh();
			navigate("/", { replace: true });
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
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-secondary/40 p-6">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-primary">Abertura de caixa</h1>
				<p className="text-sm text-muted-foreground">
					Informe o valor de suprimento inicial para começar a operar.
				</p>
			</div>
			<div className="w-full max-w-xs space-y-4 rounded-lg border bg-card p-5">
				<div className="text-center text-3xl font-bold text-primary">
					{money(centavosToNumber(digitos))}
				</div>
				<NumericKeypad
					digits={digitos}
					onChange={setDigitos}
					disabled={loading}
				/>
				{erro && <p className="text-center text-sm text-destructive">{erro}</p>}
				<Button
					size="xl"
					className="w-full"
					disabled={loading}
					onClick={() => void confirmar()}
				>
					{loading ? "Abrindo..." : "Confirmar abertura"}
				</Button>
				<Button
					variant="ghost"
					className="w-full"
					disabled={loading}
					onClick={() => void sair()}
				>
					Sair
				</Button>
			</div>
		</div>
	);
}
