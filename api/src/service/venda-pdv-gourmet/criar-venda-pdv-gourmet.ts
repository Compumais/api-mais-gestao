import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovaVendaPdvGourmet,
	VendaPdvGourmet,
} from "@/model/venda-pdv-gourmet-model.js";
import type { LancamentoPagamentoPdv } from "@/model/venda-pdv-pagamento-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarVendaPdvGourmet,
	excluirVendaPdvGourmet,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { criarVendaPdvPagamentos } from "@/repositories/venda-pdv-pagamento-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	formaErpExigeCliente,
	gerarContasReceberVendaPdvService,
	inferirPagamentosErpVendaPdv,
	type PagamentoErpVendaPdv,
} from "@/service/venda-pdv-gourmet/gerar-contas-receber-venda-pdv.js";
import { registrarRecebimentosVendaService } from "@/service/venda-pdv-gourmet/registrar-recebimentos-venda.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import {
	campoPagamentoVazio,
	totaisDeLancamentosPdv,
} from "@/util/lancamento-pagamento-pdv.js";
import { formatarValorMonetario } from "@/util/recebimentos-venda-util.js";

type CriarVendaPdvGourmetParametros = {
	dadosVendaPdvGourmet: NovaVendaPdvGourmet;
	idusuario: string;
	pagamentosErp?: PagamentoErpVendaPdv[] | undefined;
	pagamentos?: LancamentoPagamentoPdv[] | undefined;
};

export async function criarVendaPdvGourmetService({
	dadosVendaPdvGourmet,
	idusuario,
	pagamentosErp,
	pagamentos,
}: CriarVendaPdvGourmetParametros): Promise<
	HttpResponse<VendaPdvGourmet | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosVendaPdvGourmet.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const dadosComTotais = preencherTotaisDeLancamentos(
		dadosVendaPdvGourmet,
		pagamentos,
	);
	const registro = await criarVendaPdvGourmet(dadosComTotais);

	if (!registro) {
		return httpErro();
	}

	const lancamentosOk =
		pagamentos?.filter(
			(item) => (item.status ?? "ok") === "ok" && item.valor > 0,
		) ?? [];

	if (lancamentosOk.length > 0) {
		try {
			await criarVendaPdvPagamentos(
				lancamentosOk.map((item) => ({
					id: uuidv4(),
					idempresa: registro.idempresa,
					idvenda: registro.id,
					meio: item.meio,
					valor: formatarValorMonetario(item.valor),
					nsu: item.nsu ?? null,
					autorizacao: item.autorizacao ?? null,
					bandeira: item.bandeira ?? null,
					status: item.status ?? "ok",
				})),
			);
		} catch {
			await excluirVendaPdvGourmet(registro.id);
			return httpErroInterno();
		}
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_venda_pdv_gourmet",
		idusuario,
		recurso: "venda_pdv_gourmet",
		idrecurso: registro.id,
		idempresa: dadosVendaPdvGourmet.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			numeropdv: registro.numeropdv,
			idcontamesa: registro.idcontamesa,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirVendaPdvGourmet(registro.id);
		return httpErroInterno();
	}

	const recebimentos = await registrarRecebimentosVendaService({
		venda: registro,
		idusuario,
	});

	if (!recebimentos.success) {
		await excluirVendaPdvGourmet(registro.id);
		return {
			success: false,
			status: 400,
			error: recebimentos.mensagem,
			code: "RECEBIMENTOS_VENDA_ERRO",
		};
	}

	const formasErp = pagamentosErp?.filter((f) => f.valor > 0) ?? [];
	const formasResolvidas =
		formasErp.length > 0
			? formasErp
			: ((await inferirPagamentosErpVendaPdv({
					venda: registro,
					pagamentos,
				})) ?? []);

	if (formasResolvidas.length > 0) {
		const exigeCliente = (
			await Promise.all(
				formasResolvidas.map((forma) =>
					formaErpExigeCliente(forma.idtipodocumentofinanceiro),
				),
			)
		).some(Boolean);

		if (exigeCliente && !dadosVendaPdvGourmet.identidade?.trim()) {
			await excluirVendaPdvGourmet(registro.id);
			return {
				success: false,
				status: 400,
				error: "Cliente obrigatório para pagamento a prazo no PDV",
				code: "CLIENTE_PRAZO_OBRIGATORIO",
			};
		}

		const contasReceber = await gerarContasReceberVendaPdvService({
			venda: registro,
			idusuario,
			identidade: dadosVendaPdvGourmet.identidade ?? undefined,
			idcondicaopagto: dadosVendaPdvGourmet.idcondicaopagto ?? undefined,
			pagamentosErp: formasResolvidas,
		});

		if (!contasReceber.success) {
			await excluirVendaPdvGourmet(registro.id);
			return {
				success: false,
				status: contasReceber.status,
				error: contasReceber.error ?? "Erro ao gerar contas a receber",
				code: contasReceber.code ?? "CONTAS_RECEBER_PDV_ERRO",
			};
		}
	}

	return httpCriacao<VendaPdvGourmet>(registro);
}

function preencherTotaisDeLancamentos(
	dados: NovaVendaPdvGourmet,
	pagamentos?: LancamentoPagamentoPdv[],
): NovaVendaPdvGourmet {
	if (!pagamentos?.length) {
		return dados;
	}

	const totais = totaisDeLancamentosPdv(pagamentos);
	const usarTotais =
		campoPagamentoVazio(dados.valordinheiro) &&
		campoPagamentoVazio(dados.valorpix) &&
		campoPagamentoVazio(dados.valorcartaocredito) &&
		campoPagamentoVazio(dados.valorcartaodebito) &&
		campoPagamentoVazio(dados.valorcartao) &&
		campoPagamentoVazio(dados.valorprepago);

	if (!usarTotais) {
		return dados;
	}

	return {
		...dados,
		valordinheiro: totais.valordinheiro,
		valorpix: totais.valorpix,
		valorcartaocredito: totais.valorcartaocredito,
		valorcartaodebito: totais.valorcartaodebito,
		valorcartao: totais.valorcartao,
		valorprepago: totais.valorprepago,
	};
}
