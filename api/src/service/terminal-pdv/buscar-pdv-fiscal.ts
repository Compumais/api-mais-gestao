import type { HttpResponse } from "@/model/http-model.js";
import { buscarCertificadoAtivoPorEmpresa } from "@/repositories/certificado-digital-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import { buscarNfeSeriePorId } from "@/repositories/nfe-serie-repositories.js";
import { buscarTerminalPdvAtivoPorNumero } from "@/repositories/terminal-pdv-repositories.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { descriptografarCredenciaisCertificado } from "@/util/montar-config-sped-nfe.js";

export type PdvFiscalCertificado = {
	apelido: string;
	cnpjcertificado: string;
	validadeinicio: string | null;
	validadefim: string | null;
	pfxBase64: string;
	senha: string;
};

export type PdvFiscalResposta = {
	numeropdv: number;
	descricao: string | null;
	ativo: boolean;
	ambiente: number;
	csc_id: string | null;
	csc_token: string | null;
	cnpj: string | null;
	uf: string | null;
	serie: string;
	numeroproximo: number;
	certificado: PdvFiscalCertificado | null;
};

export async function buscarPdvFiscalService({
	idempresa,
	idusuario,
	numeropdv,
}: {
	idempresa: string;
	idusuario: string;
	numeropdv: number;
}): Promise<HttpResponse<PdvFiscalResposta | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa) {
		return httpNaoEncontrado();
	}

	const terminal = await buscarTerminalPdvAtivoPorNumero(idempresa, numeropdv);
	if (!terminal) {
		return httpBadRequest(
			`Cadastre o PDV ${numeropdv} no retaguarda (NFC-e → Terminais PDV) com série própria`,
			{ codigoErro: "TERMINAL_PDV_AUSENTE" },
		);
	}

	const serie = await buscarNfeSeriePorId(terminal.idnfeserie);
	if (!serie || serie.idempresa !== idempresa || serie.modelo !== "65") {
		return httpBadRequest("Série NFC-e do terminal inválida ou inativa", {
			codigoErro: "TERMINAL_PDV_AUSENTE",
		});
	}

	const [nfceConfig, empresaFiscal, certificadoAtivo] = await Promise.all([
		buscarNfceConfiguracaoPorEmpresa(idempresa),
		buscarEmpresaFiscalPorEmpresa(idempresa),
		buscarCertificadoAtivoPorEmpresa(idempresa),
	]);

	const ambiente = nfceConfig?.ambiente ?? 2;
	const csc_id =
		ambiente === 1
			? (nfceConfig?.idcsc_producao ?? null)
			: (nfceConfig?.idcsc_homologacao ?? null);
	const csc_token =
		ambiente === 1
			? (nfceConfig?.csctoken_producao ?? null)
			: (nfceConfig?.csctoken_homologacao ?? null);

	let certificado: PdvFiscalCertificado | null = null;
	if (certificadoAtivo) {
		try {
			const credenciais =
				descriptografarCredenciaisCertificado(certificadoAtivo);
			certificado = {
				apelido: certificadoAtivo.apelido,
				cnpjcertificado: certificadoAtivo.cnpjcertificado,
				validadeinicio: certificadoAtivo.validadeinicio ?? null,
				validadefim: certificadoAtivo.validadefim ?? null,
				pfxBase64: credenciais.pfxBase64,
				senha: credenciais.senha,
			};
		} catch {
			certificado = null;
		}
	}

	return httpOk({
		numeropdv: terminal.numeropdv,
		descricao: terminal.descricao,
		ativo: terminal.ativo,
		ambiente,
		csc_id,
		csc_token,
		cnpj: empresa.cnpj ?? null,
		uf: empresaFiscal?.uf ?? null,
		serie: serie.serie,
		numeroproximo: serie.numeroproximo,
		certificado,
	});
}
