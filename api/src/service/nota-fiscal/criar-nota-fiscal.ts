import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarNotaFiscalComItens } from "@/repositories/nota-fiscal-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { registrarCustosNfService } from "@/service/custo-produto/registrar-custos-nf.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

export type ItemNotaFiscalEntrada = {
	idproduto: string;
	descricao?: string | undefined;
	quantidade?: string | number | undefined;
	precounitario?: string | number | undefined;
	total?: string | number | undefined;
	desconto?: string | number | undefined;
	cfop?: string | undefined;
	ncm?: string | undefined;
	unidade?: string | undefined;
	custoaquisicao?: string | number | undefined;
	baseicms?: string | number | undefined;
	icms?: string | number | undefined;
	ipi?: string | number | undefined;
};

type CriarNotaFiscalParametros = {
	idusuario: string;
	dadosNotaFiscal: Omit<NovaNotaFiscal, "id">;
	itens: ItemNotaFiscalEntrada[];
	gerarCustos?: boolean | undefined;
};

type CriarNotaFiscalResposta = {
	notaFiscal: NotaFiscal;
	itens: NotaFiscalItem[];
};

function paraString(valor: string | number | undefined | null): string | null {
	if (valor === undefined || valor === null) return null;
	return typeof valor === "number" ? valor.toString() : valor;
}

export async function criarNotaFiscalService({
	idusuario,
	dadosNotaFiscal,
	itens,
	gerarCustos = true,
}: CriarNotaFiscalParametros): Promise<HttpResponse<CriarNotaFiscalResposta>> {
	if (itens.length === 0) {
		return httpBadRequest("Informe ao menos um item da nota fiscal");
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosNotaFiscal.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	for (const item of itens) {
		const produto = await buscarProdutoPorId(item.idproduto);

		if (!produto || produto.idempresa !== dadosNotaFiscal.idempresa) {
			return httpBadRequest(
				`Produto ${item.idproduto} não encontrado ou não pertence à empresa`,
			);
		}
	}

	const notaFiscalId = uuidv4();
	const datahoraAtual = new Date().toISOString();

	const notaFiscal: NovaNotaFiscal = {
		...dadosNotaFiscal,
		id: notaFiscalId,
		idusuarioinclusao: idusuario,
		datainclusao: datahoraAtual,
		currenttimemillis: Date.now(),
	};

	const itensParaInserir: NovoNotaFiscalItem[] = itens.map((item, index) => ({
		id: uuidv4(),
		idnotafiscal: notaFiscalId,
		idproduto: item.idproduto,
		descricao: item.descricao ?? null,
		quantidade: paraString(item.quantidade),
		precounitario: paraString(item.precounitario),
		total: paraString(item.total),
		desconto: paraString(item.desconto),
		cfop: item.cfop ?? null,
		ncm: item.ncm ?? null,
		unidade: item.unidade ?? null,
		custoaquisicao: paraString(item.custoaquisicao),
		baseicms: paraString(item.baseicms),
		icms: paraString(item.icms),
		ipi: paraString(item.ipi),
		contador: index + 1,
		tipo: "P",
		currenttimemillis: Date.now(),
	}));

	const resultado = await criarNotaFiscalComItens(notaFiscal, itensParaInserir);

	if (!resultado.notaFiscal) {
		return httpErro();
	}

	if (gerarCustos) {
		const itensCustos = itens
			.filter((item) => item.precounitario !== undefined)
			.map((item) => ({
				idproduto: item.idproduto,
				precocompra: paraString(item.precounitario) ?? "0",
				custo: paraString(item.custoaquisicao) ?? undefined,
				desconto: paraString(item.desconto) ?? undefined,
				ipi: paraString(item.ipi) ?? undefined,
			}));

		if (itensCustos.length > 0) {
			const custosResultado = await registrarCustosNfService({
				idusuario,
				idempresa: dadosNotaFiscal.idempresa,
				idnotafiscal: notaFiscalId,
				itens: itensCustos,
			});

			if (!custosResultado.success) {
				return httpErroInterno();
			}
		}
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_nota_fiscal",
		idusuario,
		recurso: "nota_fiscal",
		idrecurso: notaFiscalId,
		idempresa: dadosNotaFiscal.idempresa,
		criadoem: datahoraAtual,
		metadados: {
			numero: resultado.notaFiscal.numero,
			quantidadeItens: itens.length,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	return httpCriacao<CriarNotaFiscalResposta>({
		notaFiscal: resultado.notaFiscal,
		itens: resultado.itens,
	});
}
