import type { ContaContabil } from "@/model/conta-contabil-model";
import type { HttpResponse } from "@/model/http-model";
import { buscarContaContabilPorId } from "@/repositories/conta-contabil-repositories";
import { httpNaoEncontrado, httpOk } from "@/util/http-util";

type BuscarContaContabilParametros = {
    id: string;
};

export async function buscarContaContabilService({
    id,
}: BuscarContaContabilParametros): Promise<HttpResponse<ContaContabil>> {
    const contaContabil = await buscarContaContabilPorId(id);

    if (!contaContabil) {
        return httpNaoEncontrado();
    }

    return httpOk<ContaContabil>(contaContabil);
}
