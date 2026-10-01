import { resolverNumeroEndereco } from "@/util/numero-endereco-fiscal.js";
import {
	formatarAlfanumerico,
	formatarCnpjCpf,
	formatarDataAaaammdd,
	formatarInscricaoEstadual,
	formatarNumerico,
	montarLinha,
} from "../formatador-campo.js";
import type { DadosContribuinteSintegra } from "../tipos-sintegra.js";

type MontarRegistro10Parametros = {
	contribuinte: DadosContribuinteSintegra;
	dataInicio: string;
	dataFim: string;
	finalidade: string;
};

export function montarRegistro10({
	contribuinte,
	dataInicio,
	dataFim,
	finalidade,
}: MontarRegistro10Parametros): string {
	return montarLinha([
		"10",
		formatarCnpjCpf(contribuinte.cnpj),
		formatarInscricaoEstadual(contribuinte.inscricaoEstadual),
		formatarAlfanumerico(contribuinte.razaosocial, 35),
		formatarAlfanumerico(contribuinte.municipio, 30),
		formatarAlfanumerico(contribuinte.uf, 2),
		formatarNumerico(contribuinte.fax, 10),
		formatarDataAaaammdd(dataInicio),
		formatarDataAaaammdd(dataFim),
		"3",
		"3",
		finalidade,
	]);
}

export function montarRegistro11(
	contribuinte: DadosContribuinteSintegra,
): string {
	const numero = resolverNumeroEndereco(contribuinte.numero);
	const numeroImovel =
		numero === "SN"
			? formatarAlfanumerico("SN", 5)
			: formatarNumerico(numero, 5);
	const municipio = contribuinte.municipio?.trim() ?? "";
	const municipioEhCodigo = /^\d{7}$/.test(municipio);
	const complemento =
		numero === "SN" && !contribuinte.complemento?.trim() && !municipioEhCodigo
			? municipio
			: contribuinte.complemento;

	return montarLinha([
		"11",
		formatarAlfanumerico(contribuinte.logradouro, 34),
		numeroImovel,
		formatarAlfanumerico(complemento, 22),
		formatarAlfanumerico(contribuinte.bairro, 15),
		formatarNumerico(contribuinte.cep, 8),
		formatarAlfanumerico(contribuinte.contato, 28),
		formatarNumerico(contribuinte.telefone, 12),
	]);
}
