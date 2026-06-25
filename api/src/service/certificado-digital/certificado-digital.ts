import { v4 as uuidv4 } from "uuid";
import type { CertificadoDigitalResumo } from "@/model/nfe-emissao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	ativarCertificadoDigital,
	criarCertificadoDigital,
	excluirCertificadoDigital,
	listarCertificadosDigitaisPorEmpresa,
} from "@/repositories/certificado-digital-repositories.js";
import { obterInfoCertificadoGateway } from "@/lib/nfe-gateway-client.js";
import {
	criptografarTexto,
	gerarThumbprint,
	normalizarCnpj,
} from "@/util/criptografia-certificado.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ParametrosBase = {
	idempresa: string;
	idusuario: string;
};

export async function listarCertificadosDigitaisService({
	idempresa,
	idusuario,
}: ParametrosBase): Promise<HttpResponse<{ data: CertificadoDigitalResumo[] }>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const data = await listarCertificadosDigitaisPorEmpresa(idempresa);
	return httpOk({ data });
}

type CriarCertificadoParametros = ParametrosBase & {
	apelido: string;
	senha: string;
	arquivopfxBase64: string;
};

export async function criarCertificadoDigitalService({
	idempresa,
	idusuario,
	apelido,
	senha,
	arquivopfxBase64,
}: CriarCertificadoParametros): Promise<HttpResponse<CertificadoDigitalResumo | null>> {
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

	const pfxBuffer = Buffer.from(arquivopfxBase64, "base64");
	if (pfxBuffer.length === 0) {
		return httpBadRequest("Arquivo PFX inválido");
	}

	const info = await obterInfoCertificadoGateway({
		pfxBase64: arquivopfxBase64,
		senha,
	});

	if (!info.sucesso || !info.cnpj) {
		return httpBadRequest(info.erro ?? "Não foi possível validar o certificado");
	}

	const cnpjEmpresa = normalizarCnpj(empresa.cnpj);
	if (info.cnpj !== cnpjEmpresa) {
		return httpBadRequest("CNPJ do certificado não corresponde ao CNPJ da empresa");
	}

	const agora = new Date().toISOString();
	const certificados = await listarCertificadosDigitaisPorEmpresa(idempresa);
	const ativar = certificados.length === 0;

	const registro = await criarCertificadoDigital({
		id: uuidv4(),
		idempresa,
		apelido,
		cnpjcertificado: info.cnpj,
		arquivopfxcriptografado: criptografarTexto(pfxBuffer.toString("base64")),
		senhacriptografada: criptografarTexto(senha),
		validadeinicio: info.validadeInicio ?? null,
		validadefim: info.validadeFim ?? null,
		serial: info.serial ?? null,
		thumbprint: gerarThumbprint(pfxBuffer),
		ativo: ativar,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!registro) {
		return httpErro();
	}

	const { arquivopfxcriptografado: _pfx, senhacriptografada: _senha, ...resumo } =
		registro;

	return httpCriacao<CertificadoDigitalResumo>(resumo);
}

export async function ativarCertificadoDigitalService({
	id,
	idempresa,
	idusuario,
}: ParametrosBase & { id: string }): Promise<
	HttpResponse<CertificadoDigitalResumo | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await ativarCertificadoDigital(id, idempresa);
	if (!registro) {
		return httpNaoEncontrado();
	}

	return httpOk(registro);
}

export async function excluirCertificadoDigitalService({
	id,
	idempresa,
	idusuario,
}: ParametrosBase & { id: string }): Promise<HttpResponse<null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await excluirCertificadoDigital(id);
	if (!registro || registro.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
