import type { ContaContabil, NovaContaContabil } from "@/model/conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
    atualizarContaContabil,
    buscarContaContabilPorId,
} from "@/repositories/conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
    httpErroInterno,
    httpNaoEncontrado,
    httpOk,
    httpProibido,
} from "@/util/http-util.js";

type AtualizarContaContabilParametros = {
    id: string;
    idusuario: string;
    dados: Partial<NovaContaContabil>;
};

export async function atualizarContaContabilService({
    id,
    idusuario,
    dados,
}: AtualizarContaContabilParametros): Promise<HttpResponse<ContaContabil>> {
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

    const contaContabil = await atualizarContaContabil(id, {
        ...dados,
        dataultimaalteracao: new Date().toISOString(),
        idultimousuarioalteracao: idusuario,
        currenttimemillis: Date.now(),
    });

    if (!contaContabil) {
        return httpErroInterno();
    }

    return httpOk<ContaContabil>(contaContabil);
}
