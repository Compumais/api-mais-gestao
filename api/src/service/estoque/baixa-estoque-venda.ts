import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import { atualizarVendaPdvGourmet } from "@/repositories/venda-pdv-gourmet-repositories.js";
import {
	emitirNfceVendaPdvService,
	type ResultadoEmissaoNfcePdv,
} from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { avaliarEmissaoNfcePorPagamento } from "@/util/avaliar-emissao-nfce-pagamento.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { normalizarMeiosPagamentoNfce } from "@/util/nfce-config-padrao.js";
import { TIPO_DOCUMENTO_ESTOQUE, TIPO_ESTOQUE } from "@/util/tipo-estoque.js";
import { registrarMovimentoEstoque } from "./registrar-movimento-estoque.js";

export type ItemBaixaEstoqueVenda = {
	idproduto: string;
	quantidade: string;
	precounitario: string;
	nomeproduto?: string;
};

export type BaixaEstoqueVendaParametros = {
	idempresa: string;
	idusuario: string;
	idvenda: string;
	itens: ItemBaixaEstoqueVenda[];
	pagamentos: {
		valordinheiro?: string | null;
		valorcartao?: string | null;
		valorpix?: string | null;
		valorprepago?: string | null;
		valortroco?: string | null;
		valortotal?: string | null;
	};
};

export type ResultadoBaixaEstoqueVenda = {
	movimentosRegistrados: number;
	deveEmitirNfce: boolean;
	meiosUtilizados: string[];
	avisos: string[];
	emissaoNfce?: ResultadoEmissaoNfcePdv;
};

export async function baixaEstoqueVendaService({
	idempresa,
	idusuario,
	idvenda,
	itens,
	pagamentos,
}: BaixaEstoqueVendaParametros): Promise<HttpResponse<ResultadoBaixaEstoqueVenda>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const configNfce = await buscarNfceConfiguracaoPorEmpresa(idempresa);
	const meiosConfig = normalizarMeiosPagamentoNfce(configNfce?.meiospagamentonfce);
	const avaliacao = avaliarEmissaoNfcePorPagamento(pagamentos, meiosConfig);
	const tipoestoque = avaliacao.deveEmitir
		? TIPO_ESTOQUE.AMBOS
		: TIPO_ESTOQUE.OPERACIONAL;

	const avisos: string[] = [];
	let movimentosRegistrados = 0;

	for (const item of itens) {
		const qty = Number.parseFloat(item.quantidade);
		if (Number.isNaN(qty) || qty <= 0) continue;

		const precoUnit = Number.parseFloat(item.precounitario);
		const valorTotal = (qty * (Number.isNaN(precoUnit) ? 0 : precoUnit)).toFixed(2);

		try {
			const movimento = await registrarMovimentoEstoque({
				idempresa,
				idproduto: item.idproduto,
				quantidade: qty.toFixed(6),
				sentido: "saida",
				tipoestoque,
				tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PDV,
				idoriginal: idvenda,
				iditemoriginal: item.idproduto,
				valortotal: valorTotal,
			});

			if (movimento) movimentosRegistrados++;
		} catch (erro) {
			console.error(
				`[estoque] Falha ao baixar estoque do produto ${item.nomeproduto ?? item.idproduto}:`,
				erro,
			);
			avisos.push(
				`Falha ao baixar estoque: ${item.nomeproduto ?? item.idproduto}`,
			);
		}
	}

	try {
		await atualizarVendaPdvGourmet(idvenda, {
			deveemitirnfce: avaliacao.deveEmitir,
		});
	} catch (erro) {
		console.error("[estoque] Falha ao marcar deveemitirnfce na venda:", erro);
		avisos.push("Falha ao registrar flag de emissão NFC-e na venda");
	}

	let emissaoNfce: ResultadoEmissaoNfcePdv | undefined;
	if (avaliacao.deveEmitir) {
		console.info(
			`[pdv] Emitindo NFC-e para venda ${idvenda} (meios: ${avaliacao.meiosUtilizados.join(", ")})`,
		);
		const emissao = await emitirNfceVendaPdvService({
			idempresa,
			idusuario,
			idvenda,
			pagamentos,
		});

		if (emissao.success && emissao.body) {
			emissaoNfce = emissao.body;
			if (!emissao.body.emitida) {
				const mensagem =
					emissao.body.erro ??
					emissao.body.xMotivo ??
					emissao.body.pendencias?.map((p) => p.mensagem).join("; ") ??
					"Falha na emissão da NFC-e";
				avisos.push(mensagem);
			}
		} else {
			avisos.push("Falha ao comunicar com o serviço de emissão NFC-e");
		}
	}

	return httpOk({
		movimentosRegistrados,
		deveEmitirNfce: avaliacao.deveEmitir,
		meiosUtilizados: avaliacao.meiosUtilizados,
		avisos,
		...(emissaoNfce ? { emissaoNfce } : {}),
	});
}
