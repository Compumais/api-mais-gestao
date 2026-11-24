import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import type { Empresa } from "@/model/empresa-model.js";
import {
	montarArquivoCnab240,
	type TituloRemessaCnab,
} from "@/service/remessa-bancaria/gerar-cnab240.js";
import { montarArquivoCnab400 } from "@/service/remessa-bancaria/gerar-cnab400.js";
import {
	LAYOUT_CNAB,
	type LayoutCnab,
	resolverLayoutRemessa,
} from "@/util/cnab-layouts.js";

export function montarArquivoRemessa(params: {
	empresa: Empresa;
	conta: ContaCorrente;
	sequencia: number;
	titulos: TituloRemessaCnab[];
	codigoBanco?: string;
	layout?: LayoutCnab;
}): { conteudo: string; layout: LayoutCnab; extensao: string } {
	const layout =
		params.layout ?? resolverLayoutRemessa(params.conta);

	if (layout === LAYOUT_CNAB.CNAB400) {
		return {
			layout,
			extensao: "rem",
			conteudo: montarArquivoCnab400({
				empresa: params.empresa,
				conta: params.conta,
				sequencia: params.sequencia,
				titulos: params.titulos,
				codigoBanco: params.codigoBanco,
			}),
		};
	}

	return {
		layout: LAYOUT_CNAB.CNAB240,
		extensao: "rem",
		conteudo: montarArquivoCnab240({
			empresa: params.empresa,
			conta: params.conta,
			sequencia: params.sequencia,
			titulos: params.titulos,
			codigoBanco: params.codigoBanco,
		}),
	};
}
