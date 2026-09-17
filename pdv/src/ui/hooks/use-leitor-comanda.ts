import { useEffect, useRef } from "react";
import {
	alvoEhCampoDigitacao,
	DEBOUNCE_LEITURA_COMANDA_MS,
	ESTADO_BUFFER_LEITOR_COMANDA_VAZIO,
	type LeituraComandaNormalizada,
	normalizarLeituraComanda,
	processarTeclaLeitorComanda,
	TIMEOUT_BUFFER_COMANDA_MS,
} from "@/lib/comanda-scanner";

type UseLeitorComandaParams = {
	ativo: boolean;
	onLeitura: (leitura: LeituraComandaNormalizada) => void | Promise<void>;
};

/**
 * Captura leitores que emulam teclado sem criar ou focar um input oculto.
 * Campos de texto, editores, atalhos e teclas de função ficam fora da captura.
 */
export function useLeitorComanda({
	ativo,
	onLeitura,
}: UseLeitorComandaParams): void {
	const onLeituraRef = useRef(onLeitura);
	onLeituraRef.current = onLeitura;

	useEffect(() => {
		if (!ativo) return;

		let estado = { ...ESTADO_BUFFER_LEITOR_COMANDA_VAZIO };
		let timeout: number | null = null;
		let ultimaLeitura: { codigo: string; instante: number } | null = null;

		function limparBuffer() {
			estado = { ...ESTADO_BUFFER_LEITOR_COMANDA_VAZIO };
			if (timeout !== null) {
				window.clearTimeout(timeout);
				timeout = null;
			}
		}

		function onKeyDown(evento: KeyboardEvent) {
			const agora = performance.now();
			const resultado = processarTeclaLeitorComanda(estado, {
				key: evento.key,
				agora,
				emCampoDigitacao: alvoEhCampoDigitacao(evento.target),
				comModificador:
					evento.ctrlKey || evento.metaKey || evento.altKey || evento.shiftKey,
				repetida: evento.repeat,
			});
			estado = resultado.estado;

			if (timeout !== null) window.clearTimeout(timeout);
			timeout =
				estado.buffer.length > 0
					? window.setTimeout(limparBuffer, TIMEOUT_BUFFER_COMANDA_MS)
					: null;

			if (!resultado.codigoOriginal) return;
			const duplicada =
				ultimaLeitura?.codigo === resultado.codigoOriginal &&
				agora - ultimaLeitura.instante < DEBOUNCE_LEITURA_COMANDA_MS;
			if (duplicada) {
				evento.preventDefault();
				evento.stopPropagation();
				evento.stopImmediatePropagation();
				return;
			}

			const leitura = normalizarLeituraComanda(resultado.codigoOriginal);
			if (!leitura.valida) return;
			ultimaLeitura = { codigo: leitura.codigoOriginal, instante: agora };
			evento.preventDefault();
			evento.stopPropagation();
			evento.stopImmediatePropagation();
			void onLeituraRef.current(leitura);
		}

		window.addEventListener("keydown", onKeyDown, true);
		return () => {
			limparBuffer();
			window.removeEventListener("keydown", onKeyDown, true);
		};
	}, [ativo]);
}
