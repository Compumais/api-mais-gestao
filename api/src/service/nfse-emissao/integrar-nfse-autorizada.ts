import { TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { DadosEmissaoNfseSalvos } from "@/model/nfse-emissao-model.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import {
	type FormaPagamentoNfVenda,
	gerarContasReceberNfService,
} from "@/service/nota-fiscal/gerar-contas-receber-nf.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

export type IntegrarNfseAutorizadaParametros = {
	idusuario: string;
	idnotafiscal: string;
	gerarFinanceiro?: boolean;
};

export type ResultadoIntegracaoNfse = {
	parcelasGeradas: number;
	lancamentosCaixa: number;
	avisos: string[];
};

function extrairDadosEmissaoNfseSalvos(
	dados: unknown,
): DadosEmissaoNfseSalvos | null {
	if (!dados || typeof dados !== "object") {
		return null;
	}
	return dados as DadosEmissaoNfseSalvos;
}

export async function integrarNfseAutorizadaService({
	idusuario,
	idnotafiscal,
	gerarFinanceiro: gerarFinanceiroParam,
}: IntegrarNfseAutorizadaParametros): Promise<
	HttpResponse<ResultadoIntegracaoNfse>
> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	if (!nota) {
		return httpBadRequest("Nota fiscal não encontrada");
	}

	if (nota.tipoorigem !== TIPO_ORIGEM_NFSE) {
		return httpBadRequest(
			"Integração financeira disponível apenas para NFS-e de serviço",
		);
	}

	if (nota.status !== NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("Integração financeira exige NFS-e autorizada");
	}

	const emissaoSalva = extrairDadosEmissaoNfseSalvos(nota.dadosimportacao);
	const gerarFinanceiro =
		gerarFinanceiroParam ?? emissaoSalva?.gerarFinanceiro ?? true;

	const avisos: string[] = [];
	let parcelasGeradas = 0;
	let lancamentosCaixa = 0;

	if (gerarFinanceiro) {
		const resultadoFinanceiro = await gerarContasReceberNfService({
			idempresa: nota.idempresa,
			idnotafiscal,
			idusuario,
			identidade: nota.identidade ?? undefined,
			idcondicaopagto: emissaoSalva?.idcondicaopagto,
			idtipodocumento: emissaoSalva?.idtipodocumento,
			idplanocontas: emissaoSalva?.idplanocontas,
			valortotalnota: nota.valortotalnota ?? "0",
			emissao: nota.emissao ?? new Date().toISOString(),
			numero: nota.numeronfse ?? nota.numero ?? undefined,
			serie: nota.serie ?? undefined,
			razaosocial: nota.razaosocial ?? undefined,
			formasPagamento: emissaoSalva?.formasPagamento as
				| FormaPagamentoNfVenda[]
				| undefined,
		});

		if (resultadoFinanceiro.success && resultadoFinanceiro.body) {
			parcelasGeradas = resultadoFinanceiro.body.parcelasGeradas;
			lancamentosCaixa = resultadoFinanceiro.body.lancamentosCaixa;
		} else if (!resultadoFinanceiro.success) {
			avisos.push(
				typeof resultadoFinanceiro.error === "string"
					? resultadoFinanceiro.error
					: "Falha ao gerar contas a receber",
			);
		}
	}

	return httpOk<ResultadoIntegracaoNfse>({
		parcelasGeradas,
		lancamentosCaixa,
		avisos,
	});
}
