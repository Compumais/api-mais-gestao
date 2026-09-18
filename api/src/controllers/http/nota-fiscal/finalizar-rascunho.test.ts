import { describe, expect, it, vi } from "vitest";
import { finalizarRascunhoImportacao } from "./finalizar-rascunho.js";

vi.mock("@/service/nota-fiscal/importacao/finalizar-rascunho-importacao-nf.js");

import { finalizarRascunhoImportacaoNfService } from "@/service/nota-fiscal/importacao/finalizar-rascunho-importacao-nf.js";

describe("finalizarRascunhoImportacao", () => {
	it("registra o erro com contexto e mantém a resposta interna genérica", async () => {
		const erroBanco = new Error(
			'update "notafiscalitem" set "idproduto" = $1',
			{
				cause: new Error(
					'insert or update violates foreign key constraint "fk_notafiscalitem_produto"',
				),
			},
		);
		vi.mocked(finalizarRascunhoImportacaoNfService).mockRejectedValue(
			erroBanco,
		);

		const logError = vi.fn();
		const send = vi.fn();
		const reply = {
			status: vi.fn().mockReturnThis(),
			send,
		};
		const request = {
			user: { id: "usuario-1" },
			params: { id: "rascunho-1" },
			body: {
				idempresa: "empresa-1",
				gerarCustos: true,
				gerarFinanceiro: false,
			},
			log: { error: logError },
		};

		await finalizarRascunhoImportacao(request as never, reply as never);

		expect(logError).toHaveBeenCalledWith(
			expect.objectContaining({
				err: erroBanco,
				idusuario: "usuario-1",
				idRascunho: "rascunho-1",
				idempresa: "empresa-1",
				gerarCustos: true,
				gerarFinanceiro: false,
			}),
			"Falha ao finalizar rascunho de nota fiscal de entrada",
		);
		expect(reply.status).toHaveBeenCalledWith(500);
		expect(send).toHaveBeenCalledWith({
			success: false,
			status: 500,
			error: "Erro interno",
			code: "INTERNAL_SERVER_ERROR",
		});
		expect(JSON.stringify(send.mock.calls)).not.toContain("notafiscalitem");
		expect(JSON.stringify(send.mock.calls)).not.toContain(
			"fk_notafiscalitem_produto",
		);
	});
});
