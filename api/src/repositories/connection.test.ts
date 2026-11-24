import { describe, expect, it, vi } from "vitest";
import { directPool, obterMetricasPool, pool } from "./connection.js";
import {
	executarComLockAgendador,
	liberarLockAgendador,
	tentarAdquirirLockAgendador,
} from "./tarefa-execucao-repositories.js";

describe("connection pool e gerenciamento de conexões", () => {
	it("deve exportar instâncias válidas de pool e directPool", () => {
		expect(pool).toBeDefined();
		expect(directPool).toBeDefined();
		expect(typeof pool.connect).toBe("function");
		expect(typeof directPool.connect).toBe("function");
	});

	it("deve retornar métricas coerentes em obterMetricasPool", () => {
		const metricas = obterMetricasPool();
		expect(metricas).toHaveProperty("pooled");
		expect(metricas).toHaveProperty("direct");
		expect(typeof metricas.pooled.total).toBe("number");
		expect(typeof metricas.pooled.idle).toBe("number");
		expect(typeof metricas.pooled.waiting).toBe("number");
		expect(typeof metricas.direct.total).toBe("number");
		expect(typeof metricas.direct.idle).toBe("number");
		expect(typeof metricas.direct.waiting).toBe("number");
	});

	it("deve reter o mesmo PoolClient do directPool entre lock e unlock do agendador", async () => {
		const mockQuery = vi.fn().mockImplementation((query: string) => {
			if (query.includes("pg_try_advisory_lock")) {
				return Promise.resolve({ rows: [{ locked: true }] });
			}
			if (query.includes("pg_advisory_unlock")) {
				return Promise.resolve({ rows: [] });
			}
			return Promise.resolve({ rows: [] });
		});

		const mockRelease = vi.fn();
		const mockClient = {
			query: mockQuery,
			release: mockRelease,
		};

		const connectSpy = vi
			.spyOn(directPool, "connect")
			.mockResolvedValue(mockClient as any);

		const lockId = 999999;

		const adquiriu = await tentarAdquirirLockAgendador(lockId);
		expect(adquiriu).toBe(true);
		expect(connectSpy).toHaveBeenCalledTimes(1);
		expect(mockQuery).toHaveBeenCalledWith(
			"SELECT pg_try_advisory_lock($1) as locked",
			[lockId],
		);
		expect(mockRelease).not.toHaveBeenCalled();

		// Chamada duplicada com mesmo lockId deve reutilizar sem novo connect
		const adquiriuNovamente = await tentarAdquirirLockAgendador(lockId);
		expect(adquiriuNovamente).toBe(true);
		expect(connectSpy).toHaveBeenCalledTimes(1);

		// Liberação deve rodar query de unlock no mesmo cliente e liberar
		await liberarLockAgendador(lockId);
		expect(mockQuery).toHaveBeenCalledWith(
			"SELECT pg_advisory_unlock($1)",
			[lockId],
		);
		expect(mockRelease).toHaveBeenCalledTimes(1);

		connectSpy.mockRestore();
	});

	it("executarComLockAgendador deve executar callback e liberar lock", async () => {
		const mockQuery = vi.fn().mockImplementation((query: string) => {
			if (query.includes("pg_try_advisory_lock")) {
				return Promise.resolve({ rows: [{ locked: true }] });
			}
			return Promise.resolve({ rows: [] });
		});

		const mockRelease = vi.fn();
		const mockClient = {
			query: mockQuery,
			release: mockRelease,
		};

		const connectSpy = vi
			.spyOn(directPool, "connect")
			.mockResolvedValue(mockClient as any);

		const lockId = 888888;
		let operacaoExecutada = false;

		const resultado = await executarComLockAgendador(lockId, async () => {
			operacaoExecutada = true;
			return "ok";
		});

		expect(resultado).toEqual({ adquirido: true, resultado: "ok" });
		expect(operacaoExecutada).toBe(true);
		expect(mockRelease).toHaveBeenCalledTimes(1);

		connectSpy.mockRestore();
	});
});
