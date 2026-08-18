import { useCallback, useEffect, useState } from "react";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	CHAVE_TECLAS_FUNCAO,
	type MapaTeclasFuncao,
	parseTeclasFuncao,
	TECLAS_FUNCAO_PADRAO,
} from "@/lib/teclas-funcao";

export function useTeclasFuncao() {
	const [teclas, setTeclas] = useState<MapaTeclasFuncao>(TECLAS_FUNCAO_PADRAO);

	const recarregar = useCallback(async () => {
		try {
			const config = await pdvInvoke<Record<string, string>>("getConfig");
			setTeclas(parseTeclasFuncao(config[CHAVE_TECLAS_FUNCAO]));
		} catch {
			setTeclas(TECLAS_FUNCAO_PADRAO);
		}
	}, []);

	useEffect(() => {
		void recarregar();
	}, [recarregar]);

	return { teclas, recarregar };
}
