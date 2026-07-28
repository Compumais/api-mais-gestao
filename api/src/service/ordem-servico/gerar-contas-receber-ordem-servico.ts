import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarCondicaoPagamentoPorId } from "@/repositories/condicao-pagamento-repositories.js";
import {
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import {
	buscarFinanceirosPorOrigem,
	criarFinanceiro,
} from "@/repositories/financeiro-repositories.js";
import { criarOrdemServicoFaturamento } from "@/repositories/ordem-servico-faturamento-repositories.js";
import {
	atualizarOrdemServico,
	buscarOrdemServicoPorIdEempresa,
} from "@/repositories/ordem-servico-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { buscarTipoEventoPadrao } from "@/service/ordem-servico/ordem-servico-helpers.js";
import { registrarEventoOrdemServicoService } from "@/service/ordem-servico/registrar-evento-ordem-servico.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { TIPO_ORIGEM_FINANCEIRO_ORDEM_SERVICO } from "@/util/ordem-servico-constants.js";
import {
	adicionarDias,
	formatarValorMonetario,
} from "@/util/recebimentos-venda-util.js";
import {
	resolverDestinoFinanceiroFormaPagamento,
	resolverPrazoDiasTipoDocumento,
} from "@/util/resolver-financeiro-emissao-nfe.js";
import { resolverParcelasCondicaoPagamento } from "@/util/resolver-parcelas-condicao-pagamento.js";

export type FormaPagamentoOs = {
	idtipodocumentofinanceiro: string;
	valor: number;
	indPag?: number | undefined;
};

type GerarContasReceberOsParametros = {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
	formasPagamento?: FormaPagamentoOs[] | undefined;
};

type GerarContasReceberOsResposta = {
	totalParcelas: number;
	parcelasGeradas: number;
	titulosExistentes: number;
};

function distribuirValor(total: number, parcelas: number): number[] {
	const valorParcela = Math.floor((total * 100) / parcelas) / 100;
	const soma = valorParcela * (parcelas - 1);
	const ultimaParcela = Math.round((total - soma) * 100) / 100;
	const resultado = Array(parcelas - 1).fill(valorParcela);
	resultado.push(ultimaParcela);
	return resultado;
}

export async function gerarContasReceberOrdemServicoService({
	ordemServicoId,
	idempresa,
	idusuario,
	formasPagamento,
}: GerarContasReceberOsParametros): Promise<
	HttpResponse<GerarContasReceberOsResposta>
> {
	const os = await buscarOrdemServicoPorIdEempresa(ordemServicoId, idempresa);
	if (!os) return httpNaoEncontrado();

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) return httpProibido();

	if (!os.idcliente) {
		return httpBadRequest("Ordem de serviço sem cliente vinculado");
	}

	const valorTotal = parseFloat(os.valor ?? "0");
	if (!(valorTotal > 0)) {
		return httpBadRequest("Ordem de serviço sem valor para gerar financeiro");
	}

	const existentes = await buscarFinanceirosPorOrigem(
		idempresa,
		TIPO_ORIGEM_FINANCEIRO_ORDEM_SERVICO,
		ordemServicoId,
	);
	if (existentes.length > 0) {
		return httpOk({
			totalParcelas: existentes.length,
			parcelasGeradas: 0,
			titulosExistentes: existentes.length,
		});
	}

	const cliente = await buscarEntidadePorId(os.idcliente);
	if (!cliente || cliente.idempresa !== idempresa) {
		return httpBadRequest("Cliente não encontrado");
	}

	const dataEmissao = new Date().toISOString().substring(0, 10);
	const dataRegistro = new Date().toISOString();
	const nomeCliente =
		cliente.razaosocial?.trim() ||
		cliente.nome?.trim() ||
		os.nomecliente ||
		"Cliente";
	const codigoOs = os.codigo != null ? String(os.codigo) : os.id.slice(0, 8);

	let parcelasGeradas = 0;
	const formas = (formasPagamento ?? []).filter((f) => f.valor > 0);

	if (os.idcondicaopagamento) {
		const condicao = await buscarCondicaoPagamentoPorId(os.idcondicaopagamento);
		if (condicao && (condicao.parcelas ?? 1) > 1) {
			const { totalParcelas, prazosDias } =
				resolverParcelasCondicaoPagamento(condicao);
			const valores = distribuirValor(valorTotal, totalParcelas);
			let idplanocontas: string | null = null;
			const idtipodocumento = os.idtipodocumentofinanceiro ?? null;

			if (idtipodocumento) {
				const tipoDoc =
					await buscarTipoDocumentoFinanceiroPorId(idtipodocumento);
				idplanocontas = tipoDoc?.idplanocontas ?? null;
			}

			for (let i = 0; i < totalParcelas; i++) {
				const parcela = i + 1;
				const vencimento = adicionarDias(
					new Date(dataEmissao),
					prazosDias[i] ?? 0,
				);
				const valorParcela = valores[i] ?? 0;
				const financeiro = await criarFinanceiro({
					id: uuidv4(),
					idempresa,
					identidade: os.idcliente,
					tipo: "R",
					tipoorigem: TIPO_ORIGEM_FINANCEIRO_ORDEM_SERVICO,
					idorigem: ordemServicoId,
					parcela,
					totalparcelas: totalParcelas,
					documento: `OS ${codigoOs}/${parcela}`,
					emitente: nomeCliente,
					cnpjcpfemitente: cliente.cnpjcpf ?? os.cnpjcpfcliente ?? null,
					idtipodocumentofinanceiro: idtipodocumento,
					idplanocontas,
					status: "A",
					emissao: dataEmissao,
					vencimento,
					vencimentooriginal: vencimento,
					valor: formatarValorMonetario(valorParcela),
					saldo: formatarValorMonetario(valorParcela),
					historico: `Contas a receber OS ${codigoOs} parcela ${parcela}/${totalParcelas}`,
					registro: dataRegistro,
					currenttimemillis: Date.now(),
				});

				if (financeiro) {
					parcelasGeradas++;
					await criarOrdemServicoFaturamento({
						id: uuidv4(),
						idempresa,
						idordemservico: ordemServicoId,
						idfaturamento: financeiro.id,
						datacriacao: dataRegistro,
						dataalteracao: dataRegistro,
					});
				}
			}
		}
	}

	if (parcelasGeradas === 0) {
		const formasFinais =
			formas.length > 0
				? formas
				: os.idtipodocumentofinanceiro
					? [
							{
								idtipodocumentofinanceiro: os.idtipodocumentofinanceiro,
								valor: valorTotal,
							},
						]
					: [];

		if (formasFinais.length === 0) {
			return httpBadRequest(
				"Informe formas de pagamento, condição de pagamento ou tipo de documento financeiro",
			);
		}

		for (const forma of formasFinais) {
			const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
				forma.idtipodocumentofinanceiro,
			);
			if (!tipoDoc) {
				return httpBadRequest("Tipo de documento financeiro não encontrado");
			}

			const destino = resolverDestinoFinanceiroFormaPagamento(
				tipoDoc,
				forma.indPag,
			);
			if (destino === "caixa_imediato") {
				continue;
			}

			const prazoDias = resolverPrazoDiasTipoDocumento(tipoDoc);
			const vencimento =
				destino === "titulo_vista"
					? dataEmissao
					: adicionarDias(new Date(dataEmissao), prazoDias);

			const financeiro = await criarFinanceiro({
				id: uuidv4(),
				idempresa,
				identidade: os.idcliente,
				tipo: "R",
				tipoorigem: TIPO_ORIGEM_FINANCEIRO_ORDEM_SERVICO,
				idorigem: ordemServicoId,
				parcela: 1,
				totalparcelas: 1,
				documento: `OS ${codigoOs}`,
				emitente: nomeCliente,
				cnpjcpfemitente: cliente.cnpjcpf ?? os.cnpjcpfcliente ?? null,
				idtipodocumentofinanceiro: tipoDoc.id,
				idplanocontas: tipoDoc.idplanocontas ?? null,
				status: "A",
				emissao: dataEmissao,
				vencimento,
				vencimentooriginal: vencimento,
				valor: formatarValorMonetario(forma.valor),
				saldo: formatarValorMonetario(forma.valor),
				historico: `Contas a receber OS ${codigoOs}`,
				registro: dataRegistro,
				currenttimemillis: Date.now(),
			});

			if (financeiro) {
				parcelasGeradas++;
				await criarOrdemServicoFaturamento({
					id: uuidv4(),
					idempresa,
					idordemservico: ordemServicoId,
					idfaturamento: financeiro.id,
					datacriacao: dataRegistro,
					dataalteracao: dataRegistro,
				});
			}
		}
	}

	if (parcelasGeradas === 0) {
		return httpBadRequest("Nenhum título a receber foi gerado");
	}

	await atualizarOrdemServico(ordemServicoId, idempresa, {
		geroufinanceiro: 1,
	});

	const valorTitulos = existentes.length + parcelasGeradas;
	const codigoEvento =
		Math.abs(valorTotal - Number(os.valor ?? 0)) < 0.01 &&
		(!formas.length ||
			formas.reduce((acc, f) => acc + f.valor, 0) >= valorTotal - 0.01)
			? "FATURADA"
			: "FATURADA_PARCIALMENTE";

	const tipoEvento = await buscarTipoEventoPadrao(idempresa, codigoEvento);
	if (tipoEvento) {
		await registrarEventoOrdemServicoService({
			ordemServicoId,
			idempresa,
			idusuario,
			idtipoevento: tipoEvento.id,
			descricao: `Geração de contas a receber (${parcelasGeradas} título(s))`,
		});
	}

	return httpOk({
		totalParcelas: valorTitulos,
		parcelasGeradas,
		titulosExistentes: 0,
	});
}
