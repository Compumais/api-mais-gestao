import type { HttpResponse } from "../../model/http-model";
import {
	atualizarEmpresa,
	buscarEmpresaPorId,
	type Empresa,
} from "../../repositories/empresa-model";
import { httpNaoEncontrado, httpOk } from "../../util/http-util";

type AtualizaEmpresaParametros = {
	id: string;
	dados: {
		nome?: string | undefined;
		cnpj?: string | undefined;
		telefone?: string | undefined;
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

	const empresaAtualizada = await atualizarEmpresa(id, {
		...dados,
		atualizadoEm: new Date().toISOString(),
	});

	if (!empresaAtualizada) {
		return httpNaoEncontrado();
	}

	return httpOk<Empresa>(empresaAtualizada);
}
