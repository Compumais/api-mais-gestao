import type { HttpResponse } from "@/model/http-model";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories";
import {
    buscarUltimasMovimentacoes,
    type UltimasMovimentacoes,
} from "@/repositories/dashboard-repositories";
import { httpNaoAutorizado, httpOk } from "@/util/http-util";

type BuscarUltimasMovimentacoesParametros = {
    idusuario: string;
    idempresa?: string;
};

export async function buscarUltimasMovimentacoesService({
    idusuario,
    idempresa,
}: BuscarUltimasMovimentacoesParametros): Promise<
    HttpResponse<UltimasMovimentacoes>
> {
    const idempresas = await buscarEmpresasDoUsuario(idusuario);

    if (idempresas.length === 0) {
        return httpNaoAutorizado();
    }

    // Se idempresa foi fornecido, verificar se o usuário tem acesso
    const empresaId = idempresa || idempresas[0];

    if (!idempresas.includes(empresaId)) {
        return httpNaoAutorizado();
    }

    const dados = await buscarUltimasMovimentacoes({
        idempresa: empresaId,
    });

    return httpOk<UltimasMovimentacoes>(dados);
}
