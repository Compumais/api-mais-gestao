import {
	atualizarPlanoUsuario,
	listarUsuariosComPlanoProximoVencido,
} from "@/repositories/usuarios-repositories.js";

export async function verificarCiclosService() {
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);

	const usuarios = await listarUsuariosComPlanoProximoVencido(hoje);
	let downgradesAplicados = 0;
	let planosExpirados = 0;

	for (const usuario of usuarios) {
		if (!usuario.plano_proximo) {
			continue;
		}

		planosExpirados++;

		const novoFim = new Date(hoje);
		novoFim.setFullYear(novoFim.getFullYear() + 1);

		await atualizarPlanoUsuario(usuario.id, {
			plano: usuario.plano_proximo,
			plano_proximo: null,
			plano_inicio_ciclo: hoje,
			plano_fim_ciclo: novoFim,
		});

		downgradesAplicados++;
	}

	return { downgradesAplicados, planosExpirados };
}
