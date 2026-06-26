import type { HttpResponse } from "@/model/http-model.js";
import { consultarDistribuicaoDfePorChaveGateway } from "@/lib/nfe-gateway-client.js";
import { buscarCertificadoAtivoPorEmpresa } from "@/repositories/certificado-digital-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";
import {
	decodificarChaveNfe,
	validarEstruturaChaveNfe,
} from "@/util/decodificar-chave-nfe.js";
import { obterCodigoUfIbge } from "@/util/montar-config-sped-nfe.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";
import { validarChaveNfe } from "@/util/validar-chave-nfe.js";
import { validarPreConsultaChaveNfe } from "./validar-pre-consulta-chave-nfe.js";

export type DiagnosticarChaveNfeParametros = {
	idempresa: string;
	idusuario: string;
	chaveNfe: string;
	xmlOpcional?: string;
	consultarSefaz?: boolean;
};

export type DiagnosticarChaveNfeResposta = {
	chave: string;
	chaveDecodificada: ReturnType<typeof decodificarChaveNfe>;
	empresa: {
		cnpj: string;
		uf: string | null;
		ambiente: number | null;
		ambienteDescricao: string | null;
	};
	certificado: {
		cnpj: string | null;
		cnpjBaseIgualEmpresa: boolean;
	};
	preConsulta: {
		ok: boolean;
		inconsistencias: Array<{
			codigo: string;
			mensagem: string;
			severidade: "erro" | "aviso";
		}>;
	};
	sefaz: {
		consultado: boolean;
		cStat?: string;
		xMotivo?: string;
		quantidadeDocumentos?: number;
	} | null;
};

function descreverAmbiente(ambiente: number | null | undefined): string | null {
	if (ambiente === 1) return "Produção";
	if (ambiente === 2) return "Homologação";
	return ambiente === null || ambiente === undefined ? null : String(ambiente);
}

export async function diagnosticarChaveNfeService({
	idempresa,
	idusuario,
	chaveNfe,
	xmlOpcional,
	consultarSefaz = true,
}: DiagnosticarChaveNfeParametros): Promise<
	HttpResponse<DiagnosticarChaveNfeResposta>
> {
	const validacao = validarChaveNfe(chaveNfe);

	if (!validacao.ok) {
		return httpBadRequest(validacao.mensagem);
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const empresa = await buscarEmpresaPorId(idempresa);
	const empresaFiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);
	const certificadoAtivo = await buscarCertificadoAtivoPorEmpresa(idempresa);
	const credenciais = await montarCredenciaisGatewayNfe(idempresa);

	const estrutura = validarEstruturaChaveNfe(validacao.chave);
	const preConsulta = validarPreConsultaChaveNfe({
		chave: validacao.chave,
		cnpjEmpresa: empresa?.cnpj ?? "",
		ambienteEmpresa: credenciais.ok ? credenciais.nfeConfiguracao.ambiente : 0,
		xmlOpcional,
	});

	const cnpjEmpresa = normalizarCnpj(empresa?.cnpj ?? "");
	const cnpjCertificado = certificadoAtivo?.cnpjcertificado ?? null;

	let sefaz: DiagnosticarChaveNfeResposta["sefaz"] = null;

	if (consultarSefaz) {
		if (!credenciais.ok) {
			sefaz = {
				consultado: false,
				xMotivo: credenciais.pendencias.map((item) => item.mensagem).join("; "),
			};
		} else {
			try {
				const cUFAutor = empresaFiscal?.uf
					? obterCodigoUfIbge(empresaFiscal.uf)
					: undefined;

				const resposta = await consultarDistribuicaoDfePorChaveGateway({
					configJson: credenciais.configJson,
					pfxBase64: credenciais.pfxBase64,
					senha: credenciais.senha,
					chaveNfe: validacao.chave,
					...(cUFAutor !== undefined && { cUFAutor }),
				});

				sefaz = {
					consultado: true,
					cStat: resposta.cStat,
					xMotivo: resposta.xMotivo,
					quantidadeDocumentos: resposta.docZip?.length ?? 0,
				};
			} catch (erro) {
				sefaz = {
					consultado: false,
					xMotivo:
						erro instanceof Error
							? erro.message
							: "Falha ao consultar SEFAZ",
				};
			}
		}
	}

	return httpOk({
		chave: validacao.chave,
		chaveDecodificada: estrutura.ok
			? estrutura.decodificada
			: decodificarChaveNfe(validacao.chave),
		empresa: {
			cnpj: cnpjEmpresa,
			uf: empresaFiscal?.uf ?? null,
			ambiente: credenciais.ok ? credenciais.nfeConfiguracao.ambiente : null,
			ambienteDescricao: credenciais.ok
				? descreverAmbiente(credenciais.nfeConfiguracao.ambiente)
				: null,
		},
		certificado: {
			cnpj: cnpjCertificado,
			cnpjBaseIgualEmpresa:
				Boolean(cnpjCertificado) &&
				cnpjCertificado!.slice(0, 8) === cnpjEmpresa.slice(0, 8),
		},
		preConsulta: {
			ok: preConsulta.ok,
			inconsistencias: preConsulta.inconsistencias,
		},
		sefaz,
	});
}