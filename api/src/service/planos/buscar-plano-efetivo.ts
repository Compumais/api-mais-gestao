import { buscarPlanoUsuario } from "@/repositories/usuarios-repositories.js";

const PLANO_LIBERADO = "ENTERPRISE";

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

function criarPlanoLiberado(
	planoExistente?: string | null,
	planoAgendado?: string | null,
	inicioCiclo?: Date | null,
	fimCiclo?: Date | null,
): PlanoEfetivoResultado {
	const hoje = new Date();
	const fim = fimCiclo ?? new Date(hoje.getFullYear() + 10, hoje.getMonth(), hoje.getDate());

	return {
		plano: planoExistente ?? PLANO_LIBERADO,
		planoAgendado: planoAgendado ?? null,
		inicioCiclo: inicioCiclo ?? hoje,
		fimCiclo: fim,
		status: "ACTIVE",
	};
}

export async function buscarPlanoEfetivoService({
	idusuario,
}: BuscarPlanoEfetivoParams): Promise<PlanoEfetivoResultado> {
	const planoUsuario = await buscarPlanoUsuario(idusuario);

	return criarPlanoLiberado(
		planoUsuario?.plano,
		planoUsuario?.plano_proximo,
		planoUsuario?.plano_inicio_ciclo,
		planoUsuario?.plano_fim_ciclo,
	);
}
