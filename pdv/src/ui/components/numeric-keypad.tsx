import { useEffect } from "react";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

type NumericKeypadProps = {
	/** Dígitos brutos representando o valor em centavos (ex.: "1234" = R$ 12,34). */
	digits: string;
	onChange: (digits: string) => void;
	disabled?: boolean;
	/** Enter / NumpadEnter confirma a ação (não deve repetir o dígito focado). */
	onEnter?: () => void;
	/** Captura o teclado mesmo com input focado (modais sobre a busca). */
	capturarSobreInput?: boolean;
	/** Esconde os botões touch, mas continua capturando o teclado físico. */
	mostrarBotoes?: boolean;
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

function ehEnter(e: KeyboardEvent): boolean {
	return e.key === "Enter" || e.code === "NumpadEnter";
}

/** Teclado numérico estilo calculadora de caixa: dígitos entram pela direita como centavos. */
export function NumericKeypad({
	digits,
	onChange,
	disabled,
	onEnter,
	capturarSobreInput = false,
	mostrarBotoes = true,
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
			const emCampoTexto =
				alvo instanceof HTMLElement &&
				(alvo.tagName === "INPUT" ||
					alvo.tagName === "TEXTAREA" ||
					alvo.isContentEditable);
			if (emCampoTexto && !capturarSobreInput) {
				return;
			}

			if (ehEnter(e)) {
				if (!onEnter) return;
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				onEnter();
				return;
			}

			if (e.key >= "0" && e.key <= "9") {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				onChange(aplicarTecla(digits, e.key));
				return;
			}
			if (e.key === "Backspace") {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				onChange(aplicarTecla(digits, "⌫"));
				return;
			}
			if (e.key === "Delete" || e.key === "c" || e.key === "C") {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				onChange(aplicarTecla(digits, "C"));
			}
		}

		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [digits, onChange, disabled, onEnter, capturarSobreInput]);

	if (!mostrarBotoes) {
		return null;
	}

	return (
		<div className="grid grid-cols-3 gap-2">
			{TECLAS.map((tecla) => (
				<button
					key={tecla}
					type="button"
					tabIndex={-1}
					disabled={disabled}
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => pressionar(tecla)}
					className="h-14 rounded-lg bg-card text-xl font-semibold ring-1 ring-foreground/10 transition hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-50"
				>
					{tecla}
				</button>
			))}
		</div>
	);
}
