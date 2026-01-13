import type { HttpResponse } from "@/model/http-model";
import type { PlanoContas } from "@/model/plano-contas-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { buscarPlanoContasComFilhos } from "@/repositories/plano-contas-repositories";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";

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
		filhos,
	});
}
