import type {
	EntidadeConsultaCnpj,
	ExtrasConsultaCnpj,
	OpenCnpjDados,
} from "@/model/consulta-cnpj-model.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";
import { truncarTexto } from "@/util/texto-util.js";

export type LocalidadeConsultaCnpj = {
	cidade: string | null;
	estado: string | null;
	idestado: string | null;
	idcidade: string | null;
};

function normalizarCep(cep: string | null | undefined): string | null {
	if (!cep) return null;
	const digitos = cep.replace(/\D/g, "");
	return digitos.length > 0 ? digitos : null;
}

function sugerirIndiedest(opcaoSimples: string | null): number | null {
	if (opcaoSimples?.toUpperCase() === "S") {
		return 9;
	}
	return null;
}

export function mapearExtrasConsultaCnpj(
	dados: OpenCnpjDados,
): ExtrasConsultaCnpj {
	return {
		situacaoCadastral: dados.situacaoCadastral,
		dataSituacaoCadastral: dados.dataSituacaoCadastral,
		dataInicioAtividades: dados.dataInicioAtividades,
		naturezaJuridica: dados.naturezaJuridica,
		capitalSocial: dados.capitalSocial,
		opcaoSimples: dados.opcaoSimples,
		opcaoMei: dados.opcaoMei,
		cnaes: dados.cnaes ?? [],
		socios: (dados.socios ?? []).map((socio) => ({
			nomeSocio: socio.nomeSocio,
			descricao: socio.descricao,
			identificadorSocio: socio.identificadorSocio ?? null,
			cnpjCpfSocio: socio.cnpjCpfSocio ?? null,
			dataEntradaSociedade: socio.dataEntradaSociedade ?? null,
			nomeRepresentante: socio.nomeRepresentante ?? null,
			faixaEtaria: socio.faixaEtaria ?? null,
		})),
	};
}

export function mapearEntidadeConsultaCnpj(
	dados: OpenCnpjDados,
	localidade: LocalidadeConsultaCnpj,
): EntidadeConsultaCnpj {
	const nomeBase =
		truncarTexto(dados.nomeFantasia, 60) ??
		truncarTexto(dados.razaoSocial, 60) ??
		"";

	return {
		cnpjcpf: normalizarCnpj(dados.cnpj),
		nome: nomeBase,
		razaosocial: truncarTexto(dados.razaoSocial, 60),
		tipopessoa: 1,
		email: truncarTexto(dados.email, 200),
		telefone: truncarTexto(dados.telefone, 40),
		endereco: truncarTexto(dados.logradouro, 60),
		numeroendereco: truncarTexto(dados.numero, 6),
		complemento: truncarTexto(dados.complemento, 50),
		bairro: truncarTexto(dados.bairro, 50),
		cep: normalizarCep(dados.cep),
		cidade: localidade.cidade,
		estado: localidade.estado,
		idestado: localidade.idestado,
		idcidade: localidade.idcidade,
		indiedest: sugerirIndiedest(dados.opcaoSimples),
	};
}
