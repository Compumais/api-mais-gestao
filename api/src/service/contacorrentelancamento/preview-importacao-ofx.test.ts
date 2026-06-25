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

	it("marca existente quando data, valor e tipo coincidem na conta", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarLancamentosExistentesPorChaves,
		).mockResolvedValue(
			new Map([
				[
					"2024-06-15|100.00|C",
					{ id: "lancamento-existente-1", idplanocontas: "plano-1" },
				],
			]),
		);

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
				data: "2024-06-15",
				valor: "100.00",
				tipo: "C",
				status: "existente",
				idLancamentoExistente: "lancamento-existente-1",
				idplanocontasExistente: "plano-1",
			});
			expect(resultado.body[1]).toMatchObject({
				documento: "fitid-novo",
				data: "2024-06-16",
				valor: "50.00",
				tipo: "D",
				status: "pendente",
			});
		}
	});

	it("marca existente mesmo com documento diferente quando chave composta coincide", async () => {
		const ofxDocumentoDiferente = `OFXHEADER:100
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240615000000
<TRNAMT>100.00
<FITID>fitid-novo-no-ofx
<MEMO>Teste
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarLancamentosExistentesPorChaves,
		).mockResolvedValue(
			new Map([
				[
					"2024-06-15|100.00|C",
					{ id: "lancamento-existente-2", idplanocontas: null },
				],
			]),
		);

		const resultado = await previewImportacaoOfxService(
			"conta-123",
			ofxDocumentoDiferente,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			expect(resultado.body[0]).toMatchObject({
				documento: "fitid-novo-no-ofx",
				status: "existente",
				idLancamentoExistente: "lancamento-existente-2",
			});
		}
	});
});
