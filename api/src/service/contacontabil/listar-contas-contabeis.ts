import type { ContaContabil } from "@/model/conta-contabil-model";
import type { HttpResponse } from "@/model/http-model";
import { listarContasContabeis } from "@/repositories/conta-contabil-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { httpOk } from "@/util/http-util";

type ListarContasContabeisParametros = {
    idusuario: string;
    idempresa: string;
    descricao?: string | undefined;
    page?: number;
    limit?: number;
};

type ListarContasContabeisResposta = {
    data: ContaContabil[];
    paginacao: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
};

export async function listarContasContabeisService({
    idusuario,
    idempresa,
    descricao,
    page = 1,
    limit = 10,
}: ListarContasContabeisParametros): Promise<HttpResponse<ListarContasContabeisResposta>> {
    const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
        idusuario,
        idempresa,
    );

    if (!usuarioPertenceEmpresa) {
        return httpOk<ListarContasContabeisResposta>({
            data: [],
            paginacao: {
                page,
                limit,
                total: 0,
                totalPages: 0,
            },
        });
    }

    const { contasContabeis, total } = await listarContasContabeis({
        idempresa,
        descricao,
        page,
        limit,
    });

    const totalPages = Math.ceil(total / limit);

    return httpOk<ListarContasContabeisResposta>({
        data: contasContabeis,
        paginacao: {
            page,
            limit,
            total,
            totalPages,
        },
    });
}
