import { v4 as uuidv4 } from "uuid";
import type { PlanoContas } from "@/model/plano-contas-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/clientes-repositories";
import {
	buscarPlanoContasPorId,
	buscarProximoCodigoComPai,
	buscarProximoCodigoSemPai,
	criarPlanoContas,
	excluirPlanoContas,
	type NovoPlanoContas,
} from "@/repositories/plano-contas-repositories";
import { httpCriacao, httpProibido } from "@/util/http-util";
import { criarAuditoriaService } from "../auditoria/criar-auditoria";

export async function criarPlanoContasService(
	dadosPlanoContas: NovoPlanoContas,
	usuarioId: string,
) {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		usuarioId,
		dadosPlanoContas.empresaId,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	let codigo: string;

	if (dadosPlanoContas.planoContasId) {
		const planoPai = await buscarPlanoContasPorId(
			dadosPlanoContas.planoContasId,
		);

		if (!planoPai) {
			throw new Error("Plano de contas pai não encontrado");
		}

		if (planoPai.empresaId !== dadosPlanoContas.empresaId) {
			throw new Error("Plano de contas pai não pertence à mesma empresa");
		}

		const codigoPai = planoPai.codigo;
		if (!codigoPai) {
			throw new Error("Plano de contas pai não possui código");
		}

		const proximoCodigoFilho = await buscarProximoCodigoComPai(
			dadosPlanoContas.empresaId,
			dadosPlanoContas.planoContasId,
		);

		codigo = `${codigoPai} ${proximoCodigoFilho}`;
	} else {
		codigo = await buscarProximoCodigoSemPai(dadosPlanoContas.empresaId);
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
		userId: usuarioId,
		recurso: "Plano de Contas",
		recursoId: planoContas.id,
		criadoEm: new Date().toISOString(),
		metadados: {
			planoContasId: planoContas.id,
			nome: planoContas.nome,
		},
	});

	if (!auditoria) {
		await excluirPlanoContas({ id: planoContas.id });

		throw new Error("Erro ao criar auditoria");
	}

	return httpCriacao<PlanoContas>(planoContas);
}
