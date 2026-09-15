import {
	campoCnpjCpf,
	campoDataDdmmaaaa,
	campoNumerico,
	campoTexto,
	montarLinhaPipe,
} from "@/util/efd/formatador-pipe.js";
import type { ContribuinteEfd } from "../tipos-efd-icms.js";

export function montarRegistro0000(params: {
	contribuinte: ContribuinteEfd;
	dataInicio: string;
	dataFim: string;
	codVer: string;
	finalidade: "0" | "1";
}): string {
	const { contribuinte } = params;
	return montarLinhaPipe([
		"0000",
		params.codVer,
		params.finalidade,
		campoDataDdmmaaaa(params.dataInicio),
		campoDataDdmmaaaa(params.dataFim),
		campoTexto(contribuinte.razaosocial, 100),
		campoCnpjCpf(contribuinte.cnpj),
		"",
		campoTexto(contribuinte.uf, 2),
		campoTexto(contribuinte.inscricaoEstadual, 14),
		campoNumerico(contribuinte.codigoMunicipioIbge).padStart(7, "0").slice(-7),
		campoTexto(contribuinte.inscricaoMunicipal, 15),
		"",
		contribuinte.indperfil,
		String(contribuinte.indativ),
	]);
}

export function montarRegistro0001(indMov: "0" | "1"): string {
	return montarLinhaPipe(["0001", indMov]);
}

export function montarRegistro0005(contribuinte: ContribuinteEfd): string {
	return montarLinhaPipe([
		"0005",
		campoTexto(contribuinte.nomefantasia ?? contribuinte.razaosocial, 60),
		campoNumerico(contribuinte.cep).slice(0, 8),
		campoTexto(contribuinte.logradouro, 60),
		campoTexto(contribuinte.numero, 10),
		campoTexto(contribuinte.complemento, 60),
		campoTexto(contribuinte.bairro, 60),
		campoNumerico(contribuinte.telefone).slice(0, 11),
		"",
		campoTexto(contribuinte.email, 60),
	]);
}

export function montarRegistro0150(params: {
	codigo: string;
	nome: string;
	cnpjCpf: string;
	ie: string | null;
	codigoMunicipio: string | null;
	endereco: string | null;
	numero: string | null;
	complemento: string | null;
	bairro: string | null;
}): string {
	const documento = campoCnpjCpf(params.cnpjCpf);
	const ehCpf = documento.length <= 11;
	return montarLinhaPipe([
		"0150",
		campoTexto(params.codigo, 60),
		campoTexto(params.nome, 100),
		"1058",
		ehCpf ? "" : documento.padStart(14, "0"),
		ehCpf ? documento.padStart(11, "0") : "",
		campoTexto(params.ie, 14),
		campoNumerico(params.codigoMunicipio).padStart(7, "0").slice(-7),
		"",
		campoTexto(params.endereco, 60),
		campoTexto(params.numero, 10),
		campoTexto(params.complemento, 60),
		campoTexto(params.bairro, 60),
	]);
}

export function montarRegistro0190(unidade: string, descricao: string): string {
	return montarLinhaPipe([
		"0190",
		campoTexto(unidade, 6),
		campoTexto(descricao, 60),
	]);
}

export function montarRegistro0200(params: {
	codigo: string;
	descricao: string;
	barra: string | null;
	unidade: string;
	tipoItem: string;
	ncm: string | null;
	cest: string | null;
	aliquotaIcms: string | null;
}): string {
	const tipo =
		campoNumerico(params.tipoItem).padStart(2, "0").slice(-2) || "00";
	const ncm = campoNumerico(params.ncm).slice(0, 8);
	const aliq = params.aliquotaIcms
		? String(params.aliquotaIcms).replace(".", ",")
		: "";
	return montarLinhaPipe([
		"0200",
		campoTexto(params.codigo, 60),
		campoTexto(params.descricao, 120),
		campoTexto(params.barra, 14),
		"",
		campoTexto(params.unidade, 6),
		tipo,
		ncm,
		"",
		ncm.slice(0, 2),
		"",
		aliq,
		campoNumerico(params.cest).slice(0, 7),
	]);
}

export function montarRegistro0990(qtdLinhas: number): string {
	return montarLinhaPipe(["0990", String(qtdLinhas)]);
}
