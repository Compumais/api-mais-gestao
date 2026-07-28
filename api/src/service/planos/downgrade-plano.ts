import { buscarPlanoSaasPorCodigo } from "@/repositories/saas-catalog-repositories.js";
import {
	atualizarPlanoUsuario,
	buscarUsuarioPorId,
} from "@/repositories/usuarios-repositories.js";

export async function downgradePlanoService({
	idusuario,
	planoNovo,
}: {
	idusuario: string;
	planoNovo: string;
}) {
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) throw new Error("Usuário não encontrado");

	const planoAtual = usuario.plano?.toUpperCase() ?? null;
	if (!planoAtual) throw new Error("Usuário não possui plano ativo");

	const planoAtualCat = await buscarPlanoSaasPorCodigo(planoAtual);
	const planoCat = await buscarPlanoSaasPorCodigo(planoNovo);
	if (!planoCat?.ativo) throw new Error("Plano inválido");
	if ((planoCat.ordem ?? 0) >= (planoAtualCat?.ordem ?? 0)) {
		throw new Error("O plano informado não é um downgrade");
	}

	const fimCiclo = usuario.plano_fim_ciclo
		? new Date(usuario.plano_fim_ciclo)
		: new Date();

	await atualizarPlanoUsuario(idusuario, {
		plano_proximo: planoCat.codigo,
	});

	return {
		planoAtual,
		planoAgendado: planoCat.codigo,
		dataAplicacao: fimCiclo,
		mensagem:
			"Downgrade agendado para o fim do ciclo atual. O plano atual permanece ativo até lá.",
	};
}
