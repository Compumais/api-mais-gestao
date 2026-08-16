import { useEffect } from "react";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

type NumericKeypadProps = {
	/** Dígitos brutos representando o valor em centavos (ex.: "1234" = R$ 12,34). */
	digits: string;
	onChange: (digits: string) => void;
	disabled?: boolean;
};

function aplicarTecla(digits: string, tecla: string): string {
	if (tecla === "C") return "0";
	if (tecla === "⌫") {
		const proximo = digits.slice(0, -1);
		return proximo === "" ? "0" : proximo;
	}
	const base = digits === "0" ? "" : digits;
	const proximo = base + tecla;
	return proximo.length > 9 ? proximo.slice(-9) : proximo;
}

/** Teclado numérico estilo calculadora de caixa: dígitos entram pela direita como centavos. */
export function NumericKeypad({
	digits,
	onChange,
	disabled,
}: NumericKeypadProps) {
	function pressionar(tecla: string) {
		if (disabled) return;
		onChange(aplicarTecla(digits, tecla));
	}

	useEffect(() => {
		if (disabled) return;

		function onKeyDown(e: KeyboardEvent) {
			if (e.ctrlKey || e.metaKey || e.altKey) return;

			const alvo = e.target;
			if (
				alvo instanceof HTMLElement &&
				(alvo.tagName === "INPUT" ||
					alvo.tagName === "TEXTAREA" ||
					alvo.isContentEditable)
			) {
				return;
			}

			if (e.key >= "0" && e.key <= "9") {
				e.preventDefault();
				onChange(aplicarTecla(digits, e.key));
				return;
			}
			if (e.key === "Backspace") {
				e.preventDefault();
				onChange(aplicarTecla(digits, "⌫"));
				return;
			}
			if (e.key === "Delete" || e.key === "c" || e.key === "C") {
				e.preventDefault();
				onChange(aplicarTecla(digits, "C"));
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [digits, onChange, disabled]);

	return (
		<div className="grid grid-cols-3 gap-2">
			{TECLAS.map((tecla) => (
				<button
					key={tecla}
					type="button"
					disabled={disabled}
					onClick={() => pressionar(tecla)}
					className="h-14 rounded-lg border bg-card text-xl font-semibold transition hover:bg-accent active:scale-95 disabled:pointer-events-none disabled:opacity-50"
				>
					{tecla}
				</button>
			))}
		</div>
	);
}
