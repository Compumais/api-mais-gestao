import {
	buscarCertificadoAtivoPorEmpresa,
	buscarCertificadoDigitalPorId,
} from "@/repositories/certificado-digital-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarNfseConfiguracaoPorEmpresa } from "@/repositories/nfse-configuracao-repositories.js";
import { buscarNfseSeriePadrao } from "@/repositories/nfse-serie-repositories.js";
import { validarPreRequisitosEmissaoNfse } from "@/util/validar-pre-requisitos-emissao-nfse.js";

export async function carregarContextoEmissaoNfse(idempresa: string) {
	const empresa = await buscarEmpresaPorId(idempresa);
	const empresaFiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);
	const nfseConfiguracao = await buscarNfseConfiguracaoPorEmpresa(idempresa);

	let certificadoAtivo = null;
	if (nfseConfiguracao?.idcertificadoativo) {
		certificadoAtivo = await buscarCertificadoDigitalPorId(
			nfseConfiguracao.idcertificadoativo,
		);
	}
	if (!certificadoAtivo) {
		certificadoAtivo = await buscarCertificadoAtivoPorEmpresa(idempresa);
	}

	const seriePadrao = await buscarNfseSeriePadrao(idempresa);

	const pendencias = validarPreRequisitosEmissaoNfse({
		empresa: empresa!,
		empresaFiscal,
		nfseConfiguracao,
		certificadoAtivo: certificadoAtivo ?? undefined,
		seriePadrao,
	});

	return {
		empresa,
		empresaFiscal,
		nfseConfiguracao,
		certificadoAtivo,
		seriePadrao,
		pendencias,
	};
}
