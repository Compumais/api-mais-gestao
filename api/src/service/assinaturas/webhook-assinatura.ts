import {
	atualizarAssinatura,
	buscarAssinaturaPeloIdAsaas,
} from "@/repositories/assinatura-repositories.js";
import {
	buscarUsuarioModuloPorAssinaturaAsaas,
	upsertUsuarioModulo,
} from "@/repositories/saas-catalog-repositories.js";
import { atualizarPlanoUsuario } from "@/repositories/usuarios-repositories.js";

interface AsaasWebhookEvent {
	event: string;
	payment?: {
		id: string;
		subscription?: string;
	};
	subscription?: {
		id: string;
		status: string;
	};
}

export async function processarWebhookAsaas(evento: AsaasWebhookEvent) {
	const subscriptionId =
		evento.subscription?.id || evento.payment?.subscription;
	if (!subscriptionId) {
		console.log(`Webhook Asaas sem subscription: ${evento.event}`);
		return;
	}

	const statusAsaas = (evento.subscription?.status || "").toUpperCase();
	const eventoNome = (evento.event || "").toUpperCase();

	let statusLocal = "ACTIVE";
	if (
		eventoNome.includes("DELETED") ||
		eventoNome.includes("INACTIVE") ||
		statusAsaas === "INACTIVE" ||
		statusAsaas === "EXPIRED"
	) {
		statusLocal = "CANCELED";
	} else if (
		eventoNome.includes("OVERDUE") ||
		statusAsaas === "OVERDUE"
	) {
		statusLocal = "OVERDUE";
	} else if (statusAsaas === "ACTIVE" || eventoNome.includes("CREATED")) {
		statusLocal = "ACTIVE";
	}

	const assinatura = await buscarAssinaturaPeloIdAsaas(subscriptionId);
	if (assinatura) {
		await atualizarAssinatura(assinatura.id, {
			status: statusLocal,
			atualizadoem: new Date(),
		});
		if (statusLocal === "CANCELED" && assinatura.idusuario) {
			await atualizarPlanoUsuario(assinatura.idusuario, {
				plano: null,
				plano_proximo: null,
			});
		}
		return;
	}

	const usuarioModulo =
		await buscarUsuarioModuloPorAssinaturaAsaas(subscriptionId);
	if (usuarioModulo) {
		await upsertUsuarioModulo({
			id: usuarioModulo.id,
			idusuario: usuarioModulo.idusuario,
			idmodulo: usuarioModulo.idmodulo,
			status: statusLocal === "CANCELED" ? "CANCELED" : statusLocal,
			origem: usuarioModulo.origem,
			idassinaturaasaas: usuarioModulo.idassinaturaasaas,
			valor: usuarioModulo.valor,
			proximovencimento: usuarioModulo.proximovencimento,
		});
	}
}
