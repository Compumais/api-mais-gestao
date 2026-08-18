import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { EmpresaFiscal } from "@/model/nfe-emissao-model.js";
import {
	atualizarEmpresaFiscal,
	buscarEmpresaFiscalPorEmpresa,
	criarEmpresaFiscal,
} from "@/repositories/empresa-fiscal-repositories.js";
import {
	atualizarEmpresa,
	buscarEmpresaPorId,
} from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	inteiroOuNulo,
	normalizarCodigoMunicipioIbge,
	normalizarCrt,
	normalizarUfFiscal,
} from "@/util/normalizar-dados-empresa-fiscal.js";
import {
	derivarRegimeTributarioDoCrt,
	normalizarRegimeTributario,
} from "@/util/regime-tributario-empresa.js";

export type EmpresaFiscalBody = {
	razaosocial?: string | null;
	nomefantasia?: string | null;
	inscricaoestadual?: string | null;
	inscricaomunicipal?: string | null;
	crt?: number | null;
	cnae?: string | null;
	indicadorie?: number | null;
	logradouro?: string | null;
	numero?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	cep?: string | null;
	codigomunicipioibge?: string | null;
	uf?: string | null;
	codigopais?: string | null;
	telefone?: string | null;
	email?: string | null;
	regimetributario?: string | null;
};

type BuscarEmpresaFiscalParametros = {
	idempresa: string;
	idusuario: string;
};

type AtualizarEmpresaFiscalParametros = {
	idempresa: string;
	idusuario: string;
	dados: EmpresaFiscalBody;
};

function hidratarFiscalComEmpresa(
	fiscal: EmpresaFiscal,
	empresa: NonNullable<Awaited<ReturnType<typeof buscarEmpresaPorId>>>,
): EmpresaFiscal {
	const crt =
		normalizarCrt(fiscal.crt) ??
		(empresa.regimetributario === "SN"
			? 1
			: empresa.regimetributario
				? 3
				: null);

	return {
		...fiscal,
		razaosocial: fiscal.razaosocial || empresa.nome || null,
		telefone: fiscal.telefone || empresa.telefone || null,
		email: fiscal.email || empresa.email || null,
		logradouro: fiscal.logradouro || empresa.endereco || null,
		numero: fiscal.numero || empresa.numero || null,
		complemento: fiscal.complemento || empresa.complemento || null,
		bairro: fiscal.bairro || empresa.bairro || null,
		cep: fiscal.cep || empresa.cep || null,
		uf:
			normalizarUfFiscal(fiscal.uf) ||
			normalizarUfFiscal(empresa.idestado) ||
			null,
		codigomunicipioibge:
			normalizarCodigoMunicipioIbge(fiscal.codigomunicipioibge) ||
			normalizarCodigoMunicipioIbge(empresa.idcidade) ||
			null,
		regimetributario:
			fiscal.regimetributario ||
			empresa.regimetributario ||
			derivarRegimeTributarioDoCrt(crt),
		crt,
		indicadorie: inteiroOuNulo(fiscal.indicadorie) ?? 1,
	};
}

export async function buscarEmpresaFiscalService({
	idempresa,
	idusuario,
}: BuscarEmpresaFiscalParametros): Promise<HttpResponse<EmpresaFiscal | null>> {
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

	let fiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);

	if (!fiscal) {
		const agora = new Date().toISOString();
		const crtPadrao = empresa.regimetributario === "SN" ? 1 : 3;
		fiscal = await criarEmpresaFiscal({
			id: uuidv4(),
			idempresa,
			regimetributario: empresa.regimetributario,
			razaosocial: empresa.nome,
			telefone: empresa.telefone,
			email: empresa.email,
			logradouro: empresa.endereco || null,
			numero: empresa.numero || null,
			complemento: empresa.complemento || null,
			bairro: empresa.bairro || null,
			cep: empresa.cep || null,
			uf: empresa.idestado || null,
			codigomunicipioibge: empresa.idcidade || null,
			crt: empresa.regimetributario ? crtPadrao : null,
			criadoem: agora,
			atualizadoem: agora,
		});
	}

	return httpOk<EmpresaFiscal | null>(
		fiscal ? hidratarFiscalComEmpresa(fiscal, empresa) : null,
	);
}

export async function atualizarEmpresaFiscalService({
	idempresa,
	idusuario,
	dados,
}: AtualizarEmpresaFiscalParametros): Promise<
	HttpResponse<EmpresaFiscal | null>
> {
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

	if (dados.crt != null && normalizarCrt(dados.crt) == null) {
		return httpBadRequest("CRT inválido. Informe um valor entre 1 e 4.");
	}

	const crtNormalizado = normalizarCrt(dados.crt);

	// CRT é a fonte da verdade; regime legado é derivado para outros módulos.
	const regimeDerivado =
		dados.crt !== undefined
			? derivarRegimeTributarioDoCrt(crtNormalizado)
			: dados.regimetributario !== undefined
				? normalizarRegimeTributario(dados.regimetributario)
				: undefined;

	if (
		dados.regimetributario !== undefined &&
		dados.crt === undefined &&
		dados.regimetributario !== null &&
		dados.regimetributario !== "" &&
		!regimeDerivado
	) {
		return httpBadRequest("Regime tributário inválido. Use SN, LP ou LR.");
	}

	if (regimeDerivado !== undefined) {
		await atualizarEmpresa(idempresa, {
			regimetributario: regimeDerivado,
			atualizadoem: new Date().toISOString(),
		});
	}

	const agora = new Date().toISOString();
	let fiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);

	const payload = {
		...dados,
		crt: dados.crt !== undefined ? crtNormalizado : dados.crt,
		uf: dados.uf !== undefined ? normalizarUfFiscal(dados.uf) : dados.uf,
		codigomunicipioibge:
			dados.codigomunicipioibge !== undefined
				? normalizarCodigoMunicipioIbge(dados.codigomunicipioibge)
				: dados.codigomunicipioibge,
		indicadorie:
			dados.indicadorie !== undefined
				? (inteiroOuNulo(dados.indicadorie) ?? 1)
				: dados.indicadorie,
		regimetributario:
			regimeDerivado !== undefined ? regimeDerivado : dados.regimetributario,
		atualizadoem: agora,
	};

	if (!fiscal) {
		fiscal = await criarEmpresaFiscal({
			id: uuidv4(),
			idempresa,
			...payload,
			criadoem: agora,
		});
	} else {
		fiscal = await atualizarEmpresaFiscal(fiscal.id, payload);
	}

	if (!fiscal) {
		return httpErro();
	}

	return httpOk<EmpresaFiscal>(hidratarFiscalComEmpresa(fiscal, empresa));
}
