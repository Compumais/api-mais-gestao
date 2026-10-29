import { useCallback, useEffect, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	CHAVE_TECLAS_FUNCAO,
	type MapaTeclasFuncao,
	type MapaTeclasMeios,
	parseTeclasFuncao,
	parseTeclasMeiosPagamento,
	TECLAS_FUNCAO_PADRAO,
} from "@/lib/teclas-funcao";

export function useTeclasFuncao() {
	const [teclas, setTeclas] = useState<MapaTeclasFuncao>(TECLAS_FUNCAO_PADRAO);
	const [meios, setMeios] = useState<MapaTeclasMeios>({});

	const recarregar = useCallback(async () => {
		try {
			const config = await pdvInvoke<Record<string, string>>("getConfig");
			const raw = config[CHAVE_TECLAS_FUNCAO];
			setTeclas(parseTeclasFuncao(raw));
			setMeios(parseTeclasMeiosPagamento(raw));
		} catch {
			setTeclas(TECLAS_FUNCAO_PADRAO);
			setMeios({});
		}
	}, []);

	useEffect(() => {
		void recarregar();
	}, [recarregar]);

	return { teclas, meios, recarregar };
}
