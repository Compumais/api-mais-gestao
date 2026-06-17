import type { TipoPlano } from "@/constants/planos.js";
import { obterValorPlano } from "@/constants/planos.js";
import {
	atualizarPlanoUsuario,
	buscarUsuarioPorId,
} from "@/repositories/usuarios-repositories.js";

interface CriarPlanoParams {
	idusuario: string;
	plano: TipoPlano;
	ciclo: "MONTHLY";
	creditCard: {
		holderName: string;
		number: string;
		expiryMonth: string;
		expiryYear: string;
		ccv: string;
	};
	creditCardHolderInfo: {
		name: string;
		email: string;
		cpfCnpj: string;
		postalCode?: string;
		address?: string;
		addressNumber?: string;
		complement?: string;
		province?: string;
		city?: string;
		phone: string;
	};
	remoteIp: string;
}

export async function criarPlanoService({
	idusuario,
	plano,
}: CriarPlanoParams) {
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) {
		throw new Error("Usu?rio n?o encontrado");
	}

	const hoje = new Date();
	const fimCiclo = new Date(hoje);
	fimCiclo.setMonth(fimCiclo.getMonth() + 1);
	const valor = obterValorPlano(plano);

	await atualizarPlanoUsuario(idusuario, {
		plano,
		plano_inicio_ciclo: hoje,
		plano_fim_ciclo: fimCiclo,
		plano_proximo: null,
	});

	return {
		plano,
		status: "ACTIVE",
		valor,
		proximoVencimento: fimCiclo,
		idassinaturaasaas: null,
		urlpagamento: null,
	};
}
