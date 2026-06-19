import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarEmpresa,
	buscarEmpresaPorId,
	type Empresa,
} from "@/repositories/empresa-repositories.js";
import { httpBadRequest, httpNaoEncontrado, httpOk } from "@/util/http-util.js";
import { normalizarRegimeTributario } from "@/util/regime-tributario-empresa.js";

type AtualizaEmpresaParametros = {
	id: string;
	dados: {
		nome?: string | undefined;
		cnpj?: string | undefined;
		telefone?: string | undefined;
		regimetributario?: string | null | undefined;
	};
};

export async function atualizarEmpresaService({
	id,
	dados,
}: AtualizaEmpresaParametros): Promise<HttpResponse<Empresa | null>> {
	const empresaExistente = await buscarEmpresaPorId(id);

	if (!empresaExistente) {
		return httpNaoEncontrado();
	}

	let regimetributario: string | null | undefined;

	if (dados.regimetributario !== undefined) {
		const regimeNormalizado = normalizarRegimeTributario(dados.regimetributario);

		if (
			dados.regimetributario !== null &&
			dados.regimetributario !== "" &&
			!regimeNormalizado
		) {
			return httpBadRequest("Regime tributário inválido. Use SN, LP ou LR.");
		}

		regimetributario = regimeNormalizado;
	}

	const empresaAtualizada = await atualizarEmpresa(id, {
		nome: dados.nome,
		cnpj: dados.cnpj,
		telefone: dados.telefone,
		regimetributario,
		atualizadoem: new Date().toISOString(),
	});

	if (!empresaAtualizada) {
		return httpNaoEncontrado();
	}

	return httpOk<Empresa>(empresaAtualizada);
}
