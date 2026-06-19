import type { HttpResponse } from "@/model/http-model.js";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarPlanoContasComFilhos } from "@/repositories/plano-contas-repositories.js";
import { compararCodigoHierarquico } from "@/util/comparar-codigo-hierarquico.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarPlanoContasParametros = {
	idplanocontas: string;
	idusuario: string;
};

type BuscarPlanoContasResposta = {
	plano: PlanoContas;
	filhos: PlanoContas[];
};

export async function buscarPlanoContasService({
	idplanocontas,
	idusuario,
}: BuscarPlanoContasParametros): Promise<
	HttpResponse<BuscarPlanoContasResposta | null>
> {
	const { plano, filhos } = await buscarPlanoContasComFilhos(idplanocontas);

	if (!plano) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		plano.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<BuscarPlanoContasResposta>({
		plano,
		filhos: [...filhos].sort((a, b) =>
			compararCodigoHierarquico(a.codigo, b.codigo),
		),
	});
}
