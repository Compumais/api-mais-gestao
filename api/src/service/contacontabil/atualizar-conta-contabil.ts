import type { ContaContabil, NovaContaContabil } from "@/model/conta-contabil-model";
import type { HttpResponse } from "@/model/http-model";
import {
    atualizarContaContabil,
    buscarContaContabilPorId,
} from "@/repositories/conta-contabil-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import {
    httpErroInterno,
    httpNaoEncontrado,
    httpOk,
    httpProibido,
} from "@/util/http-util";

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
