import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_ORDENS_SERVICO_CAMPOS } from "@/repositories/ordem-servico-repositories.js";
import { listarOrdensServicoService } from "@/service/ordem-servico/listar-ordens-servico.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const textoOpcional = z.string().optional();
const idOpcional = z.string().min(1).optional();

const listarOrdemServicoQuerySchema = z.object({
	idempresa: z.string().uuid(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	status: z.coerce.number().int().optional(),
	idcliente: z.string().uuid().optional(),
	idultimotecnico: idOpcional,
	idatendente: idOpcional,
	idobjeto: idOpcional,
	idarea: idOpcional,
	idtipoproblema: idOpcional,
	codigo: z.coerce.number().int().optional(),
	orcamento: z.coerce.number().int().optional(),
	dataInicio: textoOpcional,
	dataFim: textoOpcional,
	busca: textoOpcional,
	cnpjcpfcliente: textoOpcional,
	geroufinanceiro: z.coerce.number().int().optional(),
	faturouparanota: z.coerce.number().int().optional(),
	faturouparacupom: z.coerce.number().int().optional(),
	agendamento: textoOpcional,
	previsaoconclusao: textoOpcional,
	dataultimoevento: textoOpcional,
	problemadescrito: textoOpcional,
	laudotecnico: textoOpcional,
	observacao: textoOpcional,
	descricaotipoultimoevento: textoOpcional,
	descricaoultimoevento: textoOpcional,
	placa: textoOpcional,
	marca: textoOpcional,
	modelo: textoOpcional,
	renavam: textoOpcional,
	extra1: textoOpcional,
	extra2: textoOpcional,
	extra3: textoOpcional,
	extra4: textoOpcional,
	extra5: textoOpcional,
	extra6: textoOpcional,
	extra7: textoOpcional,
	extra8: textoOpcional,
	extra9: textoOpcional,
	extra10: textoOpcional,
	extra11: textoOpcional,
	extra12: textoOpcional,
	extra13: textoOpcional,
	extra14: textoOpcional,
	extra15: textoOpcional,
	extra16: textoOpcional,
	ordenarPor: z.enum(ORDENAR_ORDENS_SERVICO_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
});

export async function listarOrdemServicos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarOrdemServicoQuerySchema.parse(request.query);
		const resultado = await listarOrdensServicoService({
			idusuario: request.user.id,
			...query,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
