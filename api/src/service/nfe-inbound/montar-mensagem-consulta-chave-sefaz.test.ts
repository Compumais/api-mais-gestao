import { describe, expect, it } from "vitest";
import {
	MENSAGEM_ERRO_138_SEM_DOC,
	montarMensagemConsultaChaveSefaz,
} from "./montar-mensagem-consulta-chave-sefaz.js";
import { MENSAGEM_ERRO_137 } from "./tratar-erros-sefaz-dfe.js";

describe("montarMensagemConsultaChaveSefaz", () => {
	it("deve usar mensagem 137 quando não há consulta de situação", () => {
		const mensagem = montarMensagemConsultaChaveSefaz({ cStatDfe: "137" });
		expect(mensagem).toBe(MENSAGEM_ERRO_137);
		expect(mensagem).toContain("não significa que a nota não existe");
	});

	it("deve indicar autorização na SEFAZ quando situação retorna 100", () => {
		const mensagem = montarMensagemConsultaChaveSefaz({
			cStatDfe: "137",
			tpAmb: 1,
			consultaSituacao: { cStat: "100", xMotivo: "Autorizado o uso da NF-e" },
		});

		expect(mensagem).toContain("autorizada na SEFAZ");
		expect(mensagem).toContain("Produção");
		expect(mensagem).toContain("Importar XML");
	});

	it("deve orientar ambiente quando situação retorna 217", () => {
		const mensagem = montarMensagemConsultaChaveSefaz({
			cStatDfe: "137",
			tpAmb: 2,
			consultaSituacao: { cStat: "217", xMotivo: "NF-e não consta na base" },
		});

		expect(mensagem).toContain("não localizada na SEFAZ");
		expect(mensagem).toContain("Homologação");
		expect(mensagem).toContain("Configurações NF-e");
	});

	it("deve expor mensagem específica para 138 sem documento correspondente", () => {
		expect(MENSAGEM_ERRO_138_SEM_DOC).toContain("[138]");
		expect(MENSAGEM_ERRO_138_SEM_DOC).not.toContain("não existe na SEFAZ");
	});
});
