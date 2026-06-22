import { beforeEach, describe, expect, it, vi } from "vitest";
import * as contaCorrenteLancamentoRepository from "@/repositories/conta-corrente-lancamento-repositories.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { previewImportacaoOfxService } from "./preview-importacao-ofx.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/conta-corrente-repositories");
vi.mock("@/repositories/conta-corrente-lancamento-repositories");

const ofxMinimo = `OFXHEADER:100
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240615000000
<TRNAMT>100.00
<FITID>fitid-existente
<MEMO>Teste
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240616000000
<TRNAMT>-50.00
<FITID>fitid-novo
<MEMO>Novo
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

describe("previewImportacaoOfxService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("marca duplicata quando documento já existe na conta", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.listarDocumentosExistentesPorConta,
		).mockResolvedValue(["fitid-existente"]);

		const resultado = await previewImportacaoOfxService(
			"conta-123",
			ofxMinimo,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			expect(resultado.body).toHaveLength(2);
			expect(resultado.body[0]).toMatchObject({
				documento: "fitid-existente",
				status: "duplicada",
			});
			expect(resultado.body[1]).toMatchObject({
				documento: "fitid-novo",
				status: "pendente",
			});
		}
	});
});
