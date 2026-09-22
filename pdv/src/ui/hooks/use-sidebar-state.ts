import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pdv.sidebar.recolhida";
const EVENT_NAME = "pdv:sidebar-state";

function lerEstado(): boolean {
	if (typeof window === "undefined") return false;
	return window.sessionStorage.getItem(STORAGE_KEY) === "1";
}

/** Mantém o rail lateral sincronizado e preservado durante a sessão do renderer. */
export function useSidebarState() {
	const [recolhida, setRecolhidaLocal] = useState(lerEstado);

	useEffect(() => {
		function sincronizar(event: Event) {
			const detalhe = (event as CustomEvent<boolean>).detail;
			setRecolhidaLocal(typeof detalhe === "boolean" ? detalhe : lerEstado());
		}
		window.addEventListener(EVENT_NAME, sincronizar);
		return () => window.removeEventListener(EVENT_NAME, sincronizar);
	}, []);

	const setRecolhida = useCallback((proximo: boolean) => {
		window.sessionStorage.setItem(STORAGE_KEY, proximo ? "1" : "0");
		setRecolhidaLocal(proximo);
		window.dispatchEvent(
			new CustomEvent<boolean>(EVENT_NAME, { detail: proximo }),
		);
	}, []);

	const alternar = useCallback(
		() => setRecolhida(!recolhida),
		[recolhida, setRecolhida],
	);

	return { recolhida, setRecolhida, alternar };
}
