import type { HttpResponse } from "@/model/http-model.js";
import type {
	AmbienteFiscal,
	FiltrosRelatorioNotasFiscais,
	LinhaRelatorioNotaFiscal,
	ResultadoRelatorioNotasFiscais,
	ResumoRelatorioNotasFiscais,
} from "@/model/relatorio-notas-fiscais-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type AgrupamentoRelatorioNotaFiscal,
	consultarRelatorioNotasFiscais,
	type RegistroRelatorioNotaFiscal,
} from "@/repositories/relatorio-notas-fiscais-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { NFE_STATUS, obterLabelStatus } from "@/util/nfe-status.js";

function normalizarAmbiente(valor: number | null): AmbienteFiscal {
	return valor === 1 || valor === 2 ? valor : null;
}

function ambienteLabel(
	ambiente: AmbienteFiscal,
): LinhaRelatorioNotaFiscal["ambienteLabel"] {
	if (ambiente === 1) return "Produção";
	if (ambiente === 2) return "Homologação";
	return "Não informado";
}

export function mapearLinhaRelatorioNotaFiscal(
	registro: RegistroRelatorioNotaFiscal,
): LinhaRelatorioNotaFiscal | null {
	if (
		(registro.modelo !== "55" && registro.modelo !== "65") ||
		registro.status == null
	) {
		return null;
	}

	const inutilizacao = registro.status === NFE_STATUS.INUTILIZADA;
	const ambiente = normalizarAmbiente(registro.ambiente);
	return {
		id: registro.id,
		tipo: inutilizacao ? "INUTILIZACAO" : "NOTA_FISCAL",
		dataHora: registro.dataHora,
		modelo: registro.modelo,
		serie: registro.serie,
		numeroInicial: registro.numero,
		numeroFinal: registro.numero,
		chave: inutilizacao ? null : registro.chave,
		protocolo: registro.protocolo,
		destinatario: inutilizacao ? null : registro.destinatario,
		valorTotal: inutilizacao ? null : registro.valorTotal,
		statusCodigo: registro.status,
		status: obterLabelStatus(registro.status),
		ambiente,
		ambienteLabel: ambienteLabel(ambiente),
	};
}

export function calcularResumoRelatorioNotasFiscais(
	agrupamentos: AgrupamentoRelatorioNotaFiscal[],
): ResumoRelatorioNotasFiscais {
	const resumo: ResumoRelatorioNotasFiscais = {
		total: 0,
		porStatus: {
			emitidasPendentes: 0,
			autorizadas: 0,
			canceladas: 0,
			inutilizadas: 0,
		},
		porAmbiente: {
			producao: 0,
			homologacao: 0,
			naoInformado: 0,
		},
	};

	for (const item of agrupamentos) {
		resumo.total += item.quantidade;
		if (
			item.status === NFE_STATUS.PENDENTE ||
			item.status === NFE_STATUS.REJEITADA ||
			item.status === NFE_STATUS.DENEGADA
		) {
			resumo.porStatus.emitidasPendentes += item.quantidade;
		} else if (item.status === NFE_STATUS.AUTORIZADA) {
			resumo.porStatus.autorizadas += item.quantidade;
		} else if (
			item.status === NFE_STATUS.CANCELADA ||
			item.status === NFE_STATUS.CANCELADA_FORA_PRAZO
		) {
			resumo.porStatus.canceladas += item.quantidade;
		} else if (item.status === NFE_STATUS.INUTILIZADA) {
			resumo.porStatus.inutilizadas += item.quantidade;
		}

		if (item.ambiente === 1) {
			resumo.porAmbiente.producao += item.quantidade;
		} else if (item.ambiente === 2) {
			resumo.porAmbiente.homologacao += item.quantidade;
		} else {
			resumo.porAmbiente.naoInformado += item.quantidade;
		}
	}

	return resumo;
}

type ListarRelatorioNotasFiscaisParametros = {
	idusuario: string;
	filtros: FiltrosRelatorioNotasFiscais;
};

export async function listarRelatorioNotasFiscaisService({
	idusuario,
	filtros,
}: ListarRelatorioNotasFiscaisParametros): Promise<
	HttpResponse<ResultadoRelatorioNotasFiscais>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		filtros.idempresa,
	);
	if (!pertence) return httpProibido();

	const consulta = await consultarRelatorioNotasFiscais(filtros);
	const data = consulta.registros
		.map(mapearLinhaRelatorioNotaFiscal)
		.filter((linha): linha is LinhaRelatorioNotaFiscal => linha !== null);

	return httpOk<ResultadoRelatorioNotasFiscais>({
		data,
		resumo: calcularResumoRelatorioNotasFiscais(consulta.agrupamentos),
		paginacao: {
			page: filtros.page,
			limit: filtros.limit,
			total: consulta.total,
			totalPages: Math.ceil(consulta.total / filtros.limit),
		},
		avisos: [
			"Inutilizações representam faixas numéricas homologadas e não notas fiscais autorizadas.",
			"O grupo “Emitidas/pendentes” reúne os estados canônicos pendente, rejeitada e denegada; cada linha preserva seu status real.",
			"Documentos sem ambiente persistido são separados como “Não informado” e não são somados silenciosamente à produção.",
			"O período usa emissão para documentos comuns e a data do evento persistido para cancelamentos e inutilizações.",
		],
	});
}
