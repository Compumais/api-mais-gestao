import { describe, expect, it } from "vitest";
import {
	extrairDadosEmissaoNfeSalvos,
	montarSnapshotEmissaoNfe,
} from "./dados-emissao-nfe-nota.js";

describe("montarSnapshotEmissaoNfe", () => {
	it("preserva local de entrega e idDest para transmissão e reemissão", () => {
		const localEntrega = {
			nomeEvento: "Feira Comercial",
			dataInicioEvento: "2026-09-10",
			dataFimEvento: "2026-09-12",
			fundamentoLegal: "Tratamento fiscal validado pelo emitente",
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

	it("preserva o desconto global separado do endereço resolvido", () => {
		const endereco = {
			logradouro: "Rua do Cliente",
			numero: "20",
			bairro: "Centro",
			codigoMunicipio: "3550308",
			municipio: "São Paulo",
			uf: "SP",
			cep: "01001000",
		};
		const snapshot = montarSnapshotEmissaoNfe({
			informarEnderecoEntregaManual: false,
			enderecoEntregaResolvido: endereco,
			totais: { desconto: 4 },
		});

		expect(snapshot.emissao?.totais?.desconto).toBe(4);
		expect(snapshot.emissao?.informarEnderecoEntregaManual).toBe(false);
		expect(snapshot.emissao?.enderecoEntregaResolvido).toEqual(endereco);
		expect(extrairDadosEmissaoNfeSalvos(snapshot)?.enderecoEntregaResolvido).toEqual(
			endereco,
		);
	});
});
