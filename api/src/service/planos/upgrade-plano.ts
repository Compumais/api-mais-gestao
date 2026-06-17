import type { TipoPlano } from "@/constants/planos.js";
import { obterValorPlano } from "@/constants/planos.js";
import {
	buscarUsuarioPorId,
	atualizarPlanoUsuario,
} from "@/repositories/usuarios-repositories.js";

interface UpgradePlanoParams {
	idusuario: string;
	planoNovo: TipoPlano;
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

export async function upgradePlanoService({
	idusuario,
	planoNovo,
}: UpgradePlanoParams) {
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) {
		throw new Error("Usu?rio n?o encontrado");
	}

	const planoAtual = (usuario.plano as TipoPlano | null) ?? "BASIC";
	const hoje = new Date();
	const fimCiclo = usuario.plano_fim_ciclo
		? new Date(usuario.plano_fim_ciclo)
		: new Date(hoje.getFullYear() + 1, hoje.getMonth(), hoje.getDate());

	await atualizarPlanoUsuario(idusuario, {
		plano: planoNovo,
		plano_inicio_ciclo: hoje,
		plano_fim_ciclo: fimCiclo,
		plano_proximo: null,
	});

	return {
		planoAnterior: planoAtual,
		planoNovo,
		valorProporcional: 0,
		diasRestantes: 0,
		proximoVencimento: fimCiclo,
		asaasPaymentId: undefined,
		asaasInvoiceUrl: undefined,
		empresaCobrancaId: null,
		valorNovoMensal: obterValorPlano(planoNovo),
	};
}
