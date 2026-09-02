import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarMovimentosEstoquePorIdOriginal } from "@/repositories/movimento-estoque-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import { atualizarVendaPdvGourmet } from "@/repositories/venda-pdv-gourmet-repositories.js";
import {
	emitirNfceVendaPdvService,
	type ResultadoEmissaoNfcePdv,
} from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { garantirProducaoNaVendaService } from "@/service/producao/garantir-producao-na-venda.js";
import { isAmbienteHomologacao } from "@/util/ambiente-sefaz.js";
import { avaliarEmissaoNfcePorPagamento } from "@/util/avaliar-emissao-nfce-pagamento.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { normalizarMeiosPagamentoNfce } from "@/util/nfce-config-padrao.js";
import {
	TIPO_DOCUMENTO_ESTOQUE,
	TIPO_ESTOQUE,
	tipoEstoqueAfetouOperacional,
} from "@/util/tipo-estoque.js";
import { complementarBaixaFiscalVendaPdv } from "./complementar-baixa-fiscal-venda-pdv.js";
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
		valorcartaocredito?: string | null;
		valorcartaodebito?: string | null;
		valorpix?: string | null;
		valorprepago?: string | null;
		valortroco?: string | null;
		valortotal?: string | null;
		desconto?: string | null;
		valoracrescimo?: string | null;
		valortaxaservico?: string | null;
		valorcouverartistico?: string | null;
		valorentrega?: string | null;
	};
	emitirNfce?: boolean;
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
	emitirNfce = true,
}: BaixaEstoqueVendaParametros): Promise<
	HttpResponse<ResultadoBaixaEstoqueVenda>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const configNfce = await buscarNfceConfiguracaoPorEmpresa(idempresa);
	const homologacao = isAmbienteHomologacao(configNfce?.ambiente);
	const meiosConfig = normalizarMeiosPagamentoNfce(
		configNfce?.meiospagamentonfce,
	);
	const avaliacao = avaliarEmissaoNfcePorPagamento(pagamentos, meiosConfig);
	const deveEmitir = avaliacao.deveEmitir && emitirNfce;

	const avisos: string[] = [];
	let movimentosRegistrados = 0;

	// Homologação NFC-e não impede a baixa operacional da venda real.
	// O fiscal continua só após NFC-e autorizada em produção (complemento abaixo).
	const movimentosExistentes =
		await listarMovimentosEstoquePorIdOriginal(idvenda);
	const itensJaBaixadosOperacional = new Set(
		movimentosExistentes
			.filter(
				(movimento) =>
					(movimento.cancelado ?? 0) === 0 &&
					movimento.iditemoriginal &&
					tipoEstoqueAfetouOperacional(movimento.tipoestoque),
			)
			.map((movimento) => movimento.iditemoriginal as string),
	);

	// Regra canônica PDV: na finalização baixa sempre o operacional.
	// O fiscal só é baixado após NFC-e autorizada (complemento abaixo).
	for (const item of itens) {
		const qty = Number.parseFloat(item.quantidade);
		if (Number.isNaN(qty) || qty <= 0) continue;

		if (itensJaBaixadosOperacional.has(item.idproduto)) {
			movimentosRegistrados++;
			continue;
		}

		const precoUnit = Number.parseFloat(item.precounitario);
		const valorTotal = (
			qty * (Number.isNaN(precoUnit) ? 0 : precoUnit)
		).toFixed(2);

		try {
			const producao = await garantirProducaoNaVendaService({
				idempresa,
				idproduto: item.idproduto,
				quantidade: qty.toFixed(6),
				idoriginal: idvenda,
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
				idusuario,
			});

			if (!producao.success) {
				avisos.push(
					`Produção na venda falhou (${item.nomeproduto ?? item.idproduto}): ${producao.error ?? "erro"}`,
				);
				continue;
			}

			const movimento = await registrarMovimentoEstoque({
				idempresa,
				idproduto: item.idproduto,
				quantidade: qty.toFixed(6),
				sentido: "saida",
				tipoestoque: TIPO_ESTOQUE.OPERACIONAL,
				tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PDV,
				idoriginal: idvenda,
				iditemoriginal: item.idproduto,
				valortotal: valorTotal,
				permitirSemLote: true,
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
			deveemitirnfce: deveEmitir,
		});
	} catch (erro) {
		console.error("[estoque] Falha ao marcar deveemitirnfce na venda:", erro);
		avisos.push("Falha ao registrar flag de emissão NFC-e na venda");
	}

	let emissaoNfce: ResultadoEmissaoNfcePdv | undefined;
	if (deveEmitir) {
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
			if (emissao.body.emitida && !homologacao) {
				const complemento = await complementarBaixaFiscalVendaPdv({
					idempresa,
					idvenda,
					itens,
					idusuario,
				});
				movimentosRegistrados += complemento.movimentosRegistrados;
				avisos.push(...complemento.avisos);
			} else if (emissao.body.emitida && homologacao) {
				avisos.push(
					"NFC-e autorizada em homologação: baixa fiscal não aplicada.",
				);
			} else {
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
		deveEmitirNfce: deveEmitir,
		meiosUtilizados: avaliacao.meiosUtilizados,
		avisos,
		...(emissaoNfce ? { emissaoNfce } : {}),
	});
}
