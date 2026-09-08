import { describe, expect, it } from "vitest";
import {
	extrairDadosEmissaoNfeSalvos,
	montarSnapshotEmissaoNfe,
} from "./dados-emissao-nfe-nota.js";

describe("montarSnapshotEmissaoNfe", () => {
	it("preserva local de entrega e idDest para transmissão e reemissão", () => {
		const localEntrega = {
			nome: "Feira Comercial",
			logradouro: "Rua da Exposição",
			numero: "100",
			bairro: "Centro",
			codigoMunicipio: "3550308",
			municipio: "São Paulo",
			uf: "SP",
			cep: "01001000",
		};

		const snapshot = montarSnapshotEmissaoNfe({
			idDest: 2,
			localEntrega,
		});

		expect(snapshot.emissao?.idDest).toBe(2);
		expect(snapshot.emissao?.localEntrega).toEqual(localEntrega);
		expect(extrairDadosEmissaoNfeSalvos(snapshot)?.localEntrega).toEqual(
			localEntrega,
		);
	});
});
