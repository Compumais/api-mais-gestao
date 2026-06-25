import { v4 as uuidv4 } from "uuid";
import type { EmpresaFiscal } from "@/model/nfe-emissao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	atualizarEmpresaFiscal,
	buscarEmpresaFiscalPorEmpresa,
	criarEmpresaFiscal,
} from "@/repositories/empresa-fiscal-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { atualizarEmpresa } from "@/repositories/empresa-repositories.js";
import { httpBadRequest, httpErro, httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import { normalizarRegimeTributario } from "@/util/regime-tributario-empresa.js";

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
		fiscal = await criarEmpresaFiscal({
			id: uuidv4(),
			idempresa,
			regimetributario: empresa.regimetributario,
			criadoem: agora,
			atualizadoem: agora,
		});
	}

	return httpOk<EmpresaFiscal | null>(fiscal ?? null);
}

export async function atualizarEmpresaFiscalService({
	idempresa,
	idusuario,
	dados,
}: AtualizarEmpresaFiscalParametros): Promise<HttpResponse<EmpresaFiscal | null>> {
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

	let regimetributario = dados.regimetributario;
	if (regimetributario !== undefined) {
		const normalizado = normalizarRegimeTributario(regimetributario);
		if (
			regimetributario !== null &&
			regimetributario !== "" &&
			!normalizado
		) {
			return httpBadRequest("Regime tributário inválido. Use SN, LP ou LR.");
		}
		regimetributario = normalizado;
		await atualizarEmpresa(idempresa, {
			regimetributario: normalizado,
			atualizadoem: new Date().toISOString(),
		});
	}

	const agora = new Date().toISOString();
	let fiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);

	const payload = {
		...dados,
		regimetributario,
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

	return httpOk<EmpresaFiscal>(fiscal);
}
