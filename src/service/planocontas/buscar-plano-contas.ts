import type { HttpResponse } from "@/model/http-model";
import type { PlanoContas } from "@/model/plano-contas-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/clientes-repositories";
import {
	buscarPlanoContasComFilhos,
} from "@/repositories/plano-contas-repositories";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";

type BuscarPlanoContasParametros = {
	planoContasId: string;
	userId: string;
};

type BuscarPlanoContasResposta = {
	plano: PlanoContas;
	filhos: PlanoContas[];
};

export async function buscarPlanoContasService({
	planoContasId,
	userId,
}: BuscarPlanoContasParametros): Promise<HttpResponse<BuscarPlanoContasResposta | null>> {
	const { plano, filhos } = await buscarPlanoContasComFilhos(planoContasId);

	if (!plano) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		userId,
		plano.empresaId,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<BuscarPlanoContasResposta>({
		plano,
		filhos,
	});
}

