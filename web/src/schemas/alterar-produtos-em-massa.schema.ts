import { z } from "zod";
import type { AtualizarProdutoData } from "@/services/produtos.service";

const percentualOpcional = z.string().optional().nullable();

function campoAlteracao<T extends z.ZodTypeAny>(valor: T) {
	return z.object({
		alterar: z.boolean(),
		valor,
	});
}

export const alterarProdutosEmMassaFormSchema = z
	.object({
		idgrupo: campoAlteracao(z.string().nullable()),
		idunidademedida: campoAlteracao(z.string().nullable()),
		preco: campoAlteracao(z.string()),
		custoaquisicao: campoAlteracao(z.string().nullable()),
		origem: campoAlteracao(z.number().int().min(0).max(8).nullable()),
		ncm: campoAlteracao(z.string().nullable()),
		idcest: campoAlteracao(z.string().nullable()),
		ippt: campoAlteracao(z.enum(["P", "T"]).nullable()),
		inativo: campoAlteracao(z.number().int().min(0).max(1).nullable()),
		percentualmva: campoAlteracao(percentualOpcional),
		idcfopentrada: campoAlteracao(z.string().nullable()),
		idcfopsaida: campoAlteracao(z.string().nullable()),
		idcfopsaidanfce: campoAlteracao(z.string().nullable()),
		tipoproduto: campoAlteracao(z.string().nullable()),
		situacaotributariasnentrada: campoAlteracao(z.string().nullable()),
		situacaotributaria: campoAlteracao(z.string().nullable()),
		situacaotributariasn: campoAlteracao(z.string().nullable()),
		tributacaoespecial: campoAlteracao(z.string().nullable()),
		tributacaosn: campoAlteracao(z.string().nullable()),
		cstipientrada: campoAlteracao(z.string().nullable()),
		cstipisaida: campoAlteracao(z.string().nullable()),
		cstpisentrada: campoAlteracao(z.string().nullable()),
		cstcofinsentrada: campoAlteracao(z.string().nullable()),
		cstpis: campoAlteracao(z.string().nullable()),
		cstcofins: campoAlteracao(z.string().nullable()),
		aliquotaicmsinterna: campoAlteracao(percentualOpcional),
		aliquotaicmsdiferencialentrada: campoAlteracao(percentualOpcional),
		aliquotareducaoicmsnfcesat: campoAlteracao(percentualOpcional),
		aliquotafcpnf: campoAlteracao(percentualOpcional),
		ultimaaliquotaicmsst: campoAlteracao(percentualOpcional),
		ultimaaliquotafcpst: campoAlteracao(percentualOpcional),
		aliquotapis: campoAlteracao(percentualOpcional),
		aliquotapisentrada: campoAlteracao(percentualOpcional),
		aliquotacofins: campoAlteracao(percentualOpcional),
		aliquotaconfinsentrada: campoAlteracao(percentualOpcional),
		aliquotapisconfinssaidapreco: campoAlteracao(percentualOpcional),
		aliquotapisconfinsentradapreco: campoAlteracao(percentualOpcional),
	})
	.superRefine((dados, ctx) => {
		const algumMarcado = Object.values(dados).some((campo) => campo.alterar);
		if (!algumMarcado) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Selecione ao menos um campo para alterar",
			});
		}
	});

export type AlterarProdutosEmMassaFormData = z.infer<
	typeof alterarProdutosEmMassaFormSchema
>;

function valorOuNulo(valor: string | null | undefined): string | null {
	const texto = valor?.trim();
	return texto ? texto : null;
}

export const valoresPadraoAlteracaoEmMassa: AlterarProdutosEmMassaFormData = {
	idgrupo: { alterar: false, valor: null },
	idunidademedida: { alterar: false, valor: null },
	preco: { alterar: false, valor: "" },
	custoaquisicao: { alterar: false, valor: null },
	origem: { alterar: false, valor: 0 },
	ncm: { alterar: false, valor: "" },
	idcest: { alterar: false, valor: null },
	ippt: { alterar: false, valor: "P" },
	inativo: { alterar: false, valor: 0 },
	percentualmva: { alterar: false, valor: "" },
	idcfopentrada: { alterar: false, valor: null },
	idcfopsaida: { alterar: false, valor: null },
	idcfopsaidanfce: { alterar: false, valor: null },
	tipoproduto: { alterar: false, valor: null },
	situacaotributariasnentrada: { alterar: false, valor: "" },
	situacaotributaria: { alterar: false, valor: null },
	situacaotributariasn: { alterar: false, valor: null },
	tributacaoespecial: { alterar: false, valor: null },
	tributacaosn: { alterar: false, valor: null },
	cstipientrada: { alterar: false, valor: "" },
	cstipisaida: { alterar: false, valor: "" },
	cstpisentrada: { alterar: false, valor: null },
	cstcofinsentrada: { alterar: false, valor: null },
	cstpis: { alterar: false, valor: null },
	cstcofins: { alterar: false, valor: null },
	aliquotaicmsinterna: { alterar: false, valor: "" },
	aliquotaicmsdiferencialentrada: { alterar: false, valor: "" },
	aliquotareducaoicmsnfcesat: { alterar: false, valor: "" },
	aliquotafcpnf: { alterar: false, valor: "" },
	ultimaaliquotaicmsst: { alterar: false, valor: "" },
	ultimaaliquotafcpst: { alterar: false, valor: "" },
	aliquotapis: { alterar: false, valor: "" },
	aliquotapisentrada: { alterar: false, valor: "" },
	aliquotacofins: { alterar: false, valor: "" },
	aliquotaconfinsentrada: { alterar: false, valor: "" },
	aliquotapisconfinssaidapreco: { alterar: false, valor: "" },
	aliquotapisconfinsentradapreco: { alterar: false, valor: "" },
};

export function montarCamposAlteracaoEmMassa(
	dados: AlterarProdutosEmMassaFormData,
): AtualizarProdutoData {
	const campos: AtualizarProdutoData = {};

	if (dados.idgrupo.alterar) campos.idgrupo = dados.idgrupo.valor || null;
	if (dados.idunidademedida.alterar) {
		campos.idunidademedida = dados.idunidademedida.valor || undefined;
	}
	if (dados.preco.alterar) campos.preco = dados.preco.valor;
	if (dados.custoaquisicao.alterar) {
		campos.custoaquisicao = valorOuNulo(dados.custoaquisicao.valor);
	}
	if (dados.origem.alterar) campos.origem = dados.origem.valor;
	if (dados.ncm.alterar) campos.ncm = valorOuNulo(dados.ncm.valor);
	if (dados.idcest.alterar) campos.idcest = dados.idcest.valor || null;
	if (dados.ippt.alterar) campos.ippt = dados.ippt.valor;
	if (dados.inativo.alterar) campos.inativo = dados.inativo.valor;
	if (dados.percentualmva.alterar) {
		campos.percentualmva = valorOuNulo(dados.percentualmva.valor);
	}
	if (dados.idcfopentrada.alterar) {
		campos.idcfopentrada = dados.idcfopentrada.valor || null;
	}
	if (dados.idcfopsaida.alterar) {
		campos.idcfopsaida = dados.idcfopsaida.valor || null;
	}
	if (dados.idcfopsaidanfce.alterar) {
		campos.idcfopsaidanfce = dados.idcfopsaidanfce.valor || null;
	}
	if (dados.tipoproduto.alterar) {
		campos.tipoproduto = dados.tipoproduto.valor || null;
	}
	if (dados.situacaotributariasnentrada.alterar) {
		campos.situacaotributariasnentrada = valorOuNulo(
			dados.situacaotributariasnentrada.valor,
		);
	}
	if (dados.situacaotributaria.alterar) {
		campos.situacaotributaria = dados.situacaotributaria.valor;
	}
	if (dados.situacaotributariasn.alterar) {
		campos.situacaotributariasn = dados.situacaotributariasn.valor;
	}
	if (dados.tributacaoespecial.alterar) {
		campos.tributacaoespecial = dados.tributacaoespecial.valor;
	}
	if (dados.tributacaosn.alterar) {
		campos.tributacaosn = dados.tributacaosn.valor;
	}
	if (dados.cstipientrada.alterar) {
		campos.cstipientrada = valorOuNulo(dados.cstipientrada.valor);
	}
	if (dados.cstipisaida.alterar) {
		campos.cstipisaida = valorOuNulo(dados.cstipisaida.valor);
	}
	if (dados.cstpisentrada.alterar) {
		campos.cstpisentrada = dados.cstpisentrada.valor;
	}
	if (dados.cstcofinsentrada.alterar) {
		campos.cstcofinsentrada = dados.cstcofinsentrada.valor;
	}
	if (dados.cstpis.alterar) campos.cstpis = dados.cstpis.valor;
	if (dados.cstcofins.alterar) campos.cstcofins = dados.cstcofins.valor;
	if (dados.aliquotaicmsinterna.alterar) {
		campos.aliquotaicmsinterna = valorOuNulo(dados.aliquotaicmsinterna.valor);
	}
	if (dados.aliquotaicmsdiferencialentrada.alterar) {
		campos.aliquotaicmsdiferencialentrada = valorOuNulo(
			dados.aliquotaicmsdiferencialentrada.valor,
		);
	}
	if (dados.aliquotareducaoicmsnfcesat.alterar) {
		campos.aliquotareducaoicmsnfcesat = valorOuNulo(
			dados.aliquotareducaoicmsnfcesat.valor,
		);
	}
	if (dados.aliquotafcpnf.alterar) {
		campos.aliquotafcpnf = valorOuNulo(dados.aliquotafcpnf.valor);
	}
	if (dados.ultimaaliquotaicmsst.alterar) {
		campos.ultimaaliquotaicmsst = valorOuNulo(dados.ultimaaliquotaicmsst.valor);
	}
	if (dados.ultimaaliquotafcpst.alterar) {
		campos.ultimaaliquotafcpst = valorOuNulo(dados.ultimaaliquotafcpst.valor);
	}
	if (dados.aliquotapis.alterar) {
		campos.aliquotapis = valorOuNulo(dados.aliquotapis.valor);
	}
	if (dados.aliquotapisentrada.alterar) {
		campos.aliquotapisentrada = valorOuNulo(dados.aliquotapisentrada.valor);
	}
	if (dados.aliquotacofins.alterar) {
		campos.aliquotacofins = valorOuNulo(dados.aliquotacofins.valor);
	}
	if (dados.aliquotaconfinsentrada.alterar) {
		campos.aliquotaconfinsentrada = valorOuNulo(
			dados.aliquotaconfinsentrada.valor,
		);
	}
	if (dados.aliquotapisconfinssaidapreco.alterar) {
		campos.aliquotapisconfinssaidapreco = valorOuNulo(
			dados.aliquotapisconfinssaidapreco.valor,
		);
	}
	if (dados.aliquotapisconfinsentradapreco.alterar) {
		campos.aliquotapisconfinsentradapreco = valorOuNulo(
			dados.aliquotapisconfinsentradapreco.valor,
		);
	}

	return campos;
}
