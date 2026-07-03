import type { HttpResponse } from "@/model/http-model.js";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarPlanoContasPorId,
	listarTodosPlanoContasPorEmpresa,
	moverPlanoContasComCodigos,
} from "@/repositories/plano-contas-repositories.js";
import { compararCodigoHierarquico } from "@/util/comparar-codigo-hierarquico.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import { verificarPermissao } from "@/util/verificar-permissao.js";

type MoverPlanoContasParametros = {
	id: string;
	idusuario: string;
	roles: string | string[];
	idplanocontasdestino: string | null;
};

function ehDescendente(
	planos: PlanoContas[],
	idorigem: string,
	iddestino: string,
): boolean {
	const planoPorId = new Map(planos.map((plano) => [plano.id, plano]));
	let atual = planoPorId.get(iddestino);

	while (atual?.idplanocontas) {
		if (atual.idplanocontas === idorigem) {
			return true;
		}
		atual = planoPorId.get(atual.idplanocontas);
	}

	return false;
}

function gerarCodigosHierarquicos(
	planos: PlanoContas[],
	idmovido: string,
	idpaidestino: string | null,
): { id: string; codigo: string }[] {
	const filhosPorPai = new Map<string | null, PlanoContas[]>();

	for (const plano of planos) {
		const idpai = plano.id === idmovido ? idpaidestino : plano.idplanocontas;
		const filhos = filhosPorPai.get(idpai) ?? [];
		filhos.push(plano);
		filhosPorPai.set(idpai, filhos);
	}

	// Ordena irmãos pelo código atual, mas o nó movido vai para o fim da nova lista
	for (const filhos of filhosPorPai.values()) {
		filhos.sort((a, b) => {
			if (a.id === idmovido) {
				return 1;
			}
			if (b.id === idmovido) {
				return -1;
			}
			return compararCodigoHierarquico(a.codigo, b.codigo);
		});
	}

	const codigosAlterados: { id: string; codigo: string }[] = [];

	const atribuirCodigos = (idpai: string | null, codigoPai: string | null) => {
		const filhos = filhosPorPai.get(idpai) ?? [];

		filhos.forEach((filho, indice) => {
			const codigo = codigoPai ? `${codigoPai} ${indice + 1}` : `${indice + 1}`;

			if (filho.codigo !== codigo) {
				codigosAlterados.push({ id: filho.id, codigo });
			}

			atribuirCodigos(filho.id, codigo);
		});
	};

	atribuirCodigos(null, null);

	return codigosAlterados;
}

export async function moverPlanoContasService({
	id,
	idusuario,
	roles,
	idplanocontasdestino,
}: MoverPlanoContasParametros): Promise<HttpResponse<PlanoContas | null>> {
	const temPermissao = verificarPermissao(roles, [
		"proprietario",
		"financeiro",
	]);

	if (!temPermissao) {
		return httpProibido();
	}

	const plano = await buscarPlanoContasPorId(id);

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

	if (idplanocontasdestino === id) {
		return {
			success: false,
			status: 400,
			error: "Não é possível mover um plano de contas para dentro dele mesmo",
			code: "PLANO_CONTAS_MOVER_PARA_SI_MESMO",
		};
	}

	if (plano.idplanocontas === idplanocontasdestino) {
		return httpOk<PlanoContas>(plano);
	}

	const planos = await listarTodosPlanoContasPorEmpresa(plano.idempresa);

	if (idplanocontasdestino) {
		const destino = planos.find(
			(planoAtual) => planoAtual.id === idplanocontasdestino,
		);

		if (!destino) {
			return httpNaoEncontrado();
		}

		if (destino.inativo === 1) {
			return {
				success: false,
				status: 400,
				error: "Não é possível mover para um plano de contas inativo",
				code: "PLANO_CONTAS_MOVER_DESTINO_INATIVO",
			};
		}

		if (ehDescendente(planos, id, idplanocontasdestino)) {
			return {
				success: false,
				status: 400,
				error:
					"Não é possível mover um plano de contas para dentro de um de seus descendentes",
				code: "PLANO_CONTAS_MOVER_REFERENCIA_CIRCULAR",
			};
		}
	}

	const codigosAlterados = gerarCodigosHierarquicos(
		planos,
		id,
		idplanocontasdestino,
	);

	await moverPlanoContasComCodigos(id, idplanocontasdestino, codigosAlterados);

	const planoAtualizado = await buscarPlanoContasPorId(id);

	return httpOk<PlanoContas | null>(planoAtualizado ?? null);
}
