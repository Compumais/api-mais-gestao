import { describe, expect, it } from "vitest";
import {
	httpCriacao,
	httpErroInterno,
	httpLimiteExcedido,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpOk,
	httpRecursoExistente,
	httpSemConteudo,
} from "./http-util.js";

describe("http-util", () => {
	describe("httpCriacao", () => {
		it("deve retornar resposta de criação com status 201 e body", () => {
			const dados = { id: "123", nome: "Teste" };
			const resultado = httpCriacao(dados);

			expect(resultado.success).toBe(true);
			expect(resultado.status).toBe(201);
			if (resultado.success) {
				expect(resultado.body).toEqual(dados);
			}
		});

		it("deve funcionar com tipos genéricos diferentes", () => {
			const resultadoString = httpCriacao("teste");
			const resultadoNumber = httpCriacao(42);
			const resultadoArray = httpCriacao([1, 2, 3]);

			expect(resultadoString.success).toBe(true);
			expect(resultadoString.status).toBe(201);
			expect(resultadoNumber.success).toBe(true);
			expect(resultadoNumber.status).toBe(201);
			expect(resultadoArray.success).toBe(true);
			expect(resultadoArray.status).toBe(201);
		});
	});

	describe("httpOk", () => {
		it("deve retornar resposta de sucesso com status 200 e body", () => {
			const dados = { id: "456", nome: "Sucesso" };
			const resultado = httpOk(dados);

			expect(resultado.success).toBe(true);
			expect(resultado.status).toBe(200);
			if (resultado.success) {
				expect(resultado.body).toEqual(dados);
			}
		});

		it("deve funcionar com tipos genéricos diferentes", () => {
			const resultadoNull = httpOk(null);
			const resultadoUndefined = httpOk(undefined);

			expect(resultadoNull.success).toBe(true);
			expect(resultadoNull.status).toBe(200);
			expect(resultadoUndefined.success).toBe(true);
			expect(resultadoUndefined.status).toBe(200);
		});
	});

	describe("httpSemConteudo", () => {
		it("deve retornar resposta de sucesso com status 204 e body null", () => {
			const resultado = httpSemConteudo();

			expect(resultado.success).toBe(true);
			expect(resultado.status).toBe(204);
			if (resultado.success) {
				expect(resultado.body).toBeNull();
			}
		});
	});

	describe("httpNaoAutorizado", () => {
		it("deve retornar resposta de erro com status 401", () => {
			const resultado = httpNaoAutorizado();

			expect(resultado.success).toBe(false);
			expect(resultado.status).toBe(401);
			if (!resultado.success) {
				expect(resultado.error).toBe("Não autorizado");
				expect(resultado.code).toBe("UNAUTHORIZED_ERROR");
			}
		});
	});

	describe("httpNaoEncontrado", () => {
		it("deve retornar resposta de erro com status 404", () => {
			const resultado = httpNaoEncontrado();

			expect(resultado.success).toBe(false);
			expect(resultado.status).toBe(404);
			if (!resultado.success) {
				expect(resultado.error).toBe("Recurso não encontrado");
				expect(resultado.code).toBe("NOT_FOUND_ERROR");
			}
		});
	});

	describe("httpErroInterno", () => {
		it("deve retornar resposta de erro com status 500", () => {
			const resultado = httpErroInterno();

			expect(resultado.success).toBe(false);
			expect(resultado.status).toBe(500);
			if (!resultado.success) {
				expect(resultado.error).toBe("Erro interno");
				expect(resultado.code).toBe("INTERNAL_SERVER_ERROR");
			}
		});
	});

	describe("httpRecursoExistente", () => {
		it("deve retornar resposta de erro com status 409", () => {
			const resultado = httpRecursoExistente();

			expect(resultado.success).toBe(false);
			expect(resultado.status).toBe(409);
			if (!resultado.success) {
				expect(resultado.error).toBe("Recurso já existe");
				expect(resultado.code).toBe("RESOURCE_ALREADY_EXISTS");
			}
		});
	});

	describe("httpLimiteExcedido", () => {
		it("deve retornar resposta de erro com status 429", () => {
			const resultado = httpLimiteExcedido();

			expect(resultado.success).toBe(false);
			expect(resultado.status).toBe(429);
			if (!resultado.success) {
				expect(resultado.error).toBe("Limite excedido");
				expect(resultado.code).toBe("LIMIT_EXCEEDED");
			}
		});
	});
});
