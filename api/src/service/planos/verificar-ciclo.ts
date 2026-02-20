import { eq, and, lte, isNotNull } from "drizzle-orm";
import * as schema from "../../../drizzle/schema";
import { db } from "@/repositories/connection";
import { atualizarPlanoUsuario } from "@/repositories/usuarios-repositories";

/**
 * Job periódico para verificar ciclos vencidos e aplicar downgrades agendados
 * Deve ser executado diariamente (via cron job ou scheduler)
 */
export async function verificarCiclosService() {
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);

	// Buscar usuários com downgrade agendado e ciclo vencido
	const usuariosComDowngrade = await db
		.select()
		.from(schema.usuarios)
		.where(
			and(
				isNotNull(schema.usuarios.plano_proximo),
				lte(schema.usuarios.plano_fim_ciclo, hoje)
			)
		);

	const resultados = [];

	for (const usuario of usuariosComDowngrade) {
		if (!usuario.plano_proximo || !usuario.plano_fim_ciclo) {
			continue;
		}

		try {
			// Aplicar downgrade: atualizar plano e limpar plano_proximo
			await atualizarPlanoUsuario(usuario.id, {
				plano: usuario.plano_proximo,
				plano_proximo: null,
				// Manter ciclo atual ou criar novo ciclo?
				// Por padrão, manteremos o fim do ciclo e ajustar início
				plano_inicio_ciclo: new Date(usuario.plano_fim_ciclo),
				plano_fim_ciclo: (() => {
					const novoFim = new Date(usuario.plano_fim_ciclo);
					novoFim.setMonth(novoFim.getMonth() + 1);
					return novoFim;
				})(),
			});

			resultados.push({
				idusuario: usuario.id,
				email: usuario.email,
				planoAnterior: usuario.plano,
				planoNovo: usuario.plano_proximo,
				status: "aplicado",
			});
		} catch (error) {
			resultados.push({
				idusuario: usuario.id,
				email: usuario.email,
				planoAnterior: usuario.plano,
				planoNovo: usuario.plano_proximo,
				status: "erro",
				erro: error instanceof Error ? error.message : "Erro desconhecido",
			});
		}
	}

	// Também verificar usuários com ciclo vencido que precisam renovar
	// (para upgrades ou renovações normais)
	const usuariosComCicloVencido = await db
		.select()
		.from(schema.usuarios)
		.where(
			and(
				isNotNull(schema.usuarios.plano),
				lte(schema.usuarios.plano_fim_ciclo, hoje),
				eq(schema.usuarios.plano_proximo, null) // Sem downgrade agendado
			)
		);

	// Para renovações, você pode querer notificar o usuário ou processar automaticamente
	// Por enquanto, apenas logamos
	for (const usuario of usuariosComCicloVencido) {
		resultados.push({
			idusuario: usuario.id,
			email: usuario.email,
			plano: usuario.plano,
			status: "ciclo_vencido",
			mensagem: "Ciclo vencido - requer renovação",
		});
	}

	return {
		downgradesAplicados: resultados.filter((r) => r.status === "aplicado").length,
		ciclosVencidos: resultados.filter((r) => r.status === "ciclo_vencido").length,
		erros: resultados.filter((r) => r.status === "erro").length,
		resultados,
	};
}

