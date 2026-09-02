import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarFinanceiro,
	buscarFinanceirosPorOrigem,
} from "@/repositories/financeiro-repositories.js";
import {
	atualizarMovimentoEstoque,
	listarMovimentosEstoquePorIdOriginal,
} from "@/repositories/movimento-estoque-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarVendaPdvGourmetPorId } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { registrarMovimentoEstoque } from "@/service/estoque/registrar-movimento-estoque.js";
import { TIPO_ORIGEM_VENDA_PDV } from "@/util/recebimentos-venda-util.js";
import { statusEhAutorizada } from "@/util/nfe-status.js";
import {
	TIPO_DOCUMENTO_ESTOQUE,
	TIPO_ESTOQUE,
	type TipoEstoque,
} from "@/util/tipo-estoque.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export type ResultadoCancelamentoVendaNaoFiscal = {
	idvenda: string;
	titulosCancelados: number;
	movimentosEstornados: number;
	avisos: string[];
};

type CancelarVendaNaoFiscalPdvParametros = {
	idusuario: string;
	idempresa: string;
	idvenda: string;
	motivo?: string | null;
};

/**
 * Cancela venda PDV sem NFC-e autorizada: estorna estoque operacional e títulos
 * financeiros da origem venda PDV. Não chama SEFAZ (não confundir com cancelar NFC-e).
 */
export async function cancelarVendaNaoFiscalPdvService({
	idusuario,
	idempresa,
	idvenda,
	motivo,
}: CancelarVendaNaoFiscalPdvParametros): Promise<
	HttpResponse<ResultadoCancelamentoVendaNaoFiscal>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const venda = await buscarVendaPdvGourmetPorId(idvenda);
	if (!venda || venda.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (venda.idnotafiscalnfce) {
		const nota = await buscarNotaFiscalPorId(venda.idnotafiscalnfce);
		if (nota && statusEhAutorizada(nota.status)) {
			return httpBadRequest(
				"Esta venda possui NFC-e autorizada. Use o cancelamento de NFC-e (SEFAZ).",
			);
		}
	}

	const avisos: string[] = [];
	let titulosCancelados = 0;
	let movimentosEstornados = 0;
	const agora = new Date().toISOString();

	const titulos = await buscarFinanceirosPorOrigem(
		idempresa,
		TIPO_ORIGEM_VENDA_PDV,
		idvenda,
	);

	for (const titulo of titulos) {
		if (titulo.status === "C") continue;

		const saldo = Number.parseFloat(titulo.saldo ?? "0");
		const valor = Number.parseFloat(titulo.valor ?? "0");

		if (saldo < valor) {
			avisos.push(
				`Título ${titulo.documento ?? titulo.id} possui baixa parcial e não foi estornado automaticamente`,
			);
			continue;
		}

		await atualizarFinanceiro(titulo.id, { status: "C" });
		titulosCancelados++;
	}

	const movimentos = await listarMovimentosEstoquePorIdOriginal(idvenda);

	for (const movimento of movimentos) {
		if (movimento.cancelado === 1) continue;

		const qtdSaida = Number.parseFloat(movimento.quantidadesaida ?? "0");
		const qtdEntrada = Number.parseFloat(movimento.quantidadeentrada ?? "0");
		const sentidoEstorno = qtdSaida > 0 ? "entrada" : "saida";
		const quantidade = qtdSaida > 0 ? qtdSaida : qtdEntrada;

		if (!movimento.idproduto || !(quantidade > 0)) {
			await atualizarMovimentoEstoque(movimento.id, { cancelado: 1 });
			continue;
		}

		await atualizarMovimentoEstoque(movimento.id, { cancelado: 1 });

		const tipoestoque: TipoEstoque =
			movimento.tipoestoque != null
				? (movimento.tipoestoque as TipoEstoque)
				: TIPO_ESTOQUE.OPERACIONAL;

		await registrarMovimentoEstoque({
			idempresa,
			idproduto: movimento.idproduto,
			quantidade: quantidade.toFixed(6),
			sentido: sentidoEstorno,
			tipoestoque,
			tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PDV,
			idoriginal: idvenda,
			iditemoriginal: movimento.idproduto,
			observacao: "Estorno cancelamento venda PDV não fiscal",
			permitirSemLote: true,
		});

		movimentosEstornados++;
	}

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "cancelar_venda_nao_fiscal_pdv",
			idusuario,
			recurso: "venda_pdv_gourmet",
			idrecurso: idvenda,
			idempresa,
			criadoem: agora,
			metadados: {
				motivo: motivo?.trim() || null,
				titulosCancelados,
				movimentosEstornados,
				avisos,
			},
		});
	} catch (erro) {
		console.error(
			"Erro ao registrar auditoria de cancelamento venda não fiscal:",
			erro,
		);
	}

	return httpOk({
		idvenda,
		titulosCancelados,
		movimentosEstornados,
		avisos,
	});
}
