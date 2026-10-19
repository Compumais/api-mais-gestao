import { api } from "@/lib/axios";

export interface ConfiguracaoPdv {
	modeloAtendimento: "mesa" | "comanda";
	etiqueta_balanca_habilitada: "0" | "1";
	etiqueta_balanca_prefixo: string;
	etiqueta_balanca_digitos_codigo: "4" | "5" | "6";
	etiqueta_balanca_conteudo: "preco" | "peso";
	etiqueta_balanca_centavos: "0" | "1";
	etiqueta_balanca_indicador_uso: "0" | "1";
	venda_sem_estoque: "0" | "1";
}

export const configuracaoPdvService = {
	async buscar(idempresa: string): Promise<ConfiguracaoPdv> {
		const { data } = await api.get<ConfiguracaoPdv>("/configuracao-pdv", {
			params: { idempresa },
		});
		return data;
	},

	async salvar(
		idempresa: string,
		dados: Partial<ConfiguracaoPdv>,
	): Promise<ConfiguracaoPdv> {
		const { data } = await api.put<ConfiguracaoPdv>("/configuracao-pdv", {
			idempresa,
			...dados,
		});
		return data;
	},
};
