import {
	buscarUsuarioPorId,
	atualizarPlanoUsuario,
} from "@/repositories/usuarios-repositories.js";
import { isPlanoInferior } from "@/constants/planos.js";
import type { TipoPlano } from "@/constants/planos.js";

interface DowngradePlanoParams {
	idusuario: string;
	planoNovo: TipoPlano;
}

export async function downgradePlanoService({
	idusuario,
	planoNovo,
}: DowngradePlanoParams) {
	// 1. Verificar se usuário existe e possui plano
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) {
		throw new Error("Usuário não encontrado");
	}

	if (!usuario.plano) {
		throw new Error("Usuário não possui plano ativo");
	}

	const planoAtual = usuario.plano as TipoPlano;

	// 2. Validar que o novo plano é inferior
	if (!isPlanoInferior(planoAtual, planoNovo)) {
		throw new Error(
			"O novo plano deve ser inferior ao plano atual para realizar downgrade",
		);
	}

	// 3. Verificar se ciclo atual está pago (verificar se fim do ciclo é no futuro)
	if (!usuario.plano_fim_ciclo) {
		throw new Error("Ciclo de plano inválido");
	}

	const fimCiclo = new Date(usuario.plano_fim_ciclo);
	const hoje = new Date();

	// Se o ciclo já venceu, não pode fazer downgrade agendado
	if (fimCiclo <= hoje) {
		throw new Error("Ciclo atual já venceu. Renove o plano primeiro.");
	}

	// 4. Agendar downgrade: definir plano_proximo sem alterar plano atual
	await atualizarPlanoUsuario(idusuario, {
		plano_proximo: planoNovo,
		// Não alterar plano, inicio_ciclo, fim_ciclo
	});

	return {
		planoAtual,
		planoAgendado: planoNovo,
		dataAplicacao: fimCiclo,
		mensagem: `Downgrade agendado para ${fimCiclo.toLocaleDateString("pt-BR")}`,
	};
}
