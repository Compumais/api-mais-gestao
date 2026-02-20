import { buscarUsuarioPorId, atualizarPlanoUsuario, buscarPlanoUsuario } from "@/repositories/usuarios-repositories";
import { AsaasService } from "../asaas/asaas.service";
import {
	obterValorPlano,
	isPlanoSuperior,
	calcularDiasRestantesNoCiclo,
	calcularDiasTotaisDoCiclo,
	calcularValorProporcional,
} from "@/constants/planos";
import type { TipoPlano } from "@/constants/planos";

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
	creditCard,
	creditCardHolderInfo,
	remoteIp,
}: UpgradePlanoParams) {
	// 1. Verificar se usuário existe e possui plano
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) {
		throw new Error("Usuário não encontrado");
	}

	if (!usuario.plano) {
		throw new Error("Usuário não possui plano ativo. Use a contratação inicial.");
	}

	const planoAtual = usuario.plano as TipoPlano;

	// 2. Validar que o novo plano é superior
	if (!isPlanoSuperior(planoAtual, planoNovo)) {
		throw new Error("O novo plano deve ser superior ao plano atual para realizar upgrade");
	}

	// 3. Verificar se possui ciclo válido
	if (!usuario.plano_inicio_ciclo || !usuario.plano_fim_ciclo) {
		throw new Error("Ciclo de plano inválido");
	}

	const inicioCiclo = new Date(usuario.plano_inicio_ciclo);
	const fimCiclo = new Date(usuario.plano_fim_ciclo);
	const hoje = new Date();

	// 4. Calcular diferença proporcional
	const diasRestantes = calcularDiasRestantesNoCiclo(inicioCiclo, fimCiclo, hoje);
	const diasTotais = calcularDiasTotaisDoCiclo(inicioCiclo, fimCiclo);
	const valorAtualMensal = obterValorPlano(planoAtual);
	const valorNovoMensal = obterValorPlano(planoNovo);
	const valorProporcional = calcularValorProporcional(
		valorAtualMensal,
		valorNovoMensal,
		diasRestantes,
		diasTotais
	);

	// 5. Processar pagamento da diferença no Asaas
	// Nota: O Asaas pode ter uma API específica para upgrade de assinatura
	// Por enquanto, vamos criar um pagamento único da diferença
	// Em produção, você pode usar a API de pagamentos do Asaas para cobrar a diferença

	// 6. Atualizar plano imediatamente após confirmação do pagamento
	// (Assumindo que o pagamento foi processado com sucesso)
	await atualizarPlanoUsuario(idusuario, {
		plano: planoNovo,
		// Manter o fim do ciclo, ajustar início se necessário
		plano_inicio_ciclo: hoje,
		plano_fim_ciclo: fimCiclo, // Manter fim do ciclo original
		plano_proximo: null,
	});

	return {
		planoAnterior: planoAtual,
		planoNovo,
		valorProporcional,
		diasRestantes,
		proximoVencimento: fimCiclo,
	};
}

