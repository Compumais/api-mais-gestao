import { v4 as uuidv4 } from "uuid";
import type { StatusImportacaoInbound } from "@/model/nfe-inbound-model.js";
import type { StatusManifestacaoInbound } from "@/model/nfe-inbound-model.js";
import {
	buscarNfeInboundDocumentoPorChave,
	upsertNfeInboundDocumento,
	atualizarStatusManifestacaoPorChave,
} from "@/repositories/nfe-inbound-repositories.js";
import type { DocumentoXmlClassificado } from "./classificar-xml-dfe.js";

export async function persistirDocumentoInbound({
	idempresa,
	nsu,
	classificado,
}: {
	idempresa: string;
	nsu: string;
	classificado: DocumentoXmlClassificado;
}): Promise<{ id: string; criado: boolean }> {
	const agora = new Date().toISOString();
	const existente = await buscarNfeInboundDocumentoPorChave(
		idempresa,
		classificado.metadados.chavenfe,
	);

	if (classificado.tipo === "procEventoNFe") {
		if (classificado.statusManifestacaoEvento) {
			await atualizarStatusManifestacaoPorChave({
				idempresa,
				chavenfe: classificado.metadados.chavenfe,
				statusmanifestacao: classificado.statusManifestacaoEvento,
				atualizadoem: agora,
			});
		}

		return {
			id: existente?.id ?? uuidv4(),
			criado: false,
		};
	}

	let statusimportacao: StatusImportacaoInbound = "aguardando_xml";
	let statusmanifestacao: StatusManifestacaoInbound =
		(existente?.statusmanifestacao as StatusManifestacaoInbound | undefined) ??
		"sem_manifestacao";

	if (classificado.tipo === "procNFe") {
		statusimportacao = "disponivel";
	} else if (classificado.tipo === "resNFe") {
		statusimportacao = "aguardando_xml";
	}

	if (
		existente?.tipodocumento === "procNFe" &&
		classificado.tipo === "resNFe"
	) {
		return { id: existente.id, criado: false };
	}

	const id = existente?.id ?? uuidv4();

	await upsertNfeInboundDocumento({
		id,
		idempresa,
		nsu,
		chavenfe: classificado.metadados.chavenfe,
		tipodocumento: classificado.tipo,
		cnpjemitente: classificado.metadados.cnpjemitente ?? null,
		razaoemitente: classificado.metadados.razaoemitente ?? null,
		numero: classificado.metadados.numero ?? null,
		serie: classificado.metadados.serie ?? null,
		dataemissao: classificado.metadados.dataemissao ?? null,
		valortotal: classificado.metadados.valortotal ?? null,
		xml: classificado.xml,
		statusmanifestacao,
		statusimportacao,
		idrascunho: existente?.idrascunho ?? null,
		atualizadoem: agora,
	});

	return { id, criado: !existente };
}
