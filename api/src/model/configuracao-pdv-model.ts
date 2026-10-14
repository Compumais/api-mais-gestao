import type { configuracaopdv } from "../../drizzle/tables/configuracao-pdv.js";

export type ConfiguracaoPdv = typeof configuracaopdv.$inferSelect;

export type ConfiguracaoPdvResposta = {
	modeloAtendimento: "mesa" | "comanda";
	etiqueta_balanca_habilitada: "0" | "1";
	etiqueta_balanca_prefixo: string;
	etiqueta_balanca_digitos_codigo: "4" | "5" | "6";
	etiqueta_balanca_conteudo: "preco" | "peso";
	etiqueta_balanca_centavos: "0" | "1";
	etiqueta_balanca_indicador_uso: "0" | "1";
};
