import type { ContaContabil } from "@/model/conta-contabil-model";
import type { HttpResponse } from "@/model/http-model";
import {
    buscarContaContabilPorId,
    excluirContaContabil,
} from "@/repositories/conta-contabil-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import {
    httpNaoEncontrado,
    httpOk,
    httpProibido,
} from "@/util/http-util";

type ExcluirContaContabilParametros = {
    id: string;
    idusuario: string;
};

export async function excluirContaContabilService({
    id,
    idusuario,
}: ExcluirContaContabilParametros): Promise<HttpResponse<ContaContabil>> {
    const contaExistente = await buscarContaContabilPorId(id);

    if (!contaExistente) {
        return httpNaoEncontrado();
    }

    const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
        idusuario,
        contaExistente.idempresa,
    );

    if (!usuarioPertenceEmpresa) {
        return httpProibido();
    }

    await excluirContaContabil(id);

    return httpOk<ContaContabil>(contaExistente);
}
