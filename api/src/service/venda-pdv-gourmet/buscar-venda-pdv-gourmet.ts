import type { HttpResponse } from "@/model/http-model.js";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarVendaPdvGourmetPorId } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarVendaPdvGourmetParametros = {
	vendaPdvGourmetId: string;
	idusuario: string;
};

export async function buscarVendaPdvGourmetService({
	vendaPdvGourmetId,
	idusuario,
}: BuscarVendaPdvGourmetParametros): Promise<
	HttpResponse<VendaPdvGourmet | null>
> {
	const registro = await buscarVendaPdvGourmetPorId(vendaPdvGourmetId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<VendaPdvGourmet>(registro);
}
