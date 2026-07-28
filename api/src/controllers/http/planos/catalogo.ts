import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	listarModulosSaas,
	listarPlanosComFeatures,
} from "@/repositories/saas-catalog-repositories.js";
import { contratarModuloService } from "@/service/planos/contratar-modulo.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";

export async function listarCatalogoPlanosController(
	_request: FastifyRequest,
	reply: FastifyReply,
) {
	const planos = await listarPlanosComFeatures();
	const modulos = await listarModulosSaas(true);
	return reply.status(200).send({
		planos: planos
			.filter((p) => p.ativo)
			.map((p) => ({
				id: p.id,
				codigo: p.codigo,
				nome: p.nome,
				descricao: p.descricao,
				valormensal: Number(p.valormensal),
				maxempresas: p.maxempresas,
				maxusuarios: p.maxusuarios,
				ordem: p.ordem,
				features: p.features.map((f: { codigo: string; nome: string }) => ({
					codigo: f.codigo,
					nome: f.nome,
				})),
			})),
		modulos: modulos.map(
			(m: {
				id: string;
				codigo: string;
				nome: string;
				descricao: string | null;
				valormensal: string;
			}) => ({
				id: m.id,
				codigo: m.codigo,
				nome: m.nome,
				descricao: m.descricao,
				valormensal: Number(m.valormensal),
			}),
		),
	});
}

const contratarModuloSchema = z.object({
	modulo: z.string().min(1),
	creditCard: z.object({
		holderName: z.string(),
		number: z.string(),
		expiryMonth: z.string(),
		expiryYear: z.string(),
		ccv: z.string(),
	}),
	creditCardHolderInfo: z.object({
		name: z.string(),
		email: z.string().email(),
		cpfCnpj: z.string(),
		postalCode: z.string().nullable().optional(),
		address: z.string().nullable().optional(),
		addressNumber: z.string().nullable().optional(),
		complement: z.string().nullable().optional(),
		province: z.string().nullable().optional(),
		city: z.string().nullable().optional(),
		phone: z.string(),
	}),
});

export async function contratarModuloController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({ message: "Não autorizado" });
	}

	if (!normalizarPerfilArray(request.user.roles).includes("proprietario")) {
		return reply.status(403).send({
			message: "Apenas proprietários podem contratar módulos",
		});
	}

	const body = contratarModuloSchema.parse(request.body);
	const h = body.creditCardHolderInfo;
	try {
		const resultado = await contratarModuloService({
			idusuario: request.user.id,
			codigoModulo: body.modulo,
			creditCard: body.creditCard,
			creditCardHolderInfo: {
				name: h.name,
				email: h.email,
				cpfCnpj: h.cpfCnpj,
				phone: h.phone,
				...(h.postalCode != null && { postalCode: h.postalCode }),
				...(h.address != null && { address: h.address }),
				...(h.addressNumber != null && { addressNumber: h.addressNumber }),
				...(h.complement != null && { complement: h.complement }),
				...(h.province != null && { province: h.province }),
				...(h.city != null && { city: h.city }),
			},
			remoteIp: request.ip ?? "0.0.0.0",
		});
		return reply.status(201).send(resultado);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		const status =
			message.includes("não encontrado") || message.includes("inválido")
				? 400
				: 500;
		if (status === 500) console.error("Erro ao contratar módulo:", error);
		return reply.status(status).send({ message });
	}
}
