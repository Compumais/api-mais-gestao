import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_NFCE_CAMPOS } from "@/repositories/nota-fiscal-repositories.js";
import { atualizarVendaNfcePdvService } from "@/service/nfce-emissao/atualizar-venda-nfce-pdv.js";
import { buscarDadosCupomNfceService } from "@/service/nfce-emissao/buscar-dados-cupom-nfce.js";
import { buscarNfceParaEditarService } from "@/service/nfce-emissao/buscar-nfce-para-editar.js";
import { cancelarNfceService } from "@/service/nfce-emissao/cancelar-nfce.js";
import { cancelarNfceVendaPdvService } from "@/service/nfce-emissao/cancelar-nfce-venda-pdv.js";
import { inutilizarNfcePorNotaService } from "@/service/nfce-emissao/inutilizar-nfce-por-nota.js";
import { inutilizarNfceVendaPdvService } from "@/service/nfce-emissao/inutilizar-nfce-venda-pdv.js";
import { listarNfcePendentesService } from "@/service/nfce-emissao/listar-nfce-pendentes.js";
import {
	reconciliarNfcePdvService,
	STATUS_LOCAL_NFCE,
} from "@/service/nfce-emissao/reconciliar-nfce-pdv.js";
import { reemitirNfceService } from "@/service/nfce-emissao/reemitir-nfce.js";
import { retransmitirNfceVendaPdvService } from "@/service/nfce-emissao/retransmitir-nfce-venda-pdv.js";
import { transmitirNfceContingenciaService } from "@/service/nfce-emissao/transmitir-nfce-contingencia.js";
import { transmitirNfcePendentesLoteService } from "@/service/nfce-emissao/transmitir-nfce-pendentes-lote.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const queryListarSchema = z.object({
	idempresa: z.string().uuid(),
	status: z.coerce.number().int().optional(),
	numero: z.string().optional(),
	chavenfe: z.string().optional(),
	idvenda: z.string().optional(),
	dataInicio: z.string().optional(),
	dataFim: z.string().optional(),
	ordenarPor: z.enum(ORDENAR_NFCE_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

const queryBuscarEditarSchema = z.object({
	idempresa: z.string().uuid(),
});

const paramsNotaSchema = z.object({
	idnotafiscal: z.string().uuid(),
});

const paramsVendaSchema = z.object({
	idvenda: z.string().uuid(),
});

const bodyReemitirSchema = z.object({
	idempresa: z.string().uuid(),
});

const bodyInutilizarSchema = z.object({
	idempresa: z.string().uuid(),
	justificativa: z.string().min(15).max(255),
});

const bodyContingenciaSchema = z.object({
	idempresa: z.string().uuid(),
	idvenda: z.string().optional(),
	xml: z.string().min(1),
	chave: z.string().max(44).optional(),
	serie: z.coerce.number().int().positive(),
	numero: z.coerce.number().int().positive(),
	motivo: z.string().min(1).max(256),
	datacontingencia: z.string().min(1),
});

const bodyTransmitirPendentesLoteSchema = z.object({
	idempresa: z.string().uuid(),
	limite: z.coerce.number().int().min(1).max(100).optional(),
});

const manifestoNfcePdvSchema = z.object({
	idvendalocal: z.string().uuid(),
	idvendaremoto: z.string().uuid().optional(),
	idnotafiscal: z.string().uuid().optional(),
	statusLocal: z.enum(STATUS_LOCAL_NFCE),
	chave: z
		.string()
		.regex(/^\d{44}$/)
		.optional(),
	serie: z.coerce.number().int().positive().optional(),
	numero: z.coerce.number().int().positive().optional(),
	protocolo: z.string().optional(),
	xml: z.string().min(1).max(1_000_000).optional(),
	motivoContingencia: z.string().optional(),
	dataContingencia: z.iso.datetime({ offset: true }).optional(),
});

const bodyReconciliarNfcePdvSchema = z.object({
	idempresa: z.string().uuid(),
	numeropdv: z.coerce.number().int().positive(),
	cicloId: z.string().uuid(),
	cursor: z.string().min(1).max(200).optional(),
	limite: z.coerce.number().int().min(1).max(100).default(50),
	notas: z.array(manifestoNfcePdvSchema).max(100).default([]),
});

const itemAtualizacaoSchema = z.object({
	idproduto: z.string().uuid(),
	quantidade: z.string(),
	precounitario: z.string(),
	nomeproduto: z.string().optional(),
});

const bodyAtualizarVendaSchema = z.object({
	idempresa: z.string().uuid(),
	itens: z.array(itemAtualizacaoSchema).min(1),
	pagamentos: z.object({
		valordinheiro: z.string().optional().nullable(),
		valorcartao: z.string().optional().nullable(),
		valorcartaocredito: z.string().optional().nullable(),
		valorcartaodebito: z.string().optional().nullable(),
		valorpix: z.string().optional().nullable(),
		valorprepago: z.string().optional().nullable(),
		desconto: z.string().optional().nullable(),
		valoracrescimo: z.string().optional().nullable(),
		valortaxaservico: z.string().optional().nullable(),
		valorcouverartistico: z.string().optional().nullable(),
		valorentrega: z.string().optional().nullable(),
	}),
});

export async function listarNfcePendentes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = queryListarSchema.parse(request.query);
		const resultado = await listarNfcePendentesService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			status: query.status,
			numero: query.numero,
			chavenfe: query.chavenfe,
			idvenda: query.idvenda,
			dataInicio: query.dataInicio,
			dataFim: query.dataFim,
			ordenarPor: query.ordenarPor,
			ordem: query.ordem,
			page: query.page ?? 1,
			limit: query.limit ?? 20,
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

export async function buscarNfceParaEditar(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);
		const { idempresa } = queryBuscarEditarSchema.parse(request.query);

		const resultado = await buscarNfceParaEditarService({
			idnotafiscal,
			idempresa,
			idusuario: request.user.id,
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

export async function atualizarVendaNfce(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);
		const body = bodyAtualizarVendaSchema.parse(request.body);

		const resultado = await atualizarVendaNfcePdvService({
			idnotafiscal,
			idempresa: body.idempresa,
			idusuario: request.user.id,
			itens: body.itens.map((item) => ({
				idproduto: item.idproduto,
				quantidade: item.quantidade,
				precounitario: item.precounitario,
				...(item.nomeproduto !== undefined
					? { nomeproduto: item.nomeproduto }
					: {}),
			})),
			pagamentos: {
				valordinheiro: body.pagamentos.valordinheiro ?? null,
				valorcartao: body.pagamentos.valorcartao ?? null,
				valorcartaocredito: body.pagamentos.valorcartaocredito ?? null,
				valorcartaodebito: body.pagamentos.valorcartaodebito ?? null,
				valorpix: body.pagamentos.valorpix ?? null,
				valorprepago: body.pagamentos.valorprepago ?? null,
				desconto: body.pagamentos.desconto ?? null,
				valoracrescimo: body.pagamentos.valoracrescimo ?? null,
				valortaxaservico: body.pagamentos.valortaxaservico ?? null,
				valorcouverartistico: body.pagamentos.valorcouverartistico ?? null,
				valorentrega: body.pagamentos.valorentrega ?? null,
			},
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

export async function reemitirNfce(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);
		const { idempresa } = bodyReemitirSchema.parse(request.body);

		const resultado = await reemitirNfceService({
			idnotafiscal,
			idempresa,
			idusuario: request.user.id,
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

export async function retransmitirNfceVenda(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idvenda } = paramsVendaSchema.parse(request.params);
		const { idempresa } = bodyReemitirSchema.parse(request.body);

		const resultado = await retransmitirNfceVendaPdvService({
			idvenda,
			idempresa,
			idusuario: request.user.id,
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

export async function inutilizarNfceVenda(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idvenda } = paramsVendaSchema.parse(request.params);
		const { idempresa, justificativa } = bodyInutilizarSchema.parse(
			request.body,
		);

		const resultado = await inutilizarNfceVendaPdvService({
			idvenda,
			idempresa,
			justificativa,
			idusuario: request.user.id,
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

export async function buscarCupomNfce(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);

		const resultado = await buscarDadosCupomNfceService({
			idnotafiscal,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
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

export async function transmitirNfceContingencia(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodyContingenciaSchema.parse(request.body);
		const resultado = await transmitirNfceContingenciaService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			idvenda: body.idvenda,
			xml: body.xml,
			chave: body.chave,
			serie: body.serie,
			numero: body.numero,
			motivo: body.motivo,
			datacontingencia: body.datacontingencia,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
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

export async function transmitirNfcePendentesLote(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodyTransmitirPendentesLoteSchema.parse(request.body);
		const resultado = await transmitirNfcePendentesLoteService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			...(body.limite !== undefined ? { limite: body.limite } : {}),
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

export async function reconciliarNfcePdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodyReconciliarNfcePdvSchema.parse(request.body);
		const resultado = await reconciliarNfcePdvService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			numeropdv: body.numeropdv,
			cicloId: body.cicloId,
			...(body.cursor ? { cursor: body.cursor } : {}),
			limite: body.limite,
			notas: body.notas,
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

export async function cancelarNfceVenda(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idvenda } = paramsVendaSchema.parse(request.params);
		const { idempresa, justificativa } = bodyInutilizarSchema.parse(
			request.body,
		);

		const resultado = await cancelarNfceVendaPdvService({
			idvenda,
			idempresa,
			justificativa,
			idusuario: request.user.id,
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

export async function cancelarNfce(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);
		const { justificativa } = bodyInutilizarSchema
			.pick({ justificativa: true })
			.parse(request.body);

		const resultado = await cancelarNfceService({
			idusuario: request.user.id,
			idnotafiscal,
			justificativa,
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

export async function inutilizarNfcePorNota(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);
		const { idempresa, justificativa } = bodyInutilizarSchema.parse(
			request.body,
		);

		const resultado = await inutilizarNfcePorNotaService({
			idusuario: request.user.id,
			idempresa,
			idnotafiscal,
			justificativa,
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
