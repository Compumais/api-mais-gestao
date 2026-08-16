import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Rotas em que Escape não deve navegar para trás. */
const ROTAS_SEM_VOLTAR = new Set(["/login", "/boot"]);

/**
 * Escape global: sempre volta para a tela anterior (histórico do router).
 * Modais devem interceptar Escape em capture phase e chamar stopImmediatePropagation.
 */
export function GlobalEscapeBack() {
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "Escape") return;
			if (e.defaultPrevented) return;
			if (ROTAS_SEM_VOLTAR.has(location.pathname)) return;

			e.preventDefault();
			navigate(-1);
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [navigate, location.pathname]);

	return null;
}
