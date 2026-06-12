import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarCustoProdutoService } from "@/service/custo-produto/criar-custo-produto.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const numericString = z.string();

const criarCustoProdutoBodySchema = z.object({
	idproduto: z.string(),
	precocompra: numericString.optional(),
	custo: numericString.optional(),
	custoaquisicao: numericString.optional(),
	customedio: numericString.optional(),
	desconto: numericString.optional(),
	fretesegurooutrasdesp: numericString.optional(),
	ipi: numericString.optional(),
	icmsst: numericString.optional(),
	fcpst: numericString.optional(),
	piscofins: numericString.optional(),
	icmsfcp: numericString.optional(),
	icmsdesonerado: numericString.optional(),
	diferencialicms: numericString.optional(),
	freteconhecimento: numericString.optional(),
	icmspiscofinsconhecimento: numericString.optional(),
	vendor: numericString.optional(),
	adicional: numericString.optional(),
	observacaorebaixa: z.string().optional().nullable(),
	idmotivorebaixa: z.string().optional().nullable(),
	idcustoorigem: z.string().optional().nullable(),
});

/** origem: 1 = lançamento manual pelo usuário */
const ORIGEM_MANUAL = 1;
const STATUS_ATIVO = 1;

export async function criarCustoProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarCustoProdutoBodySchema.parse(request.body);
		const agora = new Date().toISOString();

		const dadosCustoProduto = {
			id: uuidv4(),
			idproduto: dadosValidados.idproduto,
			idultimousuario: request.user.id,
			precocompra: dadosValidados.precocompra ?? null,
			custo: dadosValidados.custo ?? dadosValidados.precocompra ?? null,
			custoaquisicao: dadosValidados.custoaquisicao ?? null,
			customedio: dadosValidados.customedio ?? null,
			desconto: dadosValidados.desconto ?? null,
			fretesegurooutrasdesp: dadosValidados.fretesegurooutrasdesp ?? null,
			ipi: dadosValidados.ipi ?? null,
			icmsst: dadosValidados.icmsst ?? null,
			fcpst: dadosValidados.fcpst ?? null,
			piscofins: dadosValidados.piscofins ?? null,
			icmsfcp: dadosValidados.icmsfcp ?? null,
			icmsdesonerado: dadosValidados.icmsdesonerado ?? null,
			diferencialicms: dadosValidados.diferencialicms ?? null,
			freteconhecimento: dadosValidados.freteconhecimento ?? null,
			icmspiscofinsconhecimento:
				dadosValidados.icmspiscofinsconhecimento ?? null,
			vendor: dadosValidados.vendor ?? null,
			adicional: dadosValidados.adicional ?? null,
			observacaorebaixa: dadosValidados.observacaorebaixa ?? null,
			idmotivorebaixa: dadosValidados.idmotivorebaixa ?? null,
			idcustoorigem: dadosValidados.idcustoorigem ?? null,
			origem: ORIGEM_MANUAL,
			status: STATUS_ATIVO,
			datahora: agora,
			currenttimemillis: Date.now(),
		};

		const resultado = await criarCustoProdutoService({
			dadosCustoProduto,
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
