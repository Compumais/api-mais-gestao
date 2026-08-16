import { useEffect } from "react";

/**
 * Quando ativo, Escape fecha o modal (capture) e impede o voltar global.
 */
export function useEscapeFechaModal(aberto: boolean, fechar: () => void): void {
	useEffect(() => {
		if (!aberto) return;

		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "Escape") return;
			e.preventDefault();
			e.stopImmediatePropagation();
			fechar();
		}

		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [aberto, fechar]);
}
