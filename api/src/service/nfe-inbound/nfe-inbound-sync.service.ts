import type { ResultadoSincronizacaoInbound } from "@/model/nfe-inbound-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	atualizarEmpresaNfeSync,
	buscarNfeInboundDocumentoPorChave,
	liberarSincronizando,
	obterOuCriarEmpresaNfeSync,
	tentarMarcarSincronizando,
} from "@/repositories/nfe-inbound-repositories.js";
import { compararNsu, normalizarNsu } from "@/util/lock-empresa.js";
import { classificarXmlDfe } from "./classificar-xml-dfe.js";
import {
	consultarDistribuicaoDfe,
	ErroConsultaDistribuicaoDfe,
} from "./consultar-distribuicao-dfe.js";
import { importPurchaseInvoiceService } from "./import-purchase-invoice.js";
import { persistirDocumentoInbound } from "./persistir-documento-inbound.js";
import {
	ErroProcessamentoDocZip,
	processarDocZip,
} from "./processar-doc-zip.js";
import { calcularProximoBackoffMs } from "./tratar-erros-sefaz-dfe.js";

const MAX_ITERACOES_PAGINACAO = 50;
const MAX_DOCZIP_POR_EXECUCAO = 200;

function isErroConsultaDistribuicaoDfe(
	erro: unknown,
): erro is ErroConsultaDistribuicaoDfe {
	return (
		typeof erro === "object" &&
		erro !== null &&
		"codigo" in erro &&
		typeof (erro as ErroConsultaDistribuicaoDfe).codigo === "string"
	);
}

export type SincronizarEmpresaNfeInboundParametros = {
	idempresa: string;
	idusuarioAutoImport?: string;
};

export async function sincronizarEmpresaNfeInboundService({
	idempresa,
	idusuarioAutoImport,
}: SincronizarEmpresaNfeInboundParametros): Promise<ResultadoSincronizacaoInbound> {
	const inicio = Date.now();
	const sync = await obterOuCriarEmpresaNfeSync(idempresa);
	const nsuInicial = normalizarNsu(sync.ultimonsu);

	if (sync.proximotentativa) {
		const proxima = new Date(sync.proximotentativa).getTime();
		if (proxima > Date.now()) {
			return {
				idempresa,
				nsuInicial,
				nsuFinal: nsuInicial,
				quantidadeXml: 0,
				tempoMs: Date.now() - inicio,
				falhas: [
					{
						nsu: nsuInicial,
						motivo: `Aguardando backoff até ${sync.proximotentativa}`,
					},
				],
				parouPor656: true,
			};
		}
	}

	const adquiriuLock = await tentarMarcarSincronizando(idempresa);
	if (!adquiriuLock) {
		return {
			idempresa,
			nsuInicial,
			nsuFinal: nsuInicial,
			quantidadeXml: 0,
			tempoMs: Date.now() - inicio,
			falhas: [{ nsu: nsuInicial, motivo: "Sincronização já em andamento" }],
			parouPor656: false,
		};
	}

	let ultNSU = nsuInicial;
	let maxNSU = normalizarNsu(sync.maxnsu ?? nsuInicial);
	let quantidadeXml = 0;
	const falhas: Array<{ nsu: string; motivo: string }> = [];
	let parouPor656 = false;
	let iteracoes = 0;
	let cStatSefaz: string | undefined;
	let xMotivoSefaz: string | undefined;

	try {
		while (iteracoes < MAX_ITERACOES_PAGINACAO && quantidadeXml < MAX_DOCZIP_POR_EXECUCAO) {
			iteracoes += 1;

			let resultadoDistribuicao;

			try {
				resultadoDistribuicao = await consultarDistribuicaoDfe({
					idempresa,
					ultNSU,
				});
			} catch (erro) {
				if (isErroConsultaDistribuicaoDfe(erro)) {
					if (erro.codigo === "BACKOFF") {
						parouPor656 = true;
						const tentativas = (sync.tentativasbackoff ?? 0) + 1;
						const proximoBackoff = new Date(
							Date.now() + calcularProximoBackoffMs(tentativas),
						).toISOString();

						await atualizarEmpresaNfeSync(idempresa, {
							proximotentativa: proximoBackoff,
							tentativasbackoff: tentativas,
						});

						falhas.push({ nsu: ultNSU, motivo: erro.message });
						break;
					}

					if (erro.codigo === "CERTIFICADO") {
						falhas.push({ nsu: ultNSU, motivo: erro.message });
						break;
					}

					falhas.push({ nsu: ultNSU, motivo: erro.message });
					break;
				}

				throw erro;
			}

			ultNSU = normalizarNsu(resultadoDistribuicao.ultNSU);
			maxNSU = normalizarNsu(resultadoDistribuicao.maxNSU);
			cStatSefaz = resultadoDistribuicao.cStat;
			xMotivoSefaz = resultadoDistribuicao.xMotivo;

			if (resultadoDistribuicao.cStat === "137") {
				await atualizarEmpresaNfeSync(idempresa, {
					ultimonsu: ultNSU,
					maxnsu: maxNSU,
					ultimosync: new Date().toISOString(),
					proximotentativa: null,
					tentativasbackoff: 0,
				});
				break;
			}

			for (const docZip of resultadoDistribuicao.docZip) {
				if (quantidadeXml >= MAX_DOCZIP_POR_EXECUCAO) {
					break;
				}

				try {
					const xml = processarDocZip(docZip.content);
					const classificado = classificarXmlDfe(xml);
					await persistirDocumentoInbound({
						idempresa,
						nsu: docZip.nsu || ultNSU,
						classificado,
					});
					quantidadeXml += 1;

					if (
						classificado.tipo === "procNFe" &&
						sync.importacaoautomatica &&
						idusuarioAutoImport
					) {
						const doc = await buscarNfeInboundDocumentoPorChave(
							idempresa,
							classificado.metadados.chavenfe,
						);
						if (doc && doc.statusimportacao === "disponivel") {
							await importPurchaseInvoiceService({
								idDocumento: doc.id,
								idempresa,
								idusuario: idusuarioAutoImport,
							});
						}
					}
				} catch (erro) {
					const motivo =
						erro instanceof ErroProcessamentoDocZip
							? `${erro.codigo}: ${erro.message}`
							: erro instanceof Error
								? erro.message
								: "Erro desconhecido";

					falhas.push({
						nsu: docZip.nsu || ultNSU,
						motivo,
					});
				}
			}

			await atualizarEmpresaNfeSync(idempresa, {
				ultimonsu: ultNSU,
				maxnsu: maxNSU,
				ultimosync: new Date().toISOString(),
				proximotentativa: null,
				tentativasbackoff: 0,
			});

			if (compararNsu(ultNSU, maxNSU) >= 0) {
				break;
			}
		}
	} finally {
		await liberarSincronizando(idempresa);
	}

	return {
		idempresa,
		nsuInicial,
		nsuFinal: ultNSU,
		quantidadeXml,
		tempoMs: Date.now() - inicio,
		falhas,
		parouPor656,
		...(cStatSefaz !== undefined && { cStat: cStatSefaz }),
		...(xMotivoSefaz !== undefined && { xMotivo: xMotivoSefaz }),
	};
}

export async function obterIdUsuarioAutoImport(idempresa: string): Promise<string | undefined> {
	const empresa = await buscarEmpresaPorId(idempresa);
	return empresa?.idproprietario;
}
