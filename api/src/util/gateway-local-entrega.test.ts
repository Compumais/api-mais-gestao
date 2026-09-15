import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("contrato do local de entrega com o gateway", () => {
	it("gera o grupo entrega com UF, município IBGE e CEP", async () => {
		const caminhoGateway = resolve(
			process.cwd(),
			"../api_Nfe/nfe-gateway/src/Services/NfeEmissaoService.php",
		);
		const codigoGateway = await readFile(caminhoGateway, "utf8");

		expect(codigoGateway).toContain("$payloadNfe['localEntrega']");
		expect(codigoGateway).toContain("$mk->tagentrega");
		expect(codigoGateway).toContain("'cMun'");
		expect(codigoGateway).toContain("'UF'");
		expect(codigoGateway).toContain("'CEP'");
	});
});
