import { v4 as uuidv4 } from "uuid";
import type { PlanoContas } from "@/model/plano-contas-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import {
	buscarPlanoContasPorId,
	buscarProximoCodigoComPai,
	buscarProximoCodigoSemPai,
	criarPlanoContas,
	excluirPlanoContas,
	type NovoPlanoContas,
} from "@/repositories/plano-contas-repositories";
import { httpCriacao, httpProibido } from "@/util/http-util";
import { verificarPermissao } from "@/util/verificar-permissao";
import { criarAuditoriaService } from "../auditoria/criar-auditoria";

export async function criarPlanoContasService(
	dadosPlanoContas: NovoPlanoContas,
	usuarioId: string,
	roles: string | string[],
) {
	const temPermissao = verificarPermissao(roles, [
		"proprietario",
		"financeiro",
	]);

	console.log(temPermissao, roles);

	if (!temPermissao) {
		return httpProibido();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		usuarioId,
		dadosPlanoContas.idempresa,
	);

	console.log(usuarioPertenceEmpresa);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	let codigo: string;

	if (dadosPlanoContas.idplanocontas) {
		const planoPai = await buscarPlanoContasPorId(
			dadosPlanoContas.idplanocontas,
		);

		if (planoPai?.idempresa !== dadosPlanoContas.idempresa) {
			throw new Error("Plano de contas pai não pertence à mesma empresa");
		}

		const codigoPai = planoPai?.codigo;
		if (!codigoPai) {
			throw new Error("Plano de contas pai não possui código");
		}

		const proximoCodigoFilho = await buscarProximoCodigoComPai(
			dadosPlanoContas.idempresa,
			dadosPlanoContas.idplanocontas,
		);

		codigo = `${codigoPai} ${proximoCodigoFilho}`;
	} else {
		codigo = await buscarProximoCodigoSemPai(dadosPlanoContas.idempresa);
	}

	const planoContas = await criarPlanoContas({
		...dadosPlanoContas,
		codigo,
	});

	if (!planoContas) {
		throw new Error("Erro ao criar plano de contas");
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "Criar Plano de Contas",
		idusuario: usuarioId,
		recurso: "Plano de Contas",
		idrecurso: planoContas.id,
		criadoem: new Date().toISOString(),
		metadados: {
			idplanocontas: planoContas.id,
			nome: planoContas.nome,
		},
	});

	if (!auditoria) {
		await excluirPlanoContas({ id: planoContas.id });

		throw new Error("Erro ao criar auditoria");
	}

	return httpCriacao<PlanoContas>(planoContas);
}
