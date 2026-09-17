import type { HttpResponse } from "@/model/http-model.js";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarVendaPdvGourmetPorIdentidadeLocal } from "@/repositories/venda-pdv-gourmet-repositories.js";
import {
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type BuscarVendaPdvPorIdentidadeLocalParametros = {
	idusuario: string;
	idempresa: string;
	numeropdv: number;
	idvendalocal: string;
};

export type VendaPdvLocalConfirmada = VendaPdvGourmet & {
	idremoto: string;
	criada: false;
	recuperada: true;
};

export async function buscarVendaPdvPorIdentidadeLocalService({
	idusuario,
	idempresa,
	numeropdv,
	idvendalocal,
}: BuscarVendaPdvPorIdentidadeLocalParametros): Promise<
	HttpResponse<VendaPdvLocalConfirmada | null>
> {
	if (!(await verificarUsuarioPertenceEmpresa(idusuario, idempresa))) {
		return httpProibido();
	}

	const venda = await buscarVendaPdvGourmetPorIdentidadeLocal(
		idempresa,
		numeropdv,
		idvendalocal,
	);
	if (!venda) {
		return httpNaoEncontrado("Venda PDV não localizada pela identidade local");
	}

	return httpOk({
		...venda,
		idremoto: venda.id,
		criada: false,
		recuperada: true,
	});
}
