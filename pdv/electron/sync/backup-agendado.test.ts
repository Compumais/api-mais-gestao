import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	aplicarRetencaoBackups,
	deveExecutarBackupAgendado,
	normalizarFrequenciaBackup,
	normalizarHoraBackup,
	normalizarManterBackups,
} from "./backup-agendado";

describe("backup agendado", () => {
	it("normaliza frequência, hora e retenção", () => {
		assert.equal(normalizarFrequenciaBackup("diario"), "diario");
		assert.equal(normalizarFrequenciaBackup("xyz"), "manual");
		assert.equal(normalizarHoraBackup("9:5"), "09:05");
		assert.equal(normalizarHoraBackup("invalid"), "22:00");
		assert.equal(normalizarManterBackups("0"), 1);
		assert.equal(normalizarManterBackups("20"), 20);
	});

	it("dispara backup horário quando passou 1h", () => {
		const agora = new Date("2026-08-17T15:00:00");
		assert.equal(
			deveExecutarBackupAgendado({
				habilitado: true,
				frequencia: "hora",
				hora: "22:00",
				ultimoIso: "2026-08-17T13:50:00.000Z",
				agora,
			}),
			true,
		);
		assert.equal(
			deveExecutarBackupAgendado({
				habilitado: true,
				frequencia: "hora",
				hora: "22:00",
				ultimoIso: agora.toISOString(),
				agora,
			}),
			false,
		);
	});

	it("dispara backup diário após o horário se ainda não rodou no dia", () => {
		const agora = new Date("2026-08-17T22:05:00");
		assert.equal(
			deveExecutarBackupAgendado({
				habilitado: true,
				frequencia: "diario",
				hora: "22:00",
				ultimoIso: "2026-08-16T22:01:00",
				agora,
			}),
			true,
		);
		assert.equal(
			deveExecutarBackupAgendado({
				habilitado: true,
				frequencia: "diario",
				hora: "22:00",
				ultimoIso: "2026-08-17T22:01:00",
				agora,
			}),
			false,
		);
		assert.equal(
			deveExecutarBackupAgendado({
				habilitado: true,
				frequencia: "diario",
				hora: "22:00",
				ultimoIso: "",
				agora: new Date("2026-08-17T21:00:00"),
			}),
			false,
		);
	});

	it("não agenda backup manual ou de fechamento de caixa", () => {
		assert.equal(
			deveExecutarBackupAgendado({
				habilitado: true,
				frequencia: "manual",
				hora: "22:00",
				ultimoIso: "",
			}),
			false,
		);
		assert.equal(
			deveExecutarBackupAgendado({
				habilitado: false,
				frequencia: "diario",
				hora: "22:00",
				ultimoIso: "",
			}),
			false,
		);
	});

	it("remove backups antigos acima da retenção", async () => {
		const pasta = await mkdtemp(join(tmpdir(), "pdv-retencao-"));
		try {
			for (let i = 1; i <= 4; i++) {
				const nome = `20260817-12000${i}_empresa_abc.tar.gz`;
				await writeFile(join(pasta, nome), "x");
				await new Promise((r) => setTimeout(r, 15));
			}
			await writeFile(join(pasta, "nao-e-backup.txt"), "x");
			const removidos = await aplicarRetencaoBackups(pasta, 2);
			assert.equal(removidos, 2);
			const restam = await readdir(pasta);
			assert.equal(restam.filter((n) => n.endsWith(".tar.gz")).length, 2);
			assert.ok(restam.includes("nao-e-backup.txt"));
		} finally {
			await rm(pasta, { recursive: true, force: true });
		}
	});
});
