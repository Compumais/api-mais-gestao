import { buscarAssinaturaPorEmpresa } from "@/repositories/assinatura-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarPlanoUsuario } from "@/repositories/usuarios-repositories.js";

export type PlanoEfetivoResultado = {
	plano: string | null;
	planoAgendado: string | null;
	inicioCiclo: Date | null;
	fimCiclo: Date | null;
	status: "ACTIVE" | "SEM_PLANO";
	mensagem?: string;
};

type BuscarPlanoEfetivoParams = {
	idusuario: string;
	idempresa?: string;
};

/**
 * Retorna o plano efetivo para o usuário no contexto atual.
 * Se idempresa fornecido e usuário pertence à empresa: usa assinatura da empresa ou plano do proprietário.
 * Caso contrário: usa plano do próprio usuário (usuarios.plano).
 */
export async function buscarPlanoEfetivoService({
	idusuario,
	idempresa,
}: BuscarPlanoEfetivoParams): Promise<PlanoEfetivoResultado> {
	if (idempresa) {
		const pertence = await verificarUsuarioPertenceEmpresa(
			idusuario,
			idempresa,
		);
		if (!pertence) {
			// Usuário não pertence à empresa, fallback para plano do usuário
			return obterPlanoDoUsuario(idusuario);
		}

		// Buscar assinatura da empresa
		const assinatura = await buscarAssinaturaPorEmpresa(idempresa);

		if (assinatura && assinatura.status === "ACTIVE" && assinatura.plano) {
			const fimCiclo = assinatura.proximovencimento
				? new Date(assinatura.proximovencimento)
				: null;
			let inicioCiclo: Date | null = null;
			if (fimCiclo) {
				inicioCiclo = new Date(fimCiclo);
				inicioCiclo.setMonth(inicioCiclo.getMonth() - 1);
			}

			return {
				plano: assinatura.plano,
				planoAgendado: null,
				inicioCiclo,
				fimCiclo,
				status: "ACTIVE",
			};
		}

		// Fallback: plano do proprietário da empresa (sistema legado)
		const empresa = await buscarEmpresaPorId(idempresa);
		if (empresa?.idproprietario) {
			const planoProprietario = await buscarPlanoUsuario(
				empresa.idproprietario,
			);
			if (planoProprietario?.plano) {
				return {
					plano: planoProprietario.plano,
					planoAgendado: planoProprietario.plano_proximo,
					inicioCiclo: planoProprietario.plano_inicio_ciclo,
					fimCiclo: planoProprietario.plano_fim_ciclo,
					status: "ACTIVE",
				};
			}
		}

		return {
			plano: null,
			planoAgendado: null,
			inicioCiclo: null,
			fimCiclo: null,
			status: "SEM_PLANO",
			mensagem: "Empresa não possui plano ativo",
		};
	}

	return obterPlanoDoUsuario(idusuario);
}

async function obterPlanoDoUsuario(
	idusuario: string,
): Promise<PlanoEfetivoResultado> {
	const planoUsuario = await buscarPlanoUsuario(idusuario);

	if (!planoUsuario || !planoUsuario.plano) {
		return {
			plano: null,
			planoAgendado: null,
			inicioCiclo: null,
			fimCiclo: null,
			status: "SEM_PLANO",
			mensagem: "Usuário não possui plano ativo",
		};
	}

	return {
		plano: planoUsuario.plano,
		planoAgendado: planoUsuario.plano_proximo,
		inicioCiclo: planoUsuario.plano_inicio_ciclo,
		fimCiclo: planoUsuario.plano_fim_ciclo,
		status: "ACTIVE",
	};
}
