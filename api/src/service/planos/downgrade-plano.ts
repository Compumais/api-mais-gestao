import {
	buscarUsuarioPorId,
	atualizarPlanoUsuario,
} from "@/repositories/usuarios-repositories.js";
import type { TipoPlano } from "@/constants/planos.js";

interface DowngradePlanoParams {
	idusuario: string;
	planoNovo: TipoPlano;
}

export async function downgradePlanoService({
	idusuario,
	planoNovo,
}: DowngradePlanoParams) {
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) {
		throw new Error("Usu?rio n?o encontrado");
	}

	const planoAtual = (usuario.plano as TipoPlano | null) ?? "ENTERPRISE";
	const hoje = new Date();
	const fimCiclo = usuario.plano_fim_ciclo
		? new Date(usuario.plano_fim_ciclo)
		: new Date(hoje.getFullYear() + 1, hoje.getMonth(), hoje.getDate());

	await atualizarPlanoUsuario(idusuario, {
		plano: planoNovo,
		plano_proximo: null,
		plano_inicio_ciclo: hoje,
		plano_fim_ciclo: fimCiclo,
	});

	return {
		planoAtual,
		planoAgendado: planoNovo,
		dataAplicacao: hoje,
		mensagem: "Downgrade aplicado localmente sem valida??o de pagamento",
	};
}
