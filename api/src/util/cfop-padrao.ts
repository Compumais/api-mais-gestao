import { v4 as uuidv4 } from "uuid";
import type { NovoCFOP } from "@/repositories/cfop-repositories.js";
import conteudoCfopPadrao from "../data/cfop-padrao.json" with { type: "json" };

type CfopPadraoJson = {
	codigo: number;
	nome: string;
	currenttimemillis?: number;
};

type CfopPadraoArquivo = {
	cfoppadrao: CfopPadraoJson[];
};

const cfopsPadrao = (conteudoCfopPadrao as CfopPadraoArquivo).cfoppadrao;

export type TipoMovimentoCfop = "E" | "S";

export function inferirTipoMovimentoCfop(codigo: string): TipoMovimentoCfop | null {
	const primeiroDigito = codigo.replace(/\D/g, "")[0];

	if (!primeiroDigito) {
		return null;
	}

	if (["1", "2", "3"].includes(primeiroDigito)) {
		return "E";
	}

	if (["5", "6", "7"].includes(primeiroDigito)) {
		return "S";
	}

	return null;
}

type MontarCfopParametros = {
	codigo: string;
	descricao: string;
	currenttimemillis: number;
};

function montarCfop(
	idempresa: string,
	parametros: MontarCfopParametros,
): NovoCFOP {
	return {
		id: uuidv4(),
		idempresa,
		codigo: parametros.codigo,
		descricao: parametros.descricao,
		currenttimemillis: parametros.currenttimemillis,
	};
}

export function montarCfopsPadrao(
	idempresa: string,
	timestampMillis: number = Date.now(),
): NovoCFOP[] {
	return cfopsPadrao.map((cfop) =>
		montarCfop(idempresa, {
			codigo: String(cfop.codigo),
			descricao: cfop.nome,
			currenttimemillis: cfop.currenttimemillis ?? timestampMillis,
		}),
	);
}

export function quantidadeCfopsPadrao(): number {
	return cfopsPadrao.length;
}
